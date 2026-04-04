import { getSupabaseClient } from './auth.js';
import { deleteGift as deleteLocalGift, getAllGifts as getLocalGifts, getGiftBySlug as getLocalGiftBySlug, saveGift as saveLocalGift } from './storage.js';

const TABLE_NAME = 'gifts';

function rowToGift(row) {
  if (!row) return null;
  return {
    ...row.payload,
    slug: row.slug,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    id: row.id
  };
}

function giftToRow(gift) {
  return {
    slug: gift.slug,
    status: gift.status || 'active',
    expires_at: gift.expiresAt,
    payload: {
      ...gift,
      expiresAt: gift.expiresAt,
      status: gift.status || 'active'
    }
  };
}

async function getClient() {
  return getSupabaseClient();
}

export async function saveGift(gift) {
  const client = await getClient();
  if (!client) {
    saveLocalGift(gift);
    return gift;
  }

  const row = giftToRow(gift);
  const { data, error } = await client
    .from(TABLE_NAME)
    .upsert(row, { onConflict: 'slug' })
    .select('*')
    .single();

  if (error) throw error;
  return rowToGift(data);
}

export async function getGiftBySlug(slug) {
  const client = await getClient();
  if (!client) {
    return getLocalGiftBySlug(slug);
  }

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return rowToGift(data);
}

export async function getAllGifts() {
  const client = await getClient();
  if (!client) {
    return getLocalGifts();
  }

  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(rowToGift);
}

export async function deleteGift(slug) {
  const client = await getClient();
  if (!client) {
    deleteLocalGift(slug);
    return;
  }

  const { error } = await client.from(TABLE_NAME).delete().eq('slug', slug);
  if (error) throw error;
}
