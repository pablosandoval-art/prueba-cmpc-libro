/** Quita espacios en los extremos y colapsa los repetidos (igual que el backend). */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Mismo nombre sin distinguir mayúsculas (como el índice único del backend). */
export function sameName(a: string, b: string): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}
