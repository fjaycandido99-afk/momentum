'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

/**
 * Scroll Reveal - adds 'revealed' class when element enters viewport
 */
export function useScrollReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    const elements = container.querySelectorAll('.scroll-reveal')
    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [containerRef])
}

/**
 * Parallax - moves elements at different speeds on scroll.
 * Disabled on touch devices to prevent scroll jank.
 */
export function useParallax(scrollRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // Skip parallax on touch devices — causes jank during scroll
    if (window.matchMedia('(hover: none)').matches) return

    const el = scrollRef.current
    if (!el) return

    let rafId: number
    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const headers = el.querySelectorAll<HTMLElement>('.parallax-header')
        headers.forEach((header) => {
          const rect = header.getBoundingClientRect()
          const offset = (rect.top / window.innerHeight) * 15
          header.style.transform = `translateY(${offset}px)`
        })
      })
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef])
}

/**
 * Magnetic Hover - cards tilt toward pointer
 */
export function useMagneticHover() {
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Skip on touch — tilt is a hover effect, on touch it fires during scroll and feels janky
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -4
    const rotateY = ((x - centerX) / centerX) * 4
    const translateX = ((x - centerX) / centerX) * 2
    const translateY = ((y - centerY) / centerY) * 2

    el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate(${translateX}px, ${translateY}px)`
  }, [])

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.transform = ''
  }, [])

  return { handlePointerMove, handlePointerLeave }
}

/**
 * Ripple Burst - spawns an expanding circle at click position
 */
export function useRippleBurst() {
  const spawnRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const size = Math.max(rect.width, rect.height) * 2

    const ripple = document.createElement('div')
    ripple.className = 'ripple-burst'
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.style.width = `${size}px`
    ripple.style.height = `${size}px`

    el.style.position = 'relative'
    el.style.overflow = 'hidden'
    el.appendChild(ripple)

    ripple.addEventListener('animationend', () => ripple.remove())
  }, [])

  return spawnRipple
}

