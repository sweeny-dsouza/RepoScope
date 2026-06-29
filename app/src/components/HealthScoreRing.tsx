interface HealthScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

export default function HealthScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
}: HealthScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = () => {
    if (score >= 80) return '#22C55E'
    if (score >= 60) return '#EAB308'
    if (score >= 40) return '#F97316'
    return '#EF4444'
  }

  const getLabel = () => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Moderate'
    return 'Needs Attention'
  }

  const color = getColor()

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#222222"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
        style={{
          color,
          backgroundColor: `${color}15`,
        }}
      >
        {getLabel()}
      </span>
    </div>
  )
}
