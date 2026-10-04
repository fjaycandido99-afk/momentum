'use client'

import { createContext, useContext } from 'react'

/**
 * Which Settings page is showing (Settings is an index of rows; each row
 * opens /settings?s=<id>). `null` = the index; `undefined` = no Settings
 * page around (a SettingsCategory used elsewhere behaves as it always has).
 */
export const SettingsSectionContext = createContext<string | null | undefined>(undefined)

export function useSettingsSection(): string | null | undefined {
  return useContext(SettingsSectionContext)
}
