import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import type { Badge } from '@/services/api';
import { getBadges } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { loadCelebratedBadgeKeys, saveCelebratedBadgeKeys } from '@/services/badges';
import { BadgeCelebrationSheet } from '@/components/badges/BadgeCelebrationSheet';

// 전역 축하 호스트. ['badges'] 쿼리 diff와 축하 이력을 비교해 신규 배지에만 시트를 띄운다.
// 첫 실행에서는 이력이 없으므로 지금 달성한 배지를 조용히 시드해 한 번에 넘긴다.
export function BadgeCelebrationHost() {
  const [token, setToken] = useState<string | null>();
  const [queue, setQueue] = useState<Badge[]>([]);
  const [closing, setClosing] = useState(false);
  const [celebratedReady, setCelebratedReady] = useState(false);
  const celebratedRef = useRef<Set<string> | null>(null);
  const seededRef = useRef(false);
  const closingRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCelebratedBadgeKeys().then(({ keys, exists }) => {
      if (cancelled) return;
      celebratedRef.current = new Set(keys);
      seededRef.current = exists;
      setCelebratedReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const badges = useQuery({
    queryKey: ['badges'],
    queryFn: () => getBadges(token!),
    enabled: Boolean(token),
  });
  const data = badges.data;

  useEffect(() => {
    if (!celebratedReady || !data || !celebratedRef.current) return;
    const celebrated = celebratedRef.current;
    const achieved = data.badges.filter((badge) => badge.achieved_at);

    if (!seededRef.current) {
      seededRef.current = true;
      achieved.forEach((badge) => celebrated.add(badge.key));
      void saveCelebratedBadgeKeys([...celebrated]);
      return;
    }

    // 회수된 배지는 축하 이력에서 지운다. 다시 획득하면 다시 축하하기 위해서다.
    const held = new Set(achieved.map((badge) => badge.key));
    const pruned = [...celebrated].filter((key) => !held.has(key));
    pruned.forEach((key) => celebrated.delete(key));

    const fresh = achieved.filter((badge) => !celebrated.has(badge.key));
    if (!fresh.length && !pruned.length) return;
    // 큐에 넣는 즉시 이력을 갱신해 같은 배지가 다시 열리지 않게 한다.
    fresh.forEach((badge) => celebrated.add(badge.key));
    void saveCelebratedBadgeKeys([...celebrated]);
    if (fresh.length) setQueue((current) => [...current, ...fresh]);
  }, [celebratedReady, data]);

  // 닫힘 애니메이션(400ms)이 끝난 뒤에 큐에서 뺀다. 이 사이엔 내용이 그대로 남아 빈 시트가 보이지 않는다.
  const dequeue = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      setQueue(([, ...rest]) => rest);
      closingRef.current = false;
      setClosing(false);
    }, 400);
  };
  return (
    <BadgeCelebrationSheet
      badge={queue[0] ?? null}
      progress={data?.progress ?? null}
      visible={!closing}
      onDismiss={dequeue}
      onOpenFootprint={() => {
        dequeue();
        if (pathname !== '/footprint') router.push('/footprint');
      }}
    />
  );
}
