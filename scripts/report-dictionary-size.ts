import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { gzipSync } from 'zlib';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { performance } from 'perf_hooks';

const ROOT = join(import.meta.dirname, '..');
const RESULTS_DIR = join(ROOT, 'docs');
const DIST_DICTIONARY_ESM = join(ROOT, 'dist', 'dictionary', 'index.js');
const DIST_DICTIONARY_CJS = join(ROOT, 'dist', 'dictionary', 'index.cjs');

interface SizeRow {
    file: string;
    rawBytes: number;
    gzipBytes: number;
}

async function measureFile(path: string): Promise<SizeRow | null> {
    if (!existsSync(path)) return null;
    const bytes = await readFile(path);
    return {
        file: path.replace(`${ROOT}/`, ''),
        rawBytes: statSync(path).size,
        gzipBytes: gzipSync(bytes).length,
    };
}

async function measureImportMs(): Promise<number | null> {
    if (!existsSync(DIST_DICTIONARY_ESM)) return null;
    const cacheBuster = `?t=${Date.now()}`;
    const start = performance.now();
    await import(
        `${pathToFileURL(resolve(DIST_DICTIONARY_ESM)).href}${cacheBuster}`
    );
    return performance.now() - start;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
}

function formatReport(rows: SizeRow[], importMs: number | null): string {
    const lines: string[] = [];
    lines.push('# Dictionary Size Report');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(
        'Run `npm run build` before this report so `dist/dictionary` exists.'
    );
    lines.push('');
    lines.push('| File | Raw | Gzip |');
    lines.push('| ---- | ---: | ---: |');
    for (const row of rows) {
        lines.push(
            `| ${row.file} | ${formatBytes(row.rawBytes)} | ${formatBytes(row.gzipBytes)} |`
        );
    }
    if (rows.length === 0) {
        lines.push('| dist/dictionary outputs missing | n/a | n/a |');
    }
    lines.push('');
    lines.push('## Load-Time Probe');
    lines.push('');
    lines.push(
        importMs === null
            ? '- ESM import time: n/a; build output missing.'
            : `- ESM import time: ${importMs.toFixed(2)}ms`
    );
    lines.push('');
    lines.push('## Compression Gate');
    lines.push('');
    lines.push(
        'Implement a compact internal dictionary format only if a prototype can reduce gzip size by at least 40% while preserving the public dictionary API.'
    );
    return lines.join('\n');
}

async function main(): Promise<void> {
    const rows = (
        await Promise.all([
            measureFile(DIST_DICTIONARY_ESM),
            measureFile(DIST_DICTIONARY_CJS),
        ])
    ).filter(row => row !== null);
    const importMs = await measureImportMs();
    const report = formatReport(rows, importMs);
    const reportPath = join(RESULTS_DIR, 'dictionary-size-report.md');

    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`Dictionary size report written to ${reportPath}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
