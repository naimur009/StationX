export interface PublicLogo {
  url: string;
  publicId: string;
}

export interface PublicSettings {
  restaurantName: string;
  logo: PublicLogo | null;
}

export type PublicSettingsResponse = { data: PublicSettings };
