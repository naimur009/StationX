import mongoose from 'mongoose';

type TransactionCallback<T> = (session: mongoose.ClientSession) => Promise<T>;

export async function withTransaction<T>(fn: TransactionCallback<T>): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
