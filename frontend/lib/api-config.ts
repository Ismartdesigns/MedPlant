// API configuration and URL management

// Get the API URL from environment variable with fallback
export const API_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://medplant-yjp2.onrender.com"

if (!API_BASE_URL && process.env.NODE_ENV === 'production') {
  console.error('NEXT_PUBLIC_FASTAPI_URL environment variable is not set in production')
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    validate: `${API_BASE_URL}/api/auth/validate`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    logout: `${API_BASE_URL}/api/auth/logout`,
  },
  // User endpoints
  user: {
    stats: `${API_BASE_URL}/api/user/stats`,
    activityFeed: `${API_BASE_URL}/api/user/activity_feed`,
    identifications: `${API_BASE_URL}/api/user/identifications`,
    favoriteIdentification: (id: string) => `${API_BASE_URL}/api/user/identifications/${id}/favorite`,
  },
  // Plant endpoints
  plants: {
    list: `${API_BASE_URL}/api/plants`,
    details: (scientificName: string) => `${API_BASE_URL}/api/plants/${encodeURIComponent(scientificName)}`,
    identify: `${API_BASE_URL}/api/plants/identify`,
  },
}

// Helper function to construct headers with authentication
export const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

// Helper function to handle API responses
export const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.message || 'API request failed')
  }
  return response.json()
}