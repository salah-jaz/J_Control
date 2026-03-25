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
    const [scaleFactor, setScaleFactor] = useState(1);
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

    const client = clients.find(c => c.id == (invoice?.client_id || invoice?.clientId));
    const bank = bankAccounts.find(b => b.id == (invoice?.bank_account_id || invoice?.bankAccountId));

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

    // Auto-scaling logic to fit content nicely on one A4 page without cutting off
    useEffect(() => {
        if (!isOpen || !componentRef.current || !printHtml) return;
        const calculateScale = () => {
            const container = componentRef.current;
            const contentWrap = container.querySelector('.print-scale-content');
            if (contentWrap) {
                // Reset scale and width for accurate measurement
                contentWrap.style.transform = 'none';
                contentWrap.style.width = '210mm';
                
                const contentHeight = contentWrap.scrollHeight;
                const a4InnerHeight = 1115; // Safe A4 height @ 96DPI
                
                if (contentHeight > a4InnerHeight) {
                    const factor = a4InnerHeight / contentHeight;
                    setScaleFactor(parseFloat(factor.toFixed(4)));
                } else {
                    setScaleFactor(1);
                }
            }
        };

        const resizeTimeout = setTimeout(calculateScale, 400);
        return () => clearTimeout(resizeTimeout);
    }, [isOpen, companySettings, printConfig, activeTemplate, invoice?.agreement_content, printHtml]);

    const handlePrintTrigger = useReactToPrint({
        contentRef: componentRef,
        documentTitle: invoice?.id ? `Invoice_${invoice.id}` : 'Invoice',
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
                .print-container {
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    min-height: 297mm !important;
                    max-height: 297mm !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                    page-break-after: avoid !important;
                    page-break-inside: avoid !important;
                    border: none !important;
                    position: relative !important;
                    display: block !important;
                    background: white !important;
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
            }
        `
    });

    const handlePrint = () => {
        if (handlePrintTrigger) {
            handlePrintTrigger();
        }
    };

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

    if (!isOpen || !invoice) return null;

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
                    <div ref={componentRef} className="print-container bg-white shadow-sm w-[210mm] h-[297mm] mx-auto print:shadow-none print:w-[210mm] print:h-auto print:min-h-[297mm] print:overflow-visible print:m-0 print:p-0 flex flex-col relative font-sans text-slate-800 print:box-border">
                        {printHtml ? (
                            <>
                                        <div className="print-scale-content" style={{ 
                                            transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : 'none',
                                            transformOrigin: 'top center',
                                            width: '210mm'
                                        }}>
                                           <div dangerouslySetInnerHTML={{ __html: printHtml }} />
                                           {invoice?.agreement_content?.length > 0 && (
                                              <div className="max-w-[210mm] mx-auto px-4 mt-6 print:mt-4">
                                                <AgreementContentDisplay blocks={invoice.agreement_content} className="print:block" />
                                              </div>
                                           )}
                                        </div>
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
