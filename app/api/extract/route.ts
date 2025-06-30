import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { fetchRecipeContent, extractRecipeContent, extractRecipeWithAI, createExtractionLog } from '../../../lib/recipe-extractor'
import type { Recipe } from '../../../lib/recipeParser'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, content } = body
    console.log('API Request:', { url, content: content?.substring(0, 100) + '...' })

    if (!url && !content) {
      return NextResponse.json(
        { error: 'Either URL or content is required' },
        { status: 400 }
      )
    }

    // Initialize extraction log
    const log = createExtractionLog(url)

    let extractedContent: string
    let sourceUrl: string | null = null

    if (url) {
      console.log('Fetching recipe from URL:', url)
      const htmlContent = await fetchRecipeContent(url, log)
      extractedContent = extractRecipeContent(htmlContent, log)
      sourceUrl = url
    } else {
      console.log('Processing provided recipe content')
      extractedContent = content
    }

    // Write debug information to files
    const debugDir = path.join(process.cwd(), 'debug')
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir)
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    fs.writeFileSync(
      path.join(debugDir, `recipe-content-${timestamp}.txt`),
      extractedContent
    )

    console.log('[DEBUG] Content length:', extractedContent.length, 'characters')

    // Extract recipe using OpenAI
    const recipe = await extractRecipeWithAI(extractedContent, log)
    
    // Add source URL if provided
    if (sourceUrl) {
      recipe.sourceUrl = sourceUrl
    }

    // Finalize log
    log.endTime = performance.now()
    log.totalDuration = log.endTime - log.startTime
    log.status = 'success'
    log.recipe = recipe

    // Write log to file
    fs.writeFileSync(
      path.join(debugDir, `extraction-log-${timestamp}.json`),
      JSON.stringify(log, null, 2)
    )

    // Log summary to console
    console.log('Extraction Summary:')
    console.log(`Total time: ${log.totalDuration.toFixed(2)}ms`)
    console.log('Steps:')
    log.steps.forEach(step => {
      console.log(`- ${step.name}: ${step.duration.toFixed(2)}ms`)
      if (step.inputChars) console.log(`  Input: ${step.inputChars} chars`)
      if (step.outputChars) console.log(`  Output: ${step.outputChars} chars`)
      if (step.error) console.log(`  Error: ${step.error}`)
    })

    return NextResponse.json(recipe)
  } catch (error) {
    // Create error log
    const log = createExtractionLog()
    log.endTime = performance.now()
    log.totalDuration = log.endTime - log.startTime
    log.status = 'error'
    log.error = error instanceof Error ? error.message : 'An unknown error occurred'

    // Write error log to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const debugDir = path.join(process.cwd(), 'debug')
    fs.writeFileSync(
      path.join(debugDir, `extraction-error-${timestamp}.json`),
      JSON.stringify(log, null, 2)
    )

    console.error('Recipe extraction error:', error)
    console.log(`[TIMING] Failed process took ${log.totalDuration.toFixed(2)}ms before error`)

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    const status = errorMessage.includes('required') ? 400 : 500

    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
} 