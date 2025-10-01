// Authentication has been removed
// This is a stub file to prevent build errors

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ 
    error: 'Authentication has been disabled',
    message: 'Sign out functionality is not available'
  }, { status: 501 })
}