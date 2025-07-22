import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

    const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/api/user/identifications/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { message: error.detail || 'Failed to delete identification' },
        { status: response.status }
      )
    }

    return NextResponse.json(
      { message: 'Identification deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete identification error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}