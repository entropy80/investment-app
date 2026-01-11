/**
 * Notifications API
 * Handles fetching, marking as read, and deleting notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/lib/notifications/notification-service'

// GET - Fetch notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (type === 'unread') {
      const result = await getUnreadNotifications(session.user.id)
      return NextResponse.json(result)
    }

    if (type === 'count') {
      const result = await getUnreadCount(session.user.id)
      return NextResponse.json(result)
    }

    const result = await getUserNotifications(session.user.id, limit, offset)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Notifications API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Mark as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { notificationId, markAll } = body

    if (markAll) {
      const result = await markAllAsRead(session.user.id)
      return NextResponse.json(result)
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      )
    }

    const result = await markAsRead(notificationId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Notifications API PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const result = await deleteNotification(notificationId, session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Notifications API DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
