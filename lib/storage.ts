import { WatchItem } from './types';

const STORAGE_KEY = 'wishhunt_watchlist';

export function getWatchlist(): WatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchItem(item: WatchItem): void {
  const list = getWatchlist();
  const idx = list.findIndex((w) => w.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteWatchItem(id: string): void {
  const list = getWatchlist().filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function updateWatchItem(id: string, updates: Partial<WatchItem>): void {
  const list = getWatchlist();
  const idx = list.findIndex((w) => w.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
