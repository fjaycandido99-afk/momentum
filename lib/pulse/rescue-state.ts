import { isDismissed, setDismissed } from '@/lib/ui/dismiss'

/**
 * Whether rescue was accepted — or turned down — TODAY, on this device.
 *
 * Kept in the shared day-scoped store (lib/ui/dismiss) so both reset at
 * local midnight by themselves: a rescue is for one bad day, never a mode
 * someone ends up living in.
 */
const ON = 'rescue-on'
const DECLINED = 'rescue-declined'

export function isRescueOn(): boolean {
  return isDismissed(ON)
}

export function isRescueDeclined(): boolean {
  return isDismissed(DECLINED)
}

export function acceptRescue(): void {
  setDismissed(ON, 'today')
}

export function declineRescue(): void {
  setDismissed(DECLINED, 'today')
}
