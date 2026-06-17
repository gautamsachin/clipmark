import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clipmark — Video Bookmark Dashboard',
  description: 'Bookmark YouTube and Instagram videos at any timestamp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
