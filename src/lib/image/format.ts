/** Keep downloaded concept images in the format returned by the provider. */
export function imageFileExtension(dataUrl: string): 'jpg' | 'png' | 'webp' {
  const mime = /^data:image\/(jpeg|png|webp);base64,/i.exec(dataUrl)?.[1]?.toLowerCase()
  return mime === 'png' || mime === 'webp' ? mime : 'jpg'
}
