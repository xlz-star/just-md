import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  // 构建优化配置
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将TipTap相关依赖分离到单独chunk
          'tiptap': ['@tiptap/core', '@tiptap/starter-kit'],
          // 将Tauri API分离
          'tauri': ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-fs'],
          // 将编辑器功能分离
          'editor-features': [
            './src/outline.ts',
            './src/findReplace.ts', 
            './src/wordCount.ts'
          ],
          // 将高级功能分离
          'advanced-features': [
            './src/spellCheck.ts',
            './src/writingStats.ts',
            './src/documentComparison.ts',
            './src/templates.ts'
          ]
        }
      }
    },
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 启用压缩
    minify: 'esbuild',
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 生成source map用于调试
    sourcemap: process.env.NODE_ENV === 'development'
  },
  
  // 性能优化
  optimizeDeps: {
    include: [
      '@tiptap/core',
      '@tiptap/starter-kit',
      '@tauri-apps/api'
    ]
  }
}));
