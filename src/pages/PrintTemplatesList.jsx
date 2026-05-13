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
  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Document Architecture"
          subtitle="Design and manage high-fidelity print layouts for transactional documents and contracts."
          primaryAction={(
            <Link to="/print-templates/new" className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>Create Layout</span>
            </Link>
          )}
        />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-white">
        <div className="px-6 lg:px-8 py-10 max-w-7xl">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6">
                <LayoutTemplate className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">No Architectures Defined</h2>
              <p className="text-slate-500 max-w-md mx-auto text-[14px] leading-relaxed mb-8">
                Initialize your first print architecture to begin generating professional grade PDF documents.
              </p>
              <Link to="/print-templates/new" className="btn-primary px-8">
                Begin Configuration
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {MODULE_ORDER.map((moduleKey) => {
                const items = grouped[moduleKey] || [];
                if (items.length === 0) return null;
                return (
                  <section key={moduleKey} className="animate-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap bg-white px-4">
                        {moduleLabel(moduleKey)} Engine
                      </h2>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                        >
                          <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="min-w-0">
                              <p className="text-[15px] font-black text-slate-900 truncate leading-none mb-2">{t.name}</p>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{moduleLabel(t.module)} Architecture</p>
                            </div>
                            {t.isDefault && (
                              <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 shadow-sm animate-pulse">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              </div>
                            )}
                          </div>

                          <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                               <button
                                onClick={() => handleSetDefault(t.id)}
                                className={clsx(
                                  "p-2.5 rounded-xl transition-all active:scale-95",
                                  t.isDefault ? "bg-amber-100 text-amber-600 shadow-inner" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-amber-600"
                                )}
                                title="Define as Primary"
                              >
                                <Star className={clsx("w-4 h-4", t.isDefault && "fill-current")} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                to={`/print-templates/edit/${t.id}`}
                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all active:scale-95"
                                title="Architect Layout"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(t.id)}
                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-all active:scale-95"
                                title="Clone Prototype"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(t.id, t.name)}
                                className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-95"
                                title="Decommission"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
      </div>
    </div>
  );
}
