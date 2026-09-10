import { Tabs } from 'expo-router';
import { TabBarIcon } from '../../components/TabBarIcon';
import { t } from '@/services/i18n';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: '#2479CC',
        tabBarInactiveTintColor: '#69809D',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#D8E7F5' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: t('tabs.focus'),
          tabBarIcon: ({ color }) => <TabBarIcon name="clock-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
