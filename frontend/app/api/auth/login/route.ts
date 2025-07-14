import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/validations/auth'
import { API_ENDPOINTS, handleApiResponse, ApiError } from '@/lib/api-config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      return NextResponse.json(
        { 
          message: 'Validation failed',
          errors: errors
        },
        { status: 422 }
      )
    }


    const response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.data),
    })

    if (response.status === 422) {
      const errorData = await response.json()
      return NextResponse.json(
        { 
          message: 'Backend validation failed',
          errors: errorData.detail || errorData.errors || errorData
        },
        { status: 422 }
      )
    }

    const data = await handleApiResponse(response)
    
    // Set the session cookie if login was successful
    const cookieStore = await cookies()
    cookieStore.set('session', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ message: 'Login successful' })
  } catch (error) {
    console.error('Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      status: error instanceof ApiError ? error.status : 500,
      details: error instanceof ApiError ? error.details : {},
      stack: error instanceof Error ? error.stack : undefined
    })

    if (error instanceof ApiError) {
      return NextResponse.json(
        { 
          message: error.message,
          errors: error.details
        },
        { 
          status: error.status,
          statusText: error.statusText
        }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}