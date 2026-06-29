import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import PremiumHero from '@/components/PremiumHero'
import DataFlowViz from '@/components/DataFlowViz'
import RepoCard from '@/components/RepoCard'
import {
  ArrowRight,
  Search,
  BarChart3,
  Bookmark,
  Sparkles,
  TrendingUp,
  GitFork,
  Star,
} from 'lucide-react'

export default function LandingPage() {
  useAuth()
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '> Initializing RepoScope...',
    '> Loading repository index...',
    '> Ready.',
  ])
  const [activeRepo, setActiveRepo] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const { data: trending } = trpc.github.getTrending.useQuery(
    { since: 'weekly' },
    { staleTime: 1000 * 60 * 30 }
  )

  // Auto-type terminal logs
  useEffect(() => {
    const logs = [
      '> Analyzing repository: facebook/react',
      '> Stars: 220k | Forks: 45k | Health: 98%',
      '> Predicted trend: Stable growth',
      '> Contribution difficulty: Intermediate',
      '> AI Summary: A declarative UI library...',
      '---',
      '> Analyzing repository: vercel/next.js',
      '> Stars: 127k | Forks: 27k | Health: 95%',
      '> Predicted trend: Strong growth',
      '> Contribution difficulty: Intermediate',
      '> AI Summary: The React Framework...',
    ]

    let idx = 0
    const interval = setInterval(() => {
      if (idx < logs.length) {
        setTerminalLogs((prev) => [...prev.slice(-8), logs[idx]])
        idx++
      } else {
        idx = 0
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLogs])

  return (
    <div className="relative">
      {/* Premium Hero Section */}
      <PremiumHero />

      {/* Command Center Split Interface */}
      <section className="relative z-10 min-h-screen bg-[#050505]/95 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Left Panel - Repository Explorer */}
          <div className="flex-1 lg:w-[60%] p-6 lg:p-10 overflow-y-auto">
            <div className="flex items-center gap-3 mb-8">
              <Search size={18} className="text-[#4ADE80]" />
              <h2 className="text-xl font-bold text-[#E2E2E2]">
                Repository Explorer
              </h2>
              <span className="text-xs text-[#555555] font-mono ml-auto">
                {trending?.length || 0} repos indexed
              </span>
            </div>

            {/* Repo Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trending?.slice(0, 8).map((repo) => (
                <div
                  key={repo.id}
                  onMouseEnter={() =>
                    setActiveRepo(`${repo.owner}/${repo.name}`)
                  }
                >
                  <RepoCard repo={repo} showActions={false} />
                </div>
              ))}

              {!trending &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-5 animate-pulse"
                  >
                    <div className="h-4 bg-[#111111] rounded w-3/4 mb-3" />
                    <div className="h-3 bg-[#111111] rounded w-full mb-2" />
                    <div className="h-3 bg-[#111111] rounded w-2/3" />
                  </div>
                ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 text-sm text-[#4ADE80] hover:text-[#22C55E] transition-colors"
              >
                View all repositories
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Right Panel - Intelligence Terminal */}
          <div className="lg:w-[40%] bg-[#050505] border-l border-[#222222] p-6 lg:p-8">
            <div className="sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <h3 className="text-sm font-mono font-bold text-[#E2E2E2] uppercase tracking-wider">
                  Intelligence Terminal
                </h3>
              </div>

              {/* Terminal */}
              <div
                ref={terminalRef}
                className="bg-[#0A0A0A] border border-[#222222] rounded p-4 h-[300px] overflow-y-auto font-mono text-xs leading-relaxed"
              >
                {terminalLogs.map((log, i) => {
                  const safeLog = log ?? ''
                  return (
                    <div
                      key={i}
                      className={`mb-1 ${
                        safeLog.startsWith('---')
                          ? 'text-[#555555]'
                          : safeLog.startsWith('> AI')
                            ? 'text-[#3B82F6]'
                            : 'text-[#8B8B8B]'
                      }`}
                    >
                      {safeLog}
                    </div>
                  )
                })}
                <div className="w-2 h-4 bg-[#4ADE80] animate-pulse inline-block" />
              </div>

              {/* Floating Data Flow Card */}
              <div className="mt-6 border border-white/20 bg-[#0A0A0A]/60 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#222222]">
                  <span className="text-[10px] font-mono text-[#555555] uppercase tracking-wider">
                    Live Data Flow
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#4ADE80]">
                      ACTIVE
                    </span>
                  </div>
                </div>
                <div className="h-[200px]">
                  <DataFlowViz />
                </div>
              </div>

              {/* Active repo info */}
              {activeRepo && (
                <div className="mt-6 p-4 border border-[#222222] rounded bg-[#0A0A0A]">
                  <span className="text-[10px] font-mono text-[#555555] uppercase tracking-wider block mb-2">
                    Currently Analyzing
                  </span>
                  <span className="text-sm font-mono text-[#4ADE80]">
                    {activeRepo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Star, label: 'Repos Tracked', value: '2.4M+' },
              { icon: GitFork, label: 'Contributors', value: '50M+' },
              { icon: TrendingUp, label: 'Daily Updates', value: '100K+' },
              { icon: Sparkles, label: 'AI Insights', value: '10K+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon
                  size={20}
                  className="mx-auto mb-3 text-[#4ADE80]"
                />
                <div className="text-2xl md:text-3xl font-bold text-[#E2E2E2] font-mono mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-[#555555] font-mono uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6 bg-[#050505]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#E2E2E2] mb-4 text-center">
            Everything You Need to
            <span className="text-[#4ADE80]"> Analyze Code</span>
          </h2>
          <p className="text-sm text-[#8B8B8B] text-center mb-16 max-w-lg mx-auto">
            A complete toolkit for understanding, evaluating, and contributing
            to open-source projects.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: 'Smart Discovery',
                desc: 'Search and filter repositories by language, stars, activity, and health score.',
                color: '#4ADE80',
              },
              {
                icon: BarChart3,
                title: 'Health Analytics',
                desc: 'Get a comprehensive 0-100 health score based on activity, issues, and community.',
                color: '#3B82F6',
              },
              {
                icon: Sparkles,
                title: 'AI Summaries',
                desc: 'Read AI-generated summaries that explain what a project does and who it is for.',
                color: '#EAB308',
              },
              {
                icon: Bookmark,
                title: 'Bookmark & Note',
                desc: 'Save repositories to collections and write personal notes for future reference.',
                color: '#8B5CF6',
              },
              {
                icon: TrendingUp,
                title: 'Track Trends',
                desc: 'Monitor star growth, contribution activity, and issue resolution trends.',
                color: '#F97316',
              },
              {
                icon: GitFork,
                title: 'Find Opportunities',
                desc: 'Identify beginner-friendly repos with good first issues and responsive maintainers.',
                color: '#22C55E',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 border border-[#222222] rounded-lg bg-[#0A0A0A] hover:border-[#333333] transition-all duration-200"
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon size={18} style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm font-bold text-[#E2E2E2] mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-[#8B8B8B] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
