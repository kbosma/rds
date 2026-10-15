/**
 * Welke melding hoort bij een mislukte verwijdering? Een 409 betekent dat de server het weigert omdat er
 * documenten of betalingen aan hangen (geschiedenis blijft bewaard); alles anders is een algemene fout.
 */
export function deleteErrorKey(error: unknown): string {
  return (error as { status?: number } | null)?.status === 409 ? 'common.deleteBlocked' : 'common.deleteError';
}
