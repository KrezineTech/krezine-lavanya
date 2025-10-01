// Authentication removed - these are stub functions
// All authentication logic has been removed from the application

type SessionUser = {
  role: string;
  [key: string]: any;
};

type Session = {
  user: SessionUser;
  [key: string]: any;
};

// Stub function - no authentication required
export async function requireAdminAuth(request?: any): Promise<Session> {
  // Return a mock admin session
  return {
    user: {
      id: 'admin-user',
      email: 'admin@example.com',
      role: 'ADMIN'
    }
  } as Session;
}

// Stub function - no authentication required
export async function getAdminSession(): Promise<Session | null> {
  return {
    user: {
      id: 'admin-user',
      email: 'admin@example.com',
      role: 'ADMIN'
    }
  } as Session;
}

export function getBaseUrl(req?: any): string {
  // In development, try to use the same host and port as the request
  if (req && req.headers && req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}`;
  }

  // Fallback to environment variable or default
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}
