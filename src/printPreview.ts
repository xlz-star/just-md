import { getCurrentMarkdownContent, getCurrentFileName } from './editor'
import { invoke } from '@tauri-apps/api/core'

export function initPrintPreview(): void {
  // Add keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault()
      showPrintPreview()
    }
  })
}

export async function showPrintPreview(): Promise<void> {
  const markdown = getCurrentMarkdownContent()
  if (!markdown) {
    console.error('No content to print')
    return
  }

  // Convert markdown to HTML
  const html = await invoke<string>('render_markdown_to_html', { markdown })
  
  // Get current filename
  const filename = getCurrentFileName() || 'document.md'
  
  // Create print preview window
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('请允许弹出窗口以显示打印预览')
    return
  }

  // Write print-optimized HTML
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>打印预览 - ${filename}</title>
  <style>
    /* Print styles */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      pre {
        page-break-inside: avoid;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      img {
        page-break-inside: avoid;
        max-width: 100% !important;
      }
      table {
        page-break-inside: avoid;
      }
    }
    
    /* Screen styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    
    /* Header */
    .print-header {
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .print-title {
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    
    .print-meta {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
    }
    
    /* Content styles */
    h1 { font-size: 2em; margin: 0.67em 0; }
    h2 { font-size: 1.5em; margin: 0.83em 0; }
    h3 { font-size: 1.17em; margin: 1em 0; }
    h4 { font-size: 1em; margin: 1.33em 0; }
    h5 { font-size: 0.83em; margin: 1.67em 0; }
    h6 { font-size: 0.67em; margin: 2.33em 0; }
    
    p { margin: 1em 0; }
    
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
      border: 1px solid #ddd;
    }
    
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }
    
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
      font-style: italic;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
    
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
    }
    
    a {
      color: #0969da;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Lists */
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    
    li {
      margin: 0.5em 0;
    }
    
    /* Task lists */
    input[type="checkbox"] {
      margin-right: 0.5em;
    }
    
    /* Math */
    .math-inline, .math-block {
      font-family: 'KaTeX_Math', 'Times New Roman', serif;
    }
    
    .math-block {
      text-align: center;
      margin: 1em 0;
    }
    
    /* Print controls */
    .print-controls {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      background: white;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .print-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .print-btn:hover {
      background: #f0f0f0;
    }
    
    .print-btn.primary {
      background: #0969da;
      color: white;
      border-color: #0969da;
    }
    
    .print-btn.primary:hover {
      background: #0860ca;
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
</head>
<body>
  <div class="print-controls no-print">
    <button class="print-btn" onclick="window.close()">关闭</button>
    <button class="print-btn primary" onclick="window.print()">打印</button>
  </div>
  
  <div class="print-header">
    <h1 class="print-title">${filename}</h1>
    <div class="print-meta">
      打印日期：${new Date().toLocaleDateString('zh-CN')}
    </div>
  </div>
  
  <div class="print-content">
    ${html}
  </div>
</body>
</html>
  `)

  printWindow.document.close()
}