import { Link } from 'react-router'
import {
  Star,
  GitFork,
  Circle,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react'
interface RepoCardProps {
  repo: {
    id: number
    name: string
    fullName: string
    owner: string
    description: string | null
    stars: number
    forks: number
    language: string | null
    updatedAt: string
    openIssues: number
    url: string
    avatarUrl?: string
  }
  isBookmarked?: boolean
  onBookmarkToggle?: () => void
  showActions?: boolean
}

const languageColors: Record<string, string> = {
  JavaScript: '#EAB308',
  TypeScript: '#3B82F6',
  Python: '#8B5CF6',
  Java: '#EF4444',
  Go: '#06B6D4',
  Rust: '#F97316',
  Ruby: '#EF4444',
  PHP: '#8B5CF6',
  'C++': '#3B82F6',
  C: '#555555',
  Swift: '#F97316',
  Kotlin: '#8B5CF6',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export default function RepoCard({
  repo,
  isBookmarked = false,
  onBookmarkToggle,
  showActions = true,
}: RepoCardProps) {
  const langColor = languageColors[repo.language || ''] || '#8B8B8B'

  return (
    <div className="group relative bg-[#0A0A0A] border border-[#222222] rounded-lg p-5 hover:border-[#333333] hover:-translate-y-0.5 transition-all duration-200">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {repo.avatarUrl ? (
            <img
              src={repo.avatarUrl}
              alt={repo.owner}
              className="w-8 h-8 rounded-full border border-[#222222] flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center flex-shrink-0">
              <Circle size={14} className="text-[#555555]" />
            </div>
          )}
          <div className="min-w-0">
            <Link
              to={`/repo/${repo.owner}/${repo.name}`}
              className="text-sm font-medium text-[#E2E2E2] hover:text-[#4ADE80] transition-colors truncate block"
            >
              {repo.owner}/<span className="font-bold">{repo.name}</span>
            </Link>
          </div>
        </div>

        {showActions && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBookmarkToggle?.()
            }}
            className="p-1.5 rounded hover:bg-[#111111] transition-colors flex-shrink-0 ml-2"
          >
            {isBookmarked ? (
              <BookmarkCheck size={16} className="text-[#4ADE80]" />
            ) : (
              <Bookmark size={16} className="text-[#555555] group-hover:text-[#8B8B8B]" />
            )}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-[#8B8B8B] mb-4 line-clamp-2 leading-relaxed">
        {repo.description || 'No description available.'}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[#555555]">
        <div className="flex items-center gap-1">
          <Star size={12} />
          <span className="font-mono">{formatNumber(repo.stars)}</span>
        </div>
        <div className="flex items-center gap-1">
          <GitFork size={12} />
          <span className="font-mono">{formatNumber(repo.forks)}</span>
        </div>
        {repo.language && (
          <div className="flex items-center gap-1">
            <Circle size={8} fill={langColor} stroke="none" />
            <span>{repo.language}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <AlertCircle size={10} />
          <span>{repo.openIssues} open</span>
        </div>
      </div>

      {/* Updated */}
      <div className="mt-3 pt-3 border-t border-[#222222]">
        <span className="text-[10px] text-[#555555] font-mono uppercase tracking-wider">
          Updated {formatDate(repo.updatedAt)}
        </span>
      </div>
    </div>
  )
}
