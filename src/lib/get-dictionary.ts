import type { Locale } from './i18n-config';

const dictionaries: Record<string, () => Promise<any>> = {
  fr: () => import('../dictionaries/fr.json').then((module) => module.default),
  en: () => import('../dictionaries/en.json').then((module) => module.default),
  pt: () => import('../dictionaries/pt.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
  const dictionary = dictionaries[locale];
  if (!dictionary) {
    console.warn(`[i18n] Requested invalid locale: ${locale}. Falling back to default: fr`);
    return dictionaries.fr();
  }
  return dictionary();
};
