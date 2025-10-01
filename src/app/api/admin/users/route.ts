import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get all users
export const GET = async (request: NextRequest) => {
  try {
    // Get all users with comprehensive data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      users,
      totalCount: users.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        code: 'USER_FETCH_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Update user role and permissions
export const PUT = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, role, isActive, permissions } = body

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['USER', 'CUSTOMER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          code: 'INVALID_ROLE',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        permissions: permissions || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to update user',
        code: 'USER_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Create new user
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { name, email, password, role = 'USER', permissions = [] } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        {
          error: 'Name and email are required',
          code: 'MISSING_REQUIRED_FIELDS',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'User with this email already exists',
          code: 'USER_ALREADY_EXISTS',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      )
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: password || null, // Store password as-is or null if not provided
        role,
        permissions,
        isActive: true,
        emailVerified: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to create user',
        code: 'USER_CREATION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Delete user
export const DELETE = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Get user to be deleted
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true }
    })

    if (!userToDelete) {
      return NextResponse.json(
        {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      )
    }

    // Delete user and related data
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: userToDelete.email,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          code: 'ADMIN_REQUIRED',
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        code: 'USER_DELETION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}