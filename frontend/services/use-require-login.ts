import { useCallback } from 'react';
import { router } from 'expo-router';

export function useRequireLogin() {
  return useCallback((token: string | null | undefined) => {
    if (token) return true;

    router.push('/activate');
    return false;
  }, []);
}
