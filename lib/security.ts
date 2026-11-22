import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { customAlphabet } from 'nanoid'

const ALPHANUMERIC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const newId = customAlphabet(ALPHANUMERIC, 7)
export const newToken = customAlphabet(ALPHANUMERIC, 32)

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

export const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const normalizeAnswer = (answer: string) => answer.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')

export async function hashSecret(answer: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(normalizeAnswer(answer), salt, 32)
  return ['scrypt', salt.toString('base64'), key.toString('base64')].join(':')
}

export async function verifySecret(answer: string, stored: string): Promise<boolean> {
  const [scheme, salt, key] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const actual = await scryptAsync(normalizeAnswer(answer), Buffer.from(salt, 'base64'), 32)
  return timingSafeEqual(actual, Buffer.from(key, 'base64'))
}

export async function isBot(): Promise<boolean> {
  if (!process.env.VERCEL) return false
  const { checkBotId } = await import('botid/server')
  return (await checkBotId()).isBot
}

export const clientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local'
