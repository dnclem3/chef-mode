import { NextResponse } from 'next/server'
import { recipe_scrapers } from 'recipe-scrapers'

export async function POST(request: Request) {
  console.log('🐍 Python extraction endpoint called')
  
  try {
    // Parse request body
    const body = await request.json()
    console.log('📥 Request body:', {
      hasUrl: !!body.url,
      hasHtml: !!body.html,
      urlLength: body.url?.length,
      htmlLength: body.html?.length
    })

    if (!body.url && !body.html) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either URL or HTML content is required' 
        },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Extract recipe data
    console.log('🔄 Starting recipe extraction')
    const startTime = Date.now()
    
    let scraper
    let source_method = ''
    
    if (body.url) {
      console.log('🌐 Extracting from URL:', body.url)
      scraper = await recipe_scrapers(body.url)
      source_method = 'url_direct'
    } else {
      console.log('📄 Extracting from HTML content')
      scraper = await recipe_scrapers.scrape_html(body.html, body.source_url || '')
      source_method = 'html_content'
    }

    // Safe extraction with error handling
    const recipe_data = {
      title: await safeExtract(() => scraper.title()),
      ingredients: await safeExtract(() => scraper.ingredients()) || [],
      instructions: await safeExtract(() => scraper.instructions()) || [],
      prep_time: await safeExtract(() => scraper.prep_time()),
      cook_time: await safeExtract(() => scraper.cook_time()),
      total_time: await safeExtract(() => scraper.total_time()),
      yields: await safeExtract(() => scraper.yields()),
      image: await safeExtract(() => scraper.image()),
      nutrients: await safeExtract(() => scraper.nutrients()),
      description: await safeExtract(() => scraper.description()),
      canonical_url: await safeExtract(() => scraper.canonical_url()),
      host: await safeExtract(() => scraper.host()),
      site_name: await safeExtract(() => scraper.site_name()),
      author: await safeExtract(() => scraper.author()),
      cuisine: await safeExtract(() => scraper.cuisine()),
      category: await safeExtract(() => scraper.category())
    }

    // Validate minimum requirements
    if (!recipe_data.title || !recipe_data.ingredients?.length) {
      console.log('❌ Invalid recipe data:', {
        hasTitle: !!recipe_data.title,
        ingredientsCount: recipe_data.ingredients?.length
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Recipe must have title and ingredients',
          partial_data: recipe_data
        },
        { 
          status: 422,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const duration = Date.now() - startTime
    console.log('✅ Extraction successful:', {
      duration: `${duration}ms`,
      title: recipe_data.title,
      ingredientsCount: recipe_data.ingredients.length,
      instructionsCount: recipe_data.instructions.length
    })

    return NextResponse.json(
      {
        success: true,
        recipe: recipe_data,
        metadata: {
          extraction_time: duration,
          source_method,
          scraper_host: recipe_data.host,
          scraper_site: recipe_data.site_name,
          ingredients_count: recipe_data.ingredients.length,
          instructions_count: recipe_data.instructions.length
        }
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ Extraction failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          error_type: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

async function safeExtract<T>(extractor: () => Promise<T> | T): Promise<T | null> {
  try {
    return await extractor()
  } catch (error) {
    console.warn('⚠️ Failed to extract field:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
} 