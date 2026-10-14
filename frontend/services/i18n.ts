import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import jaCommon from '@/locales/ja/common.json';
import jaApplications from '@/locales/ja/applications.json';
import jaFocus from '@/locales/ja/focus.json';
import jaFootprint from '@/locales/ja/footprint.json';
import jaHistory from '@/locales/ja/history.json';
import jaHome from '@/locales/ja/home.json';
import jaLanding from '@/locales/ja/landing.json';
import jaPoints from '@/locales/ja/points.json';
import jaRetro from '@/locales/ja/retro.json';
import jaRewards from '@/locales/ja/rewards.json';
import jaSettings from '@/locales/ja/settings.json';
import jaTabs from '@/locales/ja/tabs.json';
import jaTasks from '@/locales/ja/tasks.json';
import koCommon from '@/locales/ko/common.json';
import koApplications from '@/locales/ko/applications.json';
import koFocus from '@/locales/ko/focus.json';
import koFootprint from '@/locales/ko/footprint.json';
import koHistory from '@/locales/ko/history.json';
import koHome from '@/locales/ko/home.json';
import koLanding from '@/locales/ko/landing.json';
import koPoints from '@/locales/ko/points.json';
import koRetro from '@/locales/ko/retro.json';
import koRewards from '@/locales/ko/rewards.json';
import koSettings from '@/locales/ko/settings.json';
import koTabs from '@/locales/ko/tabs.json';
import koTasks from '@/locales/ko/tasks.json';

const translations = {
  ko: {
    common: koCommon,
    applications: koApplications,
    tabs: koTabs,
    home: koHome,
    landing: koLanding,
    focus: koFocus,
    history: koHistory,
    points: koPoints,
    rewards: koRewards,
    footprint: koFootprint,
    settings: koSettings,
    tasks: koTasks,
    retro: koRetro,
  },
  ja: {
    common: jaCommon,
    applications: jaApplications,
    tabs: jaTabs,
    home: jaHome,
    landing: jaLanding,
    focus: jaFocus,
    history: jaHistory,
    points: jaPoints,
    rewards: jaRewards,
    footprint: jaFootprint,
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
