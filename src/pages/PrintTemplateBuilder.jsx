import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GripVertical, Eye, Code, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MODULES,
  MODULE_FIELDS,
  TEMPLATE_SECTIONS,
  buildFullTemplateHtml,
  resolveTemplateHtml,
} from '../config/printTemplateModules';
import { getTemplateById, saveTemplate } from '../utils/printTemplateStorage';

const DEFAULT_TEMPLATE = Object.fromEntries(
  [...TEMPLATE_SECTIONS, 'body'].map((k) => [k, []])
);

const SECTION_LABELS = {
  header: 'Header Section',
  customerLeft: 'Invoice To (Customer)',
  customerRight: 'Invoice From (Company)',
  itemsTable: 'Items Table Section',
  totals: 'Totals Section',
  bankDetails: 'Bank Details Section',
  contactInfo: 'Contact Info Section',
  signature: 'Signature Section',
  footer: 'Footer Section',
  body: 'Body (legacy)',
};

export default function PrintTemplateBuilder() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(editId);

  const [templateName, setTemplateName] = useState('');
  const [selectedModule, setSelectedModule] = useState('invoices');
  const [template, setTemplate] = useState(() => ({ ...DEFAULT_TEMPLATE }));
  const [activeTab, setActiveTab] = useState('builder');

  const prefix = MODULES.find((m) => m.value === selectedModule)?.prefix || 'invoice';
  const availableFields = MODULE_FIELDS[selectedModule] || MODULE_FIELDS.invoices;

  // Load template when editing; reset when new
  useEffect(() => {
    if (isEdit && editId) {
      const t = getTemplateById(editId);
      if (t) {
        setTemplateName(t.name || '');
        setSelectedModule(t.module || 'invoices');
        const merged = { ...DEFAULT_TEMPLATE };
        [...TEMPLATE_SECTIONS, 'body'].forEach((key) => {
          merged[key] = Array.isArray(t[key]) ? t[key] : [];
        });
        setTemplate(merged);
      } else {
        toast.error('Template not found');
        navigate('/print-templates', { replace: true });
      }
    } else {
      setTemplateName('');
      setSelectedModule('invoices');
      setTemplate({ ...DEFAULT_TEMPLATE });
    }
  }, [editId, isEdit, navigate]);

  const handleDragStart = useCallback((e, field) => {
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e, zone) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      try {
        const field = JSON.parse(raw);
        setTemplate((prev) => ({
          ...prev,
          [zone]: [...(prev[zone] || []), { id: field.id, label: field.label, variable: field.variable }],
        }));
      } catch (_) {}
    },
    []
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const removeFromZone = useCallback((zone, index) => {
    setTemplate((prev) => ({
      ...prev,
      [zone]: (prev[zone] || []).filter((_, i) => i !== index),
    }));
  }, []);

  const buildStructuredHtml = useCallback(() => {
    const lines = [];
    [...TEMPLATE_SECTIONS, 'body'].forEach((zone) => {
      const items = template[zone] || [];
      if (items.length > 0) {
        lines.push(`<!-- ${(SECTION_LABELS[zone] || zone).toUpperCase()} -->`);
        items.forEach((item) => {
          lines.push(`{{${prefix}.${item.variable}}}`);
        });
        lines.push('');
      }
    });
    return lines.join('\n').trim() || `<!-- Add fields from ${selectedModule} -->`;
  }, [template, prefix, selectedModule]);

  const fullTemplateHtml = buildFullTemplateHtml(template, selectedModule);
  const previewHtml = resolveTemplateHtml(fullTemplateHtml, selectedModule);

  const handleSave = useCallback(() => {
    const name = (templateName || '').trim();
    if (!name) {
      toast.error('Enter a template name');
      return;
    }
    saveTemplate({
      id: isEdit ? editId : undefined,
      name,
      module: selectedModule,
      ...template,
    });
    toast.success(isEdit ? 'Template updated' : 'Template saved');
    navigate('/print-templates');
  }, [templateName, selectedModule, template, isEdit, editId, navigate]);

  const DropZone = ({ zone, title }) => (
    <div
      className="min-h-[80px] p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, zone)}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {(template[zone] || []).map((item, idx) => (
          <span
            key={`${zone}-${idx}-${item.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700"
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
            {item.label}
            <button
              type="button"
              onClick={() => removeFromZone(zone, idx)}
              className="ml-1 text-slate-400 hover:text-red-600"
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}
        <span className="text-slate-400 text-sm">Drop here</span>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {isEdit ? 'Edit Template' : 'New Template'}
          </h1>
          <p className="text-slate-500 mt-1">Build print layouts per module. Available fields update when you change the module.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="label text-sm font-bold text-slate-700 block mb-1">Template Name</label>
            <input
              type="text"
              className="input min-w-[200px]"
              placeholder="e.g. Invoice Standard"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          <div>
            <label className="label text-sm font-bold text-slate-700 block mb-1">Module</label>
            <select
              className="input min-w-[160px]"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => navigate('/print-templates')} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Template
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Fields - updates when module changes */}
        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-[72px]">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Available Fields</h2>
            <p className="text-xs text-slate-500 mb-3">Drag into sections below. Fields are for: {MODULES.find((m) => m.value === selectedModule)?.label}.</p>
            <ul className="space-y-2">
              {availableFields.map((field) => (
                <li
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, field)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:border-brand-300 hover:bg-brand-50/30 text-sm font-medium text-slate-700"
                >
                  <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {field.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Builder + Preview + Code */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${activeTab === 'builder' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px flex items-center gap-1 ${activeTab === 'preview' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px flex items-center gap-1 ${activeTab === 'code' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
            >
              <Code className="w-4 h-4" /> HTML
            </button>
          </div>

          {activeTab === 'builder' && (
            <div className="card p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <DropZone zone="header" title={SECTION_LABELS.header} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DropZone zone="customerLeft" title={SECTION_LABELS.customerLeft} />
                <DropZone zone="customerRight" title={SECTION_LABELS.customerRight} />
              </div>
              <DropZone zone="itemsTable" title={SECTION_LABELS.itemsTable} />
              <DropZone zone="totals" title={SECTION_LABELS.totals} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DropZone zone="bankDetails" title={SECTION_LABELS.bankDetails} />
                <DropZone zone="contactInfo" title={SECTION_LABELS.contactInfo} />
              </div>
              <DropZone zone="signature" title={SECTION_LABELS.signature} />
              <DropZone zone="footer" title={SECTION_LABELS.footer} />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-3">Preview ({MODULES.find((m) => m.value === selectedModule)?.label} – matches print output)</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-100/50 overflow-hidden min-h-[320px]">
                {(() => {
                const hasFields = [...TEMPLATE_SECTIONS, 'body'].some((zone) => (template[zone]?.length || 0) > 0);
                if (!hasFields) {
                  return (
                    <div className="flex items-center justify-center min-h-[320px] text-slate-400">
                      <p>Add fields in the Builder to see preview.</p>
                    </div>
                  );
                }
                return (
                  <iframe
                    title="Print template preview"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${previewHtml}</body></html>`}
                    className="w-full min-h-[480px] border-0 bg-white"
                    style={{ height: '520px' }}
                    sandbox="allow-same-origin"
                  />
                );
              })()}
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-3">Template variables ({'{{module.field}}'})</h3>
              <pre className="rounded-xl bg-slate-900 text-slate-100 p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                {buildStructuredHtml()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
