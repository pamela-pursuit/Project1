// Credential store for E2E tests and agent tooling.
//
// Reads accounts per application and role from ONE of these sources
// (first match wins):
//   1. CREDENTIALS_JSON   environment variable holding the JSON document (CI)
//   2. CREDENTIALS_FILE   environment variable pointing to a .json or .xlsx file
//   3. credentials/credentials.json   (git-ignored)
//   4. credentials/credentials.xlsx   (git-ignored)
//
// Individual fields can be overridden with E2E_<APP>_<ROLE>_<FIELD>, for
// example E2E_DEMO_WEB_SHOP_EXISTING_USER_PASSWORD.
//
// Values support {timestamp} and {random} placeholders, resolved on every
// getAccount() call, so registration tests get unique data.
//
// Formats: see templates/credentials.example.json and .xlsx.
// Never log returned values. Use describeStore() / mask() for output.

'use strict';

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const DEFAULT_FILES = ['credentials/credentials.json', 'credentials/credentials.xlsx'];
const SECRET_FIELD = /pass|secret|token|key|pin|otp|answer/i;

let cache;

function toKey(header) {
  const trimmed = String(header).trim();
  // Already a single identifier (email, firstName): keep its casing, lower the first letter.
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(trimmed) && !/^[A-Z0-9]+$/.test(trimmed)) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }
  const words = String(header).trim().replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

function toEnvPart(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value) return cellText(value.text); // hyperlink cells (emails)
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('result' in value) return cellText(value.result); // formula cells
    if (value instanceof Date) return value.toISOString();
  }
  return String(value).trim();
}

function normalizeJson(doc, source) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error(`${source}: expected an object of { "<app>": { "<role>": { "<field>": "<value>" } } }`);
  }
  const apps = {};
  for (const [app, roles] of Object.entries(doc)) {
    if (app.startsWith('_')) continue; // _comment, _readme
    if (!roles || typeof roles !== 'object') throw new Error(`${source}: "${app}" must map roles to accounts`);
    apps[app] = {};
    for (const [role, fields] of Object.entries(roles)) {
      if (role.startsWith('_')) continue;
      if (!fields || typeof fields !== 'object') throw new Error(`${source}: "${app}.${role}" must be an object of fields`);
      apps[app][role] = {};
      for (const [field, value] of Object.entries(fields)) {
        if (!field.startsWith('_')) apps[app][role][toKey(field)] = cellText(value);
      }
    }
  }
  return apps;
}

async function readWorkbook(file) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet('Credentials') ?? wb.worksheets[0];
  if (!ws) throw new Error(`${file}: workbook has no worksheets`);

  const header = ws.getRow(1).values.slice(1).map(cellText);
  const appCol = header.findIndex((h) => /^app(lication)?$/i.test(h));
  const roleCol = header.findIndex((h) => /^(role|account|user ?type)$/i.test(h));
  if (appCol < 0 || roleCol < 0) {
    throw new Error(`${file} (${ws.name}): row 1 needs "App" and "Role" columns followed by field columns`);
  }

  const apps = {};
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const values = row.values.slice(1).map(cellText);
    const app = values[appCol];
    const role = values[roleCol];
    if (!app || app.startsWith('#')) return; // blank or commented-out row
    if (!role) throw new Error(`${file} row ${n}: missing Role for app "${app}"`);
    apps[app] ??= {};
    if (apps[app][role]) throw new Error(`${file} row ${n}: duplicate role "${role}" for app "${app}"`);
    const fields = {};
    header.forEach((h, i) => {
      if (i === appCol || i === roleCol || !h || /^notes?$/i.test(h)) return;
      if (values[i] !== undefined && values[i] !== '') fields[toKey(h)] = values[i];
    });
    apps[app][role] = fields;
  });
  return apps;
}

function applyEnvOverrides(apps) {
  for (const [app, roles] of Object.entries(apps)) {
    for (const [role, fields] of Object.entries(roles)) {
      for (const field of Object.keys(fields)) {
        const name = `E2E_${toEnvPart(app)}_${toEnvPart(role)}_${toEnvPart(field)}`;
        if (process.env[name]) fields[field] = process.env[name];
      }
    }
  }
  return apps;
}

function resolveSource() {
  if (process.env.CREDENTIALS_JSON) return { kind: 'env', label: 'CREDENTIALS_JSON environment variable' };
  if (process.env.CREDENTIALS_FILE) {
    const file = path.resolve(process.env.CREDENTIALS_FILE);
    if (!existsSync(file)) throw new Error(`CREDENTIALS_FILE points to a missing file: ${file}`);
    return { kind: 'file', file, label: file };
  }
  for (const candidate of DEFAULT_FILES) {
    const file = path.resolve(candidate);
    if (existsSync(file)) return { kind: 'file', file, label: candidate };
  }
  return null;
}

async function loadCredentialStore({ reload = false } = {}) {
  if (cache && !reload) return cache;
  const source = resolveSource();
  if (!source) {
    cache = { source: null, apps: {} };
    return cache;
  }
  let apps;
  if (source.kind === 'env') {
    let doc;
    try {
      doc = JSON.parse(process.env.CREDENTIALS_JSON);
    } catch {
      throw new Error('CREDENTIALS_JSON is not valid JSON');
    }
    apps = normalizeJson(doc, 'CREDENTIALS_JSON');
  } else if (/\.xlsx$/i.test(source.file)) {
    apps = await readWorkbook(source.file);
  } else if (/\.json$/i.test(source.file)) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(source.file, 'utf8'));
    } catch (error) {
      // Report position only; never echo file content.
      throw new Error(`${source.label}: invalid JSON (${String(error.message).replace(/".*"/, '').slice(0, 80)})`);
    }
    apps = normalizeJson(doc, source.label);
  } else {
    throw new Error(`${source.label}: unsupported credentials format (use .json or .xlsx)`);
  }
  cache = { source: source.label, apps: applyEnvOverrides(apps) };
  return cache;
}

let lastTimestamp = 0;

// Strictly increasing within a process so two calls never collide.
function uniqueTimestamp() {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  return String(lastTimestamp);
}

function resolvePlaceholders(value) {
  return value
    .replace(/\{timestamp\}/g, uniqueTimestamp)
    .replace(/\{random\}/g, () => randomBytes(3).toString('hex'));
}

async function getAccount(app, role, { required = [] } = {}) {
  const store = await loadCredentialStore();
  const where = store.source ?? 'no credentials source';
  if (!store.source) {
    throw new Error(
      `No credentials found for ${app}/${role}. Create credentials/credentials.json or .xlsx ` +
        '(templates in templates/), or set CREDENTIALS_FILE.'
    );
  }
  const roles = store.apps[app];
  if (!roles) {
    throw new Error(`${where}: no app "${app}". Apps available: ${Object.keys(store.apps).join(', ') || 'none'}`);
  }
  const fields = roles[role];
  if (!fields) {
    throw new Error(`${where}: app "${app}" has no role "${role}". Roles available: ${Object.keys(roles).join(', ')}`);
  }
  const missing = required.map(toKey).filter((f) => !fields[f]);
  if (missing.length) throw new Error(`${where}: ${app}/${role} is missing required field(s): ${missing.join(', ')}`);

  const account = {};
  for (const [field, value] of Object.entries(fields)) account[field] = resolvePlaceholders(value);
  return account;
}

function mask(field, value) {
  if (!value) return '(empty)';
  if (SECRET_FIELD.test(field)) return `******** (${value.length} chars)`;
  if (/\{(timestamp|random)\}/.test(value)) return value.replace(/^[^@{]*/, (m) => (m ? `${m[0]}***` : ''));
  const at = value.indexOf('@');
  if (at > 0) return `${value[0]}***${value.slice(at)}`;
  return value.length <= 2 ? '**' : `${value.slice(0, 2)}***`;
}

async function describeStore() {
  const store = await loadCredentialStore({ reload: true });
  const rows = [];
  for (const [app, roles] of Object.entries(store.apps)) {
    for (const [role, fields] of Object.entries(roles)) {
      rows.push({
        app,
        role,
        fields: Object.fromEntries(Object.entries(fields).map(([f, v]) => [f, mask(f, v)]))
      });
    }
  }
  return { source: store.source, rows };
}

exports.DEFAULT_FILES = DEFAULT_FILES;
exports.resolveSource = resolveSource;
exports.loadCredentialStore = loadCredentialStore;
exports.getAccount = getAccount;
exports.describeStore = describeStore;
exports.mask = mask;
exports.toKey = toKey;
exports.envOverrideName = (app, role, field) => `E2E_${toEnvPart(app)}_${toEnvPart(role)}_${toEnvPart(field)}`;
