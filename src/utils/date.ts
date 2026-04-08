export function toDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}
