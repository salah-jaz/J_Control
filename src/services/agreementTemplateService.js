/**
 * Saved Agreement Templates - stored in localStorage.
 * Each template: { id, title, createdAt, content: blocks[] }
 */

const STORAGE_KEY = 'j_control_saved_agreements';

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function generateId() {
  return `agt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @returns {Array<{ id: string, title: string, createdAt: string, content: Array }>} */
export function getSavedAgreements() {
  const list = loadAll();
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * @param {string} title
 * @param {Array} content - agreement blocks
 * @returns {{ id: string, title: string, createdAt: string, content: Array }}
 */
export function saveAgreement(title, content) {
  const list = loadAll();
  const item = {
    id: generateId(),
    title: String(title || 'Untitled Agreement').trim() || 'Untitled Agreement',
    createdAt: new Date().toISOString(),
    content: Array.isArray(content) ? content : [],
  };
  list.unshift(item);
  saveAll(list);
  return item;
}

/**
 * @param {string} id
 * @param {{ title?: string, content?: Array }} updates
 */
export function updateAgreement(id, updates = {}) {
  const list = loadAll();
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const next = { ...list[idx] };
  if (updates.title !== undefined) next.title = String(updates.title || 'Untitled Agreement').trim() || 'Untitled Agreement';
  if (updates.content !== undefined) next.content = Array.isArray(updates.content) ? updates.content : next.content;
  list[idx] = next;
  saveAll(list);
  return next;
}

/** @param {string} id */
export function getAgreement(id) {
  return loadAll().find((a) => a.id === id) || null;
}

/** @param {string} id */
export function deleteAgreement(id) {
  const list = loadAll().filter((a) => a.id !== id);
  saveAll(list);
  return true;
}
