import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Printer, X, Edit2, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClients, getSettings } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';
import { getTemplates } from '../utils/printTemplateStorage';
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

const InvoiceView = ({ isOpen, onClose, invoice, onEdit, onDelete }) => {
    const [clients, setClients] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [companySettings, setCompanySettings] = useState(null);
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [printConfig, setPrintConfig] = useState(null);
    const [scaleFactor, setScaleFactor] = useState(1);
    const componentRef = useRef();
    const pendingPrintRef = useRef(false);
    const templates = useMemo(() => getTemplates().filter(t => t.module === 'invoices'), []);
    const [activeTemplate, setActiveTemplate] = useState(
        () => templates.find(t => t.isDefault) || templates[0] || null
    );
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

    // Auto-scaling logic to fit ENTIRE layout on one A4 page without cutting off
    useEffect(() => {
        if (!isOpen || !componentRef.current || !printHtml) return;
        
        const calculateScale = () => {
            const container = componentRef.current;
            const contentWrap = container.querySelector('.print-scale-content');
            if (!contentWrap) return;

            // Reset for calculation
            contentWrap.style.transform = 'none';
            contentWrap.style.width = '210mm';
            
            const contentHeight = contentWrap.scrollHeight;
            const a4Height = 1115; // Safe A4 height @ 96dpi

            if (contentHeight > a4Height) {
                setScaleFactor(parseFloat((a4Height / contentHeight).toFixed(4)));
            } else {
                setScaleFactor(1);
            }
        };

        const timer = setTimeout(calculateScale, 400);
        return () => clearTimeout(timer);
    }, [isOpen, printHtml, printConfig, activeTemplate]);

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
                .invoice-a4 {
                    width: 210mm !important;
                    height: 297mm !important;
                    min-height: 297mm !important;
                    max-height: 297mm !important;
                    overflow: hidden !important;
                    border: none !important;
                    box-shadow: none !important;
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
                .jaz-doc, .jaz-inner, .print-doc, .print-doc-dynamic, .invoice, .quotation, .agreement-print-root, .print-container, .letterhead-doc, .letterhead-inner {
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


    const client = clients.find(c => c.id == (invoice?.client_id || invoice?.clientId));
    const bank = bankAccounts.find(b => b.id == (invoice?.bank_account_id || invoice?.bankAccountId));

    const getPrintConfigKeys = useCallback(
        () => printConfig || getStoredPrintConfig('invoices') || getDefaultPrintConfigKeys(),
        [printConfig]
    );

    const printHtml = useMemo(() => {
        if (!activeTemplate || !companySettings || !invoice) return null;
        const keys = getPrintConfigKeys();
        const html = activeTemplate.template_html
            ? getEffectiveTemplateHtml(activeTemplate, 'invoices')
            : buildFullTemplateHtml(filterTemplateByPrintConfig(activeTemplate, keys), 'invoices');
        const data = buildInvoicePrintData(invoice, companySettings, client, bank, { baseUrl: getApiOrigin() });
        return resolveTemplateHtmlWithData(html, 'invoices', data);
    }, [activeTemplate, companySettings, invoice, client, bank, getPrintConfigKeys]);

    const buildPreviewForConfig = useCallback(
        (selectedKeys) => {
            if (!activeTemplate || !companySettings || !invoice) return '';
            const filtered = filterTemplateByPrintConfig(activeTemplate, selectedKeys);
            const html = activeTemplate.template_html
                ? getEffectiveTemplateHtml(activeTemplate, 'invoices')
                : buildFullTemplateHtml(filtered, 'invoices');
            const data = buildInvoicePrintData(invoice, companySettings, client, bank, { baseUrl: getApiOrigin() });
            return resolveTemplateHtmlWithData(html, 'invoices', data);
        },
        [activeTemplate, companySettings, invoice, client, bank]
    );

    useEffect(() => {
        if (printConfig && pendingPrintRef.current && componentRef.current) {
            pendingPrintRef.current = false;
            const t = setTimeout(() => handlePrint(), 150);
            return () => clearTimeout(t);
        }
    }, [printConfig, handlePrint]);

    const openPrintConfig = () => setShowPrintConfig(true);
    const onPrintWithConfig = (selectedKeys) => {
        setPrintConfig(selectedKeys);
        setShowPrintConfig(false);
        pendingPrintRef.current = true;
    };

    if (!isOpen || !invoice) return null;

    const pageStyles = `
        @page {
            size: A4;
            margin: 0 !important;
        }
        
        /* Force background graphics everywhere */
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        .invoice-a4 {
            width: 210mm;
            height: 297mm;
            background-color: white;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            overflow: hidden; 
        }

        /* Print Override */
        @media print {
            html, body {
                height: 297mm !important;
                width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }
            
            .invoice-a4 {
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                overflow: hidden !important;
                position: relative; 
                left: 0;
                top: 0;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                border: none !important;
                box-sizing: border-box !important;
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col lg:flex-row-reverse overflow-hidden animate-fade-in-up print:shadow-none print:w-full print:max-w-none print:max-h-none print:h-auto print:rounded-none print:overflow-visible">

                {/* Templates Visual Selector (Sidebar Desktop / Top Rail Mobile) */}
                <div className="w-full lg:w-[360px] bg-gradient-to-b from-slate-50 to-slate-100 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden print:hidden relative z-10">
                    <div className="p-4 lg:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm relative z-20">
                        <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Select Design</h3>
                        <p className="text-sm text-slate-500 mt-1 hidden lg:block">Click any layout to instantly apply it to this invoice.</p>
                    </div>

                    <div className="flex-1 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-4 lg:p-5 grid grid-flow-col auto-cols-[140px] lg:grid-flow-row lg:grid-cols-2 gap-4 lg:content-start [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 pb-10">
                        {templates.map(t => {
                            const isActive = activeTemplate?.id === t.id;
                            const previewHtml = (() => {
                                const keys = getPrintConfigKeys();
                                const html = t.template_html ? getEffectiveTemplateHtml(t, "invoices") : buildFullTemplateHtml(filterTemplateByPrintConfig(t, keys), "invoices");
                                let data = buildInvoicePrintData(invoice, companySettings, client, bank, { baseUrl: getApiOrigin() });
                                // Downscale items for miniature preview
                                if (data.invoice && data.invoice.items && data.invoice.items.length > 5) {
                                    data.invoice.items = data.invoice.items.slice(0, 5);
                                }
                                return resolveTemplateHtmlWithData(html, "invoices", data);
                            })();

                            return (
                                <div
                                    key={t.id}
                                    onClick={() => setActiveTemplate(t)}
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
                    {/* Header Actions */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white print:hidden shrink-0">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Invoice {invoice.invoice_number || invoice.id}</h3>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Printable Content Scroll Area */}
                    <div className="flex-1 overflow-auto bg-slate-200/50 print:bg-white print:overflow-visible print:h-auto shadow-inner">

                        {/* The A4 Paper */}
                        <div className="flex flex-col items-center w-full py-8 lg:py-12">
                            <div ref={componentRef} className="invoice-a4 w-[210mm] h-[297mm] shadow-2xl border border-slate-200 rounded-sm print:shadow-none print:border-none print:max-w-none print:rounded-none bg-white">
                                <div className="print-scale-container w-full h-full" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
                                    <div className="print-scale-content" style={{ 
                                        transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : 'none',
                                        transformOrigin: 'top center',
                                        width: '210mm'
                                    }}>
                                        {printHtml ? (
                                            <div style={{ transform: 'translateZ(0)', position: 'relative' }}>
                                                <div className="w-[210mm] print:m-0 mx-auto p-0" dangerouslySetInnerHTML={{ __html: printHtml }} />
                                            </div>
                                        ) : (
                                            <div className="w-full mx-auto p-6">
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                                                    <p className="font-semibold">No default Invoice template set.</p>
                                                    <p className="mt-2 text-sm">Go to Print Templates to create and set a default template for Invoices. Print and PDF will use that template.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer (Action Buttons) */}
                    <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between shrink-0 print:hidden rounded-b-xl lg:rounded-br-xl lg:rounded-bl-none">
                        <div className="flex flex-wrap gap-2">
                            {onEdit && (
                                <button onClick={onEdit} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                    <Edit2 size={16} /> Edit
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={onDelete} className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                    <Trash2 size={16} /> Delete
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    if (!activeTemplate) {
                                        toast.error('No Invoice template set. Create one in Print Templates.');
                                        return;
                                    }
                                    openPrintConfig();
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                            >
                                <Download size={16} /> Download PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!activeTemplate) {
                                        toast.error('No Invoice template set. Create one in Print Templates.');
                                        return;
                                    }
                                    openPrintConfig();
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#f59e0b] text-white hover:bg-[#d97706] rounded-lg text-sm font-semibold transition-all shadow-sm shadow-amber-500/20"
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
                moduleKey="invoices"
                moduleLabel="Invoice"
                getPreviewHtml={buildPreviewForConfig}
                onPrint={onPrintWithConfig}
                templates={templates}
                selectedTemplate={activeTemplate}
                onSelectTemplate={setActiveTemplate}
            />
        </div>
    );
};

export default InvoiceView;

