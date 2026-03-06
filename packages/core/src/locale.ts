import localesData from './locales.json' assert { type: 'json' }

export interface LocaleEntry {
  locale: string
  language: { name: string, name_local: string, iso_639_1: string }
  country?: { flag?: string, name?: string }
}

/**
 * Returns the bundled locale list (no network request).
 * Data sourced from https://cdn.simplelocalize.io/public/v1/locales
 */
export function fetchLocales(): LocaleEntry[] {
  return localesData as LocaleEntry[]
}
