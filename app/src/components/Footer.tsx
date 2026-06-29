import { Link } from 'react-router'
import { Github, Twitter, Linkedin } from 'lucide-react'

export default function Footer() {
  const linkGroups = [
    {
      title: 'PLATFORM',
      links: [
        { label: 'Explore', to: '/explore' },
        { label: 'Trending', to: '/explore?trending=true' },
        { label: 'Analytics', to: '/explore' },
        { label: 'Bookmarks', to: '/bookmarks' },
      ],
    },
    {
      title: 'INSIGHTS',
      links: [
        { label: 'Repository Health', to: '/explore' },
        { label: 'Contribution Metrics', to: '/explore' },
        { label: 'Language Trends', to: '/explore' },
      ],
    },
    {
      title: 'DEVELOPERS',
      links: [
        { label: 'Documentation', to: '#' },
        { label: 'API', to: '#' },
        { label: 'Guides', to: '#' },
      ],
    },
    {
      title: 'COMMUNITY',
      links: [
        { label: 'Open Source', to: '#' },
        { label: 'Discussions', to: '#' },
        { label: 'Learning Paths', to: '#' },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-[#222222] bg-[#050505] overflow-hidden">
      {/* Animated glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#4ADE80]/20 via-[#3B82F6]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <Link
              to="/"
              className="font-mono text-lg font-bold tracking-wider text-[#E2E2E2] hover:text-[#4ADE80] transition-colors"
            >
              REPOSCOPE
            </Link>
            <p className="mt-3 text-sm text-[#8B8B8B] leading-relaxed max-w-[280px]">
              Intelligent repository exploration for the modern developer.
            </p>
          </div>

          {/* Link Groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-mono text-[#555555] tracking-widest mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-[#8B8B8B] hover:text-[#E2E2E2] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#222222] gap-4">
          <p className="text-xs text-[#555555] font-mono">
            &copy; 2026 RepoScope. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-[#555555] hover:text-[#4ADE80] transition-colors"
            >
              <Github size={16} />
            </a>
            <a
              href="#"
              className="text-[#555555] hover:text-[#4ADE80] transition-colors"
            >
              <Twitter size={16} />
            </a>
            <a
              href="#"
              className="text-[#555555] hover:text-[#4ADE80] transition-colors"
            >
              <Linkedin size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
