'use client'

import { useEffect, useRef } from 'react'
import BubbleShooter from './BubbleShooter'

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BubbleShooter | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const game = new BubbleShooter(canvas)
    gameRef.current = game
    game.start()

    return () => {
      game.stop()
    }
  }, [])

  return (
    <main style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw'
    }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={900}
        style={{
          border: '4px solid #ffffff',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: '100%',
          maxHeight: '100vh'
        }}
      />
    </main>
  )
}
