import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Pencil, Trash2, Copy, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { MODULES } from '../config/printTemplateModules';
import {
  getTemplates,
  deleteTemplate,
  duplicateTemplate,
  setDefaultTemplate,
} from '../utils/printTemplateStorage';

const MODULE_ORDER = ['quotations', 'invoices', 'agreements'];

export default function PrintTemplatesList() {
  const [templates, setTemplates] = useState(() => getTemplates());

  const grouped = useMemo(() => {
    const byModule = {};
    MODULE_ORDER.forEach((key) => {
      byModule[key] = templates.filter((t) => t.module === key);
    });
    return byModule;
  }, [templates]);

  const refresh = () => setTemplates(getTemplates());

  const handleDelete = (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    deleteTemplate(id);
    refresh();
    toast.success('Template deleted');
  };

  const handleDuplicate = (id) => {
    const created = duplicateTemplate(id);
    if (created) {
      refresh();
      toast.success(`Created "${created.name}"`);
    }
  };

  const handleSetDefault = (id) => {
    setDefaultTemplate(id);
    refresh();
    toast.success('Set as default');
  };

  const moduleLabel = (key) => MODULES.find((m) => m.value === key)?.label || key;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Print Templates</h1>
          <p className="text-slate-500 mt-1">Manage print layouts for Invoices, Quotations, and Agreements.</p>
        </div>
        <Link
          to="/print-templates/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <LayoutTemplate className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No templates yet</h2>
          <p className="text-slate-500 mb-6">Create a template to design print layouts for your documents.</p>
          <Link to="/print-templates/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Template
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {MODULE_ORDER.map((moduleKey) => {
            const items = grouped[moduleKey] || [];
            if (items.length === 0) return null;
            return (
              <section key={moduleKey}>
                <h2 className="text-lg font-bold text-slate-800 mb-4">{moduleLabel(moduleKey)}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{t.name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{moduleLabel(t.module)}</p>
                        {t.isDefault && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            <Star className="w-3.5 h-3.5" /> Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefault(t.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                          title="Set as default"
                        >
                          <Star className={`w-4 h-4 ${t.isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                        <Link
                          to={`/print-templates/edit/${t.id}`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
