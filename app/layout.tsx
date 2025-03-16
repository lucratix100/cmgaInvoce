import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CMGA Invoice',
  description: 'Gestion des factures CMGA',
  generator: 'CMGA Invoice',
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