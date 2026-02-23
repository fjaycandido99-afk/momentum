'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Loader2,
  Check,
  ChevronDown,
  Lock,
  Bell,
  Smartphone,
  Mail,
} from 'lucide-react'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import {
  type AlertPreference,
  type AlertPreferenceUpdate,
  type AlertPriority,
  type AlertChannel,
  CATEGORY_META,
  CATEGORY_ORDER,
} from './types'

// ─── Priority config ──────────────────────────────────────────────
const PRIORITIES: { value: AlertPriority; label: string; dot: string }[] = [
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
  { value: 'high', label: 'High', dot: 'bg-orange-400' },
  { value: 'normal', label: 'Normal', dot: 'bg-blue-400' },
  { value: 'low', label: 'Low', dot: 'bg-white/40' },
]

const CHANNELS: { value: AlertChannel; label: string; icon: typeof Bell }[] = [
  { value: 'push', label: 'Push', icon: Bell },
  { value: 'in_app', label: 'In-App', icon: Smartphone },
  { value: 'email', label: 'Email', icon: Mail },
]

// ─── Sub-components ───────────────────────────────────────────────

function QuietHoursSection({
  quietStart,
  quietEnd,
  onChange,
}: {
  quietStart: string
  quietEnd: string
  onChange: (start: string, end: string) => void
}) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/15">
      <p className="text-sm text-white/85 mb-2">Quiet Hours</p>
      <p className="text-xs text-white/40 mb-3">Urgent alerts bypass quiet hours</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Start</label>
          <input
            type="time"
            value={quietStart}
            onChange={(e) => onChange(e.target.value, quietEnd)}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/15 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">End</label>
          <input
            type="time"
            value={quietEnd}
            onChange={(e) => onChange(quietStart, e.target.value)}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/15 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>
    </div>
  )
}

function PrioritySelector({
  value,
  onChange,
}: {
  value: string
  onChange: (p: AlertPriority) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PRIORITIES.map((p) => {
        const selected = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
              selected
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${p.dot}`} />
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

function ChannelSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (c: AlertChannel) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CHANNELS.map((c) => {
        const selected = value === c.value
        const Icon = c.icon
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
              selected
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function AlertTypeRow({
  pref,
  isPremiumLocked,
  isExpanded,
  onToggle,
  onExpand,
  onPriorityChange,
  onChannelChange,
}: {
  pref: AlertPreference
  isPremiumLocked: boolean
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
  onPriorityChange: (p: AlertPriority) => void
  onChannelChange: (c: AlertChannel) => void
}) {
  const catMeta = CATEGORY_META[pref.category] || CATEGORY_META.general
  const Icon = catMeta.icon

  return (
    <div
      className={`rounded-xl bg-white/[0.03] border border-white/15 overflow-hidden transition-colors hover:bg-white/[0.06] ${
        isPremiumLocked ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Main row */}
      <div className="flex items-center p-3">
        {/* Toggle area */}
        <button
          onClick={onToggle}
          role="switch"
          aria-checked={pref.enabled}
          aria-label={pref.label}
          className="flex items-center gap-3 flex-1 min-w-0 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none rounded-lg"
        >
          <Icon className={`w-4 h-4 shrink-0 ${pref.enabled ? 'text-white' : 'text-white/50'}`} />
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm truncate ${pref.enabled ? 'text-white' : 'text-white/70'}`}>
                {pref.label}
              </p>
              {isPremiumLocked && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 shrink-0">
                  <Lock className="w-3 h-3" />
                  PRO
                </span>
              )}
            </div>
            {pref.description && (
              <p className="text-xs text-white/50 truncate">{pref.description}</p>
            )}
          </div>
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0 ml-auto ${
              pref.enabled ? 'bg-emerald-500/20' : 'bg-white/10'
            }`}
          >
            {pref.enabled && <Check className="w-3 h-3 text-emerald-400" />}
          </div>
        </button>

        {/* Expand chevron */}
        <button
          onClick={onExpand}
          aria-label={isExpanded ? 'Collapse options' : 'Expand options'}
          className="p-1.5 ml-1 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <ChevronDown
            className={`w-4 h-4 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded controls */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
          <div>
            <p className="text-xs text-white/50 mb-1.5">Priority</p>
            <PrioritySelector value={pref.priority} onChange={onPriorityChange} />
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1.5">Channel</p>
            <ChannelSelector value={pref.channel} onChange={onChannelChange} />
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryGroup({
  category,
  prefs,
  isFree,
  expandedAlerts,
  onToggle,
  onExpand,
  onPriorityChange,
  onChannelChange,
}: {
  category: string
  prefs: AlertPreference[]
  isFree: boolean
  expandedAlerts: Set<string>
  onToggle: (id: string) => void
  onExpand: (id: string) => void
  onPriorityChange: (id: string, p: AlertPriority) => void
  onChannelChange: (id: string, c: AlertChannel) => void
}) {
  const meta = CATEGORY_META[category] || CATEGORY_META.general

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50 uppercase tracking-wider px-1">{meta.label}</p>
      {prefs.map((pref) => (
        <AlertTypeRow
          key={pref.alert_type_id}
          pref={pref}
          isPremiumLocked={pref.premium_only && isFree}
          isExpanded={expandedAlerts.has(pref.alert_type_id)}
          onToggle={() => onToggle(pref.alert_type_id)}
          onExpand={() => onExpand(pref.alert_type_id)}
          onPriorityChange={(p) => onPriorityChange(pref.alert_type_id, p)}
          onChannelChange={(c) => onChannelChange(pref.alert_type_id, c)}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────

export function AlertPreferencesSettings() {
  const subscription = useSubscriptionOptional()
  const isFree = !subscription || subscription.tier === 'free'

  const [preferences, setPreferences] = useState<AlertPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quietStart, setQuietStart] = useState('')
  const [quietEnd, setQuietEnd] = useState('')
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())

  const hasLoaded = useRef(false)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdates = useRef<Map<string, AlertPreferenceUpdate>>(new Map())

  // ── Fetch preferences on mount ──────────────────────────────────
  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true

    const load = async () => {
      try {
        const res = await fetch('/api/alerts/preferences')
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        const prefs: AlertPreference[] = data.preferences || []
        setPreferences(prefs)

        // Extract global quiet hours from first pref that has them
        const withQuiet = prefs.find((p) => p.quiet_start)
        if (withQuiet) {
          setQuietStart(withQuiet.quiet_start || '')
          setQuietEnd(withQuiet.quiet_end || '')
        }
      } catch {
        setError('Could not load alert preferences')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Flush pending updates ───────────────────────────────────────
  const flush = useCallback(async () => {
    const updates = Array.from(pendingUpdates.current.values())
    if (updates.length === 0) return
    pendingUpdates.current.clear()

    try {
      const res = await fetch('/api/alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updates }),
      })
      if (!res.ok) {
        console.error('Failed to save alert preferences')
      }
    } catch (err) {
      console.error('Error saving alert preferences:', err)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(flush, 800)
  }, [flush])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
      // Fire final save synchronously-ish
      const updates = Array.from(pendingUpdates.current.values())
      if (updates.length > 0) {
        navigator.sendBeacon?.(
          '/api/alerts/preferences',
          new Blob([JSON.stringify({ preferences: updates })], { type: 'application/json' })
        )
      }
    }
  }, [])

  // ── Queue an update for a single alert type ─────────────────────
  const queueUpdate = useCallback(
    (id: string, patch: Partial<AlertPreferenceUpdate>) => {
      const existing = pendingUpdates.current.get(id) || { alert_type_id: id }
      pendingUpdates.current.set(id, { ...existing, ...patch })
      scheduleFlush()
    },
    [scheduleFlush]
  )

  // ── Handlers ────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (id: string) => {
      setPreferences((prev) =>
        prev.map((p) => (p.alert_type_id === id ? { ...p, enabled: !p.enabled } : p))
      )
      const current = preferences.find((p) => p.alert_type_id === id)
      if (current) queueUpdate(id, { enabled: !current.enabled })
    },
    [preferences, queueUpdate]
  )

  const handleExpand = useCallback((id: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handlePriorityChange = useCallback(
    (id: string, priority: AlertPriority) => {
      setPreferences((prev) =>
        prev.map((p) => (p.alert_type_id === id ? { ...p, priority } : p))
      )
      queueUpdate(id, { priority })
    },
    [queueUpdate]
  )

  const handleChannelChange = useCallback(
    (id: string, channel: AlertChannel) => {
      setPreferences((prev) =>
        prev.map((p) => (p.alert_type_id === id ? { ...p, channel } : p))
      )
      queueUpdate(id, { channel })
    },
    [queueUpdate]
  )

  const handleQuietHoursChange = useCallback(
    (start: string, end: string) => {
      setQuietStart(start)
      setQuietEnd(end)

      // Apply to ALL alert types
      setPreferences((prev) =>
        prev.map((p) => ({ ...p, quiet_start: start || null, quiet_end: end || null }))
      )
      for (const pref of preferences) {
        queueUpdate(pref.alert_type_id, {
          quiet_start: start || null,
          quiet_end: end || null,
        })
      }
    },
    [preferences, queueUpdate]
  )

  // ── Group prefs by category ─────────────────────────────────────
  const grouped = CATEGORY_ORDER.reduce<Record<string, AlertPreference[]>>((acc, cat) => {
    const items = preferences.filter((p) => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  // Also catch any categories not in CATEGORY_ORDER
  for (const pref of preferences) {
    if (!CATEGORY_ORDER.includes(pref.category as any)) {
      if (!grouped[pref.category]) grouped[pref.category] = []
      if (!grouped[pref.category].find((p) => p.alert_type_id === pref.alert_type_id)) {
        grouped[pref.category].push(pref)
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-white/70">{error}</p>
      </div>
    )
  }

  if (preferences.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/15">
        <p className="text-sm text-white/50">No alert types configured yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Quiet hours */}
      <QuietHoursSection
        quietStart={quietStart}
        quietEnd={quietEnd}
        onChange={handleQuietHoursChange}
      />

      {/* Category groups */}
      {CATEGORY_ORDER.map((cat) =>
        grouped[cat] ? (
          <CategoryGroup
            key={cat}
            category={cat}
            prefs={grouped[cat]}
            isFree={isFree}
            expandedAlerts={expandedAlerts}
            onToggle={handleToggle}
            onExpand={handleExpand}
            onPriorityChange={handlePriorityChange}
            onChannelChange={handleChannelChange}
          />
        ) : null
      )}

      {/* Extra categories not in CATEGORY_ORDER */}
      {Object.keys(grouped)
        .filter((cat) => !CATEGORY_ORDER.includes(cat as any))
        .map((cat) => (
          <CategoryGroup
            key={cat}
            category={cat}
            prefs={grouped[cat]}
            isFree={isFree}
            expandedAlerts={expandedAlerts}
            onToggle={handleToggle}
            onExpand={handleExpand}
            onPriorityChange={handlePriorityChange}
            onChannelChange={handleChannelChange}
          />
        ))}
    </div>
  )
}
