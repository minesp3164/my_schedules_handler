import { NativeModules, Platform } from 'react-native';
import { refreshFocusLiveActivity } from '@/services/focus-live-activity';

type TodayPointsWidgetModule = {
  setTodayPoints: (points: number) => void;
  setThemeButton: (button: string, background: string) => void;
};

const widgetModule = NativeModules.TodayPointsWidget as TodayPointsWidgetModule | undefined;

export function syncTodayPointsWidget(points: number) {
  if (Platform.OS === 'ios') widgetModule?.setTodayPoints(points);
}

export function syncTodayPointsWidgetTheme(button: string, background: string) {
  if (Platform.OS !== 'ios') return;
  widgetModule?.setThemeButton(button, background);
  void refreshFocusLiveActivity();
}
