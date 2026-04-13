import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const BENCHMARK_DIR = join(import.meta.dirname, '..', 'benchmark', 'data');
const DATA_URL =
    'https://raw.githubusercontent.com/phylypo/segmentation-crf-khmer/master/data/kh_data_10000.zip';
const EXTRACTED_FILES = ['kh_data_10000.txt', 'kh_data_10000b.txt'] as const;

function hasExtractedData(baseDir: string): boolean {
    return EXTRACTED_FILES.some(file => existsSync(join(baseDir, file)));
}

function ensureUnzipInstalled(): void {
    try {
        execSync('unzip -v', { stdio: 'ignore' });
    } catch {
        throw new Error(
            'The "unzip" command is required to extract benchmark data. Install unzip and rerun the script.'
        );
    }
}

async function main() {
    mkdirSync(BENCHMARK_DIR, { recursive: true });

    const zipPath = join(BENCHMARK_DIR, 'kh_data_10000.zip');

    if (hasExtractedData(BENCHMARK_DIR)) {
        console.log(
            `Benchmark data already exists under ${BENCHMARK_DIR}; skipping download.`
        );
        return;
    }

    let hasZip = existsSync(zipPath);

    if (!hasZip) {
        console.log(`Downloading benchmark data from ${DATA_URL}...`);
        try {
            const res = await fetch(DATA_URL);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }
            const buffer = Buffer.from(await res.arrayBuffer());
            writeFileSync(zipPath, buffer);
            hasZip = true;
            console.log(`Downloaded to ${zipPath}`);
        } catch (error) {
            if (existsSync(zipPath)) {
                hasZip = true;
                console.warn(
                    `Download failed (${String(error)}), reusing existing archive at ${zipPath}.`
                );
            } else {
                throw new Error(
                    `Failed to download benchmark corpus from ${DATA_URL}. ${String(error)}`
                );
            }
        }
    }

    if (!hasZip) {
        throw new Error(
            `Benchmark archive is missing at ${zipPath} and could not be downloaded.`
        );
    }

    ensureUnzipInstalled();

    console.log('Extracting benchmark data...');
    execSync(`unzip -o "${zipPath}" -d "${BENCHMARK_DIR}"`, {
        stdio: 'inherit',
    });

    let extractedCount = 0;
    for (const f of EXTRACTED_FILES) {
        const p = join(BENCHMARK_DIR, f);
        if (existsSync(p)) {
            extractedCount++;
            console.log(`Extracted: ${p}`);
        }
    }

    if (extractedCount === 0) {
        throw new Error(
            `Extraction finished but none of the expected files were found (${EXTRACTED_FILES.join(', ')}).`
        );
    }

    console.log('Done!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
