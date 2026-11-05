#!/usr/bin/env node
// Scenario catalogue tooling for the E2E agent.
//
// test-plans/<app>/scenarios.json is the source of truth. This script:
//   validate  checks the catalogue against the schema and the test files
//   sync      merges the latest run's results.json (artifacts/<app>/latest.json ->
//             runs/<runId>/results.json) with screenshot links
//             into the catalogue's execution history and statuses
//   build     writes test-plans/<app>/<app>-e2e-scenarios.xlsx
//
// Usage: node scripts/workbook.mjs <validate|sync|build|all> --app <name>
// Schema: .claude/skills/e2e-agent/scenario-schema.md

import ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const AUTOMATION = ['Automated', 'Planned', 'Manual', 'Blocked', 'Not Automatable'];
const EXECUTION = ['Not Run', 'Passed', 'Failed', 'Flaky', 'Skipped', 'Partial', 'Blocked'];
const TEST_TYPES = [
  'Positive', 'Negative', 'Validation', 'Boundary', 'Edge Case', 'Authentication', 'Authorization',
  'Session', 'Persistence', 'Navigation', 'Error Handling', 'Accessibility', 'Responsive', 'Cross-Browser'
];
const RISK_TYPES = ['Risk', 'Assumption', 'Ambiguity', 'Blocker', 'Discrepancy', 'Defect'];
const ID_PATTERN = /\[([A-Z][A-Z0-9]*-\d{3,})\]/;
const SECRET_HINT = /password|passwd|secret|token|api[-_]?key|bearer/i;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--app') args.app = rest[++i];
    else throw new Error(`Unknown argument: ${rest[i]}`);
  }
  if (!['validate', 'sync', 'build', 'all'].includes(command) || !args.app) {
    throw new Error('Usage: node scripts/workbook.mjs <validate|sync|build|all> --app <name>');
  }
  return args;
}

const paths = (app) => ({
  catalogue: path.join('test-plans', app, 'scenarios.json'),
  workbook: path.join('test-plans', app, `${app}-e2e-scenarios.xlsx`),
  results: path.join('artifacts', app, 'results.json'),
  tests: path.join('tests', app)
});

async function loadCatalogue(app) {
  const file = paths(app).catalogue;
  if (!existsSync(file)) throw new Error(`Missing ${file}. The Scenario Designer creates it.`);
  const data = JSON.parse(await readFile(file, 'utf8'));
  data.scenarios ??= [];
  data.testData ??= [];
  data.risks ??= [];
  data.executions ??= [];
  return data;
}

async function saveCatalogue(app, data) {
  await writeFile(paths(app).catalogue, `${JSON.stringify(data, null, 2)}\n`);
}

async function collectTestTitles(dir) {
  const found = new Map();
  if (!existsSync(dir)) return found;
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.spec.ts')) continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(new RegExp(ID_PATTERN.source, 'g'))) {
      const list = found.get(match[1]) ?? [];
      list.push(file.replaceAll('\\', '/'));
      found.set(match[1], list);
    }
  }
  return found;
}

async function validate(app, data) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const required = ['id', 'feature', 'journey', 'testType', 'priority', 'steps', 'expected', 'automationStatus', 'requirementRef'];
  for (const s of data.scenarios) {
    const where = s.id ?? '(missing id)';
    for (const key of required) if (s[key] === undefined || s[key] === '' || (Array.isArray(s[key]) && !s[key].length)) errors.push(`${where}: missing ${key}`);
    if (s.id && !/^[A-Z][A-Z0-9]*-\d{3,}$/.test(s.id)) errors.push(`${where}: id must look like ABC-001`);
    if (ids.has(s.id)) errors.push(`${where}: duplicate id`);
    ids.add(s.id);
    if (s.priority && !PRIORITIES.includes(s.priority)) errors.push(`${where}: priority must be one of ${PRIORITIES.join(', ')}`);
    if (s.automationStatus && !AUTOMATION.includes(s.automationStatus)) errors.push(`${where}: automationStatus must be one of ${AUTOMATION.join(', ')}`);
    if (s.executionStatus && !EXECUTION.includes(s.executionStatus)) errors.push(`${where}: executionStatus must be one of ${EXECUTION.join(', ')}`);
    if (s.testType && !TEST_TYPES.includes(s.testType)) warnings.push(`${where}: non-standard testType "${s.testType}"`);
    for (const b of s.browsers ?? []) if (!BROWSERS.includes(b)) errors.push(`${where}: unknown browser ${b}`);
    if (s.priority === 'High' && !['Automated', 'Blocked'].includes(s.automationStatus)) {
      warnings.push(`${where}: High priority must be Automated or explicitly Blocked (is ${s.automationStatus})`);
    }
    if (s.automationStatus === 'Blocked' && !s.failureNotes) errors.push(`${where}: Blocked requires failureNotes explaining the blocker`);
  }
  for (const d of data.testData) {
    if (d.value && SECRET_HINT.test(`${d.key} ${d.notes ?? ''}`)) {
      errors.push(`testData ${d.key}: secret-like data must use source "credentials:<role>.<field>" or "env:VAR" and no literal value`);
    }
  }
  for (const r of data.risks) if (r.type && !RISK_TYPES.includes(r.type)) warnings.push(`risk ${r.id}: non-standard type "${r.type}"`);

  const titles = await collectTestTitles(paths(app).tests);
  for (const s of data.scenarios) {
    const files = titles.get(s.id);
    if (s.automationStatus === 'Automated' && !files) errors.push(`${s.id}: marked Automated but no test title contains [${s.id}] under ${paths(app).tests}`);
    if (files && s.automationStatus !== 'Automated') warnings.push(`${s.id}: test exists (${files[0]}) but automationStatus is ${s.automationStatus}`);
    if (files && files.length > 1) warnings.push(`${s.id}: referenced by ${files.length} tests; confirm this is not duplication`);
  }
  for (const [id, files] of titles) if (!ids.has(id)) errors.push(`${files[0]}: test tag [${id}] has no catalogue scenario`);

  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(`validate: ${data.scenarios.length} scenarios, ${errors.length} errors, ${warnings.length} warnings`);
  return errors.length === 0;
}

function stripAnsi(text) {
  return String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');
}

function flattenSpecs(suite, out = []) {
  for (const spec of suite.specs ?? []) out.push(spec);
  for (const child of suite.suites ?? []) flattenSpecs(child, out);
  return out;
}

const STATUS_MAP = { expected: 'Passed', unexpected: 'Failed', flaky: 'Flaky', skipped: 'Skipped' };

// Newest run: artifacts/<app>/latest.json -> runs/<runId>/results.json (legacy: artifacts/<app>/results.json).
async function resolveResults(app) {
  const pointer = path.join('artifacts', app, 'latest.json');
  if (existsSync(pointer)) {
    const { runDirectory } = JSON.parse(await readFile(pointer, 'utf8'));
    const file = path.join(runDirectory, 'results.json');
    if (existsSync(file)) return file;
  }
  return paths(app).results;
}

const toRepoPath = (p) => (p ? path.relative(process.cwd(), p).replaceAll('\\', '/') : '');

async function sync(app, data) {
  const file = await resolveResults(app);
  if (!existsSync(file)) throw new Error(`Missing ${file}. Run tests with TEST_SUITE=${app} first.`);
  const report = JSON.parse(await readFile(file, 'utf8'));
  const runAt = report.stats?.startTime ?? new Date().toISOString();
  if (data.executions.some((e) => e.runAt === runAt)) {
    console.log(`sync: run ${runAt} already merged`);
    return;
  }
  const rows = [];
  const untagged = [];
  for (const spec of (report.suites ?? []).flatMap((s) => flattenSpecs(s))) {
    const id = spec.title.match(ID_PATTERN)?.[1];
    for (const t of spec.tests ?? []) {
      const last = t.results?.at(-1);
      const row = {
        runAt,
        scenarioId: id ?? null,
        browser: t.projectName,
        status: STATUS_MAP[t.status] ?? t.status,
        attempts: t.results?.length ?? 0,
        durationMs: last?.duration ?? null,
        testTitle: spec.title,
        file: spec.file,
        error: stripAnsi(last?.error?.message ?? '').split('\n').slice(0, 4).join(' ').slice(0, 600),
        screenshot: toRepoPath((last?.attachments ?? []).filter((a) => a.contentType?.startsWith('image/') && a.path).at(-1)?.path),
        runDirectory: toRepoPath(path.dirname(file))
      };
      if (id) rows.push(row);
      else untagged.push(row);
    }
  }
  data.executions.push(...rows);

  const known = new Set(data.scenarios.map((s) => s.id));
  for (const s of data.scenarios) {
    const mine = rows.filter((r) => r.scenarioId === s.id);
    if (!mine.length) continue;
    const statuses = new Set(mine.map((r) => r.status));
    const expected = s.browsers?.length ? s.browsers : BROWSERS;
    const missing = expected.filter((b) => !mine.some((r) => r.browser === b));
    if (statuses.has('Failed')) s.executionStatus = 'Failed';
    else if (statuses.has('Flaky')) s.executionStatus = 'Flaky';
    else if (statuses.size === 1 && statuses.has('Skipped')) s.executionStatus = 'Skipped';
    else if (missing.length || statuses.has('Skipped')) s.executionStatus = 'Partial';
    else s.executionStatus = 'Passed';
    const failures = mine.filter((r) => r.status !== 'Passed').map((r) => `${r.browser}: ${r.status}${r.error ? ` - ${r.error}` : ''}`);
    if (missing.length) failures.push(`not run on: ${missing.join(', ')}`);
    s.lastRun = runAt;
    s.lastRunNotes = failures.join(' | ');
  }
  const orphan = [...new Set(rows.filter((r) => !known.has(r.scenarioId)).map((r) => r.scenarioId))];
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log(`sync: run ${runAt}: ${JSON.stringify(counts)}`);
  if (orphan.length) console.log(`WARN  results for unknown scenario ids: ${orphan.join(', ')}`);
  if (untagged.length) console.log(`WARN  ${untagged.length} results without a [ID] tag in the title were not merged`);
}

// ---------- Excel ----------

const COLORS = {
  header: 'FF1F3864', headerText: 'FFFFFFFF', band: 'FFF2F5FA', border: 'FFD0D7E2',
  High: 'FFF8CBAD', Medium: 'FFFFE699', Low: 'FFE2EFDA',
  Passed: 'FFC6EFCE', Failed: 'FFFFC7CE', Flaky: 'FFFFEB9C', Skipped: 'FFEDEDED', Partial: 'FFFFEB9C', Blocked: 'FFD9D2E9', 'Not Run': 'FFFFFFFF'
};

function styleSheet(ws, widths, { wrap = true } = {}) {
  ws.columns.forEach((col, i) => { col.width = widths[i] ?? 18; });
  const header = ws.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];
  if (ws.rowCount > 1) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  ws.eachRow((row, n) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = ['top', 'left', 'bottom', 'right'].reduce((b, side) => ({ ...b, [side]: { style: 'thin', color: { argb: COLORS.border } } }), {});
      if (n > 1) {
        cell.alignment = { vertical: 'top', wrapText: wrap };
        if (n % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.band } };
      }
    });
  });
}

function tint(cell) {
  const argb = COLORS[cell.value];
  if (argb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function addTable(ws, headers, rows, widths) {
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  styleSheet(ws, widths);
}

async function build(app, data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'E2E automation agent';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const scenarioHeaders = [
    'Scenario ID', 'Feature', 'User Journey', 'Test Type', 'Priority', 'Preconditions', 'Test Data', 'Steps',
    'Expected Result', 'Browser Coverage', 'Automation Status', 'Page Object', 'Risk', 'Requirement Reference',
    'Execution Status', 'Failure Notes', 'Spec File', 'Last Run'
  ];
  const cat = wb.addWorksheet('Scenario Catalogue');
  addTable(cat, scenarioHeaders, data.scenarios.map((s) => [
    s.id, s.feature, s.journey, s.testType, s.priority, s.preconditions ?? '', s.testData ?? '',
    (s.steps ?? []).map((step, i) => `${i + 1}. ${step}`).join('\n'), s.expected,
    (s.browsers?.length ? s.browsers : BROWSERS).join(', '), s.automationStatus, s.pageObject ?? '', s.risk ?? '',
    s.requirementRef ?? '', s.executionStatus ?? 'Not Run',
    [s.failureNotes, s.lastRunNotes].filter(Boolean).join('\n'), s.specFile ?? '', s.lastRun ?? ''
  ]), [12, 18, 30, 14, 10, 28, 28, 48, 40, 22, 16, 24, 28, 22, 14, 40, 28, 22]);
  cat.eachRow((row, n) => { if (n > 1) { tint(row.getCell(5)); tint(row.getCell(15)); } });
  cat.dataValidations?.add?.(`E2:E${Math.max(2, data.scenarios.length + 1)}`, { type: 'list', allowBlank: false, formulae: [`"${PRIORITIES.join(',')}"`] });

  const td = wb.addWorksheet('Test Data');
  addTable(td, ['Key', 'Value', 'Source', 'Used By', 'Notes'], data.testData.map((d) => [
    d.key,
    String(d.source ?? '').startsWith('env:') ? '(from environment)'
      : String(d.source ?? '').startsWith('credentials:') ? '(from credentials file)'
      : d.value ?? '',
    d.source ?? '',
    (d.usedBy ?? []).join(', '), d.notes ?? ''
  ]), [26, 32, 26, 28, 48]);

  // Coverage summary: live COUNTIFS formulas with cached results so it reads correctly in any viewer.
  const cov = wb.addWorksheet('Coverage Summary');
  const n = data.scenarios.length + 1;
  const ref = (col) => `'Scenario Catalogue'!$${col}$2:$${col}$${Math.max(2, n)}`;
  const count = (pred) => data.scenarios.filter(pred).length;
  cov.addRow(['Priority', ...AUTOMATION, 'Total', 'Automated %']);
  PRIORITIES.forEach((p, i) => {
    const r = i + 2;
    const cells = AUTOMATION.map((a, j) => ({
      formula: `COUNTIFS(${ref('E')},"${p}",${ref('K')},"${a}")`,
      result: count((s) => s.priority === p && s.automationStatus === a)
    }));
    const total = count((s) => s.priority === p);
    const lastCol = String.fromCharCode(66 + AUTOMATION.length - 1);
    cov.addRow([
      p, ...cells,
      { formula: `SUM(B${r}:${lastCol}${r})`, result: total },
      { formula: `IF(${String.fromCharCode(66 + AUTOMATION.length)}${r}=0,0,B${r}/${String.fromCharCode(66 + AUTOMATION.length)}${r})`, result: total ? count((s) => s.priority === p && s.automationStatus === 'Automated') / total : 0 }
    ]);
  });
  cov.addRow([]);
  cov.addRow(['Execution Status', 'Scenarios']);
  const execHeaderRow = cov.rowCount;
  for (const e of EXECUTION) cov.addRow([e, { formula: `COUNTIF(${ref('O')},"${e}")`, result: count((s) => (s.executionStatus ?? 'Not Run') === e) }]);
  cov.addRow([]);
  cov.addRow(['Test Type', 'Scenarios']);
  const typeHeaderRow = cov.rowCount;
  for (const t of [...new Set(data.scenarios.map((s) => s.testType))]) cov.addRow([t, { formula: `COUNTIF(${ref('D')},"${t}")`, result: count((s) => s.testType === t) }]);
  cov.addRow([]);
  cov.addRow(['Feature', 'Scenarios', 'High', 'Automated']);
  const featHeaderRow = cov.rowCount;
  for (const f of [...new Set(data.scenarios.map((s) => s.feature))]) {
    cov.addRow([f, count((s) => s.feature === f), count((s) => s.feature === f && s.priority === 'High'), count((s) => s.feature === f && s.automationStatus === 'Automated')]);
  }
  cov.addRow([]);
  cov.addRow(['Latest run by browser', 'Passed', 'Failed', 'Flaky', 'Skipped']);
  const browserHeaderRow = cov.rowCount;
  const latestRun = data.executions.at(-1)?.runAt;
  for (const b of BROWSERS) {
    const rows = data.executions.filter((e) => e.runAt === latestRun && e.browser === b);
    cov.addRow([b, ...['Passed', 'Failed', 'Flaky', 'Skipped'].map((st) => rows.filter((r) => r.status === st).length)]);
  }
  cov.addRow([]);
  const gaps = data.scenarios.filter((s) => s.priority === 'High' && !['Automated', 'Blocked'].includes(s.automationStatus));
  cov.addRow(['High-priority gaps', gaps.length ? gaps.map((s) => `${s.id} (${s.automationStatus})`).join(', ') : 'None']);
  cov.addRow(['Latest run', latestRun ?? 'Not run']);
  styleSheet(cov, [26, 14, 14, 14, 14, 16, 12, 14], { wrap: true });
  for (const r of [execHeaderRow, typeHeaderRow, featHeaderRow, browserHeaderRow]) {
    cov.getRow(r).eachCell((cell) => { cell.font = { bold: true, color: { argb: COLORS.headerText } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } }; });
  }
  for (let r = 2; r <= 4; r += 1) cov.getRow(r).getCell(AUTOMATION.length + 3).numFmt = '0%';

  const ex = wb.addWorksheet('Execution Results');
  const executions = [...data.executions].reverse();
  addTable(ex, ['Run At', 'Scenario ID', 'Browser', 'Status', 'Attempts', 'Duration (s)', 'Test Title', 'Spec File', 'Error', 'Screenshot', 'Run Folder'],
    executions.map((e) => [
      e.runAt, e.scenarioId, e.browser, e.status, e.attempts, e.durationMs == null ? '' : Number((e.durationMs / 1000).toFixed(1)),
      e.testTitle, e.file, e.error ?? '', e.screenshot ?? '', e.runDirectory ?? ''
    ]), [22, 12, 11, 10, 9, 11, 48, 30, 60, 22, 30]);
  // Hyperlinks are relative to the workbook (test-plans/<app>/), so they open from any checkout.
  const workbookDir = path.dirname(paths(app).workbook);
  ex.eachRow((row, i) => {
    if (i === 1) return;
    tint(row.getCell(4));
    const e = executions[i - 2];
    if (e.screenshot) {
      row.getCell(10).value = { text: 'Open screenshot', hyperlink: path.relative(workbookDir, e.screenshot).replaceAll('\\', '/') };
      row.getCell(10).font = { color: { argb: 'FF0563C1' }, underline: true };
    }
    if (e.runDirectory) {
      row.getCell(11).value = { text: e.runDirectory, hyperlink: path.relative(workbookDir, path.join(e.runDirectory, 'summary.md')).replaceAll('\\', '/') };
      row.getCell(11).font = { color: { argb: 'FF0563C1' }, underline: true };
    }
  });

  const risk = wb.addWorksheet('Risks and Assumptions');
  addTable(risk, ['ID', 'Type', 'Description', 'Impact', 'Mitigation / Clarification Needed', 'Related Scenarios', 'Status'],
    data.risks.map((r) => [r.id, r.type, r.description, r.impact ?? '', r.mitigation ?? '', (r.scenarios ?? []).join(', '), r.status ?? 'Open']),
    [10, 14, 50, 12, 44, 20, 12]);

  await wb.xlsx.writeFile(paths(app).workbook);
  console.log(`build: wrote ${paths(app).workbook.replaceAll('\\', '/')} (${data.scenarios.length} scenarios, ${data.executions.length} execution rows)`);
}

async function main() {
  const { command, app } = parseArgs(process.argv.slice(2));
  const data = await loadCatalogue(app);
  let ok = true;
  if (command === 'validate' || command === 'all') ok = await validate(app, data);
  if (command === 'sync' || command === 'all') {
    if (existsSync(await resolveResults(app)) || command === 'sync') {
      await sync(app, data);
      await saveCatalogue(app, data);
    }
  }
  if (command === 'build' || command === 'all') await build(app, data);
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
