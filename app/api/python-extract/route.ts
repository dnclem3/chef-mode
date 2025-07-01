import { NextRequest, NextResponse } from 'next/server'
import { python } from '@vercel/python'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log('🐍 Python extraction endpoint called')
  
  try {
    // Parse request body
    const body = await request.json()
    console.log('🔄 Forwarding request to Python handler:', {
      hasUrl: Boolean(body.url),
      hasHtml: Boolean(body.html),
      urlLength: body.url?.length || 0,
      htmlLength: body.html?.length || 0
    })

    if (!body.url && !body.html) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either URL or HTML content is required' 
        },
        { status: 400 }
      )
    }

    // Call Python handler
    const pythonHandler = python('./api/python-extract.py')
    const result = await pythonHandler({
      body: JSON.stringify(body)
    })

    // Parse Python response
    const { statusCode, headers, body: responseBody } = result
    const parsedBody = JSON.parse(responseBody)

    // Return response with appropriate status code
    return NextResponse.json(parsedBody, {
      status: statusCode,
      headers: headers
    })

  } catch (error) {
    console.error('❌ Error in Python extraction route:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    })
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