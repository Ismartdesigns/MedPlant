// API configuration and URL management

// Get the API URL from environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_FASTAPI_URL environment variable is not set')
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    validate: `${API_BASE_URL}/api/auth/validate`,
    signup: `${API_BASE_URL}/api/auth/signup`,
  },
  // User endpoints
  user: {
    stats: `${API_BASE_URL}/api/user/stats`,
    activityFeed: `${API_BASE_URL}/api/user/activity_feed`,
    identifications: `${API_BASE_URL}/api/user/identifications`,
  },
  // Plant endpoints
  plants: {
    list: `${API_BASE_URL}/api/plants`,
    details: (scientificName: string) => `${API_BASE_URL}/api/plants/${scientificName}`,
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