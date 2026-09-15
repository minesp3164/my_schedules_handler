import { Tabs } from 'expo-router';
import { TabBarIcon } from '../../components/TabBarIcon';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export default function TabLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: '#69809D',
        tabBarItemStyle: { width: '20%' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: palette.line,
          paddingTop: 6,
          paddingBottom: 4,
        },
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
          tabBarIcon: ({ color }) => <TabBarIcon name="focus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: '보상',
          tabBarIcon: ({ color }) => <TabBarIcon name="reward" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
