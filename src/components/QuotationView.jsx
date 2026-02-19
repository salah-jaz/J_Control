import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { X, Edit2, Trash2, FileOutput, Download, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import clsx from "clsx";
import { getDefaultTemplate } from "../utils/printTemplateStorage";
import {
  buildFullTemplateHtml,
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
    const filtered = filterTemplateByPrintConfig(defaultTemplate, keys);
    const html = buildFullTemplateHtml(filtered, "quotations");
    const data = buildQuotationPrintData(quotation, companySettings);
    return resolveTemplateHtmlWithData(html, "quotations", data);
  }, [quotation, defaultTemplate, companySettings, getPrintConfigKeys]);

  const buildPreviewForConfig = useCallback(
    (selectedKeys) => {
      if (!quotation || !defaultTemplate) return "";
      const filtered = filterTemplateByPrintConfig(defaultTemplate, selectedKeys);
      const html = buildFullTemplateHtml(filtered, "quotations");
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
    if (defaultTemplate) openPrintConfig();
    else handlePrint();
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
              <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation No</p>
                <p className="font-semibold text-slate-900">{quotation.quotation_no}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client</p>
                <p className="font-semibold text-slate-900">{clientName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</p>
                <p className="font-medium text-slate-800">{dateStr}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</p>
                <span
                  className={clsx(
                    "inline-block px-2.5 py-1 rounded-lg text-xs font-semibold",
                    quotation.status === "Draft" && "bg-gray-100 text-gray-700",
                    quotation.status === "Sent" && "bg-blue-50 text-blue-700",
                    quotation.status === "Accepted" && "bg-emerald-50 text-emerald-700",
                    quotation.status === "Rejected" && "bg-rose-50 text-rose-700",
                    quotation.status === "Converted" && "bg-violet-50 text-violet-700"
                  )}
                >
                  {quotation.status}
                </span>
              </div>
              {quotation.reference_number && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</p>
                  <p className="font-medium text-slate-800">{quotation.reference_number}</p>
                </div>
              )}
              {quotation.sales_person && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Person</p>
                  <p className="font-medium text-slate-800">{quotation.sales_person}</p>
                </div>
              )}
              {expiryStr !== "—" && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</p>
                  <p className="font-medium text-slate-800">{expiryStr}</p>
                </div>
              )}
            </div>

            {client && (client.address_line_1 || client.email_address || client.mobile_number) && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Client Details</h4>
                <div className="text-sm text-slate-700 space-y-1">
                  {client.address_line_1 && <p>{[client.address_line_1, client.address_line_2, client.city, client.state, client.country].filter(Boolean).join(", ")}</p>}
                  {client.email_address && <p>Email: {client.email_address}</p>}
                  {client.mobile_number && <p>Phone: {client.mobile_number}</p>}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Tax %</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-slate-400">No items</td>
                      </tr>
                    ) : (
                      items.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-medium text-slate-900">{row.item}</td>
                          <td className="px-4 py-2 text-slate-600">{row.description || "—"}</td>
                          <td className="px-4 py-2 text-right">{parseFloat(row.qty) || 0}</td>
                          <td className="px-4 py-2 text-right">₹{parseFloat(row.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-right">{parseFloat(row.tax) || 0}%</td>
                          <td className="px-4 py-2 text-right font-medium">₹{parseFloat(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-medium">-₹{discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax</span>
                  <span className="font-medium">₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {initialDeposit > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Initial Deposit</span>
                    <span className="font-medium">₹{initialDeposit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-700">Balance Due</span>
                    <span>₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>

            {quotation.notes && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}

            {quotation?.agreement_content?.length > 0 && (
              <div className="mt-6">
                <AgreementContentDisplay blocks={quotation.agreement_content} />
              </div>
            )}
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
            onClick={() => (defaultTemplate ? openPrintConfig() : handlePrint())}
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
