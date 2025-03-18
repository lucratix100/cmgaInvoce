import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CMGA Delivery',
  description: 'Suivi livraisons CMGA',
  generator: 'CMGA Delivery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
} 