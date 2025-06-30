import { vi } from 'vitest'

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key'

// Mock performance.now()
global.performance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(),
  getEntriesByType: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntries: vi.fn(),
  toJSON: vi.fn()
}

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} 