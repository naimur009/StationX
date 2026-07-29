import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPermission {
  module: string;
  actions: string[];
  impliedBy?: string;
}

export interface IUser extends Document {
  name?: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'employee';
  permissions: IUserPermission[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userPermissionSchema = new Schema<IUserPermission>(
  {
    module: { type: String, required: true },
    actions: { type: [String], required: true },
    impliedBy: { type: String, required: false },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'employee'],
    },

    permissions: {
      type: [userPermissionSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
