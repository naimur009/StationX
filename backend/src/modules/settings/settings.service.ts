import Settings, { DEFAULT_SETTINGS } from '../../models/Settings';
import Table from '../../models/Table';
import { deleteFromCloudinary } from '../../lib/upload';
import { getIO } from '../../config/socket';
import type { UpdateSettingsDto } from './settings.validation';

const SETTINGS_ID = 'restaurant-settings';

export async function getSettings() {
  let settings = await Settings.findById(SETTINGS_ID).lean();

  if (!settings) {
    settings = await Settings.create(DEFAULT_SETTINGS);
  }

  return settings;
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    restaurantName: settings.restaurantName,
    logo: settings.logo?.url ? settings.logo : null,
    loyaltyOrderThreshold: settings.loyaltyOrderThreshold,
  };
}

export async function updateSettings(dto: UpdateSettingsDto) {
  const updateData: Record<string, unknown> = {};

  const allowedFields: (keyof UpdateSettingsDto)[] = [
    'restaurantName',
    'address',
    'logo',
    'contactNumber',
    'businessHours',
    'vatInfo',
    'loyaltyOrderThreshold',
    'tableCount',
  ];

  for (const field of allowedFields) {
    if (field in dto) {
      updateData[field] = dto[field as keyof UpdateSettingsDto];
    }
  }

  if ('logo' in dto) {
    const current = await Settings.findById(SETTINGS_ID).lean();
    const oldPublicId = current?.logo?.publicId;
    const newPublicId = dto.logo?.publicId;

    if (oldPublicId && oldPublicId !== newPublicId) {
      deleteFromCloudinary(oldPublicId).catch((err: unknown) => console.error('[Cloudinary] Failed to delete old logo:', err));
    }
  }

  const settings = await Settings.findByIdAndUpdate(
    SETTINGS_ID,
    { $set: updateData },
    { new: true, upsert: true, runValidators: true }
  );

  if ('tableCount' in dto && dto.tableCount !== undefined) {
    await syncTables(dto.tableCount);
  }

  return settings;
}

async function syncTables(targetCount: number): Promise<void> {
  await Table.deleteMany({});

  if (targetCount > 0) {
    const toCreate: Array<{ tableNumber: string; capacity: number | null; status: 'available' }> = [];
    for (let i = 1; i <= targetCount; i++) {
      toCreate.push({ tableNumber: String(i), capacity: null, status: 'available' });
    }
    await Table.insertMany(toCreate);
  }

  getIO().emit('table:statusChanged', {});
}
