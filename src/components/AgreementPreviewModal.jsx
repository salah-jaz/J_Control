import { useRef, useEffect, useState, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { getDefaultTemplate } from '../utils/printTemplateStorage';
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
  const [fetchedTemplate, setFetchedTemplate] = useState(null);

  const defaultTemplate = useMemo(() => getDefaultTemplate('agreements'), []);

  useEffect(() => {
    if (isOpen) {
      getSettings().then((s) => setCompanySettings(s?.company || {}));
      if (!templateProp) setFetchedTemplate(getDefaultTemplate('agreements'));
    }
  }, [isOpen, templateProp]);

  // Use prop template when provided, else latest fetched (so styles changes in Print Template tab apply on next open)
  const effectiveTemplate = templateProp ?? fetchedTemplate ?? defaultTemplate;

  // Normalized agreement so buildAgreementPrintData gets content blocks and Body renders via {{agreement.agreement_content}}
  const agreementForPrint = useMemo(() => {
    const source =
      agreementProp ??
      selectedAgreement ??
      agreementData ??
      agreementRecord ??
      null;

    // STEP 1: Debug source agreement (before normalization)
    console.log('RAW AGREEMENT SOURCE:', source);
    console.log('RAW CONTENT FIELD:', source?.content);
    console.log('RAW AGREEMENT_CONTENT FIELD:', source?.agreement_content);
    console.log('RAW BLOCKS FIELD:', source?.blocks);

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

    // STEP 2: Debug normalized blocks (after normalization)
    console.log('NORMALIZED BLOCKS:', blocks);

    return {
      ...source,
      content: blocks,
      agreement_content: blocks,
    };
  }, [agreementProp, selectedAgreement, agreementData, agreementRecord]);

  const printHtml = useMemo(() => {
    if (!agreementForPrint) return null;
    const template = effectiveTemplate ?? {};
    const templateHtml = getEffectiveTemplateHtml(template, 'agreements');
    if (!templateHtml) return null;
    const templateHasBodySection = templateHtml.includes('print-section-body');
    const printData = buildAgreementPrintData(agreementForPrint, companySettings, null, {
      template,
      templateHasBodySection,
      templateHtml,
      styles: template?.styles,
    });

    // STEP 3: Debug printData
    console.log('PRINT DATA OBJECT:', printData);
    console.log('PRINT DATA BODY HTML:', printData?.agreement_content);

    // Pass under agreement key so {{agreement.agreement_content}} resolves from printData.agreement_content
    let html = resolveTemplateHtmlWithData(templateHtml, 'agreements', { agreement: printData });

    // STEP 4: Debug final HTML (after resolve)
    console.log('FINAL RESOLVED TEMPLATE HTML:', html);

    // STEP 5: Force fallback render if template replacement failed (placeholder still present or content missing)
    if (
      html &&
      printData?.agreement_content &&
      !html.includes(printData.agreement_content)
    ) {
      html = html.replace(
        '{{agreement.agreement_content}}',
        printData.agreement_content
      );
    }

    // STEP 6: Emergency direct render – guarantee body is visible if still missing
    if (printData?.agreement_content && !html.includes(printData.agreement_content)) {
      html += `     <div class="debug-body">
      ${printData.agreement_content}     </div>
  `;
    }

    return html;
  }, [agreementForPrint, effectiveTemplate, companySettings]);

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
  const hasTemplate = Boolean(printHtml);

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0 print:no-show">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrintClick}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div
            ref={contentRef}
            className="agreement-print-root bg-white text-slate-800 max-w-[210mm] mx-auto min-h-[200px] p-8 rounded-lg border border-gray-200"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}
          >
            {hasTemplate ? (
              <div className="max-w-[210mm] mx-auto text-slate-800" dangerouslySetInnerHTML={{ __html: printHtml }} />
            ) : (
              <>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-amber-800 text-sm">
                  <p className="font-semibold">No default Agreement template set.</p>
                  <p className="mt-1">Go to Print Templates to create and set a default template for Agreements. Print and PDF will then use that layout.</p>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-gray-200">
                  {title}
                </h1>
                {blocks.length === 0 ? (
                  <p className="text-slate-500">No content.</p>
                ) : (
                  <AgreementContentDisplay blocks={blocks} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
