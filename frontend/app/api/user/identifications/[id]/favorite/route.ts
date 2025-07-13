import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'
    const response = await fetch(`${FASTAPI_URL}/api/user/identifications/${params.id}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to update favorite status')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating favorite status:', error)
    return NextResponse.json(
      { message: 'Failed to update favorite status' },
      { status: 500 }
    )
  }
}