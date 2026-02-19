import { useState, useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import TemplateSwitcher from './TemplateSwitcher';
import { getClients, getSettings } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';

const InvoiceView = ({ isOpen, onClose, invoice, activeTemplate, onTemplateChange }) => {
    const [clients, setClients] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [companySettings, setCompanySettings] = useState(null);
    const componentRef = useRef();

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
                            onClick={handlePrint}
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

                        {/* 1. Header with Angles */}
                        <div className="relative h-36 md:h-44 overflow-hidden shrink-0">
                            {/* Navy Background */}
                            <div className="absolute inset-0 bg-[#1b2537]"
                                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 45% 80%, 35% 65%, 0 65%)' }}>
                            </div>
                            {/* Orange Accent */}
                            <div className="absolute inset-0 bg-[#ea580c]"
                                style={{ clipPath: 'polygon(35% 65%, 45% 80%, 100% 80%, 100% 65%)' }}>
                            </div>

                            <div className="absolute inset-0 flex justify-between items-start px-6 md:px-10 mt-2">
                                {/* Company Logo & Tagline */}
                                <div className="flex items-center gap-2 md:gap-4 pt-4">
                                    {companySettings?.logo ? (
                                        <img src={companySettings.logo} alt="Logo" className="h-10 md:h-14 w-auto object-contain" />
                                    ) : (
                                        <div className="h-10 w-10 md:h-12 md:w-12 bg-[#ea580c] rounded-lg flex items-center justify-center text-white font-bold text-xl md:text-2xl">
                                            {companySettings?.name?.charAt(0) || 'C'}
                                        </div>
                                    )}
                                    <div className="text-white ">
                                        <h2 className="text-lg md:text-2xl font-bold leading-tight text-white">{companySettings?.name || 'COMPANY'}</h2>
                                        <p className="text-[8px] md:text-[10px] tracking-[0.2em] text-gray-300 uppercase">{companySettings?.tagline || 'COMPANY TAGLINE HERE'}</p>
                                    </div>
                                </div>

                                {/* Invoice Title Section */}
                                <div className="text-right pt-4">
                                    <h1 className="text-2xl md:text-4xl font-black text-[#ea580c] tracking-widest italic leading-none">INVOICE</h1>
                                    <div className="text-white text-[9px] md:text-[11px] mt-1 md:mt-2 space-y-0.5">
                                        <p><span className="font-bold ">Invoice Id:  {invoice.invoice_number || invoice.id}</span></p>
                                        <p><span className="font-bold ">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Client & Sender Info */}
                        <div className="flex flex-row justify-between px-10 py-8 bg-white gap-0">
                            <div className="w-1/2">
                                <h3 className="text-[#ea580c] font-bold text-xs uppercase mb-3 tracking-wider">Invoice To:</h3>
                                <div className="text-[#1b2537]">
                                    <p className="text-2xl font-black mb-1">{client ? (client.company_name || client.client_name) : 'Client Name'}</p>
                                    <p className="text-xs text-slate-500 font-medium mb-2">{client?.role || 'Managing Director, Company ltd.'}</p>
                                    <div className="text-sm space-y-0.5 font-medium opacity-90">
                                        <p><span className="font-bold">Phone:</span> {client?.mobile_number}</p>
                                        <p><span className="font-bold">Email:</span> {client?.email_address}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2 text-right">
                                <h3 className="text-[#ea580c] font-bold text-xs uppercase mb-3 tracking-wider">Invoice From:</h3>
                                <div className="text-[#1b2537]">
                                    <p className="text-2xl font-black mb-1">{companySettings?.name || 'John Smith'}</p>
                                    <p className="text-xs text-slate-500 font-medium mb-2">Service Provider</p>
                                    <div className="text-sm space-y-0.5 font-medium opacity-90">
                                        <p><span className="font-bold">Phone:</span> {companySettings?.phone}</p>
                                        <p><span className="font-bold">Email:</span> {companySettings?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="px-10 flex-1 overflow-visible">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="text-white text-[11px] uppercase tracking-tighter">
                                        <th className="relative py-3 px-6 text-left bg-[#ea580c] font-bold"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            Description
                                        </th>
                                        <th className="relative py-3 px-4 text-center bg-[#ea580c] font-bold w-32"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            Price
                                        </th>
                                        <th className="relative py-3 px-4 text-center bg-[#ea580c] font-bold w-32"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 0%, 100% 100%, 0 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            Payment Status
                                        </th>
                                        <th className="relative py-3 px-6 text-right bg-[#ea580c] font-bold w-32"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(items.length > 0 ? items : [{ service_name: 'Service', amount: invoice.amount, quantity: 1 }]).map((item, index) => (
                                        <tr key={index} className="border-b border-slate-100 text-sm">
                                            <td className="py-4 px-6 font-semibold text-slate-700 print:text-black">
                                                <div className="text-sm font-bold">{item.service_name || item.serviceName}</div>
                                                {item.description && <div className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed opacity-80 max-w-[280px]">{item.description}</div>}
                                            </td>
                                            <td className="py-4 px-4 text-center font-medium text-slate-600 print:text-black">
                                                ₹ {parseFloat(item.rate || (item.amount / (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap print:border print:border-gray-300",
                                                    (item.payment_status || 'Pending') === 'Paid'
                                                        ? "bg-green-100 text-green-700 print:text-green-800"
                                                        : "bg-amber-100 text-amber-700 print:text-amber-800"
                                                )}>
                                                    {item.payment_status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold text-slate-800 print:text-black">
                                                ₹ {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Payment & Totals Section - REARRANGED */}
                        <div className="px-10 py-6 flex flex-col mt-auto gap-8">

                            {/* Row 1: Totals (Right Aligned) */}
                            <div className="w-full flex justify-end">
                                <div className="w-5/12">
                                    <div className="space-y-2 border-b-2 border-slate-100 pb-4">
                                        <div className="flex justify-between text-xs font-bold text-slate-600">
                                            <span>SUBTOTAL:</span>
                                            <span className="print:text-black">₹ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600">
                                            <span>TAX ({gst}%):</span>
                                            <span className="print:text-black">₹ {gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600">
                                            <span>DISCOUNT:</span>
                                            <span className="print:text-black">₹ {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <div className="relative mt-2 h-12 flex items-center px-6">
                                        <div className="absolute inset-0 bg-[#ea580c] print:bg-[#ea580c]" style={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>
                                        <div className="relative w-full flex justify-between text-white font-black text-lg">
                                            <span>TOTAL:</span>
                                            <span>₹ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-1 px-2">
                                        {hasFinance && (
                                            <>
                                                {initialDeposit > 0 && (
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-600 print:text-black">
                                                        <span>INITIAL DEPOSIT:</span>
                                                        <span>₹ {initialDeposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                {(invoice.extra_installments || []).length > 0 && (
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-600 print:text-black">
                                                        <span>INSTALLMENTS:</span>
                                                        <span>₹ {installmentsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div className="flex justify-between text-[10px] font-bold text-green-600 print:text-green-800">
                                            <span>PAID AMOUNT:</span>
                                            <span>₹ {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-red-500 print:text-red-600">
                                            <span>BALANCE DUE:</span>
                                            <span>₹ {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Bank Details, Contact, Scan to Pay */}
                            <div className={clsx("w-full grid gap-4 border-t border-slate-100 pt-6", qrCodeUrl ? "grid-cols-3" : "grid-cols-2")}>
                                {/* Bank Details */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4 print:text-black">Bank Details:</h4>
                                    <div className="text-[11px] space-y-1.5 font-medium text-slate-600 print:text-black">
                                        <div className="flex"><span className="w-20 font-bold">Bank:</span> <span>{invoice.bank_name || bank?.bankName || '—'}</span></div>
                                        <div className="flex"><span className="w-20 font-bold">Account No:</span> <span>{invoice.account_number || bank?.accountNumber || '—'}</span></div>
                                        <div className="flex"><span className="w-20 font-bold">Acc Name:</span> <span>{bank?.accountName || '—'}</span></div>
                                        <div className="flex"><span className="w-20 font-bold">IFSC:</span> <span>{bank?.ifsc || '—'}</span></div>
                                        {invoice.gpay_number && <div className="flex"><span className="w-20 font-bold">GPay:</span> <span>{invoice.gpay_number}</span></div>}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4 print:text-black">Contact Info:</h4>
                                    <div className="text-[11px] space-y-1.5 font-medium text-slate-600 print:text-black">
                                        <div className="flex"><span className="w-16 font-bold">Phone:</span> <span>{companySettings?.phone || '+123 4567 8910'}</span></div>
                                        <div className="flex"><span className="w-16 font-bold">Email:</span> <span>{companySettings?.email || 'example@mail.com'}</span></div>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {qrCodeUrl && (
                                    <div className="flex flex-col items-start">
                                        <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4 print:text-black">Scan to Pay:</h4>
                                        <div className="w-24 h-24 border border-slate-100 p-1 bg-white shadow-sm rounded-lg flex items-center justify-center print:border-gray-200">
                                            <img src={qrCodeUrl} alt="Payment QR" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Signature & T&C */}
                        <div className="px-6 md:px-10 pb-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-10 mt-4">
                            <div className="w-full md:w-1/2 text-center md:text-left">
                                <h4 className="text-xs font-black text-slate-800 mb-2">Thank You For Your Business</h4>
                                <div className="text-[9px] text-slate-500 leading-relaxed max-w-sm mx-auto md:mx-0">
                                    <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
                                    <p>{companySettings?.terms || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'}</p>
                                </div>
                            </div>

                            <div className="w-full md:w-1/3 text-center">
                                <div className="border-b border-slate-300 w-full mb-2 min-h-[3rem] md:min-h-[4rem] flex items-end justify-center pb-1">
                                    {companySettings?.signature ? (
                                        <img src={companySettings.signature} alt="Signature" className="max-h-12 md:max-h-14 w-auto object-contain object-bottom" />
                                    ) : null}
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-800">Authorised Sign</p>
                            </div>
                        </div>

                        {/* 6. Footer Decoration */}
                        <div className="relative h-12 overflow-hidden bg-white shrink-0">
                            {/* Navy Background */}
                            {/* <div className="absolute inset-0 bg-[#1b2537]"
                                style={{ clipPath: 'polygon(0 0, 55% 0, 65% 100%, 100% 100%, 100% 0, 0 0)' }}>
                            </div> */}
                            {/* Wait, the footer in the image is simpler: Dark bar at bottom with orange clip */}
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-[#1b2537]"
                                style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 55% 0, 45% 100%, 0 100%)' }}>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-[#ea580c]"
                                style={{ clipPath: 'polygon(0 100%, 45% 100%, 55% 0, 0% 0)' }}>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;

