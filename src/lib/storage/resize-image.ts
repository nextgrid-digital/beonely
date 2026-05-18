const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024
const ALLOWED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const JPEG_QUALITY = 0.88

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_INPUT_TYPES.has(file.type)) {
    return 'Please use a JPEG, PNG, or WebP image.'
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return 'Image must be 5 MB or smaller.'
  }
  return null
}

export async function fileToResizedJpeg(
  file: File,
  maxEdge: number
): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * ratio))
    const h = Math.max(1, Math.round(bmp.height * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare image canvas')
    ctx.drawImage(bmp, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b: Blob | null) =>
          b ? resolve(b) : reject(new Error('Could not encode image')),
        'image/jpeg',
        JPEG_QUALITY
      )
    })
  } finally {
    bmp.close()
  }
}
