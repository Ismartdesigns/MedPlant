import { randomBytes } from 'crypto'

const tokens = new Map<string, number>()

export function generateCsrfToken(): string {
  const token = randomBytes(32).toString('hex')
  tokens.set(token, Date.now())
  return token
}

export function verifyCsrfToken(token: string): boolean {
  const timestamp = tokens.get(token)
  if (!timestamp) return false
  
  // Remove old tokens (older than 1 hour)
  const now = Date.now()
  for (const [t, ts] of tokens.entries()) {
    if (now - ts > 3600000) tokens.delete(t)
  }
  
  return true
}