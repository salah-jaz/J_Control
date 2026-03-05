import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { X, Printer, Check } from 'lucide-react';
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
  @page { size: A4; margin: 16mm; }
`;

export default function AgreementPreviewModal({
  agreement: agreementProp,
  selectedAgreement,
  agreementData,
  agreementRecord,
  isOpen,
  onClose,
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

  const generateHtmlForTemplate = useCallback((tpl, agreementSource) => {
    if (!agreementSource) return null;
    if (tpl === 'standard') return null;

    const template = tpl ?? {};
    const templateHtml = getEffectiveTemplateHtml(template, 'agreements');
    if (!templateHtml) return null;

    const templateHasBodySection = templateHtml.includes('print-section-body');
    const printData = buildAgreementPrintData(agreementSource, companySettings, null, {
      template,
      templateHasBodySection,
      templateHtml,
      styles: template?.styles,
    });

    // Pass under agreement key so {{agreement.agreement_content}} resolves from printData.agreement_content
    let html = resolveTemplateHtmlWithData(templateHtml, 'agreements', { agreement: printData });

    return html;
  }, [companySettings]);

  const printHtml = useMemo(() => {
    return generateHtmlForTemplate(activeTemplate, agreementForPrint);
  }, [agreementForPrint, activeTemplate, generateHtmlForTemplate]);

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

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:block">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col lg:flex-row-reverse overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none">

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

          <div className="flex-1 overflow-y-auto bg-slate-200/50 p-6 print:p-0 print:bg-white flex flex-col items-center shadow-inner">
            <div
              ref={contentRef}
              className={clsx(
                "bg-white transition-all w-full shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:p-0 print:rounded-none",
                selectedPreviewId === 'standard' ? "max-w-4xl p-8 md:p-12 mb-12" : "max-w-[210mm] min-h-[297mm] mb-12"
              )}
            >
              {selectedPreviewId === 'standard' ? (
                <>
                  <div className="agreement-fallback-header mb-10 text-center">
                    <div className="inline-flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 via-white to-pink-50 rounded-full shadow-sm border border-slate-100 mb-4">
                      <span className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                        {agreementForPrint?.override_company_name || companySettings?.name || 'JAZ INFOTECH'}
                      </span>
                      <span className="text-sm text-slate-400 italic font-medium pt-1 border-l border-slate-200 pl-4">
                        {agreementForPrint?.tagline || 'Build, automate, scale — without limits.'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] flex justify-center gap-4">
                      <span>{companySettings?.phone}</span>
                      <span>{companySettings?.email}</span>
                      <span>{companySettings?.address}</span>
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-gray-200 text-center uppercase tracking-tight">
                    {title}
                  </h1>
                  {blocks.length === 0 ? (
                    <p className="text-slate-500">No content.</p>
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

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 items-center justify-end rounded-b-2xl print:hidden">
            <button
              type="button"
              onClick={onPrintClick}
              className="px-6 py-2.5 bg-[#f97316] text-white hover:bg-[#ea580c] rounded-lg text-sm font-bold transition-all shadow-sm shadow-orange-500/20 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Agreement
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-lg text-sm font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
