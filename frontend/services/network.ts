import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

let online = true;

export function initNetworkMonitor() {
  NetInfo.addEventListener((state) => {
    online = state.isConnected !== false;
    onlineManager.setOnline(online);
  });
}

export const isOnline = () => online;

export function useIsOnline() {
  const [value, setValue] = useState(online);
  useEffect(
    () => NetInfo.addEventListener((state) => setValue(state.isConnected !== false)),
    []
  );
  return value;
}
