import mongoose, { ClientSession } from 'mongoose';

const MAX_TXN_ATTEMPTS = 3;

function isTransient(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; errorLabels?: unknown };
  if (candidate.code === 112) return true;
  if (Array.isArray(candidate.errorLabels)) {
    return (
      candidate.errorLabels.includes('TransientTransactionError') ||
      candidate.errorLabels.includes('UnknownTransactionCommitResult')
    );
  }
  return false;
}

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TXN_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      lastError = error;
      if (!isTransient(error) || attempt === MAX_TXN_ATTEMPTS) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }
  throw lastError;
}