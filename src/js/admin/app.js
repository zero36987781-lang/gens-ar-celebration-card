import { getSupabaseConfig, signInAdmin } from '../core/auth.js';
import { getAllGifts, getGiftBySlug, saveGift } from '../core/data-service.js';
import { TEMPLATES, getTemplateById } from '../core/templates.js';
import { qs, setStatus, safeUrl, formatLocalDateInput, readHms, writeHms, parseYouTubeId } from '../core/utils.js';
import { applyPageLanguage } from '../core/i18n.js';

const els = {
  editor: qs('#admin-editor'),
  authStatus: qs('#admin-auth-status'),
  saveStatus: qs('#admin-save-status'),
  giftList: qs('#gift-list'),
  recentGifts: qs('#recent-gifts')
};

const state = { authenticated: false, currentGift: null };

function fields() {
  return {
    slug: qs('#admin-slug'), template: qs('#admin-template'),
    recipientName: qs('#admin-recipient-name'), senderName: qs('#admin-sender-name')
  };
}

function populateTemplates() {
  const sel = fields().template;
  if (sel) sel.innerHTML = TEMPLATES.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function enableEditor(msg) {
  state.authenticated = true;
  els.editor?.classList.remove('hidden');
  setStatus(els.authStatus, msg, 'success');
  renderGiftList();
}

async function onLogin(e) {
  e.preventDefault();
  try {
    await signInAdmin(qs('#admin-email')?.value?.trim(), qs('#admin-password')?.value?.trim());
    enableEditor('Admin session started.');
  } catch (error) {
    setStatus(els.authStatus, error.message || 'Sign in failed.', 'error');
  }
}

async function loadGift() {
  const slug = fields().slug?.value?.trim();
  if (!slug) { setStatus(els.saveStatus, 'Enter a slug.', 'error'); return; }
  try {
    const gift = await getGiftBySlug(slug);
    if (!gift) { setStatus(els.saveStatus, 'Not found.', 'error'); return; }
    state.currentGift = gift;
    fields().recipientName.value = gift.recipientName || '';
    fields().senderName.value = gift.senderName || '';
    fields().template.value = gift.templateId || TEMPLATES[0].id;
    setStatus(els.saveStatus, 'Gift loaded.', 'success');
  } catch (error) {
    setStatus(els.saveStatus, error.message || 'Failed.', 'error');
  }
}

async function saveCurrentGift() {
  if (!state.authenticated) { setStatus(els.saveStatus, 'Sign in first.', 'error'); return; }
  const f = fields();
  const base = state.currentGift || {};
  const payload = {
    ...base,
    slug: f.slug?.value?.trim(),
    templateId: f.template?.value,
    recipientName: f.recipientName?.value?.trim(),
    senderName: f.senderName?.value?.trim(),
    updatedAt: new Date().toISOString()
  };
  if (!payload.slug) { setStatus(els.saveStatus, 'Slug required.', 'error'); return; }
  try {
    state.currentGift = await saveGift(payload);
    setStatus(els.saveStatus, 'Saved.', 'success');
    renderGiftList();
  } catch (error) {
    setStatus(els.saveStatus, error.message || 'Failed.', 'error');
  }
}

async function renderGiftList() {
  try {
    const gifts = await getAllGifts();
    els.recentGifts?.classList.remove('hidden');
    if (!gifts.length) { els.giftList.innerHTML = '<div class="status-box muted">No gifts yet.</div>'; return; }
    els.giftList.innerHTML = gifts.map(g => `
      <button class="gift-item" type="button" data-slug="${g.slug}">
        <div><strong>${g.slug}</strong><div class="meta">${g.recipientName || ''} → ${g.senderName || ''} (${g.status || 'active'})</div></div>
        <span class="meta">${new Date(g.updatedAt || g.createdAt).toLocaleString()}</span>
      </button>
    `).join('');
  } catch (error) {
    els.giftList.innerHTML = `<div class="status-box error">${error.message}</div>`;
  }
}

async function init() {
  applyPageLanguage();
  populateTemplates();

  qs('#admin-login')?.addEventListener('submit', onLogin);
  qs('#demo-admin')?.addEventListener('click', () => enableEditor('Demo mode.'));
  qs('#admin-load')?.addEventListener('click', loadGift);
  qs('#admin-save')?.addEventListener('click', saveCurrentGift);
  els.giftList?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-slug]');
    if (!item) return;
    fields().slug.value = item.dataset.slug;
    loadGift();
  });

  const { url, anonKey } = await getSupabaseConfig();
  setStatus(els.authStatus, url && anonKey ? 'Supabase config detected. Sign in to edit.' : 'No Supabase config. Demo mode available.', url && anonKey ? 'success' : 'warn');
}

init();
