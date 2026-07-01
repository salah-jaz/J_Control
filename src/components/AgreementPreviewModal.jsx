import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { X, Printer, Check, Edit2, Trash2, Download, LayoutTemplate } from 'lucide-react';
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
  
  @page { 
    size: A4; 
    margin: 0 !important; 
  }

  @media print {
    html, body { 
      height: auto !important; 
      width: 210mm !important; 
      margin: 0 auto !important; 
      padding: 0 !important; 
      font-family: 'Inter', sans-serif !important; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      background-color: white !important; 
      overflow: visible !important; 
      box-sizing: border-box !important;
    }
    
    * { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-shadow: none !important;
    }

    .print-root-container { 
      display: block !important; 
      position: relative !important; 
      width: 100% !important; 
      height: auto !important; 
      overflow: visible !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      background: transparent !important; 
      box-sizing: border-box !important; 
    }
    
    .print-main-layout { 
      display: block !important; 
      position: static !important; 
      width: 100% !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      box-sizing: border-box !important; 
    }
    
    .print-root { 
      display: block !important; 
      width: 100% !important;
      height: auto !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      border: none !important; 
      box-sizing: border-box !important; 
    }
    
    .print-content { 
      display: block !important; 
      width: 210mm !important; 
      max-width: 210mm !important;
      height: auto !important;
      min-height: 297mm !important;
      margin: 0 auto !important; 
      border: none !important; 
      box-shadow: none !important;
      overflow: visible !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
      position: relative !important;
      transform: none !important;
    }

    .print-scale-container, .print-scale-content {
      transform: none !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      display: block !important;
    }

    /* Standard template print padding */
    .standard-template-print-wrapper {
      padding: 20mm 15mm !important;
      box-sizing: border-box !important;
      width: 100% !important;
    }

    /* Support dynamic template elements */
    .print-doc-dynamic, .agreement-print-root, .agreement-wrap, .jaz-doc, .print-doc, .letterhead-doc, .letterhead-inner {
      height: auto !important;
      min-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      max-width: 210mm !important;
      box-sizing: border-box !important;
      border: none !important;
      box-shadow: none !important;
      overflow: visible !important;
      display: block !important;
      position: relative !important;
    }

    /* Content spacing and break points */
    .agreement-section, .agreement-paragraph, .agreement-bullets, .agreement-table, .signature-box, .party-details {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .jaz-footer-branding, .jaz-company-contact, .print-footer, footer {
      page-break-inside: avoid !important;
    }

    /* Ensure backgrounds and gradients print properly */
    .jaz-acc-tl, .jaz-acc-tr, .jaz-acc-bl { 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  /* Screen-only: Trap fixed elements in the preview box */
  @media screen {
    .print-content {
      position: relative !important;
      transform: translateZ(0);
      overflow: visible !important;
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

  // Scaling logic removed to allow document to overflow to multiple pages naturally
  // instead of shrinking to fit a single A4 page.


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
        html = '<style>' + css + '</style>\n' + html;
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
              const previewHtml = isActive ? generateHtmlForTemplate(t, agreementForPrint) : null;

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
                      {isActive ? (
                        <div className="absolute top-0 left-0 w-[794px] bg-white transform origin-top-left" style={{ transform: 'scale(0.126)' }} dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-3 gap-2">
                          <LayoutTemplate className="w-8 h-8 text-slate-300" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center line-clamp-2">{t.name}</span>
                        </div>
                      )}
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
                "w-[210mm] min-h-[297mm] print:h-auto print:min-h-0 print:overflow-visible mb-12 print:mb-0"
              )}
            >
              <div className="print-scale-container" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                <div className="print-scale-content">
                  {selectedPreviewId === 'standard' ? (
                    <div className="standard-print-layout">
                      <div className="print-header">
                        <div className="print-header-left">
                          <h2 className="company-name">{agreementForPrint?.override_company_name || companySettings?.company_name || companySettings?.name || "JAZ INFOTECH"}</h2>
                          <p className="company-details">
                            {companySettings?.address || "Business Address\nCity, Country"}
                            {companySettings?.email && `\nEmail: ${companySettings?.email}`}
                            {companySettings?.phone && `\nPhone: ${companySettings?.phone}`}
                            {companySettings?.website && `\nWebsite: ${companySettings?.website}`}
                          </p>
                        </div>
                        <div className="print-header-right">
                          <h2 className="doc-number">Agreement No: {agreementForPrint?.agreement_no || "—"}</h2>
                          {quotation && <p className="doc-date" style={{ marginBottom: '4px' }}>Quote No: {quotation.quotation_no}</p>}
                          <p className="doc-date">Date: {dateStr}</p>
                        </div>
                      </div>

                      <hr className="print-divider" />

                      <div className="print-billing">
                        <div className="print-billing-col">
                          <h3>Bill To</h3>
                          <div className="address-details">
                            <p className="font-bold text-slate-800">{clientName}</p>
                            {client.company_name && client.client_name && <p>{client.client_name}</p>}
                            <p>{client.address || "Client Address"}</p>
                            <p>{client.phone || "Client Phone"}</p>
                          </div>
                        </div>
                        <div className="print-billing-col">
                          <h3>From</h3>
                          <div className="address-details">
                            <p className="font-bold text-slate-800">{companySettings?.company_name || companySettings?.name || "Your Company Pvt Ltd"}</p>
                            <p className="whitespace-pre-line">{companySettings?.address || "Business Address\nCity, Country"}</p>
                            {companySettings?.email && <p>Email: {companySettings?.email}</p>}
                            {companySettings?.phone && <p>Phone: {companySettings?.phone}</p>}
                          </div>
                        </div>
                      </div>

                      {quotation && items.length > 0 && (
                        <div style={{ width: '100%' }}>
                          <div className="print-table-wrapper">
                            <table className="print-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '60px' }}>#</th>
                                  <th>Description</th>
                                  <th className="text-center" style={{ width: '80px' }}>Qty</th>
                                  <th className="text-right" style={{ width: '120px' }}>Price</th>
                                  <th className="text-right" style={{ width: '120px' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, index) => (
                                  <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td style={{ whiteSpace: 'pre-wrap' }}>{item.description || item.item_name || "—"}</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right font-medium">
                                      {quotation.currency || '$'}{parseFloat(item.unit_price || 0).toFixed(2)}
                                    </td>
                                    <td className="text-right font-bold text-slate-900">
                                      {quotation.currency || '$'}{parseFloat(item.total || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="print-summary">
                            <div className="print-summary-box">
                              <div className="print-summary-row">
                                <span>Subtotal</span>
                                <span>{quotation.currency || '$'}{subtotal.toFixed(2)}</span>
                              </div>
                              {discount > 0 && (
                                <div className="print-summary-row">
                                  <span>Discount</span>
                                  <span className="text-emerald-600 font-medium">-{quotation.currency || '$'}{discount.toFixed(2)}</span>
                                </div>
                              )}
                              {tax > 0 && (
                                <div className="print-summary-row">
                                  <span>Tax</span>
                                  <span>{quotation.currency || '$'}{tax.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="print-summary-row total">
                                <span>Total</span>
                                <span className="total-amount font-bold">{quotation.currency || '$'}{total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <hr className="agreement-divider" />
                        </div>
                      )}

                      <h1 className="agreement-title">
                        {title}
                      </h1>

                      <div className="agreement-content">
                        {blocks.length === 0 ? (
                          <p className="text-slate-500 text-center italic mt-4">No agreement content provided.</p>
                        ) : (
                          <AgreementContentDisplay blocks={blocks} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-800 w-full">
                      {printHtml ? (
                        <div
                          className="premium-template-root relative"
                          style={{ transform: 'translateZ(0)' }}
                          dangerouslySetInnerHTML={{ __html: printHtml }}
                        />
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
