import React, { useEffect, useState } from 'react'

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [hoverState, setHoverState] = useState<'normal' | 'button' | 'card'>('normal')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Enable only on desktop non-touch devices
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024 && !('ontouchstart' in window))
    }
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })

      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('a')) {
        setHoverState('button')
      } else if (target.closest('.group') || target.closest('.glass-card')) {
        setHoverState('card')
      } else {
        setHoverState('normal')
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('resize', checkIsDesktop)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  if (!isDesktop) return null

  return (
    <div
      className={`fixed top-0 left-0 pointer-events-none z-[9999] transition-transform duration-100 ease-out transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border border-white/40 backdrop-blur-sm ${
        hoverState === 'button'
          ? 'w-16 h-16 bg-[#A8D5A2]/80 text-[#0b3826] font-extrabold text-[10px] scale-110 shadow-2xl'
          : hoverState === 'card'
          ? 'w-20 h-20 bg-[#F5E6A3]/80 text-[#0b3826] font-extrabold text-[10px] scale-110 shadow-2xl'
          : 'w-4 h-4 bg-white/60'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {hoverState === 'button' && 'LIHAT'}
      {hoverState === 'card' && 'EXPLORE'}
    </div>
  )
}
