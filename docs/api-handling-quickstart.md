# API Handling Quickstart

This small guide shows the minimal, focused changes to make the `admin` APIs safe and consumable by the `frontend`.

## Goals
- Centralize CORS handling in the admin project
- Provide a secure auth approach (cookie or Bearer) and required headers
- Show the frontend fetch usage with credentials or Authorization header

---

## 1) Admin: Add a CORS middleware (minimal)

Create `admin/src/lib/middleware/cors.ts` (or similar) and use it at the top of API handlers.

Example (plain Next.js API handler-friendly):

```ts
// admin/src/lib/middleware/cors.ts
import { NextApiRequest, NextApiResponse } from 'next'

export function allowCors(req: NextApiRequest, res: NextApiResponse) {
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_FRONTEND_URL || ''
  const origin = req.headers.origin
  if (FRONTEND_ORIGIN && origin === FRONTEND_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  // For development you can allow localhost explicitly
  if (!FRONTEND_ORIGIN && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
```

Then in any API route handler:

```ts
import { allowCors } from '../../lib/middleware/cors'

export default async function handler(req, res) {
  if (allowCors(req, res)) return
  // ...existing handler logic
}
```

Notes:
- In production set `FRONTEND_ORIGIN=https://www.your-frontend.com` in admin deployment envs.
- Do not use `*` in production for `Access-Control-Allow-Origin`.

---

## 2) Admin: Recommended auth options

- Option A: httpOnly Secure cookie (recommended when frontend and admin are same parent domain or you can set cookies cross-site)
  - Set cookie with `HttpOnly; Secure; SameSite=None; Domain=.your-domain.com` on login.
  - Admin must send `Access-Control-Allow-Credentials: true` and frontend must fetch with `credentials: 'include'`.

- Option B: Authorization Bearer token (recommended when frontend on another domain)
  - Server returns `accessToken` and `refreshToken` (refresh token set as httpOnly cookie or stored securely).
  - Frontend sends `Authorization: Bearer <token>` header.

Implement a refresh endpoint: `/api/auth/refresh` that rotates tokens and is called when 401 encountered.

---

## 3) Frontend: Minimal fetch examples

- Using cookies (httpOnly):

```ts
// frontend/src/lib/apiClient.ts
const BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  return res
}
```

- Using Bearer token:

```ts
// frontend/src/lib/apiClient.ts
const BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL
let accessToken: string | null = null

export function setAccessToken(t: string | null) { accessToken = t }

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(opts.headers || {}),
    },
  })
  return res
}
```

Notes for frontend:
- Set `NEXT_PUBLIC_ADMIN_API_URL` in the frontend deployment environment to `https://api.your-admin-domain.com`.
- If using cookies, all fetch calls that need auth must set `credentials: 'include'`.

---

## 4) Quick checklist to deploy safely

- Admin: add `FRONTEND_ORIGIN=https://www.your-frontend.com` and `ADMIN_JWT_SECRET` to envs.
- Frontend: set `NEXT_PUBLIC_ADMIN_API_URL=https://api.your-admin-domain.com`.
- Ensure TLS is enforced on both domains.
- Add a health endpoint in admin: `/api/health`.

---

That's it — this file contains the minimal code and env changes needed to make the admin APIs ready to be consumed securely by the frontend. If you want, I can patch the admin to add the `cors.ts` file and update one example API handler and add a `frontend/src/lib/apiClient.ts` file.
