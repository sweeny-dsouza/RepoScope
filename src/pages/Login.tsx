import { Github, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

function getOAuthUrl() {
  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID

  if (!githubClientId) {
    console.error("❌ ERROR: VITE_GITHUB_CLIENT_ID is undefined!")
    console.error("Check: app/.env file exists and contains VITE_GITHUB_CLIENT_ID")
    console.error("File: app/src/pages/Login.tsx, function: getOAuthUrl()")
    alert("GitHub OAuth not configured. Check console for details.")
    return '#'
  }

  const redirectUri = `${window.location.origin}/api/github/callback`

  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', githubClientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'read:user user:email')

  return url.toString()
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20">
          <div className="absolute inset-0 bg-gradient-radial from-[#4ADE80]/30 via-transparent to-transparent blur-3xl" />
        </div>
      </div>

      <div className="relative w-full max-w-sm mx-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8B8B8B] hover:text-[#E2E2E2] transition-colors mb-8"
        >
          <ArrowLeft size={12} />
          Back to RepoScope
        </Link>

        <div className="bg-[#0A0A0A] border border-[#222222] rounded-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-mono text-lg font-bold tracking-wider text-[#E2E2E2] mb-2">
              REPOSCOPE
            </h1>
            <p className="text-xs text-[#8B8B8B]">
              Sign in to bookmark repos, save notes, and get personalized recommendations.
            </p>
          </div>

          {/* Sign in button */}
          <button
            onClick={() => {
              window.location.href = getOAuthUrl()
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E2E2E2] text-[#050505] text-sm font-medium rounded hover:bg-white active:scale-[0.98] transition-all"
          >
            <Github size={16} />
            Sign in with GitHub
          </button>

          <div className="mt-6 pt-6 border-t border-[#222222] text-center">
            <p className="text-[10px] text-[#555555] font-mono">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
