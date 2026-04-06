const STORAGE_KEY = 'ar-surprise:gifts:v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

export function getAllGifts() {
  return readAll().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export function getGiftBySlug(slug) {
  return readAll().find((item) => item.slug === slug) || null;
}

export function saveGift(gift) {
  const items = readAll();
  const nextItems = items.filter((item) => item.slug !== gift.slug);
  nextItems.push({ ...gift, updatedAt: new Date().toISOString() });
  writeAll(nextItems);
  return gift;
}

export function deleteGift(slug) {
  writeAll(readAll().filter((item) => item.slug !== slug));
}
