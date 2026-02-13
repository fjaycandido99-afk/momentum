import html2canvas from 'html2canvas'

/**
 * Renders a DOM element as a PNG image and triggers native sharing or download.
 */
export async function generateShareCard(
  element: HTMLElement,
  filename: string = 'voxu-share.png'
): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
    })

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png')
    })
  } catch (err) {
    console.error('Failed to generate share card:', err)
    return null
  }
}

/**
 * Generate a share card image and share via Web Share API.
 * Falls back to download if sharing is not supported.
 */
export async function shareImage(
  element: HTMLElement,
  title: string,
  text: string,
  filename: string = 'voxu-share.png'
): Promise<boolean> {
  const blob = await generateShareCard(element, filename)
  if (!blob) return false

  const file = new File([blob], filename, { type: 'image/png' })

  // Try native share with image
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      })
      return true
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}
