import './globals.css'

export const dynamic = 'force-dynamic'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: 'LiDex - Light Novel, Anime & Manga Analytics',
  description: 'A personal project tracking and analyzing data for Light Novels, Anime, and Manga.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-light-900 dark:bg-dark-900 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <Suspense>
          <LocaleProvider>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <Footer />
          </LocaleProvider>
        </Suspense>
      </body>
    </html>
  )
}
