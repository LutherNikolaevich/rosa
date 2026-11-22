import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

const limiter = (requests: number, window: `${number} ${'m' | 'h'}`, prefix: string) =>
  redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window), prefix: `rosa_rl:${prefix}` }) : null

const LIMITERS = {
  create: limiter(10, '1 h', 'create'),
  upload: limiter(60, '1 h', 'upload'),
  react: limiter(10, '1 h', 'react'),
  secret: limiter(5, '1 m', 'secret'),
}

export async function limited(name: keyof typeof LIMITERS, key: string): Promise<boolean> {
  const rule = LIMITERS[name]
  if (!rule) return false
  return !(await rule.limit(key)).success
}
