import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '@/lib/api-config'

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

    await handleApiResponse(response)

    return NextResponse.json(
      { message: 'Identification deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete identification error:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: error instanceof Response ? error.status : 500 }
      )
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}