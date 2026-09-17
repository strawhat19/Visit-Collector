import { Platform } from 'react-native';

export const elementProps = (className: string, suffix?: string | number) => {
  const name = className.trim().split(/\s+/)?.[0] ?? `collector-element`;
  const id = `${name}${suffix === undefined ? `` : `-${String(suffix).replace(/[^a-zA-Z0-9_-]/g, `-`)}`}`;
  return Platform.OS === `web` ? { id, className, dataSet: { vcClass: className } } : { id, nativeID: id };
};
