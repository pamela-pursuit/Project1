#!/usr/bin/env node
// Credential store helper. Prints MASKED values only.
//
//   node scripts/credentials.mjs check [--app <app>] [--require role:field,field ...]
//   node scripts/credentials.mjs template [--out-dir test-data/templates]
//
// `check` exits 1 when no source exists, the app is missing, or a required
// role/field is missing. Agents use it instead of reading the file.

import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import store from '../test-data/credentials-store.cjs';

const { describeStore, getAccount, envOverrideName } = store;

const EXAMPLE = {
  _comment: 'Copy to credentials/credentials.json (git-ignored). Keys: app slug -> role -> fields. Placeholders: {timestamp}, {random}.',
  'demo-web-shop': {
    existingUser: { email: 'existing.customer@example.test', password: 'CHANGE_ME' },
    newUser: { firstName: 'QA', lastName: 'Automation', email: 'qa+{timestamp}@example.test', password: 'CHANGE_ME' }
  },
  'rahul-shetty': {
    standardUser: { username: 'your-username', password: 'CHANGE_ME' }
  }
};

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, require: [] };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--app') args.app = rest[++i];
    else if (rest[i] === '--require') args.require.push(rest[++i]);
    else if (rest[i] === '--out-dir') args.outDir = rest[++i];
    else throw new Error(`Unknown argument: ${rest[i]}`);
  }
  if (!['check', 'template'].includes(command)) {
    throw new Error('Usage: node scripts/credentials.mjs <check|template> [--app <app>] [--require role:field,field]');
  }
  return args;
}

async function check({ app, require }) {
  const { source, rows } = await describeStore();
  if (!source) {
    console.log('No credentials source. Create credentials/credentials.json or credentials/credentials.xlsx');
    console.log('(templates: test-data/templates/), or set CREDENTIALS_FILE / CREDENTIALS_JSON.');
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
      console.log(`  OK   ${app}/${role} has ${fields.join(', ') || 'an entry'}`);
    } catch (error) {
      console.log(`  MISSING ${error.message}`);
      ok = false;
    }
  }
  return ok;
}

async function template({ outDir = path.join('test-data', 'templates') }) {
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
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const xlsxFile = path.join(outDir, 'credentials.example.xlsx');
  await wb.xlsx.writeFile(xlsxFile);
  console.log(`Wrote ${jsonFile.replaceAll('\\', '/')} and ${xlsxFile.replaceAll('\\', '/')}`);
  return true;
}

const args = parseArgs(process.argv.slice(2));
(args.command === 'check' ? check(args) : template(args))
  .then((ok) => { if (!ok) process.exitCode = 1; })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
