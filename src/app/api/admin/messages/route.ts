// Admin Messages API Endpoint
// Handles admin-specific operations for managing message threads

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Input validation schemas
const updateThreadSchema = z.object({
  folder: z.enum(['INBOX', 'SENT', 'ARCHIVE', 'TRASH', 'SPAM']).optional(),
  read: z.boolean().optional(),
  privateNote: z.string().optional(),
  isPreviousBuyer: z.boolean().optional(),
})

// Helper function to get CORS headers
const getCorsHeaders = (request: NextRequest): Record<string, string> => {
  const origin = request.headers.get('origin')
  const isAllowedOrigin = origin === 'http://localhost:9002' || origin === 'http://localhost:3000'
  
  if (isAllowedOrigin) {
    return {
      'Access-Control-Allow-Origin': origin!,
      'Access-Control-Allow-Credentials': 'true',
    }
  }
  
  return {}
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request)
  return NextResponse.json({}, {
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  })
}

// GET /api/admin/messages - Fetch all threads for admin
export async function GET(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get('search') || ''
    const folder = searchParams.get('folder')
    const read = searchParams.get('read')
    const isOrderRelated = searchParams.get('isOrderRelated')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build where clause
    const where: any = {
      deleted: false,
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { senderEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (folder) {
      where.folder = folder
    }

    if (read !== null && read !== undefined) {
      where.read = read === 'true'
    }

    if (isOrderRelated !== null && isOrderRelated !== undefined) {
      where.isOrderHelp = isOrderRelated === 'true'
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Fetch threads with pagination
    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        include: {
          conversation: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              conversation: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.messageThread.count({ where })
    ])

    // Format response
    const formattedThreads = threads.map((thread: any) => ({
      id: thread.id,
      subject: thread.subject,
      folder: thread.folder,
      read: thread.read,
      customerName: thread.senderName,
      customerEmail: thread.senderEmail,
      customerAvatar: thread.senderAvatar,
      isOrderRelated: thread.isOrderHelp,
      orderId: thread.mostRecentOrderId,
      isPreviousBuyer: thread.isPreviousBuyer,
      totalPurchased: thread.totalPurchased,
      privateNote: thread.privateNote,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messageCount: thread._count.conversation,
      lastMessageAt: thread.conversation[0]?.createdAt,
      lastMessagePreview: thread.conversation[0]?.content?.substring(0, 100),
    }))

    return NextResponse.json({
      threads: formattedThreads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error fetching admin threads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}

// PATCH /api/admin/messages - Update thread (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const validatedData = updateThreadSchema.parse(body)

    const updatedThread = await prisma.messageThread.update({
      where: { id: parseInt(threadId) },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      thread: updatedThread
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error updating thread:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: getCorsHeaders(request) }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}

// DELETE /api/admin/messages - Soft delete thread (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await prisma.messageThread.update({
      where: { id: parseInt(threadId) },
      data: {
        deleted: true,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Thread deleted successfully'
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error deleting thread:', error)
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}
