import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: [
            ...configDefaults.exclude,
            'src/__tests__/segment-perf.test.ts',
        ],
        globals: true,
    },
});
