import '@testing-library/jest-dom'

// Mock window.ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  observe(target: Element): void {}
  unobserve(target: Element): void {}
  disconnect(): void {}
}

// Mock window.MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback: MutationCallback) {}
  observe(target: Node, options?: MutationObserverInit): void {}
  disconnect(): void {}
  takeRecords(): MutationRecord[] { return [] }
}

// Mock console methods to reduce noise during tests
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

// Setup DOM environment
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock localStorage with proper implementation
const createLocalStorageMock = () => {
  let store: { [key: string]: string } = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    })
  }
}

const localStorageMock = createLocalStorageMock()
global.localStorage = localStorageMock as any

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  // Reset the mock functions while preserving implementation
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})