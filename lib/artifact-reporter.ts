// Organizes each run's evidence under artifacts/<suite>/runs/<runId>/:
//
//   screenshots/<browser>/<ID>_<title>_<status>[_retryN]_<n>.png   readable copies
//   summary.md      per-test table: browser, status, duration, screenshot, error
//   (report/, test-results/, results.json are written by Playwright itself)
//
// It also writes artifacts/<suite>/latest.json (pointer to the newest run)
// and keeps only the newest E2E_KEEP_RUNS runs (default 20).

import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface Options {
  runDirectory: string;
  suiteDirectory: string;
  runId: string;
}

interface Row {
  id: string;
  title: string;
  browser: string;
  status: string;
  durationMs: number;
  retry: number;
  screenshots: string[];
  error: string;
}

const ID_PATTERN = /\[([A-Z][A-Z0-9]*-\d{3,})\]/;

function slug(text: string, max = 60): string {
  return text
    .replace(ID_PATTERN, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
    .toLowerCase();
}

function relative(from: string, to: string): string {
  return path.relative(from, to).replaceAll('\\', '/');
}

export default class ArtifactReporter implements Reporter {
  private readonly rows: Row[] = [];
  private readonly used = new Set<string>();
  private startedAt = new Date();

  constructor(private readonly options: Options) {}

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startedAt = new Date();
    mkdirSync(this.options.runDirectory, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const browser = test.parent.project()?.name ?? 'default';
    const id = test.title.match(ID_PATTERN)?.[1] ?? '';
    const base = [id, slug(test.title) || 'test', result.status, result.retry ? `retry${result.retry}` : '']
      .filter(Boolean)
      .join('_');
    const folder = path.join(this.options.runDirectory, 'screenshots', browser);

    const screenshots: string[] = [];
    for (const attachment of result.attachments) {
      if (!attachment.contentType.startsWith('image/') || !attachment.path || !existsSync(attachment.path)) continue;
      mkdirSync(folder, { recursive: true });
      const extension = path.extname(attachment.path) || '.png';
      let n = 1;
      let target = path.join(folder, `${base}_${n}${extension}`);
      while (this.used.has(target)) target = path.join(folder, `${base}_${++n}${extension}`);
      this.used.add(target);
      copyFileSync(attachment.path, target);
      screenshots.push(target);
    }

    this.rows.push({
      id,
      title: test.title,
      browser,
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      screenshots,
      error: (result.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0].slice(0, 200)
    });
  }

  onEnd(result: FullResult): void {
    const { runDirectory, suiteDirectory, runId } = this.options;
    mkdirSync(runDirectory, { recursive: true });

    const counts = (browser: string, status: string) =>
      this.rows.filter((r) => r.browser === browser && r.status === status).length;
    const browsers = [...new Set(this.rows.map((r) => r.browser))];
    const cell = (text: string) => text.replaceAll('|', '\\|');

    const lines = [
      `# Test run ${runId}`,
      '',
      `- Suite: \`${path.basename(suiteDirectory)}\``,
      `- Base URL: ${process.env.BASE_URL ?? '(not set)'}`,
      `- Started: ${this.startedAt.toISOString()}`,
      `- Overall status: **${result.status}**`,
      `- HTML report: [report/index.html](report/index.html)`,
      '',
      '| Browser | Passed | Failed | Timed out | Skipped |',
      '| --- | --- | --- | --- | --- |',
      ...browsers.map(
        (b) => `| ${b} | ${counts(b, 'passed')} | ${counts(b, 'failed')} | ${counts(b, 'timedOut')} | ${counts(b, 'skipped')} |`
      ),
      '',
      '| ID | Test | Browser | Status | Duration (s) | Screenshot | Error |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...this.rows.map((r) => {
        const shots = r.screenshots
          .map((s, i) => `[${i + 1}](${encodeURI(relative(runDirectory, s))})`)
          .join(' ');
        const status = r.retry ? `${r.status} (retry ${r.retry})` : r.status;
        return `| ${r.id} | ${cell(r.title)} | ${r.browser} | ${status} | ${(r.durationMs / 1000).toFixed(1)} | ${shots} | ${cell(r.error)} |`;
      }),
      ''
    ];
    writeFileSync(path.join(runDirectory, 'summary.md'), lines.join('\n'));

    writeFileSync(
      path.join(suiteDirectory, 'latest.json'),
      `${JSON.stringify({ runId, runDirectory: runDirectory.replaceAll('\\', '/'), status: result.status, finishedAt: new Date().toISOString() }, null, 2)}\n`
    );

    this.prune();
    console.log(`\nArtifacts saved to ${runDirectory.replaceAll('\\', '/')} (summary.md, screenshots/, report/, test-results/)`);
  }

  private prune(): void {
    const keep = Math.max(1, Number(process.env.E2E_KEEP_RUNS ?? 20) || 20);
    const runsRoot = path.dirname(this.options.runDirectory);
    if (!existsSync(runsRoot)) return;
    const runs = readdirSync(runsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== this.options.runId)
      .map((d) => d.name)
      .sort();
    const excess = runs.length - (keep - 1);
    for (const name of runs.slice(0, Math.max(0, excess))) {
      rmSync(path.join(runsRoot, name), { recursive: true, force: true });
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
