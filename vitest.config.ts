import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const tauriCoreMock = fileURLToPath(new URL('./test/mocks/tauri-core.ts', import.meta.url))
const tauriDialogMock = fileURLToPath(new URL('./test/mocks/tauri-dialog.ts', import.meta.url))
const tauriFsMock = fileURLToPath(new URL('./test/mocks/tauri-fs.ts', import.meta.url))

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
      '@tauri-apps/api/core': tauriCoreMock,
      '@tauri-apps/plugin-dialog': tauriDialogMock,
      '@tauri-apps/plugin-fs': tauriFsMock,
    },
  },
})