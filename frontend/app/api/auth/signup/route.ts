import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signupSchema } from '@/lib/validations/auth'
import { API_ENDPOINTS, handleApiResponse } from '@/lib/api-config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Request Body:", body)

    // Validate input
    const result = signupSchema.safeParse(body)
    if (!result.success) {
      console.error('Validation Errors:', result.error.errors)
      return NextResponse.json(
        { message: 'Invalid input', errors: result.error.errors },
        { status: 400 }
      )
    }

    // Destructure the validated data
    const { firstName, lastName, email, password, confirmPassword, agreeToTerms } = result.data

    // Call backend API with correctly ordered and formatted keys
    const response = await fetch(API_ENDPOINTS.auth.signup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        confirm_password: confirmPassword,
        agree_to_terms: agreeToTerms
      }),
    })

    const data = await handleApiResponse(response)

    // Set secure HTTP-only cookie with JWT token
    const cookieStore = await cookies()
    cookieStore.set('session', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return NextResponse.json({
      message: 'Signup successful',
      user: data.user
    })
  } catch (error) {
    console.error('Signup error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      status: (error as any)?.status || 500,
      details: (error as any)?.details || {},
      stack: error instanceof Error ? error.stack : undefined
    })

    // Return appropriate error response
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Internal server error',
        details: (error as any)?.details || {}
      },
      { 
        status: (error as any)?.status || 500,
        statusText: (error as any)?.statusText || 'Internal Server Error'
      }
    )
  }
}
