import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promisify } from 'util'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('🐍 Python extraction endpoint called')
  
  try {
    // Parse request body
    const body = await request.json()
    console.log('🔄 Processing extraction request:', {
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

    // Call the Python script directly
    const pythonProcess = await fetch(new URL('/api/python-extract.py', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const result = await pythonProcess.json()

    // Return response with appropriate status code
    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
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