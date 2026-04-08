import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const BENCHMARK_DIR = join(import.meta.dirname, '..', 'benchmark', 'data');
const DATA_URL =
    'https://raw.githubusercontent.com/phylypo/segmentation-crf-khmer/master/data/kh_data_10000.zip';

async function main() {
    mkdirSync(BENCHMARK_DIR, { recursive: true });

    const zipPath = join(BENCHMARK_DIR, 'kh_data_10000.zip');
    const txtPath = join(BENCHMARK_DIR, 'kh_data_10000.txt');

    if (existsSync(txtPath)) {
        console.log(`Benchmark data already exists at ${txtPath}`);
        return;
    }

    console.log('Downloading benchmark data...');
    const res = await fetch(DATA_URL);
    if (!res.ok) {
        throw new Error(`Failed to download: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(zipPath, buffer);
    console.log(`Downloaded to ${zipPath}`);

    console.log('Extracting...');
    execSync(`unzip -o "${zipPath}" -d "${BENCHMARK_DIR}"`, {
        stdio: 'inherit',
    });

    const files = ['kh_data_10000.txt', 'kh_data_10000b.txt'];
    for (const f of files) {
        const p = join(BENCHMARK_DIR, f);
        if (existsSync(p)) {
            console.log(`Extracted: ${p}`);
        }
    }

    console.log('Done!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
