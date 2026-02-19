/**
 * Print template storage: list of templates with id, name, module, isDefault, layout.
 * One-time migration from legacy print_template_by_module (one per module) to new array format.
 */
import { MODULES, TEMPLATE_SECTIONS } from '../config/printTemplateModules';

const STORAGE_KEY = 'print_templates';
const SECTION_KEYS = [...TEMPLATE_SECTIONS, 'body'];
function toSectionPayload(obj) {
  const out = {};
  SECTION_KEYS.forEach((key) => {
    out[key] = Array.isArray(obj[key]) ? obj[key] : [];
  });
  return out;
}
const LEGACY_KEY = 'print_template_by_module';

function generateId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/** Migrate legacy storage (one template per module) to new array format. */
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
          header: Array.isArray(t.header) ? t.header : [],
          body: Array.isArray(t.body) ? t.body : [],
          footer: Array.isArray(t.footer) ? t.footer : [],
        });
      }
    });
    if (list.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch (_) {}
}

/** Get all templates. Migrates from legacy once if needed. */
export function getTemplates() {
  let list = loadRaw();
  if (!list || !Array.isArray(list)) {
    migrateFromLegacy();
    list = loadRaw();
  }
  return Array.isArray(list) ? list : [];
}

/** Get a single template by id. */
export function getTemplateById(id) {
  return getTemplates().find((t) => t.id === id) || null;
}

/** Get the default template for a module (e.g. 'invoices', 'quotations'). */
export function getDefaultTemplate(moduleKey) {
  return getTemplates().find((t) => t.module === moduleKey && t.isDefault) || null;
}

/** Save template (create or update). Returns saved template. */
export function saveTemplate(payload) {
  const list = getTemplates();
  const isUpdate = payload.id && list.some((t) => t.id === payload.id);
  let template;
  if (isUpdate) {
    list.forEach((t, i) => {
      if (t.id === payload.id) {
        const sections = toSectionPayload({ ...t, ...payload });
        template = {
          id: t.id,
          name: payload.name ?? t.name,
          module: payload.module ?? t.module,
          isDefault: payload.isDefault ?? t.isDefault,
          ...sections,
        };
        list[i] = template;
        if (template.isDefault) {
          list.forEach((x, j) => {
            if (x.module === template.module && j !== i) list[j] = { ...x, isDefault: false };
          });
        }
      }
    });
  } else {
    const newId = payload.id || generateId();
    template = {
      id: newId,
      name: payload.name || 'Untitled Template',
      module: payload.module || 'invoices',
      isDefault: payload.isDefault ?? false,
      ...toSectionPayload(payload),
    };
    if (template.isDefault) {
      list.forEach((x, i) => {
        if (x.module === template.module) list[i] = { ...x, isDefault: false };
      });
    }
    list.push(template);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return template;
}

/** Delete template by id. */
export function deleteTemplate(id) {
  const list = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Duplicate template; returns new template. */
export function duplicateTemplate(id) {
  const t = getTemplateById(id);
  if (!t) return null;
  const name = `${t.name} (Copy)`;
  return saveTemplate({
    name,
    module: t.module,
    isDefault: false,
    ...toSectionPayload(t),
  });
}

/** Set template as default for its module; unset others. */
export function setDefaultTemplate(id) {
  const list = getTemplates();
  const target = list.find((t) => t.id === id);
  if (!target) return;
  const updated = list.map((t) => ({
    ...t,
    isDefault: t.id === id ? true : (t.module === target.module ? false : t.isDefault),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
