import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Printer, X, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import TemplateSwitcher from './TemplateSwitcher';
import { getClients, getSettings } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';
import { getDefaultTemplate } from '../utils/printTemplateStorage';
import {
    buildFullTemplateHtml,
    getEffectiveTemplateHtml,
    resolveTemplateHtmlWithData,
    buildInvoicePrintData,
    filterTemplateByPrintConfig,
    getDefaultPrintConfigKeys,
    getStoredPrintConfig,
} from '../config/printTemplateModules';
import { getApiOrigin } from '../api/axios';
import PrintConfigModal from './PrintConfigModal';
import AgreementContentDisplay from './AgreementContentDisplay';

const InvoiceView = ({ isOpen, onClose, invoice, activeTemplate, onTemplateChange }) => {
    const [clients, setClients] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [companySettings, setCompanySettings] = useState(null);
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [printConfig, setPrintConfig] = useState(null);
    const componentRef = useRef();
    const pendingPrintRef = useRef(false);
    const defaultTemplate = useMemo(() => getDefaultTemplate('invoices'), []);

    useEffect(() => {
        const loadData = async () => {
            const [clientsData, banksData, settingsData] = await Promise.all([
                getClients(),
                getBankAccounts(),
                getSettings()
            ]);
            setClients(clientsData);
            setBankAccounts(banksData);
            setCompanySettings(settingsData?.company || {});
        };
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const handlePrintTrigger = useReactToPrint({
        contentRef: componentRef,
        documentTitle: invoice?.id ? `Invoice_${invoice.id}` : 'Invoice',
    });

    const handlePrint = () => {
        if (handlePrintTrigger) {
            handlePrintTrigger();
        }
    };

    if (!isOpen || !invoice) return null;

    const client = clients.find(c => c.id == (invoice.client_id || invoice.clientId));
    const bank = bankAccounts.find(b => b.id == (invoice.bank_account_id || invoice.bankAccountId));

    const getPrintConfigKeys = useCallback(
        () => printConfig || getStoredPrintConfig('invoices') || getDefaultPrintConfigKeys(),
        [printConfig]
    );

    const printHtml = useMemo(() => {
        if (!defaultTemplate || !companySettings) return null;
        const keys = getPrintConfigKeys();
        const html = defaultTemplate.template_html
            ? getEffectiveTemplateHtml(defaultTemplate, 'invoices')
            : buildFullTemplateHtml(filterTemplateByPrintConfig(defaultTemplate, keys), 'invoices');
        const data = buildInvoicePrintData(invoice, companySettings, client, bank, { baseUrl: getApiOrigin() });
        return resolveTemplateHtmlWithData(html, 'invoices', data);
    }, [defaultTemplate, companySettings, invoice, client, bank, getPrintConfigKeys]);

    const buildPreviewForConfig = useCallback(
        (selectedKeys) => {
            if (!defaultTemplate || !companySettings) return '';
            const filtered = filterTemplateByPrintConfig(defaultTemplate, selectedKeys);
            const html = defaultTemplate.template_html
                ? getEffectiveTemplateHtml(defaultTemplate, 'invoices')
                : buildFullTemplateHtml(filtered, 'invoices');
            const data = buildInvoicePrintData(invoice, companySettings, client, bank, { baseUrl: getApiOrigin() });
            return resolveTemplateHtmlWithData(html, 'invoices', data);
        },
        [defaultTemplate, companySettings, invoice, client, bank]
    );

    useEffect(() => {
        if (printConfig && pendingPrintRef.current && componentRef.current) {
            pendingPrintRef.current = false;
            const t = setTimeout(() => handlePrintTrigger(), 150);
            return () => clearTimeout(t);
        }
    }, [printConfig]);

    const openPrintConfig = () => setShowPrintConfig(true);
    const onPrintWithConfig = (selectedKeys) => {
        setPrintConfig(selectedKeys);
        setShowPrintConfig(false);
        pendingPrintRef.current = true;
    };

    const items = invoice.items || [];
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || parseFloat(invoice.amount) || 0;
    const gst = invoice.gst || 0;
    const discount = invoice.discount || 0;
    const gstAmount = subtotal * (gst / 100);
    const grandTotal = Math.max(0, subtotal + gstAmount - discount);

    // Logic for Paid/Pending Calculation
    // If Invoice Status is 'Paid', then Paid = GrandTotal, Pending = 0.
    // If Invoice Status is 'Pending' or 'Overdue', we calculate based on individual item status.
    // However, if the Invoice Status is forced to 'Pending' but some items are 'Paid', we should reflect that.

    let paidAmount = 0;

    // Calculate total of items marked as 'Paid'
    const itemsPaidTotal = items
        .filter(item => item.payment_status === 'Paid')
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Calculate total of items marked as 'Pending'
    const itemsPendingTotal = items
        .filter(item => item.payment_status !== 'Paid')
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // If the main invoice status is explicitly 'Paid', we treat everything as paid.
    if (invoice.status === 'Paid') {
        paidAmount = grandTotal;
    } else {
        // Otherwise, we base it on the item statuses.
        // We need to apply the GST and Discount proportionally to the Paid Amount.

        if (subtotal > 0) {
            const ratio = itemsPaidTotal / subtotal;
            paidAmount = itemsPaidTotal + (gstAmount * ratio) - (discount * ratio);
        } else {
            paidAmount = 0;
        }
    }

    // Floating point safety
    paidAmount = Math.max(0, paidAmount);
    paidAmount = Math.min(paidAmount, grandTotal);

    const balanceAmount = grandTotal - paidAmount;

    // QR Code URL Construction
    const API_BASE_URL = 'http://localhost:8000';
    const qrCodeUrl = invoice.qr_code
        ? (invoice.qr_code.startsWith('http') ? invoice.qr_code : `${API_BASE_URL}/storage/${invoice.qr_code}`)
        : null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">

                {/* Header Actions */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white print:hidden">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Invoice Preview</h3>
                    <div className="flex gap-2">
                        <TemplateSwitcher activeTemplate={activeTemplate} onTemplateChange={onTemplateChange} />
                        <button
                            type="button"
                            onClick={() => {
                                if (!defaultTemplate) {
                                    toast.error('No default Invoice template set. Create one in Print Templates.');
                                    return;
                                }
                                openPrintConfig();
                            }}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 py-2 text-sm"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Content: Default Template or fallback layout */}
                <div className="flex-1 overflow-y-auto p-0 md:p-8 bg-gray-100 print:bg-white print:p-0">
                    <div ref={componentRef} className="bg-white shadow-sm max-w-4xl mx-auto print:shadow-none print:w-full print:max-w-none min-h-[1050px] flex flex-col">
                        {printHtml ? (
                            <>
                            <div className="max-w-[210mm] mx-auto text-slate-800 p-4 print:p-0" dangerouslySetInnerHTML={{ __html: printHtml }} />
                            {invoice?.agreement_content?.length > 0 && (
                              <div className="max-w-[210mm] mx-auto px-4 mt-6 print:mt-4">
                                <AgreementContentDisplay blocks={invoice.agreement_content} className="print:block" />
                              </div>
                            )}
                            </>
                        ) : (
                            <div className="max-w-[210mm] mx-auto p-6">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                                    <p className="font-semibold">No default Invoice template set.</p>
                                    <p className="mt-2 text-sm">Go to Print Templates to create and set a default template for Invoices. Print and PDF will use that template.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <PrintConfigModal
                isOpen={showPrintConfig}
                onClose={() => setShowPrintConfig(false)}
                moduleKey="invoices"
                moduleLabel="Invoice"
                getPreviewHtml={buildPreviewForConfig}
                onPrint={onPrintWithConfig}
            />
        </div>
    );
};

export default InvoiceView;

