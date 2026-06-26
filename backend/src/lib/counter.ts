import { ClientSession } from 'mongoose';
import Counter from '../models/Counter';

export async function getNextSequence(name: string, session: ClientSession): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  return counter!.seq;
}
