// Authentication has been removed
// This is a stub file to prevent build errors

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Authentication has been disabled' }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: 'Authentication has been disabled' }, { status: 501 })
}