import { getCurrentMarkdownContent, getCurrentFileName } from './editor'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

export async function exportToHTML(): Promise<void> {
  try {
    const markdown = getCurrentMarkdownContent()
    if (!markdown) {
      console.error('No content to export')
      return
    }

    // Convert markdown to HTML
    const html = await invoke<string>('render_markdown_to_html', { markdown })
    
    // Get current filename without extension
    const currentName = getCurrentFileName()?.replace(/\.md$/i, '') || 'document'
    
    // Create full HTML document
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
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
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`

    // Show save dialog
    const savePath = await save({
      defaultPath: `${currentName}.html`,
      filters: [{
        name: 'HTML文件',
        extensions: ['html', 'htm']
      }]
    })

    if (savePath) {
      await writeTextFile(savePath, fullHtml)
      console.log('Exported to HTML:', savePath)
    }
  } catch (error) {
    console.error('Failed to export to HTML:', error)
  }
}

export async function exportToPDF(): Promise<void> {
  try {
    const markdown = getCurrentMarkdownContent()
    if (!markdown) {
      console.error('No content to export')
      return
    }

    // Get current filename without extension
    const currentName = getCurrentFileName()?.replace(/\.md$/i, '') || 'document'

    // Show save dialog
    const savePath = await save({
      defaultPath: `${currentName}.pdf`,
      filters: [{
        name: 'PDF文件',
        extensions: ['pdf']
      }]
    })

    if (savePath) {
      try {
        // Call backend to generate PDF
        await invoke('export_to_pdf', { 
          markdown, 
          outputPath: savePath 
        })
        console.log('Exported to PDF:', savePath)
      } catch (err) {
        // Show alternative solution
        alert('PDF导出功能需要安装额外的依赖。\n\n请先导出为HTML，然后使用浏览器的打印功能保存为PDF。')
        // Export to HTML instead
        await exportToHTML()
      }
    }
  } catch (error) {
    console.error('Failed to export to PDF:', error)
  }
}