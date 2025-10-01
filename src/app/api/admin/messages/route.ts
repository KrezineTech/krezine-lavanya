// Admin Messages API Endpoint
// Handles admin-specific operations for managing message threads

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Input validation schemas
const updateThreadSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedAdmin: z.string().optional(),
  notes: z.string().optional(),
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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const isOrderRelated = searchParams.get('isOrderRelated')
    const assignedAdmin = searchParams.get('assignedAdmin')
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

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (isOrderRelated !== null) {
      where.isOrderHelp = isOrderRelated === 'true'
    }

    if (assignedAdmin) {
      where.assignedAdmin = assignedAdmin
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
              conversation: {
                where: { isRead: false }
              }
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
      status: thread.status,
      priority: thread.priority,
      customerName: thread.senderName,
      customerEmail: thread.senderEmail,
      isOrderRelated: thread.isOrderHelp,
      orderId: thread.mostRecentOrderId,
      assignedAdmin: thread.assignedAdmin,
      notes: thread.notes,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      unreadCount: thread._count.conversation,
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
      where: { id: threadId },
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
      where: { id: threadId },
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
