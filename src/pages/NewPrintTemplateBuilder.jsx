import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GripVertical, Eye, Code, Save, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MODULES,
  MODULE_FIELDS,
  TEMPLATE_SECTIONS,
  AGREEMENT_TEMPLATE_SECTIONS,
  DEFAULT_AGREEMENT_STYLES,
  buildFullTemplateHtml,
  getDefaultCss,
  resolveTemplateHtml,
  resolveTemplateHtmlWithData,
  getSampleData,
  parseTemplateFromHtml,
} from '../config/printTemplateModules';
import { PREMIUM_TEMPLATES } from '../config/premiumTemplates';
import { getTemplateById, saveTemplate } from '../utils/printTemplateStorage';

const AUTO_SCROLL_THRESHOLD = 100;
const AUTO_SCROLL_STEP = 12;
const SCROLL_TICK_MS = 16;

const ALL_SECTION_KEYS = [...new Set([...TEMPLATE_SECTIONS, 'body', ...AGREEMENT_TEMPLATE_SECTIONS])];
const DEFAULT_TEMPLATE = Object.fromEntries(ALL_SECTION_KEYS.map((k) => [k, []]));

const SECTION_LABELS = {
  title: 'Title',
  header: 'Header Section',
  customerLeft: 'Invoice To (Customer)',
  customerRight: 'Invoice From (Company)',
  itemsTable: 'Items Table Section',
  totals: 'Totals Section',
  bankDetails: 'Bank Details Section',
  contactInfo: 'Contact Info Section',
  signature: 'Signature Section',
  termsAndConditions: 'Terms and Conditions',
  footer: 'Footer Section',
  body: 'Body',
  partyDetailsProvider: 'Service Provider',
  partyDetailsClient: 'Client',
  signatureProvider: 'Service Provider Signature',
  signatureClient: 'Client Signature',
};

export default function PrintTemplateBuilder() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(editId);

  const [templateName, setTemplateName] = useState('');
  const [selectedModule, setSelectedModule] = useState('invoices');
  const [template, setTemplate] = useState(() => ({ ...DEFAULT_TEMPLATE }));
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateCss, setTemplateCss] = useState('');
  const [templateStyles, setTemplateStyles] = useState(() => ({ ...DEFAULT_AGREEMENT_STYLES }));
  const [activeTab, setActiveTab] = useState('builder');
  const [isDragging, setIsDragging] = useState(false);

  const builderScrollRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  const prefix = MODULES.find((m) => m.value === selectedModule)?.prefix || 'invoice';
  const availableFields = MODULE_FIELDS[selectedModule] || MODULE_FIELDS.invoices;

  const lastDragPosRef = useRef({ x: 0, y: 0 });

  // Auto-scroll while dragging: document-level dragover + scroll when near viewport edges or builder edges
  useEffect(() => {
    if (!isDragging) return;

    const onDocumentDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      lastDragPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const { x, y } = lastDragPosRef.current;
      if (y < AUTO_SCROLL_THRESHOLD) {
        window.scrollBy(0, -AUTO_SCROLL_STEP);
      } else if (y > window.innerHeight - AUTO_SCROLL_THRESHOLD) {
        window.scrollBy(0, AUTO_SCROLL_STEP);
      }
      const el = builderScrollRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const inBuilder = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (inBuilder) {
          const zoneHeight = rect.height;
          const relY = y - rect.top;
          if (relY < AUTO_SCROLL_THRESHOLD && zoneHeight > AUTO_SCROLL_THRESHOLD * 2) {
            el.scrollTop -= AUTO_SCROLL_STEP;
          } else if (relY > zoneHeight - AUTO_SCROLL_THRESHOLD && zoneHeight > AUTO_SCROLL_THRESHOLD * 2) {
            el.scrollTop += AUTO_SCROLL_STEP;
          }
        }
      }
    };

    document.addEventListener('dragover', onDocumentDragOver, false);
    scrollIntervalRef.current = setInterval(tick, SCROLL_TICK_MS);

    return () => {
      document.removeEventListener('dragover', onDocumentDragOver, false);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isDragging]);

  // Load template when editing; reset when new. Styles must be restored so Styles tab and Preview show saved values.
  useEffect(() => {
    if (isEdit && editId) {
      const t = getTemplateById(editId);
      if (t) {
        setTemplateName(t.name || '');
        setSelectedModule(t.module || 'invoices');
        const merged = { ...DEFAULT_TEMPLATE };
        ALL_SECTION_KEYS.forEach((key) => {
          merged[key] = Array.isArray(t[key]) ? t[key] : [];
        });
        // Backward compatibility: merge old agreement sections into body
        if (t.module === 'agreements') {
          const intro = Array.isArray(t.agreementIntroduction) ? t.agreementIntroduction : [];
          const content = Array.isArray(t.agreementContent) ? t.agreementContent : [];
          const financial = Array.isArray(t.financialTerms) ? t.financialTerms : [];
          const bodyFromLegacy = [...intro, ...content, ...financial];
          if (bodyFromLegacy.length > 0) merged.body = bodyFromLegacy;
        }
        setTemplate(merged);
        setTemplateHtml(typeof t.template_html === 'string' ? t.template_html : '');
        setTemplateCss(typeof t.template_css === 'string' ? t.template_css : '');
        const mergeStyles = (s) => {
          if (!s || typeof s !== 'object') return { ...DEFAULT_AGREEMENT_STYLES };
          const d = DEFAULT_AGREEMENT_STYLES;
          return {
            ...d,
            ...s,
            fontFamily: s.fontFamily ?? d.fontFamily,
            heading: { ...d.heading, ...(s.heading || {}) },
            subheading: { ...d.subheading, ...(s.subheading || {}) },
            paragraph: { ...d.paragraph, ...(s.paragraph || {}) },
            bullets: { ...d.bullets, ...(s.bullets || {}) },
            terms: { ...d.terms, ...(s.terms || {}) },
            section: { ...d.section, ...(s.section || {}) },
            table: { ...d.table, ...(s.table || {}) },
            signature: { ...d.signature, ...(s.signature || {}) },
            signatureLabel: { ...d.signatureLabel, ...(s.signatureLabel || {}) },
            body: { ...d.body, ...(s.body || {}) },
            companyLogo: { ...d.companyLogo, ...(s.companyLogo || {}) },
            companyName: { ...d.companyName, ...(s.companyName || {}) },
            companyEmail: { ...d.companyEmail, ...(s.companyEmail || {}) },
            companyPhone: { ...d.companyPhone, ...(s.companyPhone || {}) },
            companyAddress: { ...d.companyAddress, ...(s.companyAddress || {}) },
            providerName: { ...d.providerName, ...(s.providerName || {}) },
            providerEmail: { ...d.providerEmail, ...(s.providerEmail || {}) },
            providerPhone: { ...d.providerPhone, ...(s.providerPhone || {}) },
            providerAddress: { ...d.providerAddress, ...(s.providerAddress || {}) },
          };
        };
        let loadedStyles = t.styles;
        if (typeof loadedStyles === 'string' && loadedStyles.trim()) {
          try {
            loadedStyles = JSON.parse(loadedStyles);
          } catch (_) {
            loadedStyles = null;
          }
        }
        setTemplateStyles(t.module === 'agreements' && loadedStyles ? mergeStyles(loadedStyles) : { ...DEFAULT_AGREEMENT_STYLES });
      } else {
        toast.error('Template not found');
        navigate('/print-templates', { replace: true });
      }
    } else {
      setTemplateName('');
      setSelectedModule('invoices');
      setTemplate({ ...DEFAULT_TEMPLATE });
      setTemplateHtml('');
      setTemplateCss('');
      setTemplateStyles({ ...DEFAULT_AGREEMENT_STYLES });
    }
  }, [editId, isEdit, navigate]);

  // When user fills HTML/CSS first (Builder empty), sync Builder from parsed HTML so both Builder and Preview show content
  useEffect(() => {
    if (!templateHtml.trim()) return;
    const hasAnyBuilderFields = ALL_SECTION_KEYS.some((k) => (template[k]?.length || 0) > 0);
    if (hasAnyBuilderFields) return;
    const parsed = parseTemplateFromHtml(templateHtml, selectedModule);
    if (parsed) setTemplate(parsed);
  }, [templateHtml, selectedModule, template]);

  const handleDragStart = useCallback((e, field) => {
    e.dataTransfer.setData('application/json', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
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
      } catch (_) { }
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
    const zoneKeys = selectedModule === 'agreements' ? AGREEMENT_TEMPLATE_SECTIONS : [...TEMPLATE_SECTIONS, 'body'];
    zoneKeys.forEach((zone) => {
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

  const effectiveFullHtml = templateHtml.trim()
    ? `<style>${templateCss.trim() || getDefaultCss(selectedModule)}</style>\n${templateHtml}`
    : buildFullTemplateHtml(template, selectedModule);
  const sampleData = getSampleData(selectedModule);
  const previewData = useMemo(() => {
    if (selectedModule !== 'agreements' || !sampleData[prefix]) return sampleData;
    const agreementPreviewData = { ...sampleData[prefix], styles: templateStyles };
    const inHeader = (v) => (template.header || []).some((item) => item && item.variable === v);
    const inProvider = (v) => (template.partyDetailsProvider || []).some((item) => item && item.variable === v);
    if (!inHeader('company_logo')) agreementPreviewData.company_logo = '';
    if (!inHeader('company_name')) agreementPreviewData.company_name = '';
    if (!inHeader('company_email')) agreementPreviewData.company_email = '';
    if (!inHeader('company_phone')) agreementPreviewData.company_phone = '';
    if (!inHeader('company_address')) agreementPreviewData.company_address = '';
    if (!inProvider('provider_name')) agreementPreviewData.provider_name = '';
    if (!inProvider('provider_email')) agreementPreviewData.provider_email = '';
    if (!inProvider('provider_phone')) agreementPreviewData.provider_phone = '';
    if (!inProvider('provider_address')) agreementPreviewData.provider_address = '';
    return { [prefix]: agreementPreviewData };
  }, [selectedModule, prefix, sampleData, templateStyles, template.header, template.partyDetailsProvider]);
  // Preview must react to templateStyles so style changes apply immediately in the iframe.
  const previewHtml = useMemo(
    () => resolveTemplateHtmlWithData(effectiveFullHtml, selectedModule, previewData),
    [effectiveFullHtml, selectedModule, templateStyles, template, templateHtml, templateCss]
  );

  // Full HTML/CSS to show in HTML tab when user hasn't set custom: same as Preview
  const generatedBodyHtml = buildFullTemplateHtml(template, selectedModule, { includeStyle: false });
  const generatedCss = getDefaultCss(selectedModule);
  const displayHtml = templateHtml.trim() !== '' ? templateHtml : generatedBodyHtml;
  const displayCss = templateCss.trim() !== '' ? templateCss : generatedCss;

  const handleRegenerateFromBuilder = useCallback(() => {
    const body = buildFullTemplateHtml(template, selectedModule, { includeStyle: false });
    setTemplateHtml(body);
    setTemplateCss(getDefaultCss(selectedModule));
    toast.success('HTML & CSS regenerated from Builder layout');
  }, [template, selectedModule]);

  const handleLoadPremiumTemplate = useCallback(() => {
    const t = PREMIUM_TEMPLATES[selectedModule];
    if (!t) {
      toast.error(`No premium template available for ${selectedModule}`);
      return;
    }
    setTemplateHtml(t.html);
    setTemplateCss(t.css);
    const parsed = parseTemplateFromHtml(t.html, selectedModule);
    if (parsed) {
      const merged = { ...DEFAULT_TEMPLATE };
      ALL_SECTION_KEYS.forEach((key) => {
        merged[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
      });
      setTemplate(merged);
    }
    toast.success(`Premium ${selectedModule.slice(0, -1)} template loaded`);
  }, [selectedModule]);

  const handleSave = useCallback(() => {
    const name = (templateName || '').trim();
    if (!name) {
      toast.error('Enter a template name');
      return;
    }
    let htmlToSave = templateHtml;
    let cssToSave = templateCss;
    if (!htmlToSave.trim()) {
      htmlToSave = buildFullTemplateHtml(template, selectedModule, { includeStyle: false });
      cssToSave = templateCss.trim() || getDefaultCss(selectedModule);
    }
    const templatePayload = {
      id: isEdit ? editId : undefined,
      name,
      module: selectedModule,
      ...template,
      template_html: htmlToSave,
      template_css: cssToSave,
      styles: selectedModule === 'agreements' ? templateStyles : undefined,
    };
    saveTemplate(templatePayload);
    toast.success(isEdit ? 'Template updated' : 'Template saved');
    navigate('/print-templates');
  }, [templateName, selectedModule, template, templateHtml, templateCss, templateStyles, isEdit, editId, navigate]);

  const DropZone = ({ zone, title }) => (
    <div
      className={`min-h-[140px] p-6 rounded-xl border-2 border-dashed transition-colors ${isDragging ? 'border-violet-400 bg-brand-50/50' : 'border-slate-200 bg-slate-50/50'}`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, zone)}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="flex flex-wrap gap-2 min-h-[60px]">
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
        <span className="text-slate-400 text-sm self-center">Drop here</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-12rem)] lg:min-h-[calc(100vh-14rem)]">
        {/* Available Fields - scrollable list, fixed height to match right */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <div className="card p-4 flex flex-col min-h-0 flex-1 overflow-hidden">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex-shrink-0">Available Fields</h2>
            <p className="text-xs text-slate-500 mb-3 flex-shrink-0">Drag into sections below. Fields are for: {MODULES.find((m) => m.value === selectedModule)?.label}.</p>
            <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {availableFields.map((field) => (
                <li
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, field)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-grab active:cursor-grabbing hover:border-violet-300 hover:bg-brand-50/30 text-sm font-medium text-slate-700 select-none"
                >
                  <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {field.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Builder + Preview + Code - full height, builder scrollable */}
        <div className="lg:col-span-2 flex flex-col min-h-0 space-y-0">
          <div className="flex gap-2 border-b border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${activeTab === 'builder' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500'}`}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px flex items-center gap-1 ${activeTab === 'preview' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500'}`}
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px flex items-center gap-1 ${activeTab === 'code' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500'}`}
            >
              <Code className="w-4 h-4" /> HTML &amp; CSS
            </button>
            {selectedModule === 'agreements' && (
              <button
                type="button"
                onClick={() => setActiveTab('styles')}
                className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px flex items-center gap-1 ${activeTab === 'styles' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500'}`}
              >
                <Palette className="w-4 h-4" /> Styles
              </button>
            )}
          </div>

          {activeTab === 'builder' && (
            <div
              ref={builderScrollRef}
              className="card p-6 space-y-6 overflow-y-auto flex-1 min-h-0 mt-4"
            >
              {selectedModule === 'agreements' ? (
                <>
                  <DropZone zone="header" title={SECTION_LABELS.header} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DropZone zone="partyDetailsProvider" title={SECTION_LABELS.partyDetailsProvider} />
                    <DropZone zone="partyDetailsClient" title={SECTION_LABELS.partyDetailsClient} />
                  </div>
                  <DropZone zone="body" title={SECTION_LABELS.body} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DropZone zone="signatureProvider" title={SECTION_LABELS.signatureProvider} />
                    <DropZone zone="signatureClient" title={SECTION_LABELS.signatureClient} />
                  </div>
                  <DropZone zone="footer" title={SECTION_LABELS.footer} />
                </>
              ) : (
                <>
                  <DropZone zone="title" title={SECTION_LABELS.title} />
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
                  <DropZone zone="termsAndConditions" title={SECTION_LABELS.termsAndConditions} />
                  <DropZone zone="footer" title={SECTION_LABELS.footer} />
                </>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-600 mb-3">Preview ({MODULES.find((m) => m.value === selectedModule)?.label} – matches print output)</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-100/50 overflow-hidden min-h-[320px]">
                {(() => {
                  const previewZones = selectedModule === 'agreements' ? AGREEMENT_TEMPLATE_SECTIONS : [...TEMPLATE_SECTIONS, 'body'];
                  const hasBuilderFields = previewZones.some((zone) => (template[zone]?.length || 0) > 0);
                  const hasCustomHtml = templateHtml.trim().length > 0;
                  if (!hasBuilderFields && !hasCustomHtml) {
                    return (
                      <div className="flex items-center justify-center min-h-[320px] text-slate-400">
                        <p>Add fields in the Builder or add HTML in the HTML tab to see preview.</p>
                      </div>
                    );
                  }
                  return (
                    <iframe
                      key={`preview-${selectedModule}-${templateHtml.length}-${templateCss.length}${selectedModule === 'agreements' && templateStyles ? `-${JSON.stringify({
                        n: templateStyles.companyName,
                        e: templateStyles.companyEmail,
                        p: templateStyles.companyPhone,
                        a: templateStyles.companyAddress,
                        l: templateStyles.companyLogo,
                        pn: templateStyles.providerName,
                        pe: templateStyles.providerEmail,
                        pp: templateStyles.providerPhone,
                        pa: templateStyles.providerAddress,
                      })}` : ''}`}
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
            <div className="card p-6 overflow-y-auto flex-1 min-h-0 mt-4 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-sm font-bold text-slate-600">Editable HTML &amp; CSS</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLoadPremiumTemplate}
                    className="btn-secondary text-sm border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    Load Premium Preset
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateFromBuilder}
                    className="btn-secondary text-sm"
                  >
                    Regenerate from Builder
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Full layout is generated from the Builder. Use variables like {'{{'}{prefix}.field_name{'}}'}. Edit below to customize; Preview updates live. Custom classes, page-break-after, and inline styles are supported.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">CSS (full styles – matches Preview)</label>
                <textarea
                  value={displayCss}
                  onChange={(e) => setTemplateCss(e.target.value)}
                  className="input font-mono text-xs w-full min-h-[200px] resize-y"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">HTML (full layout – matches Preview)</label>
                <textarea
                  value={displayHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  className="input font-mono text-xs w-full min-h-[320px] resize-y"
                  spellCheck={false}
                />
              </div>
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer font-medium text-slate-600">Template variables (from Builder)</summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-100 overflow-x-auto whitespace-pre-wrap font-mono">
                  {buildStructuredHtml()}
                </pre>
              </details>
            </div>
          )}

          {activeTab === 'styles' && selectedModule === 'agreements' && (
            <div className="card p-6 overflow-y-auto flex-1 min-h-0 mt-4 space-y-6">
              <h3 className="text-sm font-bold text-slate-600">Style configuration</h3>
              <p className="text-xs text-slate-500">These styles apply to Agreement print preview and print output. Font sizes and colors use CSS variables from the template.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Font family</label>
                  <select
                    className="input w-full"
                    value={templateStyles.fontFamily ?? ''}
                    onChange={(e) => setTemplateStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}
                  >
                    <option value="Arial, sans-serif">Arial, sans-serif</option>
                    <option value="Georgia, serif">Georgia, serif</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="system-ui, -apple-system, sans-serif">System UI</option>
                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Section margin (e.g. 20px)</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={templateStyles.section?.marginBottom ?? ''}
                    onChange={(e) => setTemplateStyles((prev) => ({ ...prev, section: { ...(prev.section || {}), marginBottom: e.target.value } }))}
                    placeholder="20px"
                  />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Company Logo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Width</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyLogo?.width ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyLogo: { ...(prev.companyLogo || {}), width: e.target.value } }))}
                      placeholder="120px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Alignment</label>
                    <select
                      className="input w-full"
                      value={templateStyles.companyLogo?.textAlign ?? 'left'}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyLogo: { ...(prev.companyLogo || {}), textAlign: e.target.value } }))}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Margin bottom</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyLogo?.marginBottom ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyLogo: { ...(prev.companyLogo || {}), marginBottom: e.target.value } }))}
                      placeholder="10px"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Company Name</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyName?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyName: { ...(prev.companyName || {}), fontSize: e.target.value } }))}
                      placeholder="20px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.companyName?.color) ? templateStyles.companyName.color : '#1e293b'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyName: { ...(prev.companyName || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.companyName?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyName: { ...(prev.companyName || {}), color: e.target.value } }))}
                        placeholder="#1e293b"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font weight</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyName?.fontWeight ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyName: { ...(prev.companyName || {}), fontWeight: e.target.value } }))}
                      placeholder="700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Alignment</label>
                    <select
                      className="input w-full"
                      value={templateStyles.companyName?.textAlign ?? 'left'}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyName: { ...(prev.companyName || {}), textAlign: e.target.value } }))}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Company Email</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyEmail?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyEmail: { ...(prev.companyEmail || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.companyEmail?.color) ? templateStyles.companyEmail.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyEmail: { ...(prev.companyEmail || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.companyEmail?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyEmail: { ...(prev.companyEmail || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Company Phone</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyPhone?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyPhone: { ...(prev.companyPhone || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.companyPhone?.color) ? templateStyles.companyPhone.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyPhone: { ...(prev.companyPhone || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.companyPhone?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyPhone: { ...(prev.companyPhone || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Company Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyAddress?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyAddress: { ...(prev.companyAddress || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.companyAddress?.color) ? templateStyles.companyAddress.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyAddress: { ...(prev.companyAddress || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.companyAddress?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyAddress: { ...(prev.companyAddress || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Line height</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.companyAddress?.lineHeight ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, companyAddress: { ...(prev.companyAddress || {}), lineHeight: e.target.value } }))}
                      placeholder="1.4"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Service Provider Name</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerName?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerName: { ...(prev.providerName || {}), fontSize: e.target.value } }))}
                      placeholder="18px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.providerName?.color) ? templateStyles.providerName.color : '#1e293b'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerName: { ...(prev.providerName || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.providerName?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerName: { ...(prev.providerName || {}), color: e.target.value } }))}
                        placeholder="#1e293b"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font weight</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerName?.fontWeight ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerName: { ...(prev.providerName || {}), fontWeight: e.target.value } }))}
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Alignment</label>
                    <select
                      className="input w-full"
                      value={templateStyles.providerName?.alignment ?? templateStyles.providerName?.textAlign ?? 'left'}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerName: { ...(prev.providerName || {}), alignment: e.target.value } }))}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Service Provider Email</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerEmail?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerEmail: { ...(prev.providerEmail || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.providerEmail?.color) ? templateStyles.providerEmail.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerEmail: { ...(prev.providerEmail || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.providerEmail?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerEmail: { ...(prev.providerEmail || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Service Provider Phone</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerPhone?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerPhone: { ...(prev.providerPhone || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.providerPhone?.color) ? templateStyles.providerPhone.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerPhone: { ...(prev.providerPhone || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.providerPhone?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerPhone: { ...(prev.providerPhone || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Service Provider Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerAddress?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerAddress: { ...(prev.providerAddress || {}), fontSize: e.target.value } }))}
                      placeholder="14px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.providerAddress?.color) ? templateStyles.providerAddress.color : '#475569'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerAddress: { ...(prev.providerAddress || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.providerAddress?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerAddress: { ...(prev.providerAddress || {}), color: e.target.value } }))}
                        placeholder="#475569"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Line height</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.providerAddress?.lineHeight ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, providerAddress: { ...(prev.providerAddress || {}), lineHeight: e.target.value } }))}
                      placeholder="1.4"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Heading</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.heading?.fontSize ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), fontSize: e.target.value } }))}
                      placeholder="24px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                        value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.heading?.color) ? templateStyles.heading.color : '#1e293b'}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))}
                      />
                      <input
                        type="text"
                        className="input flex-1 font-mono text-sm"
                        value={templateStyles.heading?.color ?? ''}
                        onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))}
                        placeholder="#1e293b"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font weight</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.heading?.fontWeight ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), fontWeight: e.target.value } }))}
                      placeholder="600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Margin bottom</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={templateStyles.heading?.marginBottom ?? ''}
                      onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), marginBottom: e.target.value } }))}
                      placeholder="12px"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Subheading</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input type="text" className="input w-full" value={templateStyles.subheading?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, subheading: { ...(prev.subheading || {}), fontSize: e.target.value } }))} placeholder="20px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.subheading?.color) ? templateStyles.subheading.color : '#334155'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, subheading: { ...(prev.subheading || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.subheading?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, subheading: { ...(prev.subheading || {}), color: e.target.value } }))} placeholder="#334155" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font weight</label>
                    <input type="text" className="input w-full" value={templateStyles.subheading?.fontWeight ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, subheading: { ...(prev.subheading || {}), fontWeight: e.target.value } }))} placeholder="600" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Margin bottom</label>
                    <input type="text" className="input w-full" value={templateStyles.subheading?.marginBottom ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, subheading: { ...(prev.subheading || {}), marginBottom: e.target.value } }))} placeholder="8px" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Paragraph</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input type="text" className="input w-full" value={templateStyles.paragraph?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.paragraph?.color) ? templateStyles.paragraph.color : '#475569'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.paragraph?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} placeholder="#475569" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Line height</label>
                    <input type="text" className="input w-full" value={templateStyles.paragraph?.lineHeight ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), lineHeight: e.target.value } }))} placeholder="1.6" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Margin bottom</label>
                    <input type="text" className="input w-full" value={templateStyles.paragraph?.marginBottom ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), marginBottom: e.target.value } }))} placeholder="10px" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Bullet points</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input type="text" className="input w-full" value={templateStyles.bullets?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, bullets: { ...(prev.bullets || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.bullets?.color) ? templateStyles.bullets.color : '#475569'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, bullets: { ...(prev.bullets || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.bullets?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, bullets: { ...(prev.bullets || {}), color: e.target.value } }))} placeholder="#475569" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Line height</label>
                    <input type="text" className="input w-full" value={templateStyles.bullets?.lineHeight ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, bullets: { ...(prev.bullets || {}), lineHeight: e.target.value } }))} placeholder="1.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Margin bottom</label>
                    <input type="text" className="input w-full" value={templateStyles.bullets?.marginBottom ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, bullets: { ...(prev.bullets || {}), marginBottom: e.target.value } }))} placeholder="10px" />
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Agreement Terms &amp; Conditions</h4>
                <p className="text-xs text-slate-500 mb-3">Style the terms and conditions text block in the agreement.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input type="text" className="input w-full" value={templateStyles.terms?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, terms: { ...(prev.terms || {}), fontSize: e.target.value } }))} placeholder="13px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.terms?.color) ? templateStyles.terms.color : '#475569'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, terms: { ...(prev.terms || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.terms?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, terms: { ...(prev.terms || {}), color: e.target.value } }))} placeholder="#475569" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Line height</label>
                    <input type="text" className="input w-full" value={templateStyles.terms?.lineHeight ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, terms: { ...(prev.terms || {}), lineHeight: e.target.value } }))} placeholder="1.5" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Alignment</label>
                    <select className="input w-full" value={templateStyles.terms?.textAlign ?? templateStyles.terms?.alignment ?? 'left'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, terms: { ...(prev.terms || {}), textAlign: e.target.value, alignment: e.target.value } }))}>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Signature (name)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Font size</label>
                    <input type="text" className="input w-full" value={templateStyles.signature?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, signature: { ...(prev.signature || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.signature?.color) ? templateStyles.signature.color : '#1e293b'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, signature: { ...(prev.signature || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.signature?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, signature: { ...(prev.signature || {}), color: e.target.value } }))} placeholder="#1e293b" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Table</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Body font size</label>
                    <input type="text" className="input w-full" value={templateStyles.table?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Body color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.table?.color) ? templateStyles.table.color : '#1e293b'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), color: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.table?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), color: e.target.value } }))} placeholder="#1e293b" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Border (e.g. 1px solid #cbd5e1)</label>
                    <input type="text" className="input w-full" value={templateStyles.table?.border ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), border: e.target.value } }))} placeholder="1px solid #cbd5e1" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Header background</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded border border-slate-200 cursor-pointer" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.table?.headerBackground) ? templateStyles.table.headerBackground : '#2563eb'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), headerBackground: e.target.value } }))} />
                      <input type="text" className="input flex-1 font-mono text-sm" value={templateStyles.table?.headerBackground ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, table: { ...(prev.table || {}), headerBackground: e.target.value } }))} placeholder="#2563eb" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
