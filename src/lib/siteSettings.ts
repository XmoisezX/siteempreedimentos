import { supabase } from './supabaseClient';

export interface SiteSettings {
  show_estimated_parcel: boolean;
  show_hero_banner: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  show_estimated_parcel: false,
  show_hero_banner: true,
};

// Cache em memória para evitar múltiplas chamadas
let cachedSettings: SiteSettings | null = null;

export async function getSiteSettings(): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['show_estimated_parcel', 'show_hero_banner']);

    if (error) {
      console.warn('site_settings table not found, using defaults:', error.message);
      return DEFAULT_SETTINGS;
    }

    const settings = { ...DEFAULT_SETTINGS };
    if (data) {
      for (const row of data) {
        if (row.key === 'show_estimated_parcel') {
          settings.show_estimated_parcel = row.value === 'true';
        }
        if (row.key === 'show_hero_banner') {
          settings.show_hero_banner = row.value === 'true';
        }
      }
    }

    cachedSettings = settings;
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSiteSetting(key: keyof SiteSettings, value: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' });

    if (error) {
      console.error('Error updating site setting:', error.message);
      return false;
    }

    // Invalida cache
    cachedSettings = null;
    return true;
  } catch {
    return false;
  }
}
