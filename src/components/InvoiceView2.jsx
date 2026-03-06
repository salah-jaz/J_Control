import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Printer, X } from 'lucide-react';
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
            const [clientsResult, banksData, settingsData] = await Promise.all([
                getClients({ per_page: 100 }),
                getBankAccounts(),
                getSettings()
            ]);
            const clientsData = clientsResult?.data ?? clientsResult;
            setClients(Array.isArray(clientsData) ? clientsData : []);
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
        pageStyle: `
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
                .print-container {
                    padding: 0;
                    margin: 0;
                    width: 210mm;
                    height: 297mm;
                    overflow: hidden; /* Force single page */
                }
            }
        `
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
    let paidAmount = 0;
    const itemsPaidTotal = items
        .filter(item => item.payment_status === 'Paid')
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const itemsPendingTotal = items
        .filter(item => item.payment_status !== 'Paid')
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    if (invoice.status === 'Paid') {
        paidAmount = grandTotal;
    } else {
        if (subtotal > 0) {
            const ratio = itemsPaidTotal / subtotal;
            paidAmount = itemsPaidTotal + (gstAmount * ratio) - (discount * ratio);
        } else {
            paidAmount = 0;
        }
    }

    paidAmount = Math.max(0, paidAmount);
    paidAmount = Math.min(paidAmount, grandTotal);

    const balanceAmount = grandTotal - paidAmount;

    // QR Code URL Construction
    const API_BASE_URL = 'http://localhost:8000';
    const rawQrCode = invoice.qr_code || companySettings?.qr_code;

    const qrCodeUrl = rawQrCode
        ? (rawQrCode.startsWith('http') ? rawQrCode : `${API_BASE_URL}/storage/${rawQrCode}`)
        : null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none">

                {/* Header Actions (Hidden in Print) */}
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

                {/* Printable Content: Default Template from Print Templates or fallback layout */}
                <div className="flex-1 overflow-y-auto p-0 md:p-8 bg-gray-100 print:bg-white print:p-0 print:overflow-visible">
                    <div ref={componentRef} className="print-container bg-white shadow-sm max-w-3xl mx-auto print:shadow-none print:w-[210mm] print:min-h-[297mm] flex flex-col relative font-sans text-slate-800">
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
