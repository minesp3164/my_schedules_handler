import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import jaCommon from '@/locales/ja/common.json';
import jaFocus from '@/locales/ja/focus.json';
import jaHistory from '@/locales/ja/history.json';
import jaHome from '@/locales/ja/home.json';
import jaLanding from '@/locales/ja/landing.json';
import jaRetro from '@/locales/ja/retro.json';
import jaSettings from '@/locales/ja/settings.json';
import jaTabs from '@/locales/ja/tabs.json';
import jaTasks from '@/locales/ja/tasks.json';
import koCommon from '@/locales/ko/common.json';
import koFocus from '@/locales/ko/focus.json';
import koHistory from '@/locales/ko/history.json';
import koHome from '@/locales/ko/home.json';
import koLanding from '@/locales/ko/landing.json';
import koRetro from '@/locales/ko/retro.json';
import koSettings from '@/locales/ko/settings.json';
import koTabs from '@/locales/ko/tabs.json';
import koTasks from '@/locales/ko/tasks.json';

const translations = {
  ko: {
    common: koCommon,
    tabs: koTabs,
    home: koHome,
    landing: koLanding,
    focus: koFocus,
    history: koHistory,
    settings: koSettings,
    tasks: koTasks,
    retro: koRetro,
  },
  ja: {
    common: jaCommon,
    tabs: jaTabs,
    home: jaHome,
    landing: jaLanding,
    focus: jaFocus,
    history: jaHistory,
    settings: jaSettings,
    tasks: jaTasks,
    retro: jaRetro,
  },
};

export type AppLocale = keyof typeof translations;

const languageCode = getLocales()[0]?.languageCode;
export const locale: AppLocale = languageCode === 'ja' ? 'ja' : 'ko';

const i18n = new I18n(translations);
i18n.locale = locale;
i18n.enableFallback = true;
i18n.defaultLocale = 'ko';

export const t = i18n.t.bind(i18n);
export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);

export const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(date);

export const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
