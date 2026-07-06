import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  employee: Types.ObjectId;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'half-day';
  checkInAt?: Date;
  checkOutAt?: Date;
  notes?: string;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent', 'late', 'half-day'],
    },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);

export default Attendance;
