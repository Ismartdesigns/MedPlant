import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signupSchema } from '@/lib/validations/auth'

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
    const response = await fetch('http://localhost:8000/api/auth/signup', {
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

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Signup failed' },
        { status: response.status }
      )
    }

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
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
