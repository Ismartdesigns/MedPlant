import { NextResponse, NextRequest } from 'next/server';
import { API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '@/lib/api-config';

export async function GET(request: NextRequest, { params }: { params: { scientific_name: string } }) {
  const { scientific_name } = params;

  try {
    const response = await fetch(API_ENDPOINTS.plants.details(scientific_name), {
      method: 'GET',
      headers: getAuthHeaders(request.cookies.get('session')?.value),
    });

    const data = await handleApiResponse(response);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Plant details error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Response ? error.status : 500 }
    );
  }
}