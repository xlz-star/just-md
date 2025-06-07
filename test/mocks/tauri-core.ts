export const invoke = vi.fn()

// Mock specific Tauri functions
invoke.mockImplementation((command: string, args?: any) => {
  switch (command) {
    case 'render_markdown_to_html':
      return Promise.resolve(`<p>${args?.markdown || ''}</p>`)
    case 'write_file':
      return Promise.resolve()
    case 'read_file':
      return Promise.resolve('mock file content')
    default:
      return Promise.resolve('mock result')
  }
})