import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRecipeContent, extractRecipeContent, extractRecipeWithAI, extractRecipeWithFallback } from './recipe-extractor'
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
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      })

      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      const content = await fetchRecipeContent('https://example.com/recipe', log)
      expect(content).toBe(mockHtml)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/recipe', expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Mozilla')
        })
      }))
    })

    it('throws error when fetch fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      await expect(fetchRecipeContent('https://example.com/recipe', log))
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
      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      const content = extractRecipeContent(html, log)
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
      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      const content = extractRecipeContent(html, log)
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
      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      const content = extractRecipeContent(html, log)
      expect(content).toBe('Recipe Content')
      expect(content).not.toContain('JavaScript code')
      expect(content).not.toContain('Advertisement')
    })
  })

  describe('extractRecipeWithAI', () => {
    const mockRecipe: Recipe = {
      title: 'Test Recipe',
      subcomponents: [{
        name: 'Main',
        ingredients: [
          { quantity: '1', ingredient: 'Test Ingredient' }
        ]
      }],
      steps: [{
        instruction: 'Test Step',
        ingredients: [],
        time: { duration: '10 minutes', action: 'cook' }
      }],
      sourceUrl: null
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

      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      const result = await extractRecipeWithAI('Test recipe content', log)
      expect(result).toEqual(mockRecipe)
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

      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      await expect(extractRecipeWithAI('Test recipe content', log))
        .rejects
        .toThrow('No content received from OpenAI')
    })

    it('throws error when OpenAI call fails', async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error('API Error'))

      const log = { url: 'test', startTime: performance.now(), steps: [], status: 'success' as const }
      await expect(extractRecipeWithAI('Test recipe content', log))
        .rejects
        .toThrow('Failed to extract recipe information')
    })
  })

  describe('extractRecipeWithFallback', () => {
    it('uses Python service when available', async () => {
      // Mock successful fetch for HTML content
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>Recipe HTML</body></html>')
      })
      
      // Mock Python service health check (will fail, triggering fallback)
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Service unavailable'))
      
      // Mock AI extraction as fallback
      const mockRecipe: Recipe = {
        title: 'Fallback Recipe',
        subcomponents: [{ name: 'Main', ingredients: [] }],
        steps: [],
        sourceUrl: 'https://example.com/recipe'
      }
      
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{
          message: { content: JSON.stringify(mockRecipe) }
        }]
      })

      const result = await extractRecipeWithFallback('https://example.com/recipe')
      
      expect(result.recipe.title).toBe('Fallback Recipe')
      expect(result.log.status).toBe('success')
      expect(result.log.steps.length).toBeGreaterThan(0)
    })
  })

  describe('Python Service Enhancement', () => {
    it('enhances Python service results with AI ingredient mapping', async () => {
      // Mock environment to enable AI enhancement
      process.env.PYTHON_AI_ENHANCEMENT = 'true'
      
      // Mock successful fetch for HTML content
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>Recipe HTML</body></html>')
      })
      
      // Mock Python service health check success
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true
      })
      
      // Mock Python service extraction success
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          recipe: {
            title: 'Enhanced Python Recipe',
            ingredients: ['1 cup flour', '2 eggs', '1/2 tsp salt'],
            instructions: ['Mix dry ingredients', 'Add eggs and mix', 'Cook until done'],
            prep_time: 10,
            cook_time: 20
          }
        })
      })
      
      // Mock AI enhancement response
      const enhancedRecipe: Recipe = {
        title: 'Enhanced Python Recipe',
        subcomponents: [{
          name: 'Main Ingredients',
          ingredients: [
            { quantity: '1 cup', ingredient: 'flour' },
            { quantity: '2', ingredient: 'eggs' },
            { quantity: '1/2 tsp', ingredient: 'salt' }
          ]
        }],
        steps: [
          {
            instruction: 'Mix dry ingredients',
            ingredients: [
              { quantity: '1 cup', ingredient: 'flour' },
              { quantity: '1/2 tsp', ingredient: 'salt' }
            ],
            time: null
          },
          {
            instruction: 'Add eggs and mix',
            ingredients: [
              { quantity: '2', ingredient: 'eggs' }
            ],
            time: null
          },
          {
            instruction: 'Cook until done',
            ingredients: [],
            time: { duration: '20 minutes', action: 'cook' }
          }
        ],
        sourceUrl: 'https://example.com/recipe'
      }
      
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{
          message: { content: JSON.stringify(enhancedRecipe) }
        }]
      })

      const result = await extractRecipeWithFallback('https://example.com/recipe')
      
      expect(result.recipe.title).toBe('Enhanced Python Recipe')
      expect(result.recipe.steps).toHaveLength(3)
      
      // Verify ingredients are mapped to specific steps
      expect(result.recipe.steps[0].ingredients).toHaveLength(2) // flour and salt for mixing
      expect(result.recipe.steps[1].ingredients).toHaveLength(1) // eggs for adding
      expect(result.recipe.steps[2].ingredients).toHaveLength(0) // no specific ingredients for cooking
      
      // Verify enhancement was logged
      const enhancementStep = result.log.steps.find(step => 
        step.name === 'AI Enhancement (Python + OpenAI)'
      )
      expect(enhancementStep).toBeDefined()
      expect(result.log.status).toBe('success')
    })

    it('falls back to basic conversion when AI enhancement fails', async () => {
      // Mock environment to enable AI enhancement
      process.env.PYTHON_AI_ENHANCEMENT = 'true'
      
      // Mock successful fetch for HTML content
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>Recipe HTML</body></html>')
      })
      
      // Mock Python service health check success
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true
      })
      
      // Mock Python service extraction success
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          recipe: {
            title: 'Basic Converted Recipe',
            ingredients: ['1 cup flour', '2 eggs'],
            instructions: ['Mix ingredients', 'Cook until done']
          }
        })
      })
      
      // Mock AI enhancement failure
      mockCreateCompletion.mockRejectedValueOnce(new Error('AI Enhancement failed'))

      const result = await extractRecipeWithFallback('https://example.com/recipe')
      
      expect(result.recipe.title).toBe('Basic Converted Recipe')
      expect(result.recipe.steps).toHaveLength(2)
      
      // Verify it fell back to basic conversion (no ingredient mapping)
      expect(result.recipe.steps[0].ingredients).toHaveLength(0)
      expect(result.recipe.steps[1].ingredients).toHaveLength(0)
      
      // Verify enhancement failure was logged
      const enhancementStep = result.log.steps.find(step => 
        step.name === 'AI Enhancement (Python + OpenAI)'
      )
      expect(enhancementStep).toBeDefined()
      expect(enhancementStep?.error).toContain('Enhancement failed')
      expect(result.log.status).toBe('success')
    })
  })
}) 