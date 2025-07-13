import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '@/lib/api-config'

export async function POST() {
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get('session')?.value

    if (token) {
      // Call backend logout endpoint
      const response = await fetch(API_ENDPOINTS.auth.logout, {
        method: 'POST',
        headers: getAuthHeaders(token),
      })

      await handleApiResponse(response)
    }

    // Clear the session cookie regardless of backend response
    const response = NextResponse.json({ message: 'Logged out successfully' })
    response.cookies.delete('session')
    return response

  } catch (error) {
    console.error('Logout error:', error)
    // Still clear the cookie even if there's an error
    const response = NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Response ? error.status : 500 }
    )
    response.cookies.delete('session')
    return response
  }
}