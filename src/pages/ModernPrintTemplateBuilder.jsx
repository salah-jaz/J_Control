import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GripVertical, Eye, Code, Save, Palette, LayoutTemplate } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('code');
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
      const premium = PREMIUM_TEMPLATES[selectedModule] || PREMIUM_TEMPLATES.invoices;
      setTemplateHtml(premium.html);
      setTemplateCss(premium.css || getDefaultCss(selectedModule));
      const parsed = parseTemplateFromHtml(premium.html, selectedModule);
      if (parsed) {
        const merged = { ...DEFAULT_TEMPLATE };
        ALL_SECTION_KEYS.forEach((key) => {
          merged[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
        });
        setTemplate(merged);
      } else {
        setTemplate({ ...DEFAULT_TEMPLATE });
      }
      setTemplateStyles({ ...DEFAULT_AGREEMENT_STYLES });
    }
  }, [editId, isEdit, navigate, selectedModule]);

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
      className={`min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${isDragging ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'}`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, zone)}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
        {title}
        <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Zone</span>
      </p>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {(template[zone] || []).map((item, idx) => (
          <span
            key={`${zone}-${idx}-${item.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 shadow-sm text-xs font-medium text-slate-700"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            {item.label}
            <button
              type="button"
              onClick={() => removeFromZone(zone, idx)}
              className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}
        {(template[zone] || []).length === 0 && (
          <span className="text-slate-400 text-xs self-center w-full text-center py-2 italic opacity-60">Drop fields here</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 flex-shrink-0 bg-white p-5 rounded-xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="bg-indigo-50 p-1.5 rounded-lg">
              <Eye className="w-5 h-5 text-indigo-600" />
            </div>
            {isEdit ? 'Edit Template' : 'New Template'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Design your structured print layouts precisely.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate('/print-templates')} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow hover:-translate-y-0.5 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Template
          </button>
        </div>
      </div>

      {/* Split Layout Body */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 items-start">

        {/* Left Panel (Configuration Section) */}
        <div className="w-full lg:w-[480px] flex flex-col gap-6 sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Configuration</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Template Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm outline-none"
                  placeholder="e.g. Corporate Standard"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Module Type</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm outline-none cursor-pointer"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  {MODULES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pt-8 mt-2 -mx-6 px-6">
              <button onClick={() => setActiveTab('code')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'code' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Code className="w-4 h-4 inline mr-1 -mt-0.5" /> HTML/CSS</button>
              {selectedModule === 'agreements' && (
                <button onClick={() => setActiveTab('styles')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'styles' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Palette className="w-4 h-4 inline mr-1 -mt-0.5" /> Appearance</button>
              )}
            </div>
          </div>

          {/* HTML Code specific left panel */}
          {activeTab === 'code' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Code Editor</h3>
                <div className="flex gap-2">
                  <button type="button" onClick={handleLoadPremiumTemplate} className="text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-indigo-700 transition-all border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                    <LayoutTemplate className="w-3 h-3" /> Load Premium Preset
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 border-l-2 border-indigo-300 pl-3">Changes here reflect on the live preview instantly.</p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">CSS</label>
                <textarea spellCheck={false} value={displayCss} onChange={(e) => setTemplateCss(e.target.value)} className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg min-h-[150px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">HTML</label>
                <textarea spellCheck={false} value={displayHtml} onChange={(e) => setTemplateHtml(e.target.value)} className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg min-h-[250px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-400 outline-none" />
              </div>
            </div>
          )}

          {/* Styles specific left panel */}
          {activeTab === 'styles' && selectedModule === 'agreements' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 space-y-5">
              <h3 className="text-sm font-bold text-slate-700">Appearance Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Global Font Family</label>
                  <select className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 outline-none" value={templateStyles.fontFamily ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}>
                    <option value="Arial, sans-serif">Arial, sans-serif</option>
                    <option value="Georgia, serif">Georgia, serif</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="system-ui, -apple-system, sans-serif">System UI</option>
                    <option value="'Inter', 'Helvetica Neue', Arial, sans-serif">Modern (Inter)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Section Gap</label>
                  <input type="text" className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-slate-50 outline-none" value={templateStyles.section?.marginBottom ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, section: { ...(prev.section || {}), marginBottom: e.target.value } }))} placeholder="24px" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 bg-indigo-50 inline-block px-2 py-0.5 rounded">Headings</h4>
                <div className="grid grid-cols-2 gap-3 pl-1 border-l-2 border-indigo-100">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Size</label>
                    <input type="text" className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50" value={templateStyles.heading?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), fontSize: e.target.value } }))} placeholder="24px" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Color</label>
                    <div className="flex gap-1.5">
                      <input type="color" className="w-6 h-6 rounded cursor-pointer border border-slate-300" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.heading?.color) ? templateStyles.heading.color : '#1e293b'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))} />
                      <input type="text" className="flex-1 text-xs p-1 border border-slate-200 rounded bg-slate-50" value={templateStyles.heading?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, heading: { ...(prev.heading || {}), color: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 bg-indigo-50 inline-block px-2 py-0.5 rounded">Body Text</h4>
                <div className="grid grid-cols-2 gap-3 pl-1 border-l-2 border-indigo-100">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Size</label>
                    <input type="text" className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50" value={templateStyles.paragraph?.fontSize ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), fontSize: e.target.value } }))} placeholder="14px" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Color</label>
                    <div className="flex gap-1.5">
                      <input type="color" className="w-6 h-6 rounded cursor-pointer border border-slate-300" value={/^#[0-9A-Fa-f]{6}$/.test(templateStyles.paragraph?.color) ? templateStyles.paragraph.color : '#475569'} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} />
                      <input type="text" className="flex-1 text-xs p-1 border border-slate-200 rounded bg-slate-50" value={templateStyles.paragraph?.color ?? ''} onChange={(e) => setTemplateStyles((prev) => ({ ...prev, paragraph: { ...(prev.paragraph || {}), color: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Live Preview Section) */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200/80 flex flex-col min-h-0 overflow-hidden relative group self-stretch bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2Y4ZmFmYyI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iI2UxZTRlOCI+PC9jaXJjbGU+Cjwvc3ZnPg==')]">
          <div className="bg-white/95 backdrop-blur flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-bold text-slate-700">Live Document Preview</h2>
            </div>
            <div className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 bg-slate-100 rounded-full text-slate-500 border border-slate-200">
              A4 Proportion
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center">
            <div className="bg-white shadow-xl shadow-slate-200 border border-slate-100 w-full max-w-[800px] rounded-sm transition-all duration-300 ring-1 ring-slate-900/5">
              {(() => {
                const previewZones = selectedModule === 'agreements' ? AGREEMENT_TEMPLATE_SECTIONS : [...TEMPLATE_SECTIONS, 'body'];
                const hasBuilderFields = previewZones.some((zone) => (template[zone]?.length || 0) > 0);
                const hasCustomHtml = templateHtml.trim().length > 0;

                if (!hasBuilderFields && !hasCustomHtml) {
                  return (
                    <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 p-8 text-center bg-slate-50/50">
                      <LayoutTemplate className="w-16 h-16 text-slate-300 mb-4 opacity-50" />
                      <p className="font-medium text-slate-500">Document is empty</p>
                      <p className="text-sm mt-1 max-w-sm">Write custom HTML to generate the layout.</p>
                    </div>
                  );
                }

                return (
                  <iframe
                    key={`preview-${selectedModule}-${templateHtml.length}-${templateCss.length}${selectedModule === 'agreements' && templateStyles ? '-sty' : ''}`}
                    title="Print template preview"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;box-sizing:border-box;">${previewHtml}</body></html>`}
                    className="w-full border-0"
                    style={{ minHeight: '1000px', height: '100vh', pointerEvents: 'none' }}
                    sandbox="allow-same-origin"
                  />
                );
              })()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
