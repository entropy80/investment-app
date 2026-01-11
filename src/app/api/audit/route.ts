/**
 * Audit Logs API - View audit logs (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllAuditLogs, getUserAuditLogs } from '@/lib/audit/audit-service'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') || 'user' // 'user' or 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action') || undefined

    // If scope is 'all', check if user is admin
    if (scope === 'all') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })

      if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      const result = await getAllAuditLogs(limit, offset, action)
      return NextResponse.json(result)
    }

    // Regular users can only see their own logs
    const result = await getUserAuditLogs(session.user.id, limit, offset)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Audit logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
