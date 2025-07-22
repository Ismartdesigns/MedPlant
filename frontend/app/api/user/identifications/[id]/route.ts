import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_ENDPOINTS, getAuthHeaders } from '@/lib/api-config'

export async function DELETE(
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

    const response = await fetch(`${API_ENDPOINTS.user.identifications}/${params.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json(
        { message: data.message || 'Identification deleted successfully' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { message: data.message || data.detail || 'Failed to delete identification' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Delete identification error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}