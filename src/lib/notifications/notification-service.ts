/**
 * Notification Service
 *
 * Handles creating and managing user notifications
 */

import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: params,
    })
    return { success: true, notification }
  } catch (error) {
    console.error('Failed to create notification:', error)
    return { success: false, error }
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return { success: true, notifications }
  } catch (error) {
    console.error('Failed to fetch unread notifications:', error)
    return { success: false, error, notifications: [] }
  }
}

/**
 * Get all notifications for a user (paginated)
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  try {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ])

    return { success: true, notifications, total }
  } catch (error) {
    console.error('Failed to fetch user notifications:', error)
    return { success: false, error, notifications: [], total: 0 }
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
    return { success: true, notification }
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return { success: false, error }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
    return { success: true, count: result.count }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return { success: false, error }
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return { success: false, error }
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    })
    return { success: true, count }
  } catch (error) {
    console.error('Failed to get unread count:', error)
    return { success: false, count: 0 }
  }
}

// ============================================================================
// Helper Functions for Common Notifications
// ============================================================================

export async function notifyWelcome(userId: string) {
  return createNotification({
    userId,
    type: 'ACCOUNT',
    title: 'Welcome to Investment App!',
    message: 'Thank you for joining us. Get started by exploring your dashboard.',
    link: '/dashboard',
  })
}

export async function notifySubscriptionCreated(userId: string, tier: string) {
  return createNotification({
    userId,
    type: 'SUCCESS',
    title: 'Subscription Activated',
    message: `Your ${tier} subscription has been activated successfully.`,
    link: '/dashboard/billing',
  })
}

export async function notifyPaymentSucceeded(userId: string, amount: number) {
  return createNotification({
    userId,
    type: 'BILLING',
    title: 'Payment Successful',
    message: `Your payment of $${(amount / 100).toFixed(2)} was processed successfully.`,
    link: '/dashboard/billing',
  })
}

export async function notifyPaymentFailed(userId: string, amount: number) {
  return createNotification({
    userId,
    type: 'ERROR',
    title: 'Payment Failed',
    message: `We couldn't process your payment of $${(amount / 100).toFixed(2)}. Please update your payment method.`,
    link: '/dashboard/billing',
  })
}

export async function notifySubscriptionCancelled(userId: string) {
  return createNotification({
    userId,
    type: 'WARNING',
    title: 'Subscription Cancelled',
    message: 'Your subscription has been cancelled and will end at the end of your billing period.',
    link: '/dashboard/billing',
  })
}
