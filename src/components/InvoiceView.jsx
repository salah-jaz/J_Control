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
            const t = setTimeout(() => handlePrint(), 150);
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
    const gst = parseFloat(invoice.gst) || 0;
    const discount = parseFloat(invoice.discount) || 0;
    const gstAmount = subtotal * (gst / 100);
    const grandTotal = Math.max(0, subtotal + gstAmount - discount);

    const hasFinance = invoice.initial_deposit_enabled || (invoice.extra_installments && invoice.extra_installments.length > 0);
    const initialDeposit = hasFinance ? (parseFloat(invoice.initial_deposit_amount) || 0) : 0;
    const installmentsSum = (invoice.extra_installments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    let paidAmount = 0;
    let balanceAmount = grandTotal;

    if (hasFinance) {
        paidAmount = Math.min(initialDeposit + installmentsSum, grandTotal);
        balanceAmount = Math.max(0, grandTotal - paidAmount);
    } else {
        if (invoice.status === 'Paid') {
            paidAmount = grandTotal;
            balanceAmount = 0;
        } else {
            const itemsPaidTotal = items
                .filter(item => item.payment_status === 'Paid')
                .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            if (subtotal > 0) {
                const ratio = itemsPaidTotal / subtotal;
                paidAmount = Math.min(grandTotal, Math.max(0, itemsPaidTotal + (gstAmount * ratio) - (discount * ratio)));
            }
            balanceAmount = Math.max(0, grandTotal - paidAmount);
        }
    }

    // QR Code URL Construction
    // QR Code URL Construction
    const API_BASE_URL = 'http://localhost:8000';

    // Determine QR Path: Invoice override exists? Use it. Else use Bank default.
    const qrPath = invoice.qr_code || (bank ? bank.qrCode : null);

    const qrCodeUrl = qrPath
        ? (qrPath.startsWith('http') ? qrPath : `${API_BASE_URL}/storage/${qrPath}`)
        : null;

    // Styles for unified A4 look (Screen & Print)
    const pageStyles = `
        @page {
            size: A4;
            margin: 0;
        }
        
        /* Force background graphics everywhere */
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .invoice-a4 {
            width: 210mm;
            min-height: 296.5mm; /* Fixed A4 Height -> Min Height */
            background-color: white;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: visible; 
        }

        /* Print Override */
        @media print {
            html, body {
                height: auto !important;
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            
            .invoice-a4 {
                margin: 0;
                box-shadow: none !important;
                /* Match screen rules explicitly */
                width: 210mm;
                min-height: 296.5mm;
                overflow: visible;
                /* Remove absolute positioning to keep flow identical to screen */
                position: relative; 
                left: 0;
                top: 0;
            }

            .no-print {
                display: none !important;
            }
            .print-hidden-wrapper {
                display: none;
            }
        }
        
        /* Screen specific tweaks */
        @media screen {
            .invoice-a4 {
                box-shadow: 0 10px 30px -10px rgba(0,0,0,0.15);
                margin-top: 2rem;
                margin-bottom: 2rem;
            }
        }
    `;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:block print:bg-white print:overflow-hidden">
            <style>{pageStyles}</style>

            {/* Modal Container */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none print:overflow-visible">

                {/* Header Actions */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white print:hidden shrink-0">
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

                {/* Printable Content Scroll Area */}
                <div className="flex-1 overflow-auto bg-gray-100 print:bg-white print:overflow-visible print:h-auto">

                    {/* The A4 Paper */}
                    <div ref={componentRef} className="invoice-a4">
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

