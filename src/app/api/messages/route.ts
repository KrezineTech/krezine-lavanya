// Main Messages API Endpoint
// Handles thread-based messaging for both admin and customer interfaces

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// Extend global type for socket.io
declare global {
  var io: any
}

// Input validation schemas
const createThreadSchema = z.object({
  subject: z.string().min(1).max(200),
  senderName: z.string().min(1).max(100),
  senderEmail: z.string().email(),
  message: z.string().min(1).max(10000),
  isOrderHelp: z.boolean().default(false),
  mostRecentOrderId: z.string().optional()
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  authorRole: z.enum(['CUSTOMER', 'SELLER', 'SUPPORT', 'SYSTEM', 'OTHER']),
  authorName: z.string().min(1).max(100)
})

// JWT validation helper
const validateJWT = (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided')
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any

    if (!decoded || !decoded.id || !decoded.email) {
      throw new Error('Invalid token structure')
    }

    return decoded
  } catch (error) {
    console.error('JWT validation error:', error)
    throw new Error('Invalid or expired token')
  }
}

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
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  })
}

// GET /api/messages - Fetch threads or messages
export async function GET(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const threadId = searchParams.get('threadId')
    const customerEmail = searchParams.get('customerEmail')

    // Get inbox threads for customer
    if (action === 'inbox' && customerEmail) {
      const threads = await prisma.messageThread.findMany({
        where: {
          senderEmail: customerEmail,
          deleted: false
        },
        include: {
          conversation: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          labels: {
            include: {
              label: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      // Transform to match frontend interface
      const transformedThreads = threads.map(thread => ({
        id: thread.id,
        subject: thread.subject,
        senderName: thread.senderName,
        senderEmail: thread.senderEmail,
        read: thread.read,
        updatedAt: thread.updatedAt.toISOString(),
        isOrderHelp: thread.isOrderHelp,
        conversation: thread.conversation.map(msg => ({
          id: msg.id,
          content: msg.content,
          authorRole: msg.authorRole,
          authorName: msg.authorName,
          createdAt: msg.createdAt.toISOString()
        })),
        labels: thread.labels.map(l => ({
          id: l.label.id,
          name: l.label.name,
          color: l.label.color
        }))
      }))

      return NextResponse.json({
        success: true,
        threads: transformedThreads
      }, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    // Get messages for a specific thread
    if (threadId) {
      try {
        console.log('🔍 Fetching thread:', threadId);
        const thread = await prisma.messageThread.findUnique({
          where: { id: parseInt(threadId) },
          include: {
            conversation: {
              orderBy: { createdAt: 'asc' },
              include: {
                attachments: {
                  select: {
                    id: true,
                    url: true,
                    filename: true,
                    mimeType: true,
                    size: true
                  }
                }
              }
            }
          }
        })

        if (!thread) {
          console.log('❌ Thread not found:', threadId);
          return NextResponse.json(
            { error: 'Thread not found' },
            { 
              status: 404,
              headers: {
                ...corsHeaders,
                'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              }
            }
          )
        }

        console.log('✅ Thread found:', { id: thread.id, subject: thread.subject, conversationCount: thread.conversation.length });

        // Transform to match frontend interface
        const transformedThread = {
          id: thread.id,
          subject: thread.subject,
          senderName: thread.senderName,
          senderEmail: thread.senderEmail,
          read: thread.read,
          updatedAt: thread.updatedAt.toISOString(),
          isOrderHelp: thread.isOrderHelp,
          conversation: thread.conversation.map(msg => ({
            id: msg.id,
            content: msg.content,
            authorRole: msg.authorRole,
            authorName: msg.authorName,
            createdAt: msg.createdAt.toISOString(),
            attachments: msg.attachments.map(att => ({
              id: att.id,
              url: att.url,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size
            }))
          }))
        }

        console.log('✅ Thread transformed successfully');
        return NextResponse.json({
          success: true,
          thread: transformedThread
        }, {
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      } catch (error) {
        console.error('❌ Error fetching thread:', error);
        const errorObj = error instanceof Error ? error : { message: String(error), name: 'Unknown', code: undefined, meta: undefined, stack: undefined };
        console.error('Error details:', {
          name: errorObj.name,
          message: errorObj.message,
          code: (errorObj as any).code,
          meta: (errorObj as any).meta,
          stack: errorObj.stack
        });

        return NextResponse.json(
          { error: 'Failed to fetch thread', details: errorObj.message },
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }
    }

    // Get all threads for admin (no specific action)
    const threads = await prisma.messageThread.findMany({
      where: { deleted: false },
      include: {
        conversation: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        labels: {
          include: {
            label: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    const transformedThreads = threads.map(thread => ({
      id: thread.id,
      subject: thread.subject,
      senderName: thread.senderName,
      senderEmail: thread.senderEmail,
      read: thread.read,
      updatedAt: thread.updatedAt.toISOString(),
      isOrderHelp: thread.isOrderHelp,
      conversation: thread.conversation.map(msg => ({
        id: msg.id,
        content: msg.content,
        authorRole: msg.authorRole,
        authorName: msg.authorName,
        createdAt: msg.createdAt.toISOString()
      })),
      labels: thread.labels.map(l => ({
        id: l.label.id,
        name: l.label.name,
        color: l.label.color
      }))
    }))

    return NextResponse.json({
      success: true,
      threads: transformedThreads
    }, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    const corsHeaders = getCorsHeaders(request)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}

// POST /api/messages - Create thread or send message
export async function POST(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const threadId = searchParams.get('threadId')

    // Create new thread
    if (action === 'thread') {
      const body = await request.json()
      const validationResult = createThreadSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.flatten().fieldErrors
          },
          { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }

      const { subject, senderName, senderEmail, message, isOrderHelp, mostRecentOrderId } = validationResult.data

      // Create thread
      const thread = await prisma.messageThread.create({
        data: {
          subject,
          senderName,
          senderEmail,
          isOrderHelp,
          mostRecentOrderId,
          folder: 'INBOX',
          read: false
        }
      })

      // Create initial message
      const conversationMessage = await prisma.conversationMessage.create({
        data: {
          threadId: thread.id,
          authorRole: 'CUSTOMER',
          authorName: senderName,
          content: message
        }
      })

      // Broadcast to real-time clients (with error handling)
      try {
        if (global.io) {
          global.io.emit('new_thread', {
            thread: {
              id: thread.id,
              subject: thread.subject,
              senderName: thread.senderName,
              senderEmail: thread.senderEmail,
              createdAt: thread.createdAt
            },
            message: {
              id: conversationMessage.id,
              content: conversationMessage.content,
              authorRole: conversationMessage.authorRole,
              authorName: conversationMessage.authorName,
              createdAt: conversationMessage.createdAt
            }
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting new thread:', broadcastError);
        // Don't fail the request if broadcasting fails
      }

      return NextResponse.json({
        success: true,
        thread: {
          id: thread.id,
          subject: thread.subject,
          senderName: thread.senderName,
          senderEmail: thread.senderEmail,
          createdAt: thread.createdAt.toISOString()
        }
      }, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    // Send message to existing thread
    if (threadId && action === 'message') {
      try {
        console.log('🔍 Attempting to send message to thread:', threadId);

        const body = await request.json()
        console.log('📨 Request body:', body);

        const validationResult = sendMessageSchema.safeParse(body)

        if (!validationResult.success) {
          console.error('❌ Validation failed:', validationResult.error.flatten().fieldErrors);
          return NextResponse.json(
            {
              error: 'Validation failed',
              details: validationResult.error.flatten().fieldErrors
            },
            { 
              status: 400,
              headers: {
                ...corsHeaders,
                'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              }
            }
          )
        }

        const { content, authorRole, authorName } = validationResult.data
        console.log('✅ Validation passed:', { content: content.substring(0, 50), authorRole, authorName });

        // Verify thread exists
        const thread = await prisma.messageThread.findUnique({
          where: { id: parseInt(threadId) }
        });

        if (!thread) {
          console.error('❌ Thread not found:', threadId);
          return NextResponse.json(
            { error: 'Thread not found' },
            { 
              status: 404,
              headers: {
                ...corsHeaders,
                'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              }
            }
          )
        }

        console.log('✅ Thread exists:', { id: thread.id, subject: thread.subject, deleted: thread.deleted });

        // Create message
        console.log('💾 Creating message...');
        const message = await prisma.conversationMessage.create({
          data: {
            threadId: parseInt(threadId),
            authorRole,
            authorName,
            content
          },
          include: {
            attachments: true
          }
        });

        console.log('✅ Message created:', { id: message.id, threadId: message.threadId });

        // Update thread timestamp
        console.log('📅 Updating thread timestamp...');
        await prisma.messageThread.update({
          where: { id: parseInt(threadId) },
          data: {
            updatedAt: new Date(),
            // When a message is sent, mark as unread for the recipient
            // If customer sent message, admin hasn't read it (read = false)
            // If admin sent message, customer hasn't read it (read = false)
            read: false
          }
        });

        console.log('✅ Thread updated');

        // Note: Broadcasting is now handled by socket send_message handler
        // No need to broadcast here since messages are sent via socket

        return NextResponse.json({
          success: true,
          message: {
            id: message.id,
            content: message.content,
            authorRole: message.authorRole,
            authorName: message.authorName,
            createdAt: message.createdAt.toISOString()
          }
        }, {
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })

      } catch (error) {
        console.error('❌ Unexpected error in message creation:', error);
        const errorObj = error instanceof Error ? error : { message: String(error), name: 'Unknown', code: undefined, meta: undefined, stack: undefined };
        console.error('Error details:', {
          name: errorObj.name,
          message: errorObj.message,
          code: (errorObj as any).code,
          meta: (errorObj as any).meta,
          stack: errorObj.stack
        });

        return NextResponse.json(
          { error: 'Failed to create message', details: errorObj.message },
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid action or parameters' },
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )

  } catch (error) {
    console.error('Error creating message/thread:', error)
    const corsHeaders = getCorsHeaders(request)
    return NextResponse.json(
      { error: 'Failed to create message' },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}

// PATCH /api/messages - Update thread or message status
export async function PATCH(request: NextRequest) {
  try {
    const corsHeaders = getCorsHeaders(request)
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID is required' },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    const body = await request.json()
    const { read, folder } = body

    // Mark thread as read
    if (read === true) {
      // Verify user has access to this thread
      const thread = await prisma.messageThread.findUnique({
        where: { id: parseInt(threadId) }
      })

      if (!thread) {
        return NextResponse.json(
          { error: 'Thread not found' },
          { 
            status: 404,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }

      // Update thread as read
      await prisma.messageThread.update({
        where: { id: parseInt(threadId) },
        data: { read: true }
      })

      // Broadcast read status to real-time clients
      try {
        if (global.io) {
          const roomName = `thread_${threadId}`
          global.io.to(roomName).emit('thread_read', {
            threadId: parseInt(threadId),
            timestamp: new Date()
          })
        }
      } catch (broadcastError) {
        console.error('Error broadcasting thread read status:', broadcastError);
        // Don't fail the request if broadcasting fails
      }

      return NextResponse.json({
        success: true,
        message: 'Thread marked as read'
      }, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    // Update thread folder
    if (folder) {
      const validFolders = ['INBOX', 'SENT', 'TRASH', 'ARCHIVE', 'SPAM']
      if (!validFolders.includes(folder)) {
        return NextResponse.json(
          { error: 'Invalid folder' },
          { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }

      await prisma.messageThread.update({
        where: { id: parseInt(threadId) },
        data: { folder: folder }
      })

      return NextResponse.json({
        success: true,
        message: `Thread moved to ${folder}`
      }, {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid update operation' },
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )

  } catch (error) {
    console.error('Error updating message/thread:', error)
    const corsHeaders = getCorsHeaders(request)
    return NextResponse.json(
      { error: 'Failed to update message' },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
  // Removed prisma.$disconnect() - client should remain connected
}