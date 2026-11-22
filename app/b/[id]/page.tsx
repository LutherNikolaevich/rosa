import type { Metadata } from 'next'
import { isExpired, loadBouquet } from '@/lib/bouquets'
import { ClientEntry } from '@/src/screens/ClientEntry'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await loadBouquet((await params).id).catch(() => null)
  const to = row && !isExpired(row) ? row.state.card.to : null
  const title = to ? `A bouquet for ${to} 💐` : 'A bouquet for you 💐'
  const description = 'Someone made you a bouquet. Tap to open it.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'rosa' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function BouquetPage() {
  return <ClientEntry />
}
