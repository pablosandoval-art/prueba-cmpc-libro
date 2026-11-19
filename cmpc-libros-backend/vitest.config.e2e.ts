import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['reflect-metadata'],
    // Los logs de cada petición no aportan en la salida de las pruebas.
    env: { LOG_LEVEL: 'silent' },
    // bcrypt y el arranque de la app completa pueden tardar algunos segundos.
    hookTimeout: 30_000,
  },
});
