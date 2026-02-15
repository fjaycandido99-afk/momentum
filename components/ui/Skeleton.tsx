'use client'

export function Skeleton({ width, height, className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-2xl ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonCardRow({ heroCard = false, count = 4 }: { heroCard?: boolean; count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
      {Array.from({ length: count }).map((_, i) => {
        const isHero = i === 0 && heroCard
        const skelSize = isHero ? 'w-56 h-56' : 'w-40 h-40'
        const skelWidth = isHero ? 'w-56' : 'w-40'
        return (
          <div key={i} className={`shrink-0 ${skelWidth}`}>
            <div className={`${skelSize} rounded-2xl card-gradient-border skeleton-shimmer`} />
            <div className="h-3 bg-[#111113] rounded mt-2 w-3/4" />
            <div className="h-2 bg-[#111113] rounded mt-1.5 w-1/2" />
          </div>
        )
      })}
    </div>
  )
}

export function SkeletonHeroCarousel() {
  return (
    <div className="px-6 mb-6">
      <div className="w-full h-40 rounded-2xl skeleton-shimmer" />
    </div>
  )
}
