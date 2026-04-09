import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        minify: false,
        target: 'es2020',
    },
    {
        entry: { 'dictionary/index': 'src/dictionary/index.ts' },
        format: ['esm', 'cjs'],
        dts: { compilerOptions: { outDir: 'dist' } },
        sourcemap: true,
        minify: false,
        target: 'es2020',
        outDir: 'dist',
    },
    {
        entry: { 'react/index': 'src/react/index.ts' },
        format: ['esm', 'cjs'],
        dts: { compilerOptions: { outDir: 'dist' } },
        sourcemap: true,
        minify: false,
        target: 'es2020',
        outDir: 'dist',
    },
]);
