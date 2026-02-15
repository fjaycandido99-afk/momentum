import type { SWRConfiguration } from 'swr'

export const swrFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Fetch failed')
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

export const swrDefaults: SWRConfiguration = {
  fetcher: swrFetcher,
  dedupingInterval: 5000,
  revalidateOnFocus: false,
  errorRetryCount: 2,
}
