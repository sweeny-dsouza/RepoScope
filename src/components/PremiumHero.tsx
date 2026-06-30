import { useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Spline from '@splinetool/react-spline'

export default function PremiumHero() {
  const heroRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#070b0a]">
      {/* Spline Background */}
      <div className="absolute inset-0">
        <Spline
          scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
          className="h-full w-full"
        />
      </div>

      {/* Subtle dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 bg-[#070b0a]/25" />

      {/* Hero content */}
      <div
        ref={heroRef}
        className="relative z-20 flex h-full flex-col items-center justify-center px-6"
      >
        <div
          className="mx-auto max-w-5xl text-center"
          style={{
            animation: 'fadeUp 1s ease-out both',
          }}
        >
          {/* Headline */}
          <h1
            className="mb-6 font-bold leading-tight tracking-tight"
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              color: '#ffffff',
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #5ed29c 50%, #00d4ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Understand a Repository
            </span>
            <br />
            <span className="text-white">Before You Contribute</span>
          </h1>

          {/* Supporting text */}
          <p
            className="mx-auto mb-10 max-w-2xl text-base leading-relaxed md:text-lg"
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              animation: 'fadeUp 1s ease-out 0.2s both',
            }}
          >
            Get instant insights on repository health, contributor difficulty, growth trends, and
            community strength. Make data-driven decisions about where to invest your time.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            style={{ animation: 'fadeUp 1s ease-out 0.4s both' }}
          >
            <Link
              to="/explore"
              className="group flex items-center gap-2 rounded-lg border border-[#5ed29c]/50 bg-[#5ed29c]/10 px-8 py-3.5 text-sm font-medium text-[#5ed29c] backdrop-blur-sm transition-all duration-200 hover:border-[#5ed29c] hover:bg-[#5ed29c]/20"
            >
              Start Exploring
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <a
              href="/login"
              className="rounded-lg border border-white/20 px-8 py-3.5 text-sm font-medium text-white/70 transition-all duration-200 hover:border-white/40 hover:text-white"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ animation: 'fadeUp 1s ease-out 0.6s both' }}
        >
          <span className="text-[10px] uppercase tracking-widest text-white/30">
            Scroll
          </span>
          <ChevronDown size={16} className="animate-bounce text-white/30" />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
