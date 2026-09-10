import { Link, Stack } from 'expo-router';

import { Text, View } from 'react-native';
import { t } from '@/services/i18n';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t('common.notFoundTitle') }} />
      <View className={styles.container}>
        <Text className={styles.title}>{t('common.notFoundTitle')}</Text>
        <Link href="/" className={styles.link}>
          <Text className={styles.linkText}>{t('common.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = {
  container: `items-center flex-1 justify-center p-5`,
  title: `text-xl font-bold`,
  link: `mt-4 pt-4`,
  linkText: `text-base text-[#2e78b7]`,
};
