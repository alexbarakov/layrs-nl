// Web preview: localStorage, guarded because private windows can throw.
export const kvGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
export const kvSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not persisted */ } };
