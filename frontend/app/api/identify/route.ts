import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_ENDPOINTS, handleApiResponse, ApiError } from '@/lib/api-config'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the form data from the request
    const formData = await request.formData()
    
    // Forward the request to FastAPI with Bearer token authentication
    const response = await fetch(API_ENDPOINTS.plants.identify, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    const data = await handleApiResponse(response)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Plant identification error:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}