import { Zap, AlertTriangle, Shield } from 'lucide-react'

interface DifficultyBadgeProps {
  rating: 'beginner' | 'intermediate' | 'advanced'
  label?: string
  size?: 'sm' | 'md'
}

const config = {
  beginner: {
    color: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.1)',
    icon: Zap,
    defaultLabel: 'Beginner Friendly',
  },
  intermediate: {
    color: '#EAB308',
    bg: 'rgba(234, 179, 8, 0.1)',
    icon: AlertTriangle,
    defaultLabel: 'Intermediate',
  },
  advanced: {
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    icon: Shield,
    defaultLabel: 'Senior Level',
  },
}

export default function DifficultyBadge({
  rating,
  label,
  size = 'md',
}: DifficultyBadgeProps) {
  const c = config[rating]
  const Icon = c.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
      style={{
        color: c.color,
        backgroundColor: c.bg,
        border: `1px solid ${c.color}30`,
      }}
    >
      <Icon size={size === 'sm' ? 10 : 12} />
      {label || c.defaultLabel}
    </span>
  )
}
