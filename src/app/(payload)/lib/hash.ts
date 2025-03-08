import 'server-only'

import { createHmac } from 'crypto'

export function hashWithHmac(value: string): string {
  const secret = process.env.PAYLOAD_SECRET

  if (!secret) {
    throw new Error('Failed to generate hash. Please check config')
  }

  return createHmac('sha256', secret).update(value).digest('hex')
}
