import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { X, Edit2, Trash2, FileOutput, Download, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import clsx from "clsx";
import { getTemplates } from "../utils/printTemplateStorage";
import {
  buildFullTemplateHtml,
  getEffectiveTemplateHtml,
  resolveTemplateHtmlWithData,
  buildQuotationPrintData,
  filterTemplateByPrintConfig,
  getDefaultPrintConfigKeys,
  getStoredPrintConfig,
} from "../config/printTemplateModules";
import { getSettings } from "../services/db";
import PrintConfigModal from "./PrintConfigModal";
import AgreementContentDisplay from "./AgreementContentDisplay";

const QuotationView = ({
  isOpen,
  onClose,
  quotation,
  onEdit,
  onDelete,
  onConvertToInvoice,
  onSaved,
}) => {
  const printRef = useRef();
  const pendingPrintRef = useRef(false);
  const [companySettings, setCompanySettings] = useState({});
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [printConfig, setPrintConfig] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    getSettings().then((data) => setCompanySettings(data?.company || {}));
  }, [isOpen]);

  const templates = useMemo(() => getTemplates().filter(t => t.module === "quotations"), []);
  const [activeTemplate, setActiveTemplate] = useState(
    () => templates.find(t => t.isDefault) || templates[0] || null
  );
  const [selectedPreviewId, setSelectedPreviewId] = useState('standard');

  useEffect(() => {
    setActiveTemplate(templates.find(t => t.isDefault) || templates[0] || null);
  }, [templates]);

  const getPrintConfigKeys = useCallback(
    () => printConfig || getStoredPrintConfig("quotations") || getDefaultPrintConfigKeys(),
    [printConfig]
  );

  const printHtml = useMemo(() => {
    if (!quotation || !activeTemplate) return null;
    const keys = getPrintConfigKeys();
    const html = activeTemplate.template_html
      ? getEffectiveTemplateHtml(activeTemplate, "quotations")
      : buildFullTemplateHtml(filterTemplateByPrintConfig(activeTemplate, keys), "quotations");
    const data = buildQuotationPrintData(quotation, companySettings);
    return resolveTemplateHtmlWithData(html, "quotations", data);
  }, [quotation, activeTemplate, companySettings, getPrintConfigKeys]);

  const buildPreviewForConfig = useCallback(
    (selectedKeys) => {
      if (!quotation || !activeTemplate) return "";
      const filtered = filterTemplateByPrintConfig(activeTemplate, selectedKeys);
      const html = activeTemplate.template_html
        ? getEffectiveTemplateHtml(activeTemplate, "quotations")
        : buildFullTemplateHtml(filtered, "quotations");
      const data = buildQuotationPrintData(quotation, companySettings);
      return resolveTemplateHtmlWithData(html, "quotations", data);
    },
    [quotation, activeTemplate, companySettings]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: quotation?.quotation_no ? `Quotation_${quotation.quotation_no}` : "Quotation",
  });

  useEffect(() => {
    if (printConfig && pendingPrintRef.current && printRef.current) {
      pendingPrintRef.current = false;
      const t = setTimeout(() => {
        handlePrint();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [printConfig]);

  const openPrintConfig = () => setShowPrintConfig(true);
  const onPrintWithConfig = (selectedKeys) => {
    setPrintConfig(selectedKeys);
    setShowPrintConfig(false);
    pendingPrintRef.current = true;
  };

  const handleDownloadPDF = () => {
    if (!activeTemplate) {
      toast.error("No Quotation template available. Create one in Print Templates.");
      return;
    }
    openPrintConfig();
  };

  if (!isOpen) return null;
  if (!quotation) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-slate-500">No quotation selected.</div>
      </div>
    );
  }

  const client = quotation.client;
  const clientName = client ? (client.company_name || client.client_name) : "—";
  const items = quotation.items || [];
  const subtotal = parseFloat(quotation.subtotal) || 0;
  const discount = parseFloat(quotation.discount) || 0;
  const tax = parseFloat(quotation.tax) || 0;
  const total = parseFloat(quotation.total) || 0;
  const initialDeposit = parseFloat(quotation.initial_deposit) || 0;
  const balanceDue = Math.max(0, total - initialDeposit);
  const dateStr = quotation.date ? (typeof quotation.date === "string" ? quotation.date.split("T")[0] : quotation.date) : "—";
  const expiryStr = quotation.expiry_date ? (typeof quotation.expiry_date === "string" ? quotation.expiry_date.split("T")[0] : quotation.expiry_date) : "—";

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:block">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col lg:flex-row-reverse overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none">

        {/* Templates Visual Selector (Sidebar Desktop / Top Rail Mobile) */}
        <div className="w-full lg:w-[360px] bg-gradient-to-b from-slate-50 to-slate-100 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden print:hidden relative z-10">
          <div className="p-4 lg:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm relative z-20">
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Select Design</h3>
            <p className="text-sm text-slate-500 mt-1 hidden lg:block">Click any layout to instantly apply it to this quotation.</p>
          </div>

          <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-4 lg:p-5 grid grid-flow-col auto-cols-[140px] lg:grid-flow-row lg:grid-cols-2 gap-4 lg:content-start [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 pb-10">


            <div
              onClick={() => setSelectedPreviewId('standard')}
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
                  {/* Abstract standard form visual */}
                  <div className="w-full h-full bg-white border border-slate-200 shadow-sm rounded flex flex-col p-3 space-y-3" style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', height: '125%' }}>
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-3 lg:w-16 lg:h-4 rounded bg-slate-200"></div>
                      <div className="w-8 h-4 lg:w-12 lg:h-6 rounded bg-slate-200"></div>
                    </div>
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="flex gap-2 lg:gap-4">
                      <div className="w-1/2 space-y-1"><div className="w-8 h-1.5 lg:w-10 lg:h-2 bg-slate-200"></div><div className="w-16 h-1.5 lg:w-20 lg:h-2 bg-slate-200"></div></div>
                      <div className="w-1/2 space-y-1"><div className="w-8 h-1.5 lg:w-10 lg:h-2 bg-slate-200"></div><div className="w-16 h-1.5 lg:w-20 lg:h-2 bg-slate-200"></div></div>
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
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {templates.map(t => {
              const isActive = selectedPreviewId !== 'standard' && activeTemplate?.id === t.id;
              const previewHtml = (() => {
                const keys = getPrintConfigKeys();
                const html = t.template_html ? getEffectiveTemplateHtml(t, "quotations") : buildFullTemplateHtml(filterTemplateByPrintConfig(t, keys), "quotations");
                let data = buildQuotationPrintData(quotation, companySettings);
                // If items are too long, limit them so the preview doesn't break aspect ratio terribly
                if (data.quotation && data.quotation.items && data.quotation.items.length > 5) {
                  data.quotation.items = data.quotation.items.slice(0, 5);
                }
                return resolveTemplateHtmlWithData(html, "quotations", data);
              })();

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
                    {/* Miniature A4 Document Holder */}
                    <div className="relative shadow-md border border-slate-300 bg-white overflow-hidden rounded-[2px] transition-transform duration-300 group-hover:scale-105" style={{ width: '100px', height: '141px' }}>
                      <div className="absolute top-0 left-0 w-[794px] bg-white transform origin-top-left" style={{ transform: 'scale(0.126)' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/[0.02] transition-colors z-10" />
                    </div>
                  </div>
                  <div className="p-3.5 text-center text-sm font-bold text-slate-800 flex-shrink-0 relative flex lg:flex-row flex-col items-center justify-center gap-1.5">
                    {t.name}
                    {t.isDefault && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Default</span>}
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white p-1.5 rounded-full shadow-sm z-20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0 print:hidden">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex-shrink-0">
              Quotation {quotation.quotation_no}
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

          <div className="flex-1 overflow-y-auto bg-slate-200/50 print:p-0 print:bg-white flex flex-col items-center shadow-inner">
            <div className="w-full py-8 lg:py-12 flex flex-col items-center">
              <div ref={printRef} className={clsx("bg-white transition-all w-full", selectedPreviewId === 'standard' ? "max-w-4xl p-6 md:p-10 shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:p-0 print:rounded-none" : "max-w-[210mm] shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:max-w-none print:rounded-none")}>
                {selectedPreviewId === 'standard' ? (
                  <>
                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                      <div className="text-slate-600">
                        <p className="font-semibold text-slate-800">{companySettings.company_name || "Company Name"}</p>
                        <p className="text-sm">{companySettings.website || companySettings.email || "www.company.com"}</p>
                      </div>
                      <div className="text-right text-slate-800">
                        <p className="text-sm"><span className="font-bold">Quote No:</span> {quotation.quotation_no}</p>
                        <p className="text-sm mt-1"><span className="font-bold">Date:</span> {dateStr}</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-0.5 w-full bg-amber-400 mb-6 rounded-full" />

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div>
                        <h3 className="text-amber-500 font-bold mb-3">Bill To</h3>
                        <div className="text-slate-700 text-sm space-y-1">
                          <p>{clientName}</p>
                          {client.company_name && client.client_name && <p>{client.client_name}</p>}
                          <p>{client.address || "Client Address"}</p>
                          <p>{client.phone || "Client Phone"}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-amber-500 font-bold mb-3">From</h3>
                        <div className="text-slate-700 text-sm space-y-1">
                          <p>{companySettings.company_name || "Your Company Pvt Ltd"}</p>
                          <p className="whitespace-pre-line">{companySettings.address || "Business Address\nCity, Country"}</p>
                          <p>{companySettings.email || "contact@company.com"}</p>
                          {companySettings.phone && <p>{companySettings.phone}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
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
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-4 py-6 text-center text-slate-500">No items added.</td>
                            </tr>
                          ) : items.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4">{index + 1}</td>
                              <td className="px-4 py-4 font-medium">{item.description || item.item_name || "—"}</td>
                              <td className="px-4 py-4 text-center">{item.quantity}</td>
                              <td className="px-4 py-4 text-right">
                                {quotation.currency || '$'}{parseFloat(item.unit_price || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-4 text-right font-semibold text-slate-900">
                                {quotation.currency || '$'}{parseFloat(item.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-4">
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

                  </>
                ) : (
                  <div className="text-slate-800 w-full min-h-[297mm]">
                    {printHtml ? (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: printHtml }} />
                        {quotation?.agreement_content?.length > 0 && (
                          <div className="px-8 mt-6 pb-8">
                            <AgreementContentDisplay blocks={quotation.agreement_content} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-12 text-center text-slate-500">
                        <p className="font-semibold text-lg">No Template Selected</p>
                        <p className="text-sm mt-2">Please select a valid print template from the dropdown.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between rounded-b-2xl print:hidden">
            <div className="flex flex-wrap gap-2">
              <button onClick={onEdit} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Edit2 size={16} /> Edit
              </button>
              <button onClick={onDelete} className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Trash2 size={16} /> Delete
              </button>
              {quotation.status !== "Converted" && (
                <button
                  onClick={onConvertToInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white hover:bg-[#ea580c] rounded-lg text-sm font-semibold transition-all shadow-sm shadow-orange-500/20"
                >
                  <FileOutput size={16} /> Convert to Invoice
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleDownloadPDF} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => {
                  if (!activeTemplate) {
                    toast.error("No Quotation template available. Create one in Print Templates.");
                    return;
                  }
                  openPrintConfig();
                }}
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

      <PrintConfigModal
        isOpen={showPrintConfig}
        onClose={() => setShowPrintConfig(false)}
        moduleKey="quotations"
        moduleLabel="Quotation"
        getPreviewHtml={buildPreviewForConfig}
        onPrint={onPrintWithConfig}
        templates={templates}
        selectedTemplate={activeTemplate}
        onSelectTemplate={setActiveTemplate}
      />
    </div>
  );
};

export default QuotationView;
