import { NativeModules, Platform } from 'react-native';

type TodayPointsWidgetModule = {
  setTodayPoints: (points: number) => void;
};

const widgetModule = NativeModules.TodayPointsWidget as TodayPointsWidgetModule | undefined;

export function syncTodayPointsWidget(points: number) {
  if (Platform.OS === 'ios') widgetModule?.setTodayPoints(points);
}
