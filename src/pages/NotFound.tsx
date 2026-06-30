import { Link } from 'react-router'
import { ArrowLeft, GitBranch } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-6">
      <div className="text-center">
        <GitBranch size={32} className="mx-auto mb-4 text-[#333333]" />
        <h1 className="text-6xl font-bold text-[#E2E2E2] font-mono mb-2">
          404
        </h1>
        <p className="text-sm text-[#8B8B8B] mb-8">
          This branch does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#222222] rounded text-sm text-[#8B8B8B] hover:text-[#E2E2E2] hover:border-[#333333] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
