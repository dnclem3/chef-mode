import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRecipeContent, extractRecipeContent, extractRecipeWithAI } from './recipe-extractor'
import type { Recipe } from './recipeParser'

// Mock fetch
global.fetch = vi.fn()

// Mock OpenAI
const mockCreateCompletion = vi.fn()
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion
      }
    }
  }))
}))

describe('Recipe Extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateCompletion.mockReset()
  })

  describe('fetchRecipeContent', () => {
    it('successfully fetches recipe content from URL', async () => {
      const mockHtml = '<html><body><div class="recipe">Test Recipe</div></body></html>'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const content = await fetchRecipeContent('https://example.com/recipe')
      expect(content).toBe(mockHtml)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/recipe')
    })

    it('throws error when fetch fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(fetchRecipeContent('https://example.com/recipe'))
        .rejects
        .toThrow('Failed to fetch recipe content')
    })
  })

  describe('extractRecipeContent', () => {
    it('extracts content from recipe-specific container', () => {
      const html = `
        <html>
          <body>
            <div class="recipe">
              Recipe Content
            </div>
            <div class="ads">
              Advertisement
            </div>
          </body>
        </html>
      `
      const content = extractRecipeContent(html)
      expect(content).toBe('Recipe Content')
    })

    it('falls back to body content when no recipe container found', () => {
      const html = `
        <html>
          <body>
            <div>
              Generic Content
            </div>
          </body>
        </html>
      `
      const content = extractRecipeContent(html)
      expect(content).toBe('Generic Content')
    })

    it('removes unwanted elements', () => {
      const html = `
        <html>
          <body>
            <div class="recipe">Recipe Content</div>
            <script>JavaScript code</script>
            <div class="ads">Advertisement</div>
          </body>
        </html>
      `
      const content = extractRecipeContent(html)
      expect(content).toBe('Recipe Content')
      expect(content).not.toContain('JavaScript code')
      expect(content).not.toContain('Advertisement')
    })
  })

  describe('extractRecipeWithAI', () => {
    const mockRecipe: Recipe = {
      title: 'Test Recipe',
      description: 'A test recipe',
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      servings: 4,
      ingredients: [
        { item: 'Test Ingredient', amount: '1', unit: 'cup' }
      ],
      equipment: ['Test Equipment'],
      prep: [{ step: 'Test Prep Step', time: 10 }],
      cook: [{ step: 'Test Cook Step', time: 20 }],
      notes: ['Test Note']
    }

    it('successfully extracts recipe information', async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockRecipe)
            }
          }
        ]
      })

      const result = await extractRecipeWithAI('Test recipe content')
      expect(result).toEqual(mockRecipe)
    })

    it('handles missing time values in cook steps', async () => {
      const recipeWithoutTime = {
        ...mockRecipe,
        cook: [{ step: 'Test Cook Step' }]
      }

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(recipeWithoutTime)
            }
          }
        ]
      })

      const result = await extractRecipeWithAI('Test recipe content')
      expect(result.cook[0].time).toBe(null)
    })

    it('throws error when OpenAI returns no content', async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      })

      await expect(extractRecipeWithAI('Test recipe content'))
        .rejects
        .toThrow('No content received from OpenAI')
    })

    it('throws error when OpenAI call fails', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('API Error'))

      await expect(extractRecipeWithAI('Test recipe content'))
        .rejects
        .toThrow('Failed to extract recipe information')
    })
  })
}) 