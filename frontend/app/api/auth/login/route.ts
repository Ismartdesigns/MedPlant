import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/validations/auth'
import { API_ENDPOINTS, handleApiResponse } from '@/lib/api-config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: result.error.errors },
        { status: 400 }
      )
    }


    const response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.data),
    })

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
    console.error('Login error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Response ? error.status : 500 }
    )
  }
}