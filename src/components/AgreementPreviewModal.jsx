import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { X, Printer, Check, Edit2, Trash2, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getTemplates, getDefaultTemplate } from '../utils/printTemplateStorage';
import { getSettings } from '../services/db';
import {
  getEffectiveTemplateHtml,
  resolveTemplateHtmlWithData,
  buildAgreementPrintData,
} from '../config/printTemplateModules';
import AgreementContentDisplay from './AgreementContentDisplay';

const A4_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');
  @page { size: A4; margin: 0 !important; }
  @media print {
    html, body { height: 297mm !important; width: 210mm !important; margin: 0 !important; padding: 0 !important; font-family: 'Inter', sans-serif !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: transparent !important; overflow: hidden !important; box-sizing: border-box !important; }
    * { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      margin-bottom: 0 !important;
    }
    .print-root-container { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: transparent !important; box-sizing: border-box !important; }
    .print-main-layout { display: block !important; position: static !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
    .print-root { display: block !important; height: 297mm !important; min-height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; border: none !important; box-sizing: border-box !important; }
    .print-content { 
      display: block !important; 
      width: 210mm !important; 
      max-width: 210mm !important; 
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important; 
      padding: 0 !important; 
      border: none !important; 
      box-shadow: none !important;
      overflow: hidden !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-content > div { height: auto !important; min-height: 297mm !important; max-height: none !important; width: 210mm !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; overflow: hidden !important; }
    /* Root of dynamic templates */
    .print-doc-dynamic, .agreement-print-root, .agreement-wrap, .jaz-doc, .print-doc, .letterhead-doc, .letterhead-inner {
      height: auto !important;
      min-height: 297mm !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      box-sizing: border-box !important;
      border: none !important;
      box-shadow: none !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .jaz-footer-branding, .jaz-company-contact, .print-footer, footer {
      margin-top: auto !important;
    }
    .jaz-inner, .agreement-wrap, .print-doc-dynamic { padding: 0 !important; box-sizing: border-box !important; overflow: hidden !important; }
    /* Fixed decoration at the absolute bottom of EVERY page */
    .jaz-acc-bl { position: fixed !important; bottom: 0 !important; left: 0 !important; margin-bottom: 0 !important; width: 100% !important; height: auto !important; z-index: -1 !important; }
    .agreement-section, .agreement-paragraph, .agreement-bullets, .agreement-table, .signature-box, .party-details {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 12px !important;
    }
  }
`;

export default function AgreementPreviewModal({
  agreement: agreementProp,
  selectedAgreement,
  agreementData,
  agreementRecord,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  autoPrint = false,
  template: templateProp,
}) {
  const contentRef = useRef(null);
  const [companySettings, setCompanySettings] = useState({});
  const [selectedPreviewId, setSelectedPreviewId] = useState('standard');

  const templates = useMemo(() => getTemplates().filter(t => t.module === "agreements"), []);
  const [activeTemplate, setActiveTemplate] = useState(
    () => templateProp ?? (templates.find(t => t.isDefault) || templates[0] || null)
  );

  useEffect(() => {
    if (isOpen) {
      getSettings().then((s) => setCompanySettings(s?.company || {}));
      if (!templateProp) {
        const def = getDefaultTemplate('agreements');
        setActiveTemplate(def);
        setSelectedPreviewId(def ? def.id : 'standard');
      } else {
        setActiveTemplate(templateProp);
        setSelectedPreviewId(templateProp.id);
      }
    }
  }, [isOpen, templateProp]);

  // Normalized agreement so buildAgreementPrintData gets content blocks and Body renders via {{agreement.agreement_content}}
  // MUST be declared before any useEffect that references it in dependency arrays
  const agreementForPrint = useMemo(() => {
    const source =
      agreementProp ??
      selectedAgreement ??
      agreementData ??
      agreementRecord ??
      null;

    if (!source || typeof source !== 'object') return null;

    const raw = source.content ?? source.agreement_content ?? source.blocks;
    const blocks = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && String(raw).trim()
        ? (() => {
          try {
            const p = JSON.parse(raw);
            return Array.isArray(p) ? p : [];
          } catch {
            return [];
          }
        })()
        : [];

    return {
      ...source,
      content: blocks,
      agreement_content: blocks,
    };
  }, [agreementProp, selectedAgreement, agreementData, agreementRecord]);

  // Auto-scaling logic to fit content nicely on one A4 page without cutting off
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const resizeTimeout = setTimeout(() => {
      const container = contentRef.current;
      const contentWrap = container.querySelector('.print-scale-content');
      if (contentWrap) {
        // Reset scale and width for accurate measurement
        contentWrap.style.transform = 'none';
        contentWrap.style.width = '100%';
        contentWrap.style.transformOrigin = 'top left';
        
        const contentHeight = contentWrap.scrollHeight;
        const a4InnerHeight = 1125; // Standard A4 height @ 96DPI is ~1123px
        
        if (contentHeight > a4InnerHeight) {
          const scaleRatio = a4InnerHeight / contentHeight;
          const factor = scaleRatio - 0.01;
          
          // Proportional scale to fit content within the A4 height
          contentWrap.style.transform = `scale(${factor.toFixed(4)})`;
          contentWrap.style.transformOrigin = 'top center';
          contentWrap.style.width = '100%';
        }
      }
    }, 300); // allow fonts and layout to settle
    return () => clearTimeout(resizeTimeout);
  }, [isOpen, agreementForPrint, activeTemplate, companySettings, selectedPreviewId]);

  const generateHtmlForTemplate = useCallback((tpl, agreementSource) => {
    if (!agreementSource) return null;
    if (tpl === 'standard') return null;

    const template = tpl ?? {};
    let templateHtml = template.template_html || template.html || getEffectiveTemplateHtml(template, 'agreements');
    if (!templateHtml) return null;

    // --- AUTO-FIX FOR LEGACY / HARDCODED CUSTOM TEMPLATES ---
    // Many legacy custom templates have hardcoded dummy text instead of dynamic placeholders.
    // Ensure we inject the entered agreement content into these missing spots so it displays.
    const dummyTextRegex = /This space is used for agreement,\s*proposal or letter content\.?\s*You can dynamically load your agreement content here\.?/gi;
    if (dummyTextRegex.test(templateHtml)) {
      templateHtml = templateHtml.replace(dummyTextRegex, '{{agreement.agreement_content}}');
    }
    // Replace "Agreement Title" with the dynamic variable if it looks like a hardcoded placeholder
    templateHtml = templateHtml.replace(/>\s*(Agreement Title|TITLE OF AGREEMENT|AGREEMENT TITLE)\s*</gi, '>{{agreement.agreement_title}}<');

    // Also patch potential use of legacy un-prefixed variables for safety
    templateHtml = templateHtml.replace(/\{\{\s*agreement_content\s*\}\}/g, '{{agreement.agreement_content}}');
    templateHtml = templateHtml.replace(/\{\{\s*body_content\s*\}\}/g, '{{agreement.agreement_content}}');
    // --------------------------------------------------------

    const templateHasBodySection = templateHtml.includes('print-section-body');
    const printData = buildAgreementPrintData(agreementSource, companySettings, null, {
      template,
      templateHasBodySection,
      templateHtml,
      styles: template?.styles,
    });

    // Pass under agreement key so {{agreement.agreement_content}} resolves from printData.agreement_content
    let html = resolveTemplateHtmlWithData(templateHtml, 'agreements', { agreement: printData });

    // --- INJECT STYLES FOR PRINT/PREVIEW IF MISSING ---
    // If it doesn't already have <style> tags, wrap with the template's CSS (or shared premium styles)
    if (!html.includes('<style>')) {
      const css = template.template_css || template.css || '';
      if (css) {
        html = `<style>${css}</style>\n${html}`;
      }
    }

    return html;
  }, [companySettings]);

  const printHtml = useMemo(() => {
    if (selectedPreviewId === 'standard') return null; // We render components explicitly inside the JSX for standard
    return generateHtmlForTemplate(activeTemplate, agreementForPrint);
  }, [selectedPreviewId, activeTemplate, agreementForPrint, generateHtmlForTemplate]);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle:
      agreementForPrint?.title ??
      agreementProp?.title ??
      selectedAgreement?.title ??
      'Agreement',
    pageStyle: A4_STYLES,
  });

  const onPrintClick = () => {
    handlePrint();
  };

  useEffect(() => {
    if (isOpen && autoPrint && agreementForPrint && contentRef.current) {
      const t = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen, autoPrint, agreementForPrint?.id]);

  if (!isOpen) return null;

  const blocks = agreementForPrint?.content ?? agreementForPrint?.agreement_content ?? [];
  const title =
    agreementForPrint?.title ??
    agreementProp?.title ??
    selectedAgreement?.title ??
    agreementData?.title ??
    agreementRecord?.title ??
    'Agreement';

  const client = agreementForPrint?.client || agreementForPrint?.quotation?.client || {};
  const clientName = client ? (client.company_name || client.client_name) : "—";
  const quotation = agreementForPrint?.quotation || null;
  const items = quotation?.items || [];
  const subtotal = parseFloat(quotation?.subtotal) || 0;
  const discount = parseFloat(quotation?.discount) || 0;
  const tax = parseFloat(quotation?.tax) || 0;
  const total = parseFloat(quotation?.total) || 0;
  const dateStr = agreementForPrint?.date ? (typeof agreementForPrint.date === "string" ? agreementForPrint.date.split("T")[0] : agreementForPrint.date) : "—";

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:block print-root-container">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col lg:flex-row-reverse overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none print-main-layout">

        {/* Template Selection Panel */}
        <div className="w-full lg:w-[360px] bg-gradient-to-b from-slate-50 to-slate-100 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden print:hidden relative z-10">
          <div className="p-4 lg:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm relative z-20">
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Select Design</h3>
            <p className="text-sm text-slate-500 mt-1 hidden lg:block">Click any layout to instantly apply it to this agreement.</p>
          </div>

          <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-4 lg:p-5 grid grid-flow-col auto-cols-[140px] lg:grid-flow-row lg:grid-cols-2 gap-4 lg:content-start pb-10">

            {/* Standard Template Card */}
            <div
              onClick={() => { setSelectedPreviewId('standard'); setActiveTemplate(null); }}
              className={clsx(
                "shrink-0 cursor-pointer rounded-xl border-2 overflow-hidden transition-all flex flex-col group w-full relative",
                selectedPreviewId === 'standard'
                  ? "border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-500/10 z-10"
                  : "border-transparent ring-1 ring-slate-200 bg-white hover:ring-slate-300 hover:-translate-y-0.5 hover:shadow-md"
              )}
            >
              <div className={clsx(
                "h-32 lg:h-48 overflow-hidden relative pointer-events-none flex justify-center items-center border-b w-full rounded-t-xl transition-colors",
                selectedPreviewId === 'standard' ? "bg-orange-100/40 border-orange-100" : "bg-slate-50 border-slate-100"
              )}>
                <div className="relative shadow-md border border-slate-300 bg-white overflow-hidden rounded-[2px] transition-transform duration-300 group-hover:scale-105" style={{ width: '100px', height: '141px' }}>
                  <div className="w-full h-full bg-white border border-slate-200 shadow-sm rounded flex flex-col p-3 space-y-3" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}>
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-3 lg:w-16 lg:h-4 rounded bg-slate-200"></div>
                      <div className="w-8 h-4 lg:w-12 lg:h-6 rounded bg-slate-200"></div>
                    </div>
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="space-y-2">
                      <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                      <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                      <div className="w-3/4 h-1.5 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-full h-12 lg:h-20 bg-slate-100 rounded mt-auto"></div>
                  </div>
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/[0.02] transition-colors z-10" />
                </div>
              </div>
              <div className="p-3.5 text-center text-sm font-bold text-slate-800 flex-shrink-0 relative flex items-center justify-center gap-2">
                Standard Form
              </div>
              {selectedPreviewId === 'standard' && (
                <div className="absolute top-2 right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-sm z-20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={4} />
                </div>
              )}
            </div>

            {/* Premium/Custom Templates */}
            {templates.map(t => {
              const isActive = selectedPreviewId === t.id;
              const previewHtml = generateHtmlForTemplate(t, agreementForPrint);

              return (
                <div
                  key={t.id}
                  onClick={() => { setSelectedPreviewId(t.id); setActiveTemplate(t); }}
                  className={clsx(
                    "shrink-0 cursor-pointer rounded-xl border-2 overflow-hidden transition-all flex flex-col group w-full relative",
                    isActive
                      ? "border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-500/10 z-10"
                      : "border-transparent ring-1 ring-slate-200 bg-white hover:ring-slate-300 hover:-translate-y-0.5 hover:shadow-md"
                  )}
                >
                  <div className={clsx(
                    "h-32 lg:h-48 overflow-hidden relative pointer-events-none flex justify-center items-center border-b w-full rounded-t-xl transition-colors",
                    isActive ? "bg-orange-100/40 border-orange-100" : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="relative shadow-md border border-slate-300 bg-white overflow-hidden rounded-[2px] transition-transform duration-300 group-hover:scale-105" style={{ width: '100px', height: '141px' }}>
                      <div className="absolute top-0 left-0 w-[794px] bg-white transform origin-top-left" style={{ transform: 'scale(0.126)' }} dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/[0.02] transition-colors z-10" />
                    </div>
                  </div>
                  <div className="p-3.5 text-center text-sm font-bold text-slate-800 flex-shrink-0 relative flex lg:flex-row flex-col items-center justify-center gap-1.5">
                    {t.name}
                    {t.isDefault && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Default</span>}
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-sm z-20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={4} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Preview Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0 print:hidden">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex-shrink-0">
              {title}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-200/50 p-6 print:p-0 print:bg-white flex flex-col items-center shadow-inner print:block print-root">
            <div
              ref={contentRef}
              className={clsx(
                "bg-white transition-all shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:p-0 print:rounded-none print-content",
                "w-[210mm] h-[297mm] print:h-auto print:min-h-[297mm] print:overflow-visible mb-12 print:mb-0"
              )}
            >
              <div className="print-scale-container" style={{ transformOrigin: 'top left', width: '100%', height: '100%', overflow: 'visible' }}>
                <div className="print-scale-content" style={{ transformOrigin: 'top left' }}>
              {selectedPreviewId === 'standard' ? (
                <>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6 print:block">
                    <div className="text-slate-600">
                      <p className="font-bold text-xl text-slate-800 tracking-tight">{agreementForPrint?.override_company_name || companySettings?.company_name || companySettings?.name || "JAZ INFOTECH"}</p>
                      <p className="text-sm">{companySettings?.website || companySettings?.email || "www.company.com"}</p>
                    </div>
                    <div className="text-right text-slate-800">
                      <p className="text-sm border bg-slate-50 px-3 py-1.5 rounded-md inline-block font-medium mb-1"><span className="font-bold">Agreement No:</span> {agreementForPrint?.agreement_no || "—"}</p>
                      {quotation && <p className="text-sm mt-1 mb-1"><span className="font-bold">Quote No:</span> {quotation.quotation_no}</p>}
                      <p className="text-sm mt-1"><span className="font-bold">Date:</span> {dateStr}</p>
                    </div>
                  </div>

                  <div className="h-0.5 w-full bg-amber-400 mb-6 rounded-full" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div>
                      <h3 className="text-amber-500 font-bold mb-3">Bill To</h3>
                      <div className="text-slate-700 text-sm space-y-1">
                        <p className="font-bold text-slate-800">{clientName}</p>
                        {client.company_name && client.client_name && <p>{client.client_name}</p>}
                        <p>{client.address || "Client Address"}</p>
                        <p>{client.phone || "Client Phone"}</p>
                      </div>
                    </div>
                    <div className="print:mt-6">
                      <h3 className="text-amber-500 font-bold mb-3">From</h3>
                      <div className="text-slate-700 text-sm space-y-1">
                        <p className="font-bold text-slate-800">{companySettings?.company_name || companySettings?.name || "Your Company Pvt Ltd"}</p>
                        <p className="whitespace-pre-line">{companySettings?.address || "Business Address\nCity, Country"}</p>
                        <p>{companySettings?.email || "contact@company.com"}</p>
                        {companySettings?.phone && <p>{companySettings?.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {quotation && items.length > 0 && (
                    <div className="mb-8">
                      <div className="overflow-x-auto rounded-lg border border-slate-200 mb-4">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#1e293b] text-white">
                            <tr>
                              <th className="px-4 py-3 font-semibold">#</th>
                              <th className="px-4 py-3 font-semibold">Description</th>
                              <th className="px-4 py-3 font-semibold text-center">Qty</th>
                              <th className="px-4 py-3 font-semibold text-right">Price</th>
                              <th className="px-4 py-3 font-semibold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                            {items.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-4">{index + 1}</td>
                                <td className="px-4 py-4 font-medium min-w-[200px] whitespace-pre-wrap">{item.description || item.item_name || "—"}</td>
                                <td className="px-4 py-4 text-center">{item.quantity}</td>
                                <td className="px-4 py-4 text-right whitespace-nowrap">
                                  {quotation.currency || '$'}{parseFloat(item.unit_price || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                                  {quotation.currency || '$'}{parseFloat(item.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end mb-6">
                        <div className="w-full max-w-sm space-y-3 text-sm">
                          <div className="flex justify-between items-center px-4">
                            <span className="text-slate-600 font-medium">Subtotal</span>
                            <span className="font-semibold text-slate-800">{quotation.currency || '$'}{subtotal.toFixed(2)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between items-center px-4">
                              <span className="text-slate-600 font-medium">Discount</span>
                              <span className="font-semibold text-emerald-600">-{quotation.currency || '$'}{discount.toFixed(2)}</span>
                            </div>
                          )}
                          {tax > 0 && (
                            <div className="flex justify-between items-center px-4">
                              <span className="text-slate-600 font-medium">Tax</span>
                              <span className="font-semibold text-slate-800">{quotation.currency || '$'}{tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 mt-2">
                            <span className="text-slate-900 font-bold">Total</span>
                            <span className="text-lg font-bold text-[#f59e0b]">{quotation.currency || '$'}{total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px border-t border-dashed border-gray-300 w-full my-8"></div>
                    </div>
                  )}

                  <h1 className="text-2xl font-bold text-slate-900 mb-6 mt-4 pb-2 border-b border-gray-200 text-center uppercase tracking-tight">
                    {title}
                  </h1>

                  {blocks.length === 0 ? (
                    <p className="text-slate-500 text-center italic mt-4">No agreement content provided.</p>
                  ) : (
                    <AgreementContentDisplay blocks={blocks} />
                  )}
                </>
              ) : (
                <div className="text-slate-800 w-full">
                  {printHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: printHtml }} />
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      <p className="font-semibold text-lg">No Template Selected</p>
                      <p className="text-sm mt-2">Please select a valid print template from the sidebar.</p>
                    </div>
                  )}
                </div>
              )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between rounded-b-2xl print:hidden">
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button onClick={onEdit} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  <Edit2 size={16} /> Edit
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={onPrintClick} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={onPrintClick}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <Printer size={16} /> Print
              </button>
              <button onClick={onClose} className="inline-flex items-center gap-2 px-4 py-2 ml-2 border border-slate-200 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
