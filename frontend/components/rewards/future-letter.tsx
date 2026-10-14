import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { RewardRedemption } from '@/services/api';
import { formatShortDate, t } from '@/services/i18n';
import type { OnClaim } from './shared';

export function FutureLetter({
  accent,
  letters,
  onRedeem,
}: {
  accent: string;
  letters: RewardRedemption[];
  onRedeem: OnClaim;
}) {
  const [letter, setLetter] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7A98C9]">
        PRIVATE LETTER · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2B2A31]">
        {t('rewards.future.headline')}
      </Text>
      <Text className="mt-3 text-sm leading-6 text-[#77717C]">{t('rewards.future.body')}</Text>
      {saved ? (
        <View className="mt-7 items-center rounded-3xl bg-[#FFF2D9] px-6 py-10">
          <Text className="text-4xl">♡</Text>
          <Text className="mt-4 text-xl font-bold text-[#5D482D]">
            {t('rewards.future.savedTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-[#806B51]">
            {t('rewards.future.savedBody')}
          </Text>
          <Pressable
            onPress={() => {
              setLetter('');
              setSaved(false);
            }}
            className="mt-6 rounded-2xl border border-[#D5DDEA] bg-white px-5 py-3">
            <Text className="font-bold text-[#3B4B6B]">{t('rewards.future.again')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="mt-3 rounded-2xl px-5 py-3"
            style={{ backgroundColor: accent }}>
            <Text className="font-bold text-white">{t('rewards.backToBox')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="mt-7 min-h-52 rounded-sm border border-[#E3D3B4] bg-[#FFFDF5] p-5 shadow-sm">
            <Text className="border-b border-dashed border-[#DAC7A2] pb-3 text-[10px] tracking-[1px] text-[#987C51]">
              {t('rewards.future.to')}
            </Text>
            <TextInput
              value={letter}
              onChangeText={setLetter}
              multiline
              placeholder={t('rewards.future.placeholder')}
              placeholderTextColor="#C2B49B"
              className="mt-4 min-h-28 text-base leading-7 text-[#4B3D2D]"
              textAlignVertical="top"
            />
            <Text className="text-right text-[10px] text-[#9C8A6E]">{t('rewards.future.tag')}</Text>
          </View>
          <Pressable
            disabled={!letter.trim()}
            onPress={async () => {
              const ok = await onRedeem({ letter: letter.trim() });
              if (ok) setSaved(true);
            }}
            className="mt-7 flex-row items-center justify-between rounded-2xl px-5 py-4"
            style={{ backgroundColor: letter.trim() ? accent : '#D5DDEA' }}>
            <Text className="font-bold text-white">{t('rewards.future.submit')}</Text>
            <Text className="text-xl text-white">→</Text>
          </Pressable>
        </>
      )}
      {letters.length ? (
        <View className="mt-8">
          <Text className="text-[10px] font-bold tracking-[1.5px] text-[#987C51]">
            SAVED LETTERS
          </Text>
          <Text className="mb-3 mt-1 text-lg font-bold text-[#2B2A31]">
            {t('rewards.future.savedCount', { count: letters.length })}
          </Text>
          {letters.map((item) => (
            <View
              key={item.id}
              className="mb-2 rounded-2xl border border-[#E3D3B4] bg-[#FFFDF5] p-4">
              <Text className="text-[10px] tracking-[1px] text-[#987C51]">
                {t('rewards.future.savedMeta', {
                  date: formatShortDate(new Date(item.redeemed_at ?? item.unlocked_at)),
                })}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-[#4B3D2D]" numberOfLines={4}>
                {typeof item.payload.letter === 'string' ? item.payload.letter : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
