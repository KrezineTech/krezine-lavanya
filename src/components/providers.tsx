'use client'

import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Authentication removed - no longer wrapping with SessionProvider
  return <>{children}</>
}