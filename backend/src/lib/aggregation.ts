export function buildCancelledExcludedMatch() {
  return { status: { $ne: 'cancelled' } };
}
