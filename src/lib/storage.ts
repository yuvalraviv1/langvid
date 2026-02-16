import type { SavedItem } from '../types';

const STORAGE_KEY = 'langvid_saved_items';

export function getSavedItems(): SavedItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveItem(item: SavedItem): void {
  const items = getSavedItems();
  items.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function deleteItem(id: string): void {
  const items = getSavedItems().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
