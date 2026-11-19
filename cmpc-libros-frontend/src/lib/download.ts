/** Descarga un Blob en el navegador con el nombre indicado. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Se libera en el siguiente tick para no cortar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Nombre requerido: `CMPC-LIBROS-<timestamp>.csv` con el instante de la descarga. */
export function exportFilename(now: number = Date.now()): string {
  return `CMPC-LIBROS-${now}.csv`
}
