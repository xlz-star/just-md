import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        'src-tauri/',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@tauri-apps/api/core': './test/mocks/tauri-core.ts',
      '@tauri-apps/plugin-dialog': './test/mocks/tauri-dialog.ts',
      '@tauri-apps/plugin-fs': './test/mocks/tauri-fs.ts',
    },
  },
})