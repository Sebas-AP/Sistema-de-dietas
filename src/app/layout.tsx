import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mi dieta semanal',
  description: 'Organiza tus comidas, compras y preparación de la semana.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/app-icon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  )
}
