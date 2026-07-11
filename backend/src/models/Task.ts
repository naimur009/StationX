import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  priority: 'low' | 'medium' | 'high';
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ deadline: 1 });

const Task = mongoose.model<ITask>('Task', taskSchema);

export default Task;
