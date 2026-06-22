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
  url: z.string().url().optional(),
  publicId: z.string().optional(),
});

const taxConfigSchema = z.object({
  mode: z.enum(['none', 'flat', 'itemized']),
  rate: z.number().min(0).max(100),
});

export const updateSettingsSchema = z
  .object({
    restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters').optional(),
    address: z.string().max(500).optional(),
    logo: logoSchema.optional(),
    contactNumber: z.string().optional(),
    taxId: z.string().optional(),
    currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
    businessHours: z.array(businessHoursSchema).optional(),
    taxConfig: taxConfigSchema.optional(),
  })
  .strict();

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
