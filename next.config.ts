import type { NextConfig } from 'next'
import { withBotId } from 'botid/next/config'

const config: NextConfig = {
  allowedDevOrigins: ['192.168.1.13'],
  serverExternalPackages: ['@electric-sql/pglite'],
  devIndicators: false,
}

export default withBotId(config)
