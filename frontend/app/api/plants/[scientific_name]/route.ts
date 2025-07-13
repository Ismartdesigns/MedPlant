import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { scientific_name: string } }) {
  const { scientific_name } = params;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plants/${scientific_name}`, {
      credentials: 'include',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch plant details');
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching plant details:', error);
    return Response.json({ error: 'Failed to fetch plant details' }, { status: 500 });
  }
}