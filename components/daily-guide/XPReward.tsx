'use client'

import { useState, useEffect } from 'react'

interface XPRewardProps {
  xp: number
  show: boolean
}

export function XPReward({ xp, show }: XPRewardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [show])

  if (!visible) return null

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-xp-float text-center">
        <span className="text-lg font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
          +{xp} XP
        </span>
      </div>
      <style jsx>{`
        @keyframes xp-float {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(-20px); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        .animate-xp-float {
          animation: xp-float 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
