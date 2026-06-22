import { z } from 'zod';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const timeRegex = /^\d{2}:\d{2}$/;

export const businessInfoSchema = z.object({
  restaurantName: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  address: z.string().optional().default(''),
  contactNumber: z.string().optional().default(''),
});

export type BusinessInfoFormData = z.input<typeof businessInfoSchema>;

export const taxSchema = z.object({
  taxId: z.string().optional().default(''),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
});

export type TaxFormData = z.input<typeof taxSchema>;

export const businessHoursSchema = z.object({
  hours: z.array(
    z.object({
      day: z.enum(DAYS),
      open: z
        .string()
        .regex(timeRegex, 'Must be HH:mm')
        .nullable()
        .optional()
        .default('09:00'),
      close: z
        .string()
        .regex(timeRegex, 'Must be HH:mm')
        .nullable()
        .optional()
        .default('22:00'),
      isOpen: z.boolean().optional().default(true),
    })
  ),
});

export type BusinessHoursFormData = z.input<typeof businessHoursSchema>;

export const logoSchema = z.object({
  logo: z.object({
    url: z.string().optional().default(''),
    publicId: z.string().optional().default(''),
  }),
});

export type LogoFormData = z.input<typeof logoSchema>;
