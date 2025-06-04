interface Theme {
  id: string
  name: string
  isDark: boolean
  colors: {
    background: string
    surface: string
    primary: string
    secondary: string
    text: string
    textSecondary: string
    border: string
    accent: string
  }
  editor: {
    background: string
    text: string
    selection: string
    cursor: string
    lineHeight: string
    fontSize: string
    fontFamily: string
  }
}

const themes: Theme[] = [
  {
    id: 'default-light',
    name: '默认浅色',
    isDark: false,
    colors: {
      background: '#f8f9fa',
      surface: '#ffffff',
      primary: '#1971c2',
      secondary: '#228be6',
      text: '#333333',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      accent: '#1864ab'
    },
    editor: {
      background: '#ffffff',
      text: '#333333',
      selection: 'rgba(25, 113, 194, 0.15)',
      cursor: '#1971c2',
      lineHeight: '1.6',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  },
  {
    id: 'default-dark',
    name: '默认深色',
    isDark: true,
    colors: {
      background: '#1a1a1a',
      surface: '#2d2d2d',
      primary: '#74c0fc',
      secondary: '#a5d8ff',
      text: '#e0e0e0',
      textSecondary: '#adb5bd',
      border: '#444444',
      accent: '#339af0'
    },
    editor: {
      background: '#2d2d2d',
      text: '#e0e0e0',
      selection: 'rgba(116, 192, 252, 0.2)',
      cursor: '#74c0fc',
      lineHeight: '1.6',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  },
  {
    id: 'github-light',
    name: 'GitHub浅色',
    isDark: false,
    colors: {
      background: '#ffffff',
      surface: '#f6f8fa',
      primary: '#0969da',
      secondary: '#0860ca',
      text: '#1f2328',
      textSecondary: '#656d76',
      border: '#d0d7de',
      accent: '#0550ae'
    },
    editor: {
      background: '#ffffff',
      text: '#1f2328',
      selection: 'rgba(9, 105, 218, 0.15)',
      cursor: '#0969da',
      lineHeight: '1.5',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    isDark: true,
    colors: {
      background: '#282a36',
      surface: '#44475a',
      primary: '#bd93f9',
      secondary: '#ff79c6',
      text: '#f8f8f2',
      textSecondary: '#6272a4',
      border: '#44475a',
      accent: '#8be9fd'
    },
    editor: {
      background: '#282a36',
      text: '#f8f8f2',
      selection: 'rgba(189, 147, 249, 0.2)',
      cursor: '#50fa7b',
      lineHeight: '1.6',
      fontSize: '16px',
      fontFamily: '"Fira Code", "JetBrains Mono", monospace'
    }
  },
  {
    id: 'solarized-light',
    name: 'Solarized浅色',
    isDark: false,
    colors: {
      background: '#fdf6e3',
      surface: '#eee8d5',
      primary: '#268bd2',
      secondary: '#2aa198',
      text: '#657b83',
      textSecondary: '#93a1a1',
      border: '#eee8d5',
      accent: '#d33682'
    },
    editor: {
      background: '#fdf6e3',
      text: '#657b83',
      selection: 'rgba(38, 139, 210, 0.15)',
      cursor: '#268bd2',
      lineHeight: '1.6',
      fontSize: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }
]

let currentTheme = themes[0]

export function initThemes(): void {
  // Load saved theme
  const savedThemeId = localStorage.getItem('themeId')
  if (savedThemeId) {
    const theme = themes.find(t => t.id === savedThemeId)
    if (theme) {
      applyTheme(theme)
    }
  }
}

export function getThemes(): Theme[] {
  return themes
}

export function getCurrentTheme(): string {
  // Return simplified theme name for settings
  if (currentTheme.id.includes('dark')) return 'dark'
  if (currentTheme.id.includes('sepia')) return 'sepia'
  return 'light'
}

export function switchTheme(themeName: string): void {
  let theme: Theme | undefined
  switch (themeName) {
    case 'dark':
      theme = themes.find(t => t.id === 'default-dark')
      break
    case 'sepia':
      theme = themes.find(t => t.id === 'default-sepia')
      break
    default:
      theme = themes.find(t => t.id === 'default-light')
  }
  
  if (theme) {
    applyTheme(theme)
  }
}

export function applyTheme(theme: Theme): void {
  currentTheme = theme
  localStorage.setItem('themeId', theme.id)
  
  // Apply CSS variables
  const root = document.documentElement
  
  // Colors
  root.style.setProperty('--color-background', theme.colors.background)
  root.style.setProperty('--color-surface', theme.colors.surface)
  root.style.setProperty('--color-primary', theme.colors.primary)
  root.style.setProperty('--color-secondary', theme.colors.secondary)
  root.style.setProperty('--color-text', theme.colors.text)
  root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
  root.style.setProperty('--color-border', theme.colors.border)
  root.style.setProperty('--color-accent', theme.colors.accent)
  
  // Editor
  root.style.setProperty('--editor-background', theme.editor.background)
  root.style.setProperty('--editor-text', theme.editor.text)
  root.style.setProperty('--editor-selection', theme.editor.selection)
  root.style.setProperty('--editor-cursor', theme.editor.cursor)
  root.style.setProperty('--editor-line-height', theme.editor.lineHeight)
  root.style.setProperty('--editor-font-size', theme.editor.fontSize)
  root.style.setProperty('--editor-font-family', theme.editor.fontFamily)
  
  // Update body class
  if (theme.isDark) {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
  
  // Update theme toggle icon
  updateThemeIcon(theme.isDark)
}

function updateThemeIcon(isDark: boolean): void {
  const themeToggleBtn = document.getElementById('theme-toggle-btn')
  const icon = themeToggleBtn?.querySelector('i')
  
  if (icon) {
    if (isDark) {
      icon.className = 'ri-sun-line'
    } else {
      icon.className = 'ri-moon-line'
    }
  }
}

export function showThemeSelector(): void {
  const modal = document.createElement('div')
  modal.className = 'theme-modal'
  modal.innerHTML = `
    <div class="theme-modal-content">
      <div class="theme-modal-header">
        <h3>选择主题</h3>
        <button class="theme-modal-close"><i class="ri-close-line"></i></button>
      </div>
      <div class="theme-modal-body">
        <div class="theme-grid">
          ${themes.map(theme => `
            <div class="theme-item ${theme.id === currentTheme.id ? 'active' : ''}" data-theme-id="${theme.id}">
              <div class="theme-preview" style="background: ${theme.colors.surface}; color: ${theme.colors.text}; border-color: ${theme.colors.border};">
                <div class="theme-preview-header" style="background: ${theme.colors.background}; border-color: ${theme.colors.border};">
                  <span style="color: ${theme.colors.primary};">标题</span>
                </div>
                <div class="theme-preview-content">
                  <p style="color: ${theme.colors.text};">正文内容</p>
                  <p style="color: ${theme.colors.textSecondary};">次要文本</p>
                </div>
              </div>
              <div class="theme-name">${theme.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Event handlers
  const closeBtn = modal.querySelector('.theme-modal-close')
  closeBtn?.addEventListener('click', () => modal.remove())
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
  
  // Theme selection
  modal.querySelectorAll('.theme-item').forEach(item => {
    item.addEventListener('click', () => {
      const themeId = item.getAttribute('data-theme-id')
      const theme = themes.find(t => t.id === themeId)
      if (theme) {
        applyTheme(theme)
        modal.remove()
      }
    })
  })
}