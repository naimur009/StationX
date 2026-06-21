import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  actor: mongoose.Types.ObjectId;
  module: string;
  action: string;
  targetId?: mongoose.Types.ObjectId;
  targetType?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    module: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    targetType: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model<IActivityLog>(
  'ActivityLog',
  activityLogSchema
);

export default ActivityLog;
