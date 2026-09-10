import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateDevice } from '@/services/api';
import { saveDeviceToken } from '@/services/device-token';
import { createUuid } from '@/services/ids';
import { t } from '@/services/i18n';

export default function ActivateScreen() {
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await activateDevice({
        setupKey,
        installationId: createUuid(),
        name: Platform.OS === 'ios' ? 'iPhone' : t('activate.deviceName'),
        platform: Platform.OS,
      });
      await saveDeviceToken(result.access_token);
      router.replace('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('common.connectFailed'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 py-8"
          keyboardShouldPersistTaps="handled">
          <Text className="text-3xl font-bold text-[#173052]">{t('activate.title')}</Text>
          <Text className="mt-3 leading-6 text-muted">{t('activate.description')}</Text>
          <TextInput
            value={setupKey}
            onChangeText={setSetupKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            placeholder={t('activate.placeholder')}
            placeholderTextColor="#69809D"
            className="mt-8 rounded-xl border border-line bg-surface px-4 py-4 text-[#173052]"
          />
          <Pressable
            disabled={!setupKey || loading}
            onPress={connect}
            className="mt-3 min-h-12 items-center justify-center rounded-xl bg-lavender px-4 py-3 disabled:opacity-40">
            <Text className="font-bold text-white">
              {loading ? t('activate.connecting') : t('activate.connect')}
            </Text>
          </Pressable>
          {error ? <Text className="mt-4 text-sm text-[#FF9BA6]">{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
