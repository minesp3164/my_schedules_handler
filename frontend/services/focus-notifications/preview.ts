import { Platform } from 'react-native';
import { t } from '@/services/i18n';
import { hasPermission, notifications } from './module';
import { ensureWebPermission, webNotificationSupported } from './web';

export async function previewNudgeNotification() {
  const title = t('settings.nudgePreviewTitle');
  const body = t('settings.nudgePreviewBody');

  if (Platform.OS === 'web') {
    if (!webNotificationSupported()) return false;
    await ensureWebPermission();
    if (globalThis.Notification.permission !== 'granted') return false;
    new globalThis.Notification(title, { body });
    return true;
  }

  const module = await notifications();
  if (!module || !(await hasPermission())) return false;
  await module.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: { type: module.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
  return true;
}
