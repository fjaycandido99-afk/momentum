'use client'

import { type ReactNode } from 'react'

type GlassVariant = 'default' | 'strong' | 'elevated'

interface GlassCardProps {
  variant?: GlassVariant
  className?: string
  children: ReactNode
  rounded?: string
  onClick?: () => void
}

const VARIANT_CLASSES: Record<GlassVariant, string> = {
  default: 'glass-refined',
  strong: 'glass-refined glass-strong',
  elevated: 'glass-refined glass-elevated',
}

export function GlassCard({
  variant = 'default',
  className = '',
  children,
  rounded = 'rounded-2xl',
  onClick,
}: GlassCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`relative overflow-hidden ${rounded} ${VARIANT_CLASSES[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
