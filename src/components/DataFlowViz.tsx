import { useEffect, useRef } from 'react'

export default function DataFlowViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    function draw() {
      const time = Date.now() * 0.001
      const cy = h / 2

      // Trail effect
      ctx!.fillStyle = 'rgba(5, 5, 5, 0.2)'
      ctx!.fillRect(0, 0, w, h)

      ctx!.globalCompositeOperation = 'lighter'

      // Packet Columns (Left/Center)
      for (let i = 50; i < Math.min(350, w - 50); i += 2) {
        const hVal = 100 + Math.sin(i * 0.02 - time * 2) * 50 + (Math.sin(time * 0.5) * 50)
        if (Math.random() > 0.95) {
          ctx!.strokeStyle = '#4ADE80'
          ctx!.lineWidth = 2
        } else {
          ctx!.strokeStyle = 'rgba(74, 222, 128, 0.1)'
          ctx!.lineWidth = 1
        }
        ctx!.beginPath()
        ctx!.moveTo(i, cy + hVal / 2)
        ctx!.lineTo(i, cy - hVal / 2)
        ctx!.stroke()
      }

      // Wavefront (Right/Fluid Dynamics)
      if (w > 450) {
        ctx!.strokeStyle = '#3B82F6'
        ctx!.lineWidth = 2
        ctx!.beginPath()
        const startX = Math.min(400, w * 0.6)
        const endX = Math.min(550, w - 20)
        for (let i = startX; i < endX; i++) {
          const y = cy + Math.sin(i * 0.01 - time) * 20 + Math.cos(i * 0.03 + time) * 10
          if (i === startX) {
            ctx!.moveTo(i, y)
          } else {
            ctx!.lineTo(i, y)
          }
        }
        ctx!.stroke()

        // Text callouts
        ctx!.clearRect(450, cy - 60, 120, 40)
        ctx!.fillStyle = '#4ADE80'
        ctx!.font = '10px "JetBrains Mono", monospace'
        const throughput = (100 + Math.sin(time) * 50).toFixed(1)
        ctx!.fillText(`THROUGHPUT: ${throughput} MB/s`, Math.min(450, w * 0.7), cy - 40)
      }

      ctx!.globalCompositeOperation = 'source-over'
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
