'use client'

import dynamic from 'next/dynamic'
import { Shell } from './Shell'

export const ClientEntry = dynamic(() => import('./App').then((m) => m.App), { ssr: false, loading: Shell })
