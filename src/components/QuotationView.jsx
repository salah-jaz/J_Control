import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { X, Edit2, Trash2, FileOutput, Download, Printer, LayoutTemplate, Loader2 } from "lucide-react";
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
import { getQuotation } from "../services/quotationService";
import { getBankAccounts } from "../services/bankAccountService";

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
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [printConfig, setPrintConfig] = useState(() => {
    return getStoredPrintConfig("quotations") || getDefaultPrintConfigKeys();
  });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [selectedPreviewId, setSelectedPreviewId] = useState('standard');
  const [fullQuotation, setFullQuotation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    getSettings().then((data) => setCompanySettings(data?.company || {}));
    getBankAccounts({ useCache: false }).then((banks) => {
      setBankAccounts(banks || []);
      const activeBanks = (banks || []).filter(b => b.status === "Active" || b.status === "active");

      // Priority 1: a bank explicitly marked as default
      const defaultBank = activeBanks.find(b => b.isDefault);
      if (defaultBank) {
        setSelectedBankId(String(defaultBank.id));
        return;
      }

      // Priority 2: auto-select only if there is exactly ONE active bank
      if (activeBanks.length === 1) {
        setSelectedBankId(String(activeBanks[0].id));
        return;
      }

      // Priority 3: if no active banks at all, try first bank from the full list
      if (activeBanks.length === 0 && banks?.length > 0) {
        setSelectedBankId(String(banks[0].id));
        return;
      }

      // Multiple banks, no default — require user to choose
      setSelectedBankId("");
    });
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen || !quotation?.id) {
      setFullQuotation(null);
      return;
    }
    setLoading(true);
    getQuotation(quotation.id)
      .then((data) => {
        setFullQuotation(data);
      })
      .catch((err) => {
        console.error("Failed to load quotation details", err);
        toast.error("Failed to load quotation details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, quotation?.id]);

  const activeQuotation = fullQuotation || quotation;

  const selectedBank = useMemo(() =>
    bankAccounts.find(b => String(b.id) === String(selectedBankId)) || null,
    [bankAccounts, selectedBankId]
  );

  const templates = useMemo(() => getTemplates().filter(t => t.module === "quotations"), []);
  const [activeTemplate, setActiveTemplate] = useState(
    () => templates.find(t => t.isDefault) || templates[0] || null
  );

  useEffect(() => {
    setActiveTemplate(templates.find(t => t.isDefault) || templates[0] || null);
  }, [templates]);

  const isVisible = useCallback((key) => {
    return (printConfig || []).includes(key);
  }, [printConfig]);

  const buildPreviewForConfig = useCallback(
    (selectedKeys) => {
      if (!activeQuotation || !activeTemplate) return "";
      const filtered = filterTemplateByPrintConfig(activeTemplate, selectedKeys);
      const html = activeTemplate.template_html
        ? getEffectiveTemplateHtml(activeTemplate, "quotations")
        : buildFullTemplateHtml(filtered, "quotations");
      const data = buildQuotationPrintData(activeQuotation, companySettings, selectedBank);

      if (!selectedKeys.includes("company_name")) data.company_name = "";
      if (!selectedKeys.includes("company_logo")) data.company_logo = "";
      if (!selectedKeys.includes("company_address")) data.company_address = "";
      if (!selectedKeys.includes("company_phone")) data.company_phone = "";
      if (!selectedKeys.includes("company_email")) data.company_email = "";
      if (!selectedKeys.includes("document_number")) data.quotation_number = "";
      if (!selectedKeys.includes("date")) { data.date = ""; data.valid_until = ""; }
      if (!selectedKeys.includes("customer_name")) data.client_name = "";
      if (!selectedKeys.includes("customer_address")) data.customer_address = "";
      if (!selectedKeys.includes("customer_phone")) data.customer_phone = "";
      if (!selectedKeys.includes("customer_email")) data.customer_email = "";
      if (!selectedKeys.includes("items_table")) data.items_table = "";
      if (!selectedKeys.includes("subtotal")) data.subtotal = "";
      if (!selectedKeys.includes("discount")) data.discount = "";
      if (!selectedKeys.includes("tax")) data.tax_amount = "";
      if (!selectedKeys.includes("total_amount")) data.total = "";
      if (!selectedKeys.includes("bank_details")) { data.bank_name = ""; data.bank_account_name = ""; data.bank_account_number = ""; data.ifsc_code = ""; }
      if (!selectedKeys.includes("qr_code")) { data.bank_qr_code = ""; data.bank_qr_display = "none"; }
      if (!selectedKeys.includes("signature")) { data.authorized_signature = ""; }
      if (!selectedKeys.includes("authorized_signature_text")) { data.authorized_signature_text = ""; }
      if (!selectedKeys.includes("seal")) { data.company_seal = ""; }
      if (!selectedKeys.includes("terms_and_conditions")) data.terms_and_conditions = "";
      if (!selectedKeys.includes("notes")) data.company_notes = "";
      if (!selectedKeys.includes("title")) data.quotation_title = "";
      if (!selectedKeys.includes("payment_status")) data.payment_status = "";

      return resolveTemplateHtmlWithData(html, "quotations", data);
    },
    [activeQuotation, activeTemplate, companySettings, selectedBank]
  );

  const printHtml = useMemo(() => {
    const keys = printConfig || getDefaultPrintConfigKeys();
    return buildPreviewForConfig(keys);
  }, [buildPreviewForConfig, printConfig]);

  // Auto-scaling logic to fit ENTIRE layout on one A4 page
  useEffect(() => {
    if (!isOpen || !printRef.current || (selectedPreviewId !== 'standard' && !printHtml)) {
      setScaleFactor(1);
      return;
    }

    const calculateScale = () => {
      const container = printRef.current;
      const contentWrap = container.querySelector('.print-scale-content');
      if (!contentWrap) return;

      // Reset for calculation
      contentWrap.style.transform = 'none';
      contentWrap.style.width = '210mm';

      const contentHeight = contentWrap.scrollHeight;
      const a4Height = 1115;

      if (contentHeight > a4Height) {
        setScaleFactor(parseFloat((a4Height / contentHeight).toFixed(4)));
      } else {
        setScaleFactor(1);
      }
    };

    const timer = setTimeout(calculateScale, 400);
    return () => clearTimeout(timer);
  }, [isOpen, quotation, activeTemplate, selectedPreviewId, printConfig, printHtml]);


  const handlePrintTrigger = useReactToPrint({
    contentRef: printRef,
    documentTitle: activeQuotation?.quotation_no ? `Quotation_${activeQuotation.quotation_no}` : "Quotation",
    pageStyle: `
            @page {
                size: A4;
                margin: 0 !important;
            }
            @media print {
                html, body {
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .quotation-a4 {
                    width: 210mm !important;
                    height: 297mm !important;
                    min-height: 297mm !important;
                    max-height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    position: relative !important;
                    display: block !important;
                    overflow: hidden !important;
                }
                .print-scale-container {
                    width: 100% !important;
                    height: 100% !important;
                    overflow: visible !important;
                }
                /* Do NOT force transform none here; let the inline style handle scaling */
                .print-scale-content {
                    width: 210mm !important;
                    height: auto !important;
                }
                /* Target common template wrappers to allow stretch before scale */
                .jaz-doc, .jaz-inner, .print-doc, .print-doc-dynamic, .invoice, .quotation, .agreement-print-root, .letterhead-doc, .letterhead-inner {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 210mm !important;
                    max-width: 210mm !important;
                    height: auto !important;
                    min-height: 297mm !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                .jaz-footer-branding, .jaz-company-contact, .print-footer, footer {
                    margin-top: auto !important;
                }
                .no-print {
                    display: none !important;
                }
            }
        `
  });

  const handlePrint = useCallback(() => {
    if (handlePrintTrigger) {
      handlePrintTrigger();
    }
  }, [handlePrintTrigger]);

  useEffect(() => {
    if (pendingPrintRef.current && printRef.current) {
      pendingPrintRef.current = false;
      const t = setTimeout(() => {
        handlePrint();
      }, 150);
      return () => clearTimeout(t);
    }
  });

  const openPrintConfig = () => setShowPrintConfig(true);
  const onPrintWithConfig = (selectedKeys) => {
    setPrintConfig(selectedKeys);
    setShowPrintConfig(false);
    pendingPrintRef.current = true;
  };

  if (!isOpen) return null;
  if (!activeQuotation) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-slate-500">No quotation selected.</div>
      </div>
    );
  }

  const client = activeQuotation.client;
  const clientName = client ? (client.company_name || client.client_name) : "—";
  const items = activeQuotation.items || [];
  const subtotal = parseFloat(activeQuotation.subtotal) || 0;
  const discount = parseFloat(activeQuotation.discount) || 0;
  const tax = parseFloat(activeQuotation.tax) || 0;
  const total = parseFloat(activeQuotation.total) || 0;
  const dateStr = activeQuotation.date ? (typeof activeQuotation.date === "string" ? activeQuotation.date.split("T")[0] : activeQuotation.date) : "—";

  const pageStyles = `
    @page { size: A4; margin: 0 !important; }
    @media print {
      html, body { height: 297mm !important; width: 210mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; box-sizing: border-box !important; }
      .quotation-a4 {
        margin: 0 !important; padding: 0 !important; box-shadow: none !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; min-height: 297mm !important; overflow: hidden !important; page-break-after: avoid !important; page-break-inside: avoid !important; border: none !important; box-sizing: border-box !important; position: relative !important;
      }
    }
    @media screen {
      .quotation-a4 {
        min-height: 297mm;
      }
    }
  `;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:block">
      <style>{pageStyles}</style>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col lg:flex-row-reverse overflow-hidden print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none">        {/* Templates Visual Selector (Sidebar Desktop / Top Rail Mobile) */}
        <div className="w-full lg:w-[360px] bg-gradient-to-b from-slate-50 to-slate-100 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden print:hidden relative z-10">
          <div className="p-4 lg:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm relative z-20 space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Select Layout</h3>
              <p className="text-sm text-slate-500 mt-1 hidden lg:block">Choose a style for printing or saving.</p>
            </div>

            {/* Bank Account Selection Dropdown */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Account</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 focus:border-slate-900 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No bank accounts available</option>
                ) : (
                  <>
                    {!selectedBankId && <option value="">-- Select Bank Account --</option>}
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.isDefault ? "★ " : ""}{b.bankName}{b.nickName ? ` (${b.nickName})` : b.accountType ? ` — ${b.accountType}` : ""}{b.isDefault ? " [Default]" : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!selectedBankId && bankAccounts.length > 1 && (
                <p className="text-[10px] text-amber-600 font-bold mt-1.5 uppercase tracking-wider">
                  Please select a bank to continue.
                </p>
              )}
            </div>
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
                Standard
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
              const previewHtml = isActive ? (() => {
                const keys = printConfig || getDefaultPrintConfigKeys();
                const html = t.template_html ? getEffectiveTemplateHtml(t, "quotations") : buildFullTemplateHtml(filterTemplateByPrintConfig(t, keys), "quotations");
                let data = buildQuotationPrintData(activeQuotation, companySettings, selectedBank);
                if (data.quotation && data.quotation.items && data.quotation.items.length > 5) {
                  data.quotation.items = data.quotation.items.slice(0, 5);
                }
                if (!keys.includes("title")) data.quotation_title = "";
                if (!keys.includes("payment_status")) data.payment_status = "";
                return resolveTemplateHtmlWithData(html, "quotations", data);
              })() : null;

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
                        <div className="absolute top-0 left-0 w-[794px] bg-white transform origin-top-left" style={{ transform: 'scale(0.126)' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
              Quotation {activeQuotation.quotation_no}
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
            {/* Validation Alerts */}
            {(() => {
              const isCompanyInfoMissing = !companySettings?.name && !companySettings?.company_name;
              const isBankMissing = bankAccounts.length === 0;
              const isBankNotSelected = !selectedBankId;
              return (
                <div className="w-full max-w-[210mm] px-4 pt-6 space-y-3 print:hidden">
                  {isCompanyInfoMissing && (
                    <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="text-xs text-rose-800 font-medium">
                        <span className="font-bold uppercase tracking-wider block mb-0.5 text-rose-900 text-[10px]">Company Profile Incomplete</span>
                        Please complete the Company Profile in Settings to populate your header/billing details.
                      </div>
                    </div>
                  )}
                  {isBankMissing ? (
                    <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="text-xs text-rose-800 font-medium">
                        <span className="font-bold uppercase tracking-wider block mb-0.5 text-rose-900 text-[10px]">No Bank Accounts Available</span>
                        Please create a bank account before printing.
                      </div>
                    </div>
                  ) : isBankNotSelected ? (
                    <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="text-xs text-amber-800 font-medium">
                        <span className="font-bold uppercase tracking-wider block mb-0.5 text-amber-900 text-[10px]">Bank Selection Required</span>
                        Please select a Bank Account from the dropdown in the layout sidebar to print.
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            <div className="w-full py-8 lg:py-12 flex flex-col items-center">
              {loading ? (
                <div className="w-[210mm] h-[297mm] bg-white shadow-2xl border border-slate-200 rounded-sm flex flex-col items-center justify-center p-10 gap-4 animate-fade-in">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Loading quotation details...</p>
                </div>
              ) : (
                <div ref={printRef} className="quotation-a4 bg-white transition-all relative mx-auto print:h-auto print:min-h-[297mm] print:overflow-visible w-[210mm] h-[297mm] shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:p-0 print:rounded-none">
                  <div className="print-scale-container" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
                    <div className="print-scale-content" style={{
                      transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : 'none',
                      transformOrigin: 'top center',
                      width: '210mm'
                    }}>
                      {selectedPreviewId === 'standard' ? (
                        <div className="standard-print-layout">
                          <div className="print-header">
                            {(isVisible('company_name') || isVisible('company_address') || isVisible('company_phone') || isVisible('company_email')) && (
                              <div className="print-header-left">
                                {isVisible('company_name') && <h2 className="company-name">{companySettings.name || companySettings.company_name || "Company Name"}</h2>}
                                <p className="company-details font-medium whitespace-pre-line">
                                  {isVisible('company_address') && companySettings.address}
                                  {isVisible('company_address') && (companySettings.city || companySettings.state) && `\n${[companySettings.city, companySettings.state].filter(Boolean).join(', ')}`}
                                  {isVisible('company_address') && (companySettings.country || companySettings.postal_code) && `\n${[companySettings.country, companySettings.postal_code].filter(Boolean).join(' - ')}`}
                                  {isVisible('company_phone') && companySettings.phone && `\nPhone: ${companySettings.phone}`}
                                  {isVisible('company_email') && companySettings.email && `\nEmail: ${companySettings.email}`}
                                  {isVisible('company_address') && companySettings.website && `\nWebsite: ${companySettings.website}`}
                                  {isVisible('company_address') && companySettings.gst && `\nGST: ${companySettings.gst}`}
                                </p>
                              </div>
                            )}
                            {(isVisible('document_number') || isVisible('date')) && (
                              <div className="print-header-right">
                                {isVisible('document_number') && <h2 className="doc-number">Quotation No: {activeQuotation.quotation_no}</h2>}
                                {isVisible('date') && <p className="doc-date">Date: {dateStr}</p>}
                              </div>
                            )}
                          </div>

                          <hr className="print-divider" />

                          {(isVisible('customer_name') || isVisible('customer_address') || isVisible('customer_phone') || isVisible('company_name') || isVisible('company_address') || isVisible('company_phone') || isVisible('company_email')) && (
                            <div className="print-billing">
                              {(isVisible('customer_name') || isVisible('customer_address') || isVisible('customer_phone')) && (
                                <div className="print-billing-col">
                                  <h3>Bill To</h3>
                                  <div className="address-details font-medium">
                                    {isVisible('customer_name') && (
                                      <>
                                        <p className="font-bold text-slate-800">{clientName}</p>
                                        {client?.company_name && client?.client_name && <p>{client.client_name}</p>}
                                      </>
                                    )}
                                    {isVisible('customer_address') && <p>{client?.address || "Client Address"}</p>}
                                    {isVisible('customer_phone') && <p>{client?.phone || "Client Phone"}</p>}
                                  </div>
                                </div>
                              )}
                              {(isVisible('company_name') || isVisible('company_address') || isVisible('company_phone') || isVisible('company_email')) && (
                                <div className="print-billing-col">
                                  <h3>From</h3>
                                  <div className="address-details font-medium">
                                    {isVisible('company_name') && <p className="font-bold text-slate-800">{companySettings.name || companySettings.company_name || "Your Company Pvt Ltd"}</p>}
                                    {isVisible('company_address') && (
                                      <p className="whitespace-pre-line">
                                        {companySettings.address}
                                        {(companySettings.city || companySettings.state) && `\n${[companySettings.city, companySettings.state].filter(Boolean).join(', ')}`}
                                        {(companySettings.country || companySettings.postal_code) && `\n${[companySettings.country, companySettings.postal_code].filter(Boolean).join(' - ')}`}
                                      </p>
                                    )}
                                    {isVisible('company_phone') && companySettings.phone && <p>P: {companySettings.phone}</p>}
                                    {isVisible('company_email') && companySettings.email && <p>E: {companySettings.email}</p>}
                                    {isVisible('company_address') && companySettings.website && <p>W: {companySettings.website}</p>}
                                    {isVisible('company_address') && companySettings.gst && <p>GST: {companySettings.gst}</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isVisible('items_table') && (
                            <div className="print-table-wrapper">
                              <table className="print-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Description</th>
                                    <th className="text-right" style={{ width: '120px' }}>Price</th>
                                    <th className="text-right" style={{ width: '120px' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.length === 0 ? (
                                    <tr>
                                      <td colSpan="4" className="text-center">No items added.</td>
                                    </tr>
                                  ) : items.map((item, index) => (
                                    <tr key={index}>
                                      <td>{index + 1}</td>
                                      <td>{item.item || item.description || item.item_name || "—"}</td>
                                      <td className="text-right font-medium">
                                        {activeQuotation.currency || '$'}{parseFloat(item.price || item.unit_price || 0).toFixed(2)}
                                      </td>
                                      <td className="text-right font-bold text-slate-900">
                                        {activeQuotation.currency || '$'}{parseFloat(item.amount || item.total || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {(isVisible('subtotal') || isVisible('discount') || isVisible('tax') || isVisible('total_amount')) && (
                            <div className="print-summary">
                              <div className="print-summary-box">
                                {isVisible('subtotal') && (
                                  <div className="print-summary-row">
                                    <span>Subtotal</span>
                                    <span>{activeQuotation.currency || '$'}{subtotal.toFixed(2)}</span>
                                  </div>
                                )}
                                {isVisible('discount') && discount > 0 && (
                                  <div className="print-summary-row">
                                    <span>Discount</span>
                                    <span className="text-emerald-600 font-medium">-{activeQuotation.currency || '$'}{discount.toFixed(2)}</span>
                                  </div>
                                )}
                                {isVisible('tax') && tax > 0 && (
                                  <div className="print-summary-row">
                                    <span>Tax</span>
                                    <span>{activeQuotation.currency || '$'}{tax.toFixed(2)}</span>
                                  </div>
                                )}
                                {isVisible('total_amount') && (
                                  <div className="print-summary-row total">
                                    <span>Total</span>
                                    <span className="total-amount font-bold">{activeQuotation.currency || '$'}{total.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Terms, Notes, and Bank details */}
                          {((isVisible('terms_and_conditions') && companySettings.terms) || (isVisible('notes') && companySettings.notes) || (selectedBank && (isVisible('bank_details') || isVisible('qr_code')))) && (
                            <div className="print-bottom-section grid grid-cols-2 gap-8 mt-8 border-t border-slate-200 pt-6">
                              {(isVisible('terms_and_conditions') || isVisible('notes')) && (
                                <div className="print-bottom-left space-y-6">
                                  {/* Terms & Conditions */}
                                  {isVisible('terms_and_conditions') && (
                                    <div>
                                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Terms & Conditions</h3>
                                      <p className="text-[12px] text-slate-600 whitespace-pre-line leading-relaxed">
                                        {companySettings.terms || "Standard terms apply."}
                                      </p>
                                    </div>
                                  )}

                                  {/* Company Notes */}
                                  {isVisible('notes') && companySettings.notes && (
                                    <div>
                                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company Notes</h3>
                                      <p className="text-[12px] text-slate-600 whitespace-pre-line leading-relaxed">
                                        {companySettings.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(selectedBank && (isVisible('bank_details') || isVisible('qr_code'))) && (
                                <div className="print-bottom-right space-y-6">
                                  {/* Bank Details */}
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">Bank Transfer</h3>
                                    <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                                      {isVisible('bank_details') && (
                                        <>
                                          <div className="flex"><span className="w-28 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bank Name:</span> <span className="font-bold text-slate-800">{selectedBank.bankName}</span></div>
                                          <div className="flex"><span className="w-28 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Account Name:</span> <span className="font-bold text-slate-800">{selectedBank.accountName}</span></div>
                                          <div className="flex"><span className="w-28 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Account Number:</span> <span className="font-bold text-slate-800">{selectedBank.accountNumber}</span></div>
                                          <div className="flex"><span className="w-28 text-slate-400 font-bold uppercase tracking-wider text-[10px]">IFSC Code:</span> <span className="font-bold text-slate-800">{selectedBank.ifsc}</span></div>
                                        </>
                                      )}
                                      {isVisible('qr_code') && (selectedBank.qrCode || selectedBank.qr_code) && (
                                        <div className="mt-4 flex justify-center">
                                          <img src={selectedBank.qrCode || selectedBank.qr_code} alt="Bank QR Code" width="110" height="110" className="object-contain" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-800 w-full min-h-[297mm]">
                          {printHtml ? (
                            <div className="relative isolate" style={{ transform: 'translateZ(0)' }}>
                              <div className="w-[210mm] mx-auto p-0" dangerouslySetInnerHTML={{ __html: printHtml }} />
                            </div>
                          ) : (
                            <div className="p-12 text-center text-slate-500">
                              <p className="font-semibold text-lg">No template selected</p>
                              <p className="text-sm mt-2">Please choose a template from the list.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
              {activeQuotation.status !== "Converted" && (
                <button
                  onClick={onConvertToInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#f97316] text-white hover:bg-[#ea580c] rounded-lg text-sm font-semibold transition-all shadow-sm shadow-orange-500/20"
                >
                  <FileOutput size={16} /> Convert to Invoice
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {(() => {
                const isBankMissing = bankAccounts.length === 0;
                const isBankNotSelected = !selectedBankId;
                return (
                  <>
                    <button
                      disabled={isBankMissing || isBankNotSelected}
                      onClick={() => {
                        if (isBankMissing) {
                          toast.error("No bank accounts available. Please create a bank account before printing.");
                          return;
                        }
                        if (isBankNotSelected) {
                          toast.error("Please select a Bank Account before printing.");
                          return;
                        }
                        openPrintConfig();
                      }}
                      className={clsx(
                        "inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors shadow-sm",
                        (isBankMissing || isBankNotSelected)
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                      )}
                    >
                      <Download size={16} /> Download PDF
                    </button>
                    <button
                      disabled={isBankMissing || isBankNotSelected}
                      onClick={() => {
                        if (!activeTemplate) {
                          toast.error("No Quotation template available. Create one in Print Templates.");
                          return;
                        }
                        if (isBankMissing) {
                          toast.error("No bank accounts available. Please create a bank account before printing.");
                          return;
                        }
                        if (isBankNotSelected) {
                          toast.error("Please select a Bank Account before printing.");
                          return;
                        }
                        openPrintConfig();
                      }}
                      className={clsx(
                        "inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors shadow-sm",
                        (isBankMissing || isBankNotSelected)
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                      )}
                    >
                      <Printer size={16} /> Print
                    </button>
                  </>
                );
              })()}
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
        onChange={setPrintConfig}
        printConfig={printConfig}
      />
    </div>
  );
};

export default QuotationView;
