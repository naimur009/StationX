import { z } from 'zod';

const dayEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const timeRegex = /^\d{2}:\d{2}$/;

const businessHoursSchema = z.object({
  day: dayEnum,
  open: z.string().regex(timeRegex, 'Must be HH:mm format').nullable(),
  close: z.string().regex(timeRegex, 'Must be HH:mm format').nullable(),
});

const logoSchema = z.object({
  url: z.string().url().optional().or(z.literal('')),
  publicId: z.string().optional(),
});

const vatInfoSchema = z.object({
  bin: z.string().optional().default(''),
  mushak: z.string().optional().default(''),
});

export const updateSettingsSchema = z
  .object({
    restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters').optional(),
    address: z.string().max(500).optional(),
    logo: logoSchema.optional(),
    contactNumber: z.string().optional(),
    businessHours: z.array(businessHoursSchema).optional(),
    vatInfo: vatInfoSchema.optional(),
    loyaltyOrderThreshold: z.number().int().min(0).optional(),
  })
  .strict();

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
