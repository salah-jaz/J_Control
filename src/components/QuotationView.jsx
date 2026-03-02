import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { X, Edit2, Trash2, FileOutput, Download, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import clsx from "clsx";
import { getDefaultTemplate } from "../utils/printTemplateStorage";
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

  const defaultTemplate = useMemo(() => getDefaultTemplate("quotations"), []);

  const getPrintConfigKeys = useCallback(
    () => printConfig || getStoredPrintConfig("quotations") || getDefaultPrintConfigKeys(),
    [printConfig]
  );

  const printHtml = useMemo(() => {
    if (!quotation || !defaultTemplate) return null;
    const keys = getPrintConfigKeys();
    const html = defaultTemplate.template_html
      ? getEffectiveTemplateHtml(defaultTemplate, "quotations")
      : buildFullTemplateHtml(filterTemplateByPrintConfig(defaultTemplate, keys), "quotations");
    const data = buildQuotationPrintData(quotation, companySettings);
    return resolveTemplateHtmlWithData(html, "quotations", data);
  }, [quotation, defaultTemplate, companySettings, getPrintConfigKeys]);

  const buildPreviewForConfig = useCallback(
    (selectedKeys) => {
      if (!quotation || !defaultTemplate) return "";
      const filtered = filterTemplateByPrintConfig(defaultTemplate, selectedKeys);
      const html = defaultTemplate.template_html
        ? getEffectiveTemplateHtml(defaultTemplate, "quotations")
        : buildFullTemplateHtml(filtered, "quotations");
      const data = buildQuotationPrintData(quotation, companySettings);
      return resolveTemplateHtmlWithData(html, "quotations", data);
    },
    [quotation, defaultTemplate, companySettings]
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
    if (!defaultTemplate) {
      toast.error("No default Quotation template set. Create one in Print Templates.");
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
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
            Quotation {quotation.quotation_no}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Printable content: Default Template from Print Templates or fallback layout */}
          <div ref={printRef} className="print:block">
            {printHtml ? (
              <>
              <div className="max-w-[210mm] mx-auto text-slate-800" dangerouslySetInnerHTML={{ __html: printHtml }} />
              {quotation?.agreement_content?.length > 0 && (
                <div className="max-w-[210mm] mx-auto px-4 mt-6">
                  <AgreementContentDisplay blocks={quotation.agreement_content} />
                </div>
              )}
              </>
            ) : (
              <div className="max-w-[210mm] mx-auto p-6">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                  <p className="font-semibold">No default Quotation template set.</p>
                  <p className="mt-2 text-sm">Go to Print Templates to create and set a default template for Quotations. Print and PDF will use that template.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2 print:hidden">
          <button onClick={onEdit} className="btn-secondary flex items-center gap-2">
            <Edit2 size={18} />
            Edit
          </button>
          <button onClick={onDelete} className="btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-200">
            <Trash2 size={18} />
            Delete
          </button>
          {quotation.status !== "Converted" && (
            <button onClick={onConvertToInvoice} className="btn-primary flex items-center gap-2">
              <FileOutput size={18} />
              Convert to Invoice
            </button>
          )}
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            Download PDF
          </button>
          <button
            onClick={() => {
              if (!defaultTemplate) {
                toast.error("No default Quotation template set. Create one in Print Templates.");
                return;
              }
              openPrintConfig();
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
          <button onClick={onClose} className="btn-secondary ml-auto">Close</button>
        </div>
      </div>

      <PrintConfigModal
        isOpen={showPrintConfig}
        onClose={() => setShowPrintConfig(false)}
        moduleKey="quotations"
        moduleLabel="Quotation"
        getPreviewHtml={buildPreviewForConfig}
        onPrint={onPrintWithConfig}
      />
    </div>
  );
};

export default QuotationView;
