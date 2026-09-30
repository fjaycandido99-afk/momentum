/**
 * The two window events that keep Pulse and the disciplines list in step on
 * home, without either importing the other.
 */

/** The disciplines list logged or removed something; Pulse refetches. */
export const PRACTICES_CHANGED = 'voxu:practices-changed'

/** Pulse asks the home disciplines list to open one discipline's sheet. */
export const OPEN_DISCIPLINE = 'voxu:open-discipline'
