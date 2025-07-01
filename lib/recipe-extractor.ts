import { JSDOM } from 'jsdom'
import OpenAI from 'openai'
import { OPENAI_API_KEY, RECIPE_SYSTEM_PROMPT } from './config'
import type { Recipe, Step, Subcomponent } from './recipeParser'

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

const PYTHON_ENHANCEMENT_PROMPT = `You are a recipe structure parser for Chef Mode, a minimalist cooking assistant. Your job is to turn full recipe content into a structured format that supports a step-by-step cooking experience.

# PURPOSE

Extract a clean and organized JSON representation of a recipe that supports:

1. A **gather phase** with a preview of all ingredients grouped by subcomponent
2. Grouping ingredients by **subcomponent** if applicable (e.g., main dish components, sauces, toppings)
3. A **step-by-step cook phase** with progressive ingredient disclosure
4. **Timing info per step** including the action being timed (e.g., "10 minutes | brown tofu")
5. ONLY return the JSON object itself, no markdown fences, no prefix text.

# FORMATTING RULES

1. Ingredients must always have both "quantity" and "ingredient" fields
2. For optional ingredients, use "optional" as the quantity
3. For ingredients used "as needed", use "as needed" as the quantity
4. For prepared ingredients from previous steps, use an empty string as the quantity
5. Time durations should be human-readable (e.g., "10 minutes", "2-3 hours", "30 seconds")
6. Every step must have an instruction and ingredients array (can be empty)
7. Time field should be null if no specific timing is needed for the step

# OUTPUT FORMAT

Return an object in this format:

{
  "title": "Recipe Title",
  "subcomponents": [
    {
      "name": "Main Component",
      "ingredients": [
        { "quantity": "2 cups", "ingredient": "main ingredient" },
        { "quantity": "1 tbsp", "ingredient": "seasoning" },
        { "quantity": "optional", "ingredient": "optional ingredient" }
      ]
    },
    {
      "name": "Sauce",
      "ingredients": [
        { "quantity": "1 cup", "ingredient": "sauce base" },
        { "quantity": "as needed", "ingredient": "salt to taste" }
      ]
    }
  ],
  "steps": [
    {
      "instruction": "Clear instruction for this step",
      "ingredients": [
        { "quantity": "2 cups", "ingredient": "ingredient needed now" }
      ],
      "time": {
        "duration": "10 minutes",
        "action": "cook description"
      }
    },
    {
      "instruction": "Step using prepared ingredients",
      "ingredients": [
        { "quantity": "", "ingredient": "prepared sauce from earlier" }
      ],
      "time": null
    }
  ]
}`

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

interface PythonServiceConfig {
  url: string
  timeout: number
  enabled: boolean
  useAIEnhancement: boolean
}

interface PythonServiceResponse {
  success: boolean
  recipe?: {
    title: string
    ingredients: string[]
    instructions: string[]
    prep_time?: number
    cook_time?: number
    total_time?: number
    yields?: string
    image?: string
    nutrients?: any
    description?: string
    canonical_url?: string
    host?: string
    site_name?: string
    author?: string
    cuisine?: string
    category?: string
  }
  metadata?: {
    extraction_time: number
    source_method: string
    scraper_host?: string
    scraper_site?: string
    ingredients_count?: number
    instructions_count?: number
  }
  error?: string
  partial_data?: any
}

function getPythonServiceConfig(): PythonServiceConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const useAIEnhancement = process.env.PYTHON_AI_ENHANCEMENT !== 'false' // default true
  
  // In production, use the Vercel function
  // In development, try local Python service first
  let serviceUrl: string
  if (isProduction) {
    // In Vercel, construct full URL for internal function calls
    const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL
    if (vercelUrl) {
      serviceUrl = `https://${vercelUrl}/api/python-extract`
    } else {
      // Fallback - skip Python service in production if no URL available
      serviceUrl = ''
    }
  } else {
    serviceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001/extract'
  }
  
  return {
    url: serviceUrl,
    timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000'),
    enabled: serviceUrl !== '',
    useAIEnhancement
  }
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

export async function extractWithPythonService(
  url: string, 
  html: string, 
  log: ExtractionLog
): Promise<Recipe | null> {
  const stepStartTime = performance.now()
  const config = getPythonServiceConfig()
  
  // Early return if Python service is disabled or URL not available
  if (!config.enabled || !config.url) {
    console.log('🚫 PYTHON SERVICE DISABLED: No service URL available')
    log.steps.push({
      name: 'Python Service (Disabled)',
      startTime: stepStartTime,
      endTime: performance.now(),
      duration: performance.now() - stepStartTime,
      error: 'Python service disabled or URL not available'
    })
    return null
  }
  
  console.log('🐍 PYTHON CONFIG:', {
    serviceUrl: config.url,
    aiEnhancement: config.useAIEnhancement,
    timeout: config.timeout,
    enabled: config.enabled,
    isProduction: process.env.NODE_ENV === 'production',
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  })
  
  // In production (Vercel) we skip the localhost health check entirely
  if (!config.url.includes('localhost')) {
    console.log('🔄 PRODUCTION: Skipping localhost health check')
  }
  
  try {
    // For local development, do a quick health check first
    if (config.url.includes('localhost')) {
      console.log('🔍 HEALTH CHECK: Testing local Python service...')
      try {
        const healthStartTime = performance.now()
        const healthCheck = await Promise.race([
          fetch('http://localhost:5001/health', { 
            method: 'GET',
            headers: { 'User-Agent': 'chef-mode-extractor/1.0' }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 3000)
          )
        ]) as Response
        
        const healthDuration = performance.now() - healthStartTime
        console.log('✅ HEALTH CHECK SUCCESS:', {
          status: healthCheck.status,
          duration: `${healthDuration.toFixed(2)}ms`
        })
        
        if (!healthCheck.ok) {
          throw new Error(`Local service unhealthy: ${healthCheck.status}`)
        }
      } catch (healthError) {
        console.log('❌ HEALTH CHECK FAILED:', healthError)
        // Local service not available, skip to fallback
        log.steps.push({
          name: 'Python Service (Local Unavailable)',
          startTime: stepStartTime,
          endTime: performance.now(),
          duration: performance.now() - stepStartTime,
          error: 'Local Python service not running'
        })
        return null
      }
    }
    
    // Main extraction request
    console.log('📡 PYTHON REQUEST: Starting recipe extraction...')
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'chef-mode-extractor/1.0'
      },
      body: JSON.stringify({ 
        url, 
        html, 
        source_url: url 
      })
    }
    
    console.log('📤 REQUEST DETAILS:', {
      url: config.url,
      bodySize: `${JSON.stringify({ url, html, source_url: url }).length} chars`,
      headers: fetchOptions.headers
    })
    
    // Add timeout for client-side requests
    if (typeof window === 'undefined') {
      // Server-side: use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout)
      fetchOptions.signal = controller.signal
      
      try {
        const response = await fetch(config.url, fetchOptions)
        clearTimeout(timeoutId)
        
        const result: PythonServiceResponse = await response.json()
        
        console.log('📥 PYTHON RESPONSE:', {
          success: result.success,
          hasRecipe: !!result.recipe,
          metadata: result.metadata,
          error: result.error,
          recipeTitle: result.recipe?.title,
          ingredientsCount: result.recipe?.ingredients?.length,
          instructionsCount: result.recipe?.instructions?.length
        })
        
        if (result.success && result.recipe) {
          console.log(`🧠 AI ENHANCEMENT: ${config.useAIEnhancement ? 'ENABLED' : 'DISABLED'}`)
          
          // Use AI enhancement if enabled, otherwise basic conversion
          const recipe = config.useAIEnhancement 
            ? await enhancePythonRecipeWithAI(result.recipe, url, log)
            : convertPythonRecipeToOurFormat(result.recipe, url)
          
          const stepEndTime = performance.now()
          const stepDuration = stepEndTime - stepStartTime
          
          console.log('✅ PYTHON SERVICE SUCCESS:', {
            duration: `${stepDuration.toFixed(2)}ms`,
            finalRecipe: {
              title: recipe.title,
              stepsCount: recipe.steps.length,
              ingredientsCount: recipe.subcomponents.reduce((total, sub) => total + sub.ingredients.length, 0),
              hasStepIngredients: recipe.steps.some(step => step.ingredients.length > 0)
            }
          })
          
          log.steps.push({
            name: 'Python Service (recipe-scrapers)',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepDuration,
            outputChars: JSON.stringify(recipe).length
          })
          
          return recipe
        } else {
          const stepEndTime = performance.now()
          log.steps.push({
            name: 'Python Service (recipe-scrapers)',
            startTime: stepStartTime,
            endTime: stepEndTime,
            duration: stepEndTime - stepStartTime,
            error: result.error || 'Service returned no recipe data'
          })
          
          return null
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } else {
      // Client-side: use Promise.race for timeout
      const response = await Promise.race([
        fetch(config.url, fetchOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), config.timeout)
        )
      ]) as Response
      
      const result: PythonServiceResponse = await response.json()
      
      if (result.success && result.recipe) {
        // Use AI enhancement if enabled, otherwise basic conversion
        const recipe = config.useAIEnhancement 
          ? await enhancePythonRecipeWithAI(result.recipe, url, log)
          : convertPythonRecipeToOurFormat(result.recipe, url)
        
        const stepEndTime = performance.now()
        log.steps.push({
          name: 'Python Service (recipe-scrapers)',
          startTime: stepStartTime,
          endTime: stepEndTime,
          duration: stepEndTime - stepStartTime,
          outputChars: JSON.stringify(recipe).length
        })
        
        return recipe
      } else {
        const stepEndTime = performance.now()
        log.steps.push({
          name: 'Python Service (recipe-scrapers)',
          startTime: stepStartTime,
          endTime: stepEndTime,
          duration: stepEndTime - stepStartTime,
          error: result.error || 'Service returned no recipe data'
        })
        
        return null
      }
    }
    
  } catch (error) {
    const stepEndTime = performance.now()
    log.steps.push({
      name: 'Python Service (recipe-scrapers)',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: stepEndTime - stepStartTime,
      error: error instanceof Error ? error.message : 'Unknown service error'
    })
    
    console.warn('Python service extraction failed, falling back:', error)
    return null
  }
}

function convertPythonRecipeToOurFormat(pythonRecipe: any, sourceUrl: string): Recipe {
  // Convert ingredients array to our ingredient format
  const ingredients = (pythonRecipe.ingredients || []).map((ingredientStr: string) =>
    parseIngredientString(ingredientStr)
  )
  
  // Normalise instructions to an array
  let instructionArray: string[] = []
  if (Array.isArray(pythonRecipe.instructions)) {
    instructionArray = pythonRecipe.instructions
  } else if (typeof pythonRecipe.instructions === 'string') {
    // Split on newlines first, then fallback to sentence periods
    instructionArray = pythonRecipe.instructions
      .split(/\n+/)
      .flatMap((part: string) => part.split(/(?<=\.)\s+/)) // further split long lines into sentences
      .map((s: string) => s.trim())
      .filter(Boolean)
  }
  
  // Convert instructions array to our step format
  const steps = instructionArray.map((instruction: string) => ({
    instruction,
    ingredients: [], // Could be enhanced to detect step-specific ingredients
    time: extractTimeFromInstruction(instruction)
  }))
  
  // Ensure at least one step exists to satisfy validation
  if (steps.length === 0) {
    steps.push({
      instruction: 'Follow the preparation method described in the recipe.',
      ingredients: [],
      time: null
    })
  }
  
  return {
    title: pythonRecipe.title || 'Untitled Recipe',
    subcomponents: [{
      name: 'Ingredients',
      ingredients
    }],
    steps,
    sourceUrl
  }
}

async function enhancePythonRecipeWithAI(
  pythonRecipe: any, 
  sourceUrl: string, 
  log: ExtractionLog
): Promise<Recipe> {
  const stepStartTime = performance.now()
  
  console.log('🤖 AI ENHANCEMENT STARTED:', {
    recipeTitle: pythonRecipe.title,
    ingredientsType: typeof pythonRecipe.ingredients,
    instructionsType: typeof pythonRecipe.instructions,
    timestamp: new Date().toISOString()
  })
  
  try {
    // Send the raw JSON from Python scraper directly to the LLM without pre-processing
    const rawRecipeJson = JSON.stringify(pythonRecipe, null, 2)
    
    const enhancementPrompt = `Here is a recipe object extracted from a scraper. Do not assume anything about the data format – just read the JSON text provided. Your task:\n\n1. Map each ingredient to the cooking step(s) where it is primarily used.\n2. Produce an enhanced recipe JSON that follows the exact schema described in the system prompt.\n3. Preserve all original quantities and wording.\n\nRAW_RECIPE_JSON:\n${rawRecipeJson}`

    console.log('📤 AI PROMPT LENGTH:', enhancementPrompt.length)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: PYTHON_ENHANCEMENT_PROMPT },
        { role: "user", content: enhancementPrompt }
      ]
    })

    const responseContent = completion.choices[0].message.content
    if (!responseContent) {
      throw new Error('No content received from OpenAI enhancement')
    }

    console.log('📥 AI RESPONSE LENGTH:', responseContent.length)

    // Directly parse the LLM response as JSON. We trust the model to return valid JSON.
    let enhancedRecipe: Recipe
    try {
      enhancedRecipe = JSON.parse(responseContent) as Recipe
    } catch (jsonErr) {
      console.warn('Primary JSON.parse failed – attempting to recover JSON block...', jsonErr)
      const braceMatch = responseContent.match(/\{[\s\S]*\}/)
      if (braceMatch) {
        try {
          enhancedRecipe = JSON.parse(braceMatch[0]) as Recipe
        } catch (innerErr) {
          throw new Error(`Failed to parse AI JSON after recovery attempt: ${(innerErr as Error).message}`)
        }
      } else {
        throw new Error(`Failed to parse AI JSON: ${(jsonErr as Error).message}`)
      }
    }
    
    // Validate and ensure required fields
    if (!enhancedRecipe.title) enhancedRecipe.title = pythonRecipe.title || 'Untitled Recipe'
    if (!enhancedRecipe.sourceUrl) enhancedRecipe.sourceUrl = sourceUrl
    
    const stepEndTime = performance.now()
    const enhancementDuration = stepEndTime - stepStartTime
    
    console.log('✅ AI ENHANCEMENT SUCCESS:', {
      duration: `${enhancementDuration.toFixed(2)}ms`,
      finalSteps: enhancedRecipe.steps?.length,
      finalIngredients: enhancedRecipe.subcomponents?.reduce((t, s) => t + (s.ingredients?.length || 0), 0)
    })
    
    log.steps.push({
      name: 'AI Enhancement (Python + OpenAI)',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: enhancementDuration,
      inputChars: enhancementPrompt.length,
      outputChars: JSON.stringify(enhancedRecipe).length
    })
    
    return enhancedRecipe
    
  } catch (error) {
    const stepEndTime = performance.now()
    const failureDuration = stepEndTime - stepStartTime
    
    console.log('❌ AI ENHANCEMENT FAILED:', {
      error: error instanceof Error ? error.message : 'Enhancement failed',
      duration: `${failureDuration.toFixed(2)}ms`,
      fallbackToBasic: true
    })
    
    log.steps.push({
      name: 'AI Enhancement (Python + OpenAI)',
      startTime: stepStartTime,
      endTime: stepEndTime,
      duration: failureDuration,
      error: error instanceof Error ? error.message : 'Enhancement failed'
    })
    
    console.warn('🔄 Falling back to basic Python recipe conversion...')
    const basicRecipe = convertPythonRecipeToOurFormat(pythonRecipe, sourceUrl)
    console.log('✅ BASIC CONVERSION SUCCESS:', {
      title: basicRecipe.title,
      stepsCount: basicRecipe.steps.length,
      ingredientsCount: basicRecipe.subcomponents.reduce((total, sub) => total + sub.ingredients.length, 0)
    })
    return basicRecipe
  }
}

function parseIngredientString(ingredientStr: string): { quantity: string; ingredient: string } {
  // Enhanced parsing with common patterns
  const patterns = [
    // "2 cups flour"
    /^(\d+(?:\.\d+)?\s*(?:cups?|tbsp?|tsp?|oz|lbs?|g|kg|ml|l))\s+(.+)$/i,
    // "1/2 cup sugar"  
    /^(\d+\/\d+\s*(?:cups?|tbsp?|tsp?|oz|lbs?|g|kg|ml|l))\s+(.+)$/i,
    // "2-3 apples"
    /^(\d+-\d+)\s+(.+)$/,
    // "2 large eggs"
    /^(\d+(?:\.\d+)?)\s+(large|medium|small)?\s*(.+)$/i,
    // Generic number pattern
    /^(\d+(?:\.\d+)?)\s+(.+)$/
  ]
  
  for (const pattern of patterns) {
    const match = ingredientStr.match(pattern)
    if (match) {
      return {
        quantity: match[1].trim(),
        ingredient: (match[2] || match[3] || '').trim()
      }
    }
  }
  
  // If no pattern matches, return as-is
  return {
    quantity: '',
    ingredient: ingredientStr.trim()
  }
}

function extractTimeFromInstruction(instruction: string): { duration: string; action: string } | null {
  const timePatterns = [
    /(\d+)\s*(?:to\s+\d+)?\s*minutes?/i,
    /(\d+)\s*(?:to\s+\d+)?\s*mins?/i,
    /(\d+)\s*(?:to\s+\d+)?\s*hours?/i,
    /(\d+)\s*(?:to\s+\d+)?\s*hrs?/i
  ]
  
  for (const pattern of timePatterns) {
    const match = instruction.match(pattern)
    if (match) {
      const duration = match[1]
      const unit = match[0].toLowerCase().includes('hour') || match[0].toLowerCase().includes('hr') 
        ? 'hours' : 'minutes'
      
      // Determine action based on instruction context
      const actionKeywords = {
        'bake': ['bake', 'oven', 'roast'],
        'cook': ['cook', 'simmer', 'boil', 'fry', 'sauté'],
        'prep': ['prep', 'marinate', 'rest', 'chill', 'cool'],
        'mix': ['mix', 'stir', 'whisk', 'beat']
      }
      
      let action = 'cook' // default
      for (const [actionType, keywords] of Object.entries(actionKeywords)) {
        if (keywords.some(keyword => instruction.toLowerCase().includes(keyword))) {
          action = actionType
          break
        }
      }
      
      return {
        duration: `${duration} ${unit}`,
        action
      }
    }
  }
  
  return null
}

// Enhanced main extraction function with Python service as primary
export async function extractRecipeWithFallback(url: string): Promise<{ recipe: Recipe; log: ExtractionLog }> {
  const log = createExtractionLog(url)
  
  console.log('🚀 RECIPE EXTRACTION STARTED:', {
    url: url,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
  
  try {
    // Step 1: Fetch HTML content
    console.log('📄 STEP 1: Fetching HTML content...')
    const html = await fetchRecipeContent(url, log)
    console.log(`✅ HTML fetched: ${html.length} characters`)
    
    // Step 2: Primary Parse - Python service with recipe-scrapers
    console.log('🐍 STEP 2: Attempting Python service extraction...')
    let recipe = await extractWithPythonService(url, html, log)
    
    if (recipe && isRecipeComplete(recipe)) {
      console.log('🎉 EXTRACTION SUCCESS: Python service with AI enhancement')
      log.status = 'success'
      log.recipe = recipe
      log.endTime = performance.now()
      log.totalDuration = log.endTime - log.startTime
      console.log(`⏱️ Total extraction time: ${log.totalDuration?.toFixed(2)}ms`)
      return { recipe, log }
    } else {
      console.log('⚠️ Python service failed, proceeding to fallback...')
    }
    
    // Step 3: Secondary Parse - JSON-LD extraction (to be implemented later)
    // recipe = extractJSONLDRecipe(html, log)
    // if (recipe && isRecipeComplete(recipe)) { ... }
    
    // Step 4: Fallback - Enhanced HTML + AI
    console.log('🤖 STEP 4: Fallback to HTML + AI extraction...')
    const textContent = extractRecipeContent(html, log)
    recipe = await extractRecipeWithAI(textContent, log)
    recipe.sourceUrl = url
    
    console.log('🎉 EXTRACTION SUCCESS: HTML + AI fallback')
    log.status = 'success'
    log.recipe = recipe
    log.endTime = performance.now()
    log.totalDuration = log.endTime - log.startTime
    console.log(`⏱️ Total extraction time: ${log.totalDuration?.toFixed(2)}ms`)
    
    return { recipe, log }
    
  } catch (error) {
    console.error('❌ EXTRACTION FAILED:', error)
    log.status = 'error'
    log.error = error instanceof Error ? error.message : 'Unknown error'
    log.endTime = performance.now()
    log.totalDuration = log.endTime - log.startTime
    console.log(`⏱️ Failed extraction time: ${log.totalDuration?.toFixed(2)}ms`)
    throw error
  } finally {
    // Log extraction summary
    console.log('📊 EXTRACTION SUMMARY:', {
      url: url,
      status: log.status,
      totalDuration: `${log.totalDuration?.toFixed(2)}ms`,
      stepsExecuted: log.steps.length,
      stepBreakdown: log.steps.map(step => ({
        name: step.name,
        duration: `${step.duration.toFixed(2)}ms`,
        success: !step.error,
        error: step.error
      }))
    })
  }
}

function isRecipeComplete(recipe: Recipe): boolean {
  return !!(
    recipe.title &&
    recipe.subcomponents.length > 0 &&
    recipe.subcomponents.some(sub => sub.ingredients.length > 0) &&
    recipe.steps.length > 0
  )
} 