import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings, { DEFAULT_SETTINGS } from '../src/models/Settings';
import * as settingsService from '../src/modules/settings/settings.service';
import { updateSettingsSchema } from '../src/modules/settings/settings.validation';

vi.mock('../src/models/Settings');
vi.mock('../src/models/ActivityLog', () => ({
  default: { create: vi.fn().mockResolvedValue({}) },
}));

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns existing settings document', async () => {
      const existingSettings = { _id: 'restaurant-settings', restaurantName: 'Test Cafe' };
      vi.mocked(Settings.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(existingSettings),
      } as never);

      const result = await settingsService.getSettings();

      expect(Settings.findById).toHaveBeenCalledWith('restaurant-settings');
      expect(result).toEqual(existingSettings);
    });

    it('creates default settings when none exist', async () => {
      vi.mocked(Settings.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as never);
      const createdSettings = { ...DEFAULT_SETTINGS, _id: 'restaurant-settings' };
      vi.mocked(Settings.create).mockResolvedValueOnce(createdSettings as never);

      const result = await settingsService.getSettings();

      expect(Settings.create).toHaveBeenCalledWith(DEFAULT_SETTINGS);
      expect(result).toBeDefined();
      expect(result._id).toBe('restaurant-settings');
    });
  });

  describe('getPublicSettings', () => {
    it('returns only restaurantName and logo when settings exist', async () => {
      const existingSettings = {
        _id: 'restaurant-settings',
        restaurantName: 'Test Cafe',
        logo: { url: 'https://example.com/logo.png', publicId: 'logo123' },
        address: '123 Main St',
        contactNumber: '555-0000',
        vatInfo: { bin: '123', mushak: '456' },
        businessHours: [],
        loyaltyOrderThreshold: 0,
      };
      vi.mocked(Settings.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(existingSettings),
      } as never);

      const result = await settingsService.getPublicSettings();

      expect(result).toEqual({
        restaurantName: 'Test Cafe',
        logo: { url: 'https://example.com/logo.png', publicId: 'logo123' },
        loyaltyOrderThreshold: 0,
      });
      expect(result).not.toHaveProperty('address');
      expect(result).not.toHaveProperty('vatInfo');
      expect(result).not.toHaveProperty('contactNumber');
    });

    it('returns logo null when logo.url is empty', async () => {
      const existingSettings = {
        _id: 'restaurant-settings',
        restaurantName: 'Empty Logo Cafe',
        logo: { url: '', publicId: '' },
      };
      vi.mocked(Settings.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(existingSettings),
      } as never);

      const result = await settingsService.getPublicSettings();

      expect(result).toEqual({
        restaurantName: 'Empty Logo Cafe',
        logo: null,
        loyaltyOrderThreshold: undefined,
      });
    });

    it('returns empty restaurantName when settings are defaults', async () => {
      vi.mocked(Settings.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as never);
      vi.mocked(Settings.create).mockResolvedValueOnce(DEFAULT_SETTINGS as never);

      const result = await settingsService.getPublicSettings();

      expect(result.restaurantName).toBe('');
      expect(result.logo).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('merges only whitelisted fields using $set', async () => {
      const updatedSettings = { ...DEFAULT_SETTINGS, restaurantName: 'New Name' };
      vi.mocked(Settings.findByIdAndUpdate).mockResolvedValueOnce(updatedSettings as never);

      const result = await settingsService.updateSettings({ restaurantName: 'New Name' });

      expect(Settings.findByIdAndUpdate).toHaveBeenCalledWith(
        'restaurant-settings',
        { $set: { restaurantName: 'New Name' } },
        { new: true, upsert: true, runValidators: true }
      );
      expect(result).toEqual(updatedSettings);
    });

    it('ignores fields not in the whitelist', async () => {
      vi.mocked(Settings.findByIdAndUpdate).mockResolvedValueOnce(DEFAULT_SETTINGS as never);

      await settingsService.updateSettings({ unknownField: 'test' } as never);

      const callArg = vi.mocked(Settings.findByIdAndUpdate).mock.calls[0][1] as { $set: Record<string, unknown> };
      expect(callArg.$set).not.toHaveProperty('unknownField');
    });

    it('handles multiple fields in one update', async () => {
      const updateData = {
        restaurantName: 'StationX',
        vatInfo: { bin: '001234567-0101', mushak: '123456789-101' },
      };
      vi.mocked(Settings.findByIdAndUpdate).mockResolvedValueOnce({ ...DEFAULT_SETTINGS, ...updateData } as never);

      await settingsService.updateSettings(updateData);

      expect(Settings.findByIdAndUpdate).toHaveBeenCalledWith(
        'restaurant-settings',
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
      );
    });
  });
});

describe('updateSettingsSchema validation', () => {
  it('accepts valid partial update', () => {
    const result = updateSettingsSchema.safeParse({ restaurantName: 'StationX' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (merge with nothing)', () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects extra fields via .strict()', () => {
    const result = updateSettingsSchema.safeParse({ restaurantName: 'test', isActive: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Unrecognized key');
    }
  });

  it('rejects restaurantName shorter than 2 chars', () => {
    const result = updateSettingsSchema.safeParse({ restaurantName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format in businessHours', () => {
    const result = updateSettingsSchema.safeParse({
      businessHours: [{ day: 'monday', open: 'not-a-time', close: '22:00' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid enum for day', () => {
    const result = updateSettingsSchema.safeParse({
      businessHours: [{ day: 'invalid', open: '09:00', close: '22:00' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects logo without valid URL', () => {
    const result = updateSettingsSchema.safeParse({
      logo: { url: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts vatInfo with bin and mushak', () => {
    const result = updateSettingsSchema.safeParse({
      vatInfo: { bin: '001234567-0101', mushak: '123456789-101' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts vatInfo with empty strings (defaults)', () => {
    const result = updateSettingsSchema.safeParse({
      vatInfo: { bin: '', mushak: '' },
    });
    expect(result.success).toBe(true);
  });
});
