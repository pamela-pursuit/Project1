#!/usr/bin/env node
// Credential store helper. Never prints secret values.
//
//   node scripts/credentials.mjs init --app <app> --role <role>:<field>,<field> [--role ...]
//        [--format xlsx|json] [--note "<role>=<text>"]
//   node scripts/credentials.mjs check [--app <app>] [--require <role>:<field>,<field> ...]
//   node scripts/credentials.mjs template [--out-dir templates]
//
// init      Creates the credential file (or extends an existing one) with the
//           app, roles, and fields the application needs, values left blank
//           for the user to fill in. Existing values are never changed.
// check     Masked view; exits 1 when the source, app, role, or a required
//           field is missing or blank. Agents use it instead of reading the file.
// template  Regenerates the example files in templates/.

import ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import store from '../lib/credentials-store.cjs';

const { describeStore, getAccount, envOverrideName, resolveSource, toKey, DEFAULT_FILES } = store;

const EXAMPLE = {
  _comment: 'Copy to credentials/credentials.json (git-ignored). Keys: app slug -> role -> fields. Placeholders: {timestamp}, {random}.',
  'my-app': {
    existingUser: { email: 'existing.customer@example.test', password: 'CHANGE_ME' },
    newUser: { firstName: 'QA', lastName: 'Automation', email: 'qa+{timestamp}@example.test', password: 'CHANGE_ME' },
    admin: { username: 'admin-username', password: 'CHANGE_ME' }
  }
};

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
const BLANK_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, require: [], roles: [], notes: {} };
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    const next = () => {
      if (i + 1 >= rest.length) throw new Error(`${key} needs a value`);
      return rest[++i];
    };
    if (key === '--app') args.app = next();
    else if (key === '--require') args.require.push(next());
    else if (key === '--role') args.roles.push(next());
    else if (key === '--format') args.format = next().toLowerCase();
    else if (key === '--note') {
      const [role, ...text] = next().split('=');
      args.notes[role] = text.join('=');
    } else if (key === '--out-dir') args.outDir = next();
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!['init', 'check', 'template'].includes(command)) {
    throw new Error('Usage: node scripts/credentials.mjs <init|check|template> [--app <app>] [--role role:field,field] [--require role:field,field] [--format xlsx|json]');
  }
  if (command === 'init') {
    if (!args.app || !args.roles.length) throw new Error('init needs --app and at least one --role <role>:<field>,<field>');
    if (args.format && !['xlsx', 'json'].includes(args.format)) throw new Error('--format must be xlsx or json');
  }
  return args;
}

function parseRoleSpec(spec) {
  const [role, fieldList = ''] = spec.split(':');
  const fields = [...new Set(fieldList.split(',').map((f) => f.trim()).filter(Boolean).map(toKey))];
  if (!role || !fields.length) throw new Error(`Invalid --role "${spec}". Use role:field,field (for example existingUser:email,password)`);
  return { role: role.trim(), fields };
}

function defaultNote(role, fields) {
  const r = role.toLowerCase();
  let note;
  if (/new|regist|signup|sign-up/.test(r)) {
    note = 'Used to register a NEW account. Tip: put {timestamp} in the email (e.g. yourname+{timestamp}@yourdomain.com) so every run is unique.';
  } else if (/exist|login|signin|customer|standard|user/.test(r)) {
    note = 'An account that ALREADY EXISTS and can sign in.';
  } else if (/admin/.test(r)) {
    note = 'An administrator account that already exists.';
  } else {
    note = `Account for role "${role}".`;
  }
  return `${note} Fill: ${fields.join(', ')}.`;
}

function headerFor(field) {
  // firstName -> First Name; email -> Email
  return field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function chooseTarget(format) {
  const source = resolveSource();
  if (source?.kind === 'env') {
    throw new Error('CREDENTIALS_JSON is set; init cannot write to an environment variable. Unset it or use CREDENTIALS_FILE.');
  }
  if (source) {
    const existing = DEFAULT_FILES.map((f) => path.resolve(f)).filter((f) => existsSync(f));
    if (!process.env.CREDENTIALS_FILE && existing.length > 1) {
      console.log(`Note: both ${DEFAULT_FILES.join(' and ')} exist; using ${source.label} (JSON wins). Remove the other to avoid confusion.`);
    }
    return { file: source.file, created: false };
  }
  const file = path.resolve(format === 'json' ? DEFAULT_FILES[0] : DEFAULT_FILES[1]);
  return { file, created: true };
}

async function initJson(file, app, roles, notes) {
  let doc = {};
  if (existsSync(file)) {
    try {
      doc = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      throw new Error(`${file} is not valid JSON. Fix it (or delete it) and rerun init.`);
    }
  } else {
    doc._readme = 'Fill in the blank values, save, and tell Claude "done". Never commit this file. Placeholders: {timestamp}, {random}.';
  }
  const added = [];
  doc[app] ??= {};
  for (const { role, fields } of roles) {
    const entry = (doc[app][role] ??= {});
    entry._notes ??= notes[role] ?? defaultNote(role, fields);
    const existingKeys = new Set(Object.keys(entry).map(toKey));
    for (const field of fields) {
      if (!existingKeys.has(field)) {
        entry[field] = '';
        added.push(`${role}.${field}`);
      }
    }
  }
  await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`);
  return added;
}

async function initXlsx(file, app, roles, notes) {
  const wb = new ExcelJS.Workbook();
  if (existsSync(file)) await wb.xlsx.readFile(file);
  let ws = wb.getWorksheet('Credentials') ?? wb.worksheets[0];
  if (!ws) ws = wb.addWorksheet('Credentials');

  const header = ws.getRow(1);
  const columnOf = (predicate) => {
    let found = 0;
    header.eachCell((cell, col) => {
      if (!found && predicate(String(cell.text ?? '').trim())) found = col;
    });
    return found;
  };
  const nextColumn = () => Math.max(header.cellCount, header.actualCellCount, 0) + 1;
  const ensureColumn = (predicate, title) => {
    let col = columnOf(predicate);
    if (!col) {
      col = nextColumn();
      header.getCell(col).value = title;
    }
    return col;
  };

  const appCol = ensureColumn((h) => /^app(lication)?$/i.test(h), 'App');
  const roleCol = ensureColumn((h) => /^(role|account|user ?type)$/i.test(h), 'Role');
  const notesCol = ensureColumn((h) => /^notes?$/i.test(h), 'Notes');

  const added = [];
  for (const { role, fields } of roles) {
    let rowNumber = 0;
    ws.eachRow((row, n) => {
      if (n > 1 && String(row.getCell(appCol).text).trim() === app && String(row.getCell(roleCol).text).trim() === role) rowNumber = n;
    });
    const isNew = !rowNumber;
    if (isNew) rowNumber = ws.rowCount + 1;
    const row = ws.getRow(rowNumber);
    if (isNew) {
      row.getCell(appCol).value = app;
      row.getCell(roleCol).value = role;
      row.getCell(notesCol).value = notes[role] ?? defaultNote(role, fields);
    }
    for (const field of fields) {
      const col = ensureColumn((h) => h && toKey(h) === field, headerFor(field));
      const cell = row.getCell(col);
      if (cell.value === null || cell.value === undefined || String(cell.text).trim() === '') {
        cell.value = null;
        cell.fill = BLANK_FILL; // highlights cells the user must fill
        added.push(`${role}.${field}`);
      }
    }
    row.commit();
  }

  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.columns.forEach((col, i) => {
    const title = String(header.getCell(i + 1).text ?? '');
    col.width = /^notes?$/i.test(title) ? 70 : Math.max(col.width ?? 0, 16, title.length + 4);
  });
  try {
    await wb.xlsx.writeFile(file);
  } catch (error) {
    if (/EBUSY|EPERM|locked/i.test(error.code ?? error.message)) {
      throw new Error(`${file} is open in another program (probably Excel). Close it and rerun init.`);
    }
    throw error;
  }
  return added;
}

async function init({ app, roles: specs, format, notes }) {
  const roles = specs.map(parseRoleSpec);
  const { file, created } = chooseTarget(format);
  await mkdir(path.dirname(file), { recursive: true });
  const kind = /\.xlsx$/i.test(file) ? 'xlsx' : /\.json$/i.test(file) ? 'json' : null;
  if (!kind) throw new Error(`${file}: unsupported format (use .json or .xlsx)`);
  if (format && format !== kind && !created) {
    console.log(`Note: an existing ${kind.toUpperCase()} credential file was found, so it is extended instead of creating a ${format.toUpperCase()} file.`);
  }
  const added = kind === 'json' ? await initJson(file, app, roles, notes) : await initXlsx(file, app, roles, notes);

  console.log(`${created ? 'Created' : 'Updated'}: ${file}`);
  console.log(`App: ${app}`);
  for (const { role, fields } of roles) console.log(`  ${role}: ${fields.join(', ')}`);
  console.log(added.length ? `Blank fields to fill: ${added.join(', ')}` : 'All requested fields already exist (values unchanged).');
  return true;
}

async function check({ app, require }) {
  const { source, rows } = await describeStore();
  if (!source) {
    console.log('No credentials source. Run `node scripts/credentials.mjs init ...`, or create');
    console.log('credentials/credentials.json or .xlsx (templates: templates/), or set CREDENTIALS_FILE / CREDENTIALS_JSON.');
    return false;
  }
  console.log(`Source: ${source}`);
  const shown = rows.filter((r) => !app || r.app === app);
  if (app && !shown.length) {
    console.log(`App "${app}" not found. Apps: ${[...new Set(rows.map((r) => r.app))].join(', ') || 'none'}`);
    return false;
  }
  for (const r of shown) {
    console.log(`  ${r.app} / ${r.role}`);
    for (const [field, masked] of Object.entries(r.fields)) {
      console.log(`      ${field.padEnd(14)} ${masked}   (override: ${envOverrideName(r.app, r.role, field)})`);
    }
  }
  let ok = true;
  for (const spec of require) {
    const [role, fieldList = ''] = spec.split(':');
    const fields = fieldList.split(',').filter(Boolean);
    try {
      await getAccount(app, role, { required: fields });
      console.log(`  OK      ${app}/${role} has ${fields.join(', ') || 'an entry'}`);
    } catch (error) {
      console.log(`  MISSING ${error.message}`);
      ok = false;
    }
  }
  return ok;
}

async function template({ outDir = 'templates' }) {
  await mkdir(outDir, { recursive: true });
  const jsonFile = path.join(outDir, 'credentials.example.json');
  await writeFile(jsonFile, `${JSON.stringify(EXAMPLE, null, 2)}\n`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Credentials');
  const fields = ['Email', 'Username', 'Password', 'First Name', 'Last Name'];
  ws.addRow(['App', 'Role', ...fields, 'Notes']);
  for (const [app, roles] of Object.entries(EXAMPLE)) {
    if (app.startsWith('_')) continue;
    for (const [role, values] of Object.entries(roles)) {
      ws.addRow([app, role, values.email ?? '', values.username ?? '', values.password ?? '', values.firstName ?? '', values.lastName ?? '', '']);
    }
  }
  ws.addRow(['# rows whose App starts with # are ignored', '', '', '', '', '', '', 'Add any extra field as a new column; header becomes camelCase (First Name -> firstName)']);
  ws.columns.forEach((c, i) => { c.width = [18, 16, 34, 18, 16, 14, 14, 60][i]; });
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = HEADER_FILL;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const xlsxFile = path.join(outDir, 'credentials.example.xlsx');
  await wb.xlsx.writeFile(xlsxFile);
  console.log(`Wrote ${jsonFile.replaceAll('\\', '/')} and ${xlsxFile.replaceAll('\\', '/')}`);
  return true;
}

const commands = { init, check, template };
Promise.resolve()
  .then(() => {
    const args = parseArgs(process.argv.slice(2));
    return commands[args.command](args);
  })
  .then((ok) => { if (!ok) process.exitCode = 1; })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
