import { NextResponse } from 'next/server'
import { fetchRecipeContent, extractRecipeContent, extractRecipeWithAI, createExtractionLog, extractRecipeWithFallback } from '../../../lib/recipe-extractor'
import type { Recipe } from '../../../lib/recipeParser'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 })
    }
    
    const { recipe, log } = await extractRecipeWithFallback(url)
    
    return Response.json({ 
      recipe, 
      extractionLog: log,
      success: true 
    })
  } catch (error) {
    console.error('Recipe extraction failed:', error)
    return Response.json(
      { error: 'Failed to extract recipe' },
      { status: 500 }
    )
  }
} 