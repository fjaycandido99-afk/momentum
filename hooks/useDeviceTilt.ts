'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseDeviceTiltOptions {
  enabled?: boolean
  maxGyro?: number
  maxMouse?: number
}

interface UseDeviceTiltReturn {
  rotateX: number
  rotateY: number
  requestPermission: () => void
  permissionNeeded: boolean
}

export function useDeviceTilt({
  enabled = true,
  maxGyro = 6,
  maxMouse = 4,
}: UseDeviceTiltOptions = {}): UseDeviceTiltReturn {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [permissionNeeded, setPermissionNeeded] = useState(false)

  const rafRef = useRef<number>(0)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const animatingRef = useRef(false)

  // Smooth animation loop — lerp toward target values
  const animate = useCallback(() => {
    const lerp = 0.1
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * lerp
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * lerp

    setRotateX(Math.round(currentRef.current.x * 100) / 100)
    setRotateY(Math.round(currentRef.current.y * 100) / 100)

    // Keep animating while there's meaningful difference
    const dx = Math.abs(targetRef.current.x - currentRef.current.x)
    const dy = Math.abs(targetRef.current.y - currentRef.current.y)
    if (dx > 0.01 || dy > 0.01) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      animatingRef.current = false
    }
  }, [])

  const startAnimation = useCallback(() => {
    if (!animatingRef.current) {
      animatingRef.current = true
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [animate])

  // Clamp helper
  const clamp = (val: number, max: number) => Math.max(-max, Math.min(max, val))

  // iOS 13+ permission request
  const requestPermission = useCallback(() => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (DOE.requestPermission) {
      DOE.requestPermission().then((result) => {
        if (result === 'granted') setPermissionNeeded(false)
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      targetRef.current = { x: 0, y: 0 }
      startAnimation()
      return
    }

    // Check if gyroscope is available
    let hasGyro = false
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      hasGyro = true
      // beta = front/back tilt (-180..180), gamma = left/right (-90..90)
      targetRef.current = {
        x: clamp(e.beta / 10, maxGyro),   // map to reasonable range
        y: clamp(e.gamma / 10, maxGyro),
      }
      startAnimation()
    }

    // Mouse fallback for desktop
    const handleMouseMove = (e: MouseEvent) => {
      if (hasGyro) return
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      targetRef.current = {
        x: clamp(((e.clientY - centerY) / centerY) * -maxMouse, maxMouse),
        y: clamp(((e.clientX - centerX) / centerX) * maxMouse, maxMouse),
      }
      startAnimation()
    }

    const handleMouseLeave = () => {
      if (hasGyro) return
      targetRef.current = { x: 0, y: 0 }
      startAnimation()
    }

    // Check for iOS permission requirement
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+ — need permission. Mark as needed so UI can show a button.
      setPermissionNeeded(true)
      // Still try to listen (permission may already be granted)
    }

    window.addEventListener('deviceorientation', handleOrientation, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('mousemove', handleMouseMove)
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      animatingRef.current = false
    }
  }, [enabled, maxGyro, maxMouse, startAnimation])

  return { rotateX, rotateY, requestPermission, permissionNeeded }
}
