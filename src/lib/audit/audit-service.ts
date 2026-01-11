/**
 * Audit Logging Service
 *
 * Tracks important user actions and system events for security and compliance
 */

import { prisma } from '@/lib/prisma'

export interface CreateAuditLogParams {
  userId?: string
  action: string
  resource?: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        ...params,
        metadata: params.metadata || undefined,
      },
    })
    return { success: true, log }
  } catch (error) {
    console.error('Failed to create audit log:', error)
    return { success: false, error }
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({
        where: { userId },
      }),
    ])

    return { success: true, logs, total }
  } catch (error) {
    console.error('Failed to fetch user audit logs:', error)
    return { success: false, logs: [], total: 0 }
  }
}

/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(
  limit: number = 100,
  offset: number = 0,
  action?: string
) {
  try {
    const where = action ? { action } : {}

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { success: true, logs, total }
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return { success: false, logs: [], total: 0 }
  }
}

// ============================================================================
// Helper Functions for Common Audit Events
// ============================================================================

export async function logUserLogin(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.login',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function logUserLogout(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.logout',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function logUserRegistration(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.register',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function logPasswordChange(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.password_change',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function log2FAEnabled(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.2fa_enabled',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function log2FADisabled(userId: string, ipAddress?: string, userAgent?: string) {
  return createAuditLog({
    userId,
    action: 'user.2fa_disabled',
    resource: 'User',
    resourceId: userId,
    ipAddress,
    userAgent,
  })
}

export async function logSubscriptionCreated(
  userId: string,
  subscriptionId: string,
  metadata?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action: 'subscription.created',
    resource: 'Subscription',
    resourceId: subscriptionId,
    metadata,
  })
}

export async function logSubscriptionCancelled(
  userId: string,
  subscriptionId: string,
  metadata?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action: 'subscription.cancelled',
    resource: 'Subscription',
    resourceId: subscriptionId,
    metadata,
  })
}

export async function logPaymentSucceeded(
  userId: string,
  paymentId: string,
  metadata?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action: 'payment.succeeded',
    resource: 'Payment',
    resourceId: paymentId,
    metadata,
  })
}

export async function logPaymentFailed(
  userId: string,
  paymentId: string,
  metadata?: Record<string, any>
) {
  return createAuditLog({
    userId,
    action: 'payment.failed',
    resource: 'Payment',
    resourceId: paymentId,
    metadata,
  })
}

export async function logRoleChange(
  adminId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string
) {
  return createAuditLog({
    userId: adminId,
    action: 'admin.role_change',
    resource: 'User',
    resourceId: targetUserId,
    metadata: {
      oldRole,
      newRole,
      targetUserId,
    },
    ipAddress,
  })
}
