import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    // Polyfill de metadatos de decoradores (class-transformer / Nest DI).
    setupFiles: ['reflect-metadata', './src/testing/silence-logs.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/generated/**', // cliente Prisma generado
        'src/testing/**', // fixtures de tests
        'src/main.ts', // bootstrap (cubierto por e2e)
        'src/app.setup.ts', // wiring HTTP (cubierto por e2e)
        'src/**/*.module.ts', // declaraciones de DI sin lógica
        'src/**/domain/*.ts', // tipos y contratos abstractos sin lógica
        'src/database/unit-of-work.ts', // contrato abstracto
        'src/storage/image-storage.ts', // contrato abstracto y constantes
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
