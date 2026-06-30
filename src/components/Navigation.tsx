import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import {
  Search,
  Bookmark,
  User,
  Menu,
  X,
  Github,
} from 'lucide-react'

export default function Navigation() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isLanding = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navVisible = !isLanding || scrolled

  const navLinks = [
    { to: '/explore', label: 'Explore', icon: Search },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { to: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        navVisible
          ? 'bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#222222]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          to="/"
          className="font-mono text-sm font-bold tracking-wider text-[#E2E2E2] hover:text-[#4ADE80] transition-colors"
        >
          REPOSCOPE
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                location.pathname === link.to
                  ? 'text-[#4ADE80] bg-[#111111]'
                  : 'text-[#8B8B8B] hover:text-[#E2E2E2] hover:bg-[#111111]'
              }`}
            >
              <link.icon size={14} />
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-[#222222]">
              <span className="text-xs text-[#8B8B8B] font-mono">
                {user?.name || 'User'}
              </span>
            </div>
          ) : (
            <a
              href="/login"
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-[#E2E2E2] text-[#050505] text-sm font-medium rounded hover:bg-white transition-colors"
            >
              <Github size={14} />
              Connect
            </a>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-[#E2E2E2] p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#222222]">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm ${
                  location.pathname === link.to
                    ? 'text-[#4ADE80] bg-[#111111]'
                    : 'text-[#8B8B8B] hover:text-[#E2E2E2]'
                }`}
              >
                <link.icon size={14} />
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? null : (
              <a
                href="/login"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E2E2E2] text-[#050505] text-sm font-medium rounded mt-2"
              >
                <Github size={14} />
                Connect
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
