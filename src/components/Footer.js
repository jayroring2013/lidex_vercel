import Link from 'next/link'
import { Github, Twitter, Mail, BarChart3 } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-dark-700 py-12 px-4 bg-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">LiDex</span>
            </div>
            <p className="text-secondary text-sm">
              A personal project tracking LN/Anime/Manga data since 2013.
            </p>
          </div>

          <div>
            <h4 className="text-primary font-semibold mb-4">Pages</h4>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link href="/" className="hover:text-primary-500">Home</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary-500">Dashboard</Link></li>
              <li><Link href="/reports" className="hover:text-primary-500">Reports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-primary font-semibold mb-4">Connect</h4>
            <div className="flex items-center space-x-4">
              <a href="https://github.com/jayroring2013" target="_blank" className="text-secondary hover:text-primary">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-secondary hover:text-primary">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-secondary hover:text-primary">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-dark-700 pt-8 text-center text-muted text-sm">
          <p>© 2013-2026 LiDex. Built by Jay Roring.</p>
        </div>
      </div>
    </footer>
  )
}
