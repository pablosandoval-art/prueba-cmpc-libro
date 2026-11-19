/** Rampa fija de 4 pasos: el nivel de stock se lee sin leer el número. */
export function stockLevel(stock: number): 0 | 1 | 2 | 3 | 4 {
  if (stock <= 0) return 0
  if (stock <= 3) return 1
  if (stock < 10) return 2
  if (stock < 20) return 3
  return 4
}
