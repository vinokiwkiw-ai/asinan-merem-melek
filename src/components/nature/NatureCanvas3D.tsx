import React, { useEffect, useState, useRef } from 'react'

export const NatureCanvas3D: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setMousePos({ x, y })
    }

    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Parallax offsets based on depth layers
  const bgOffsetX = mousePos.x * 10
  const bgOffsetY = mousePos.y * 5 + scrollY * 0.05

  const midOffsetX = mousePos.x * 25
  const midOffsetY = mousePos.y * 12 + scrollY * 0.15

  const foreOffsetX = mousePos.x * 50
  const foreOffsetY = mousePos.y * 25 + scrollY * 0.3

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      
      {/* LAYER 1: SKY & SUNSET GLOW BACKGROUND */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${bgOffsetX}px, ${-bgOffsetY}px, 0px)`,
        }}
      >
        {/* Soft Radial Warm Sunlight */}
        <div className="absolute top-[-10%] right-[15%] w-[600px] h-[600px] rounded-full bg-radial-gradient from-amber-400/20 via-amber-600/10 to-transparent blur-3xl opacity-80 animate-pulse-slow" />
        
        {/* Distant Mountain Silhouettes */}
        <svg
          viewBox="0 0 1440 320"
          className="absolute bottom-[25%] left-0 w-full h-[40vh] opacity-30 text-[#072a1d] fill-current"
          preserveAspectRatio="none"
        >
          <path d="M0,192L120,170.7C240,149,480,107,720,128C960,149,1200,235,1320,277.3L1440,320L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
        </svg>

        {/* Drifting Clouds */}
        <div className="absolute top-[12%] left-[10%] opacity-20 text-white animate-float">
          <svg className="w-48 h-24 fill-current"><path d="M10 40 Q 30 10, 60 40 T 110 40 T 160 40 Q 180 60, 150 70 H 10 Z" /></svg>
        </div>
        <div className="absolute top-[20%] right-[20%] opacity-15 text-white animate-float" style={{ animationDelay: '2s' }}>
          <svg className="w-64 h-32 fill-current"><path d="M10 40 Q 30 10, 60 40 T 110 40 T 160 40 Q 180 60, 150 70 H 10 Z" /></svg>
        </div>
      </div>

      {/* LAYER 2: MIDDLE GROUND — PALM TREES & RICE FIELDS */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(${midOffsetX}px, ${-midOffsetY}px, 0px)`,
        }}
      >
        {/* Rice Field Hills Contour Lines */}
        <div className="absolute bottom-[10%] left-0 right-0 h-[35vh] bg-gradient-to-t from-[#0b3826] via-[#10462f]/80 to-transparent opacity-90" />
        
        {/* Swaying Palm Tree Silhouettes */}
        <div className="absolute bottom-[15%] left-[5%] text-[#10462f] opacity-40 transform -rotate-3">
          <span className="text-8xl">🌴</span>
        </div>
        <div className="absolute bottom-[20%] right-[8%] text-[#10462f] opacity-40 transform rotate-6">
          <span className="text-9xl">🌴</span>
        </div>
      </div>

      {/* LAYER 3: FOREGROUND — SWAYING GRASS & FLOATING FRESH FRUITS */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${foreOffsetX}px, ${-foreOffsetY}px, 0px)`,
        }}
      >
        {/* Floating Mangoes & Tropical Fruits */}
        <div className="absolute top-[25%] left-[8%] animate-float text-4xl opacity-80 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
          🥭
        </div>
        <div className="absolute top-[45%] right-[6%] animate-float text-5xl opacity-75 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]" style={{ animationDelay: '1.5s' }}>
          🌶️
        </div>
        <div className="absolute top-[65%] left-[12%] animate-float text-4xl opacity-70 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" style={{ animationDelay: '3s' }}>
          🥣
        </div>

        {/* Swaying Rice Grass Border at Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#072a1d] to-transparent flex items-end justify-between px-8 text-2xl text-[#A8D5A2]/30 opacity-60">
          <span className="animate-pulse">🌾</span>
          <span>🌿</span>
          <span className="animate-pulse" style={{ animationDelay: '1s' }}>🌾</span>
          <span>🌿</span>
          <span className="animate-pulse" style={{ animationDelay: '2s' }}>🌾</span>
        </div>
      </div>

      {/* Ambient Lighting Overlay Grid */}
      <div className="absolute inset-0 bg-radial-dots opacity-40" />
    </div>
  )
}
