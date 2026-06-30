import Settings, { DEFAULT_SETTINGS } from '../../models/Settings';
import type { UpdateSettingsDto } from './settings.validation';

const SETTINGS_ID = 'restaurant-settings';

export async function getSettings() {
  let settings = await Settings.findById(SETTINGS_ID).lean();

  if (!settings) {
    settings = await Settings.create(DEFAULT_SETTINGS);
  }

  return settings;
}

export async function updateSettings(dto: UpdateSettingsDto) {
  const updateData: Record<string, unknown> = {};

  const allowedFields: (keyof UpdateSettingsDto)[] = [
    'restaurantName',
    'address',
    'logo',
    'contactNumber',
    'taxId',
    'businessHours',
    'taxConfig',
    'loyaltyOrderThreshold',
  ];

  for (const field of allowedFields) {
    if (field in dto) {
      updateData[field] = dto[field as keyof UpdateSettingsDto];
    }
  }

  const settings = await Settings.findByIdAndUpdate(
    SETTINGS_ID,
    { $set: updateData },
    { new: true, upsert: true, runValidators: true }
  );

  return settings;
}
