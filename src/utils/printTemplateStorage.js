/**
 * DB-backed print template storage.
 * Falls back to localStorage when API is unavailable.
 */
import { MODULES, TEMPLATE_SECTIONS, AGREEMENT_TEMPLATE_SECTIONS } from '../config/printTemplateModules';
import {
  PREMIUM_INVOICE_TEMPLATE_ID,
  PREMIUM_INVOICE_TEMPLATE_HTML,
  PREMIUM_INVOICE_TEMPLATE_CSS,
  PROFESSIONAL_INVOICE_TEMPLATE_ID,
  PROFESSIONAL_INVOICE_TEMPLATE_HTML,
  PROFESSIONAL_INVOICE_TEMPLATE_CSS,
  MINIMAL_INVOICE_TEMPLATE_ID,
  MINIMAL_INVOICE_TEMPLATE_HTML,
  MINIMAL_INVOICE_TEMPLATE_CSS,
  PREMIUM_QUOTATION_TEMPLATE_ID,
  PREMIUM_QUOTATION_TEMPLATE_HTML,
  PREMIUM_QUOTATION_TEMPLATE_CSS,
  PREMIUM_AGREEMENT_TEMPLATE_ID,
  PREMIUM_AGREEMENT_TEMPLATE_HTML,
  PREMIUM_AGREEMENT_TEMPLATE_CSS,
} from '../config/premiumInvoiceTemplate';

const STORAGE_KEY = 'print_templates';
const SECTION_KEYS = [...new Set([...TEMPLATE_SECTIONS, 'body', ...AGREEMENT_TEMPLATE_SECTIONS])];
const LEGACY_KEY = 'print_template_by_module';
const API_BASE = 'http://localhost:8000/api/print-templates';

let memoryCache = null;
let lastDbSyncMs = 0;

function toSectionPayload(obj) {
  const out = {};
  SECTION_KEYS.forEach((key) => {
    out[key] = Array.isArray(obj?.[key]) ? obj[key] : [];
  });
  return out;
}

function generateId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { }
  return null;
}

function saveRaw(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) { }
}

function getAuthToken() {
  try {
    return localStorage.getItem('token');
  } catch (_) {
    return null;
  }
}

function migrateFromLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    const list = [];
    MODULES.forEach((m) => {
      const t = map[m.value];
      if (t && (t.header || t.body || t.footer)) {
        list.push({
          id: generateId(),
          name: `${m.label} Template`,
          module: m.value,
          isDefault: true,
          ...toSectionPayload(t),
        });
      }
    });
    if (list.length > 0) {
      saveRaw(list);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch (_) { }
}

function getSeedTemplates(existing = []) {
  const hasDefault = (module) => existing.some((t) => t?.module === module && t?.isDefault);
  return [
    {
      id: PREMIUM_INVOICE_TEMPLATE_ID,
      name: 'Premium Blue Invoice',
      module: 'invoices',
      isDefault: !hasDefault('invoices'),
      ...toSectionPayload({}),
      template_html: PREMIUM_INVOICE_TEMPLATE_HTML,
      template_css: PREMIUM_INVOICE_TEMPLATE_CSS,
      styles: null,
      description: 'Modern premium invoice layout with polished print styling.',
    },
    {
      id: PROFESSIONAL_INVOICE_TEMPLATE_ID,
      name: 'Professional Corporate Invoice',
      module: 'invoices',
      isDefault: false,
      ...toSectionPayload({}),
      template_html: PROFESSIONAL_INVOICE_TEMPLATE_HTML,
      template_css: PROFESSIONAL_INVOICE_TEMPLATE_CSS,
      styles: null,
      description: 'Professional corporate invoice with strong readability.',
    },
    {
      id: MINIMAL_INVOICE_TEMPLATE_ID,
      name: 'Minimal Clean Invoice',
      module: 'invoices',
      isDefault: false,
      ...toSectionPayload({}),
      template_html: MINIMAL_INVOICE_TEMPLATE_HTML,
      template_css: MINIMAL_INVOICE_TEMPLATE_CSS,
      styles: null,
      description: 'Clean and minimal invoice for lightweight printing.',
    },
    {
      id: PREMIUM_QUOTATION_TEMPLATE_ID,
      name: 'Premium Blue Quotation',
      module: 'quotations',
      isDefault: !hasDefault('quotations'),
      ...toSectionPayload({}),
      template_html: PREMIUM_QUOTATION_TEMPLATE_HTML,
      template_css: PREMIUM_QUOTATION_TEMPLATE_CSS,
      styles: null,
      description: 'Premium quotation layout with polished modern design.',
    },
    {
      id: PREMIUM_AGREEMENT_TEMPLATE_ID,
      name: 'Premium Professional Agreement',
      module: 'agreements',
      isDefault: !hasDefault('agreements'),
      ...toSectionPayload({}),
      template_html: PREMIUM_AGREEMENT_TEMPLATE_HTML,
      template_css: PREMIUM_AGREEMENT_TEMPLATE_CSS,
      styles: null,
      description: 'Professional agreement layout for legal and service documents.',
    },
  ];
}

function upsertSeeds(list) {
  const current = Array.isArray(list) ? [...list] : [];
  const seeds = getSeedTemplates(current);
  let changed = false;

  seeds.forEach((seed) => {
    const idx = current.findIndex((t) => t?.id === seed.id);
    if (idx === -1) {
      current.push(seed);
      changed = true;
      return;
    }
    const existing = current[idx];
    const merged = {
      ...existing,
      id: seed.id,
      name: seed.name,
      module: seed.module,
      description: seed.description,
      template_html: seed.template_html,
      template_css: seed.template_css,
      isDefault: existing?.isDefault ?? seed.isDefault,
      ...toSectionPayload(existing || {}),
    };
    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
      current[idx] = merged;
      changed = true;
    }
  });

  if (!current.some((t) => t?.module === 'invoices' && t?.isDefault)) {
    const idx = current.findIndex((t) => t?.id === PREMIUM_INVOICE_TEMPLATE_ID);
    if (idx !== -1) {
      current[idx] = { ...current[idx], isDefault: true };
      changed = true;
    }
  }

  if (!current.some((t) => t?.module === 'quotations' && t?.isDefault)) {
    const idx = current.findIndex((t) => t?.id === PREMIUM_QUOTATION_TEMPLATE_ID);
    if (idx !== -1) {
      current[idx] = { ...current[idx], isDefault: true };
      changed = true;
    }
  }

  if (!current.some((t) => t?.module === 'agreements' && t?.isDefault)) {
    const idx = current.findIndex((t) => t?.id === PREMIUM_AGREEMENT_TEMPLATE_ID);
    if (idx !== -1) {
      current[idx] = { ...current[idx], isDefault: true };
      changed = true;
    }
  }

  return { list: current, changed };
}

function normalizeTemplate(t) {
  return {
    id: t.id,
    name: t.name || 'Untitled Template',
    module: t.module || 'invoices',
    isDefault: !!(t.isDefault ?? t.is_default),
    ...toSectionPayload(t),
    template_html: t.template_html,
    template_css: t.template_css,
    styles: t.styles ?? null,
    description: t.description || '',
  };
}

function toDbPayload(t) {
  return {
    id: t.id,
    name: t.name,
    module: t.module,
    isDefault: !!t.isDefault,
    description: t.description || '',
    template_html: t.template_html,
    template_css: t.template_css,
    styles: t.styles ?? null,
    ...toSectionPayload(t),
  };
}

function syncFromDbAsync(force = false) {
  const now = Date.now();
  if (!force && now - lastDbSyncMs < 10000 && Array.isArray(memoryCache)) return;
  lastDbSyncMs = now;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(API_BASE, { headers })
    .then((res) => {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then((data) => {
      if (Array.isArray(data)) {
        const dbList = data.map(normalizeTemplate);
        const seeded = upsertSeeds(dbList);
        if (seeded.changed) {
          pushSeedTemplatesToDbAsync(seeded.list, dbList);
        }
        memoryCache = seeded.list;
        saveRaw(memoryCache);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('print_templates_updated', { detail: memoryCache }));
        }
      }
    })
    .catch(() => {});
}

function pushSeedTemplatesToDbAsync(allList, dbList) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const seeds = getSeedTemplates(allList);
  seeds.forEach((seed) => {
    const existsInDb = dbList.some((x) => x.id === seed.id);
    const url = existsInDb ? `${API_BASE}/${encodeURIComponent(seed.id)}` : API_BASE;
    const method = existsInDb ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers,
      body: JSON.stringify(toDbPayload(seed))
    }).catch(() => {});
  });
}

function getLocalListWithSeeds() {
  let list = loadRaw();
  if (!list || !Array.isArray(list)) {
    migrateFromLegacy();
    list = loadRaw();
  }
  const safe = Array.isArray(list) ? list.map(normalizeTemplate) : [];
  const seeded = upsertSeeds(safe);
  if (seeded.changed) saveRaw(seeded.list);
  memoryCache = seeded.list;
  return seeded.list;
}

export function getTemplates() {
  syncFromDbAsync();
  if (Array.isArray(memoryCache)) return memoryCache;
  return getLocalListWithSeeds();
}

export function getTemplateById(id) {
  return getTemplates().find((t) => t.id === id) || null;
}

export function getDefaultTemplate(moduleKey) {
  return getTemplates().find((t) => t.module === moduleKey && t.isDefault) || null;
}

export function saveTemplate(payload) {
  const list = getTemplates();
  const isUpdate = payload.id && list.some((t) => t.id === payload.id);
  let template;

  if (isUpdate) {
    list.forEach((t, i) => {
      if (t.id === payload.id) {
        template = {
          id: t.id,
          name: payload.name ?? t.name,
          module: payload.module ?? t.module,
          isDefault: payload.isDefault ?? t.isDefault,
          ...toSectionPayload({ ...t, ...payload }),
          template_html: payload.template_html !== undefined ? payload.template_html : t.template_html,
          template_css: payload.template_css !== undefined ? payload.template_css : t.template_css,
          styles: payload.styles !== undefined ? payload.styles : t.styles,
          description: payload.description !== undefined ? payload.description : t.description,
        };
        list[i] = template;
      }
    });
  } else {
    template = {
      id: payload.id || generateId(),
      name: payload.name || 'Untitled Template',
      module: payload.module || 'invoices',
      isDefault: payload.isDefault ?? false,
      ...toSectionPayload(payload),
      template_html: payload.template_html,
      template_css: payload.template_css,
      styles: payload.styles ?? null,
      description: payload.description || '',
    };
    list.push(template);
  }

  if (template?.isDefault) {
    list.forEach((x, i) => {
      if (x.module === template.module && x.id !== template.id) list[i] = { ...x, isDefault: false };
    });
  }

  saveRaw(list);
  memoryCache = list;

  const dbPayload = toDbPayload(template);
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = isUpdate ? `${API_BASE}/${encodeURIComponent(template.id)}` : API_BASE;
  const method = isUpdate ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers,
    body: JSON.stringify(dbPayload)
  })
  .then(() => {
    syncFromDbAsync(true);
  })
  .catch(() => {});

  return template;
}

export function deleteTemplate(id) {
  const list = getTemplates().filter((t) => t.id !== id);
  saveRaw(list);
  memoryCache = list;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers
  })
  .then(() => {
    syncFromDbAsync(true);
  })
  .catch(() => {});
}

export function duplicateTemplate(id) {
  const t = getTemplateById(id);
  if (!t) return null;
  return saveTemplate({
    name: `${t.name} (Copy)`,
    module: t.module,
    isDefault: false,
    ...toSectionPayload(t),
    template_html: t.template_html,
    template_css: t.template_css,
    styles: t.styles,
    description: t.description,
  });
}

export function setDefaultTemplate(id) {
  const list = getTemplates();
  const target = list.find((t) => t.id === id);
  if (!target) return;
  const updated = list.map((t) => ({
    ...t,
    isDefault: t.id === id ? true : (t.module === target.module ? false : t.isDefault),
  }));
  saveRaw(updated);
  memoryCache = updated;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const changedModule = updated.filter((t) => t.module === target.module);
  Promise.all(
    changedModule.map((t) =>
      fetch(`${API_BASE}/${encodeURIComponent(t.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(toDbPayload(t))
      }).catch(() => {})
    )
  )
  .then(() => {
    syncFromDbAsync(true);
  })
  .catch(() => {});
}
