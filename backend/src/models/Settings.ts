import mongoose, { Schema } from 'mongoose';

export interface IBusinessHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string | null;
  close: string | null;
}

export interface ILogo {
  url: string;
  publicId: string;
}

export interface IVatInfo {
  bin: string;
  mushak: string;
}

export interface ISettings {
  _id: string;
  restaurantName: string;
  address: string;
  logo: ILogo;
  contactNumber: string;
  vatInfo: IVatInfo;
  businessHours: IBusinessHours[];
  loyaltyOrderThreshold: number;
  tableCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const businessHoursSchema = new Schema<IBusinessHours>(
  {
    day: {
      type: String,
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    open: { type: String, default: null },
    close: { type: String, default: null },
  },
  { _id: false }
);

const logoSchema = new Schema<ILogo>(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

const vatInfoSchema = new Schema<IVatInfo>(
  {
    bin: { type: String, default: '' },
    mushak: { type: String, default: '' },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'restaurant-settings' },
    restaurantName: { type: String, default: '' },
    address: { type: String, default: '' },
    logo: { type: logoSchema, default: () => ({ url: '', publicId: '' }) },
    contactNumber: { type: String, default: '' },
    vatInfo: {
      type: vatInfoSchema,
      default: () => ({ bin: '', mushak: '' }),
    },
    businessHours: {
      type: [businessHoursSchema],
      default: () => [
        { day: 'monday', open: '09:00', close: '22:00' },
        { day: 'tuesday', open: '09:00', close: '22:00' },
        { day: 'wednesday', open: '09:00', close: '22:00' },
        { day: 'thursday', open: '09:00', close: '22:00' },
        { day: 'friday', open: '09:00', close: '22:00' },
        { day: 'saturday', open: '09:00', close: '22:00' },
        { day: 'sunday', open: '09:00', close: '22:00' },
      ],
    },
    loyaltyOrderThreshold: { type: Number, default: 0 },
    tableCount: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const DEFAULT_BUSINESS_HOURS: IBusinessHours[] = [
  { day: 'monday', open: '09:00', close: '22:00' },
  { day: 'tuesday', open: '09:00', close: '22:00' },
  { day: 'wednesday', open: '09:00', close: '22:00' },
  { day: 'thursday', open: '09:00', close: '22:00' },
  { day: 'friday', open: '09:00', close: '22:00' },
  { day: 'saturday', open: '09:00', close: '22:00' },
  { day: 'sunday', open: '09:00', close: '22:00' },
];

export const DEFAULT_SETTINGS: ISettings = {
  _id: 'restaurant-settings',
  restaurantName: '',
  address: '',
  logo: { url: '', publicId: '' },
  contactNumber: '',
  vatInfo: { bin: '', mushak: '' },
  businessHours: DEFAULT_BUSINESS_HOURS,
  loyaltyOrderThreshold: 0,
  tableCount: 0,
};

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
