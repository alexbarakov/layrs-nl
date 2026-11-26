// Key-value storage on the device (expo-sqlite kv-store). The web build uses localStorage (kv.web.ts).
import Storage from 'expo-sqlite/kv-store';

export const kvGet = (k: string): string | null => Storage.getItemSync(k);
export const kvSet = (k: string, v: string) => Storage.setItemSync(k, v);
