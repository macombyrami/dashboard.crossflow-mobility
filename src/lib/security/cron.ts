import { NextRequest, NextResponse } from 'next/server'
import { ENV, hasCronSecret } from '@/lib/config/env'

type CronAuthOptions = {
  headerName?: 'authorization' | 'x-cron-secret'
}

function extractSecret(request: NextRequest, headerName: NonNullable<CronAuthOptions['headerName']>) {
  if (headerName === 'x-cron-secret') {
    return request.headers.get('x-cron-secret') ?? ''
  }

  const authHeader = request.headers.get('authorization') ?? ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
}

export function isAuthorizedCronRequest(
  request: NextRequest,
  options: CronAuthOptions = {},
) {
  if (!hasCronSecret()) return false

  const headerName = options.headerName ?? 'authorization'
  const providedSecret = extractSecret(request, headerName)
  return providedSecret.length > 0 && providedSecret === ENV.CRON_SECRET
}

export function unauthorizedCronResponse() {
  return NextResponse.json(
    { error: 'Unauthorized: valid cron secret required' },
    { status: 401 },
  )
}
