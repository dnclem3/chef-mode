import { JSDOM } from 'jsdom'
import OpenAI from 'openai'
import { OPENAI_API_KEY, RECIPE_SYSTEM_PROMPT } from './config'
import type { Recipe, Step, Subcomponent } from './recipeParser'

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

interface ExtractionLog {
  url?: string
  startTime: number
  steps: {
    name: string
    startTime: number
    endTime: number
    duration: number
    inputChars?: number
    outputChars?: number
    error?: string
  }[]
  endTime?: number
  totalDuration?: number
  status: 'success' | 'error'
  error?: string
  recipe?: Recipe
}

export async function fetchRecipeContent(url: string, log: ExtractionLog): Promise<string> {
  const stepStartTime = performance.now()
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch recipe page: ${response.status} ${response.statusText}`)
    }
    const content = await response.text()
    const stepEndTime = performance.now()
    
    log.steps.push({
      name: 'URL Fetch',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      outputChars: content.length
    })
    
    return content
  } catch (error) {
    const stepEndTime = performance.now()
    log.steps.push({
      name: 'URL Fetch',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    console.error('Error fetching recipe content:', error)
    throw new Error('Failed to fetch recipe content')
  }
}

export function extractRecipeContent(html: string, log: ExtractionLog): string {
  const stepStartTime = performance.now()
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.nav',
      '.header',
      '.footer',
      '.sidebar',
      '.advertisement',
      '.ads',
      '.social-share',
      '.comments',
      '#comments',
      '.related-posts',
      '.navigation',
      'iframe',
      'noscript'
    ]
    
    unwantedSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove())
    })

    // Try to find the main recipe content first
    const recipeSelectors = [
      '[itemtype*="Recipe"]',
      '.recipe-content',
      '.recipe',
      '.post-content',
      '.entry-content',
      'article',
      'main'
    ]

    // Try to find specific recipe container
    for (const selector of recipeSelectors) {
      const element = document.querySelector(selector)
      const text = element?.textContent || ''
      const trimmed = text.trim()
      if (trimmed) {
        const stepEndTime = performance.now()
        log.steps.push({
          name: 'HTML Extraction',
          startTime: stepStartTime,
          endTime: stepEndTime,
          duration: stepEndTime - stepStartTime,
          inputChars: html.length,
          outputChars: trimmed.length
        })
        return trimmed
      }
    }

    // Fallback to body content if no recipe container found
    const bodyText = document.body?.textContent || ''
    const trimmed = bodyText.trim()
    const stepEndTime = performance.now()
    log.steps.push({
      name: 'HTML Extraction (Fallback)',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      inputChars: html.length,
      outputChars: trimmed.length
    })
    return trimmed
  } catch (error) {
    const stepEndTime = performance.now()
    log.steps.push({
      name: 'HTML Extraction',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      inputChars: html.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

export async function extractRecipeWithAI(content: string, log: ExtractionLog): Promise<Recipe> {
  const stepStartTime = performance.now()
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: RECIPE_SYSTEM_PROMPT
        },
        { 
          role: "user", 
          content: "Extract recipe information from this content and return it as a JSON object:\n\n" + content
        }
      ]
    })

    const responseContent = completion.choices[0].message.content
    if (!responseContent) {
      throw new Error('No content received from OpenAI')
    }

    const parsedRecipe = JSON.parse(responseContent) as Recipe
    
    // Validate recipe structure
    if (!parsedRecipe.title) {
      throw new Error('Recipe must have a title')
    }

    if (!Array.isArray(parsedRecipe.subcomponents)) {
      throw new Error('Recipe must have subcomponents array')
    }

    if (!Array.isArray(parsedRecipe.steps)) {
      throw new Error('Recipe must have steps array')
    }

    // Ensure all subcomponents have required fields
    parsedRecipe.subcomponents = parsedRecipe.subcomponents.map((subcomponent: Subcomponent) => {
      if (!subcomponent.name) {
        throw new Error('Each subcomponent must have a name')
      }
      if (!Array.isArray(subcomponent.ingredients)) {
        throw new Error(`Subcomponent "${subcomponent.name}" must have ingredients array`)
      }
      return subcomponent
    })

    // Ensure all steps have required fields and normalize time
    parsedRecipe.steps = parsedRecipe.steps.map((step: Step) => {
      if (!step.instruction) {
        throw new Error('Each step must have an instruction')
      }
      if (!Array.isArray(step.ingredients)) {
        step.ingredients = []
      }
      // Ensure time is null if not specified
      if (step.time && (!step.time.duration || !step.time.action)) {
        step.time = null
      }
      return step
    })

    const stepEndTime = performance.now()
    log.steps.push({
      name: 'OpenAI Extraction',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      inputChars: content.length,
      outputChars: responseContent.length
    })

    return parsedRecipe
  } catch (error) {
    const stepEndTime = performance.now()
    log.steps.push({
      name: 'OpenAI Extraction',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      inputChars: content.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    console.error('Error extracting recipe with AI:', error)
    throw new Error('Failed to extract recipe information')
  }
}

export function createExtractionLog(url?: string): ExtractionLog {
  return {
    url,
    startTime: performance.now(),
    steps: [],
    status: 'success'
  }
} 