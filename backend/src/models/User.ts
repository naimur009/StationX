import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPermission {
  module: string;
  actions: string[];
}

export interface IUser extends Document {
  name?: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'employee' | 'chief';
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
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String },
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
      enum: ['admin', 'manager', 'employee', 'chief'],
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
