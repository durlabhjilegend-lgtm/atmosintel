import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AtmosIntel — Delhi AQI',
  description: 'Hyper-local air quality intelligence for Delhi-NCR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b0c10] text-white antialiased">{children}</body>
    </html>
  )
}