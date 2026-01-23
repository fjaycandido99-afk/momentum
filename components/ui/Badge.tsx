import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  success: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  danger: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  info: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Badge({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// Convenience status badge component
export function StatusBadge({ status }: { status: string }) {
  const getVariant = (): BadgeVariant => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'primary'
      case 'scheduled':
        return 'default'
      default:
        return 'default'
    }
  }

  const getLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'in_progress':
        return 'In Progress'
      case 'scheduled':
        return 'Scheduled'
      default:
        return status
    }
  }

  return <Badge variant={getVariant()}>{getLabel()}</Badge>
}

// Service type badge
export function ServiceBadge({ serviceType }: { serviceType: string }) {
  const getColor = (): BadgeVariant => {
    switch (serviceType) {
      case 'vent':
        return 'primary'
      case 'chimney':
        return 'warning'
      case 'hvac':
        return 'success'
      case 'gutter':
        return 'info'
      case 'pool':
        return 'primary'
      case 'mold':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getLabel = () => {
    switch (serviceType) {
      case 'vent':
        return 'Vent & Duct'
      case 'chimney':
        return 'Chimney'
      case 'hvac':
        return 'HVAC'
      case 'gutter':
        return 'Gutter'
      case 'pool':
        return 'Pool'
      case 'mold':
        return 'Mold'
      default:
        return serviceType
    }
  }

  return <Badge variant={getColor()}>{getLabel()}</Badge>
}
