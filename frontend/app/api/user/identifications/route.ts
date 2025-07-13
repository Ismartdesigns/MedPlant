import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '@/lib/api-config'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const response = await fetch(API_ENDPOINTS.user.identifications, {
      method: 'GET',
      headers: getAuthHeaders(token),
    })

    const data = await handleApiResponse(response)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Identifications error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Response ? error.status : 500 }
    )
  }
}