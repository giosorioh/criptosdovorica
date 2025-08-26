import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Criptos do Vô Rica',
  description: 'Criptos em tempo real do vô rica',
  generator: 'vercel.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
