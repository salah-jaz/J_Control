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

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto p-0 md:p-8 bg-gray-100 print:bg-white print:p-0 print:overflow-visible">
                    <div ref={componentRef} className="print-container bg-white shadow-sm max-w-3xl mx-auto print:shadow-none print:w-[210mm] print:h-[297mm] min-h-[297mm] flex flex-col relative font-sans text-slate-800">

                        {/* 1. Curved Header - Reduced Height for Print */}
                        <div className="relative h-48 md:h-56 overflow-hidden shrink-0 w-full bg-white print:h-[50mm]">
                            {/* Dark Wave Background */}
                            <div className="absolute top-0 left-0 right-0 h-full bg-[#1f2937] z-0">
                                <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                                    <path fill="#ffffff" fillOpacity="1" d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,218.7C1120,235,1280,245,1360,250.7L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
                                    <path fill="#f3f4f6" fillOpacity="0.4" d="M0,160L80,170.7C160,181,320,203,480,197.3C640,192,800,160,960,165.3C1120,171,1280,213,1360,234.7L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
                                </svg>
                            </div>

                            {/* Header Content */}
                            <div className="absolute inset-0 z-10 p-8 px-10 flex justify-between items-start text-white print:p-6 print:px-8">
                                {/* Left Logo */}
                                <div className="flex items-center gap-3 pt-2">
                                    {companySettings?.logo ? (
                                        <img src={companySettings.logo} alt="Logo" className="h-12 md:h-14 w-auto object-contain" />
                                    ) : (
                                        <div className="flex relative">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#eab308] rounded-tr-[20px] rounded-bl-[20px]"></div>
                                            <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-white rounded-tr-[20px] rounded-bl-[20px] -ml-3 md:-ml-4 translate-y-2 md:translate-y-3"></div>
                                        </div>
                                    )}
                                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-widest uppercase ml-3 mt-1 leading-none">{companySettings?.name || 'JAZ'}</h1>
                                </div>

                                {/* Right Contact Info */}
                                <div className="text-right text-[10px] md:text-[11px] font-medium text-gray-300 pt-3">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left items-start">
                                        <span className="text-[#eab308] font-bold text-right">Phone:</span>
                                        <span className="text-white whitespace-nowrap">{companySettings?.phone || '+999 123 456 789'}</span>

                                        <span className="text-[#eab308] font-bold text-right">Web:</span>
                                        <span className="text-white whitespace-nowrap">{companySettings?.website || 'info@yourname.com'}</span>

                                        <span className="text-[#eab308] font-bold text-right mt-0.5">Area:</span>
                                        <span className="text-white leading-tight max-w-[140px]">{companySettings?.address || '123 Street Town, Postal, County'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Middle Info Section - Flexbox for opposite alignment */}
                        <div className="px-10 py-8 flex justify-between items-start w-full print:py-6 print:px-8">
                            {/* To Section (Left) */}
                            <div className="w-1/2 pr-6">
                                <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 print:bg-transparent print:border-0 print:p-0">
                                    <h3 className="text-slate-500 text-[10px] font-bold uppercase mb-2 tracking-widest border-b border-gray-200 pb-1 w-20">Invoice To</h3>
                                    <div className="text-slate-800 mt-2">
                                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide mb-1.5 leading-none">{client ? (client.company_name || client.client_name) : 'JOHN SMITH'}</h2>
                                        <p className="text-xs text-slate-500 mb-1 leading-relaxed max-w-[220px] font-medium">{client?.address || '123 Street, Town/City, County'}</p>
                                        <p className="text-xs text-slate-800 font-bold mt-2.5">Phone: <span className="font-semibold text-slate-500">{client?.mobile_number || '+55 12345678'}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Details (Right) */}
                            <div className="w-1/2 flex flex-col items-end pt-2">
                                <h1 className="text-5xl md:text-6xl font-thin text-slate-800 uppercase tracking-[0.2em] mb-6 leading-none text-right opacity-90">INVOICE</h1>
                                <div className="text-xs font-semibold space-y-2 text-right w-full flex flex-col items-end">
                                    <div className="flex justify-end gap-6 text-slate-600 w-auto">
                                        <span className="font-bold text-slate-900 w-28 text-right uppercase tracking-wider text-[10px]">Invoice No</span>
                                        <span className="font-bold text-slate-700 w-28 text-left">: {invoice.id}</span>
                                    </div>

                                    <div className="flex justify-end gap-6 text-slate-600 w-auto">
                                        <span className="font-bold text-slate-900 w-28 text-right uppercase tracking-wider text-[10px]">Due Date</span>
                                        <span className="font-bold text-slate-700 w-28 text-left">: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : new Date(new Date(invoice.date).setDate(new Date(invoice.date).getDate() + 15)).toLocaleDateString()}</span>
                                    </div>

                                    <div className="flex justify-end gap-6 text-slate-600 w-auto">
                                        <span className="font-bold text-slate-900 w-28 text-right uppercase tracking-wider text-[10px]">Invoice Date</span>
                                        <span className="font-bold text-slate-700 w-28 text-left">: {new Date(invoice.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Table - Enhanced */}
                        <div className="mt-4 mb-6 w-full print:mt-4 print:mb-4">
                            <div className="flex items-center text-xs font-black uppercase tracking-wider h-12 shadow-sm print:h-10 print:shadow-none">
                                {/* Description Header - Gold */}
                                <div className="bg-[#facc15] w-[45%] flex items-center px-8 text-slate-900 h-full print:px-8  print:rounded-none">
                                    Item Description
                                </div>
                                {/* Dark Headers */}
                                <div className="bg-[#1f2937] flex-1 flex items-center justify-between text-white px-4 h-full print:px-4 print:rounded-none">
                                    <div className="w-1/4 text-center">Price</div>
                                    <div className="w-1/4 text-center">Qty</div>
                                    <div className="w-1/4 text-center">Status</div>
                                    <div className="w-1/4 text-right pr-4">Total</div>
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="flex flex-col w-full mt-1">
                                {(items.length > 0 ? items : [{ service_name: 'Example Service', amount: invoice.amount, quantity: 1, rate: invoice.amount, payment_status: 'Pending' }]).map((item, index) => (
                                    <div key={index} className={clsx(
                                        "flex items-stretch text-xs min-h-[48px] border-b border-gray-100",
                                        index % 2 === 0 ? "bg-gray-50/80" : "bg-white"
                                    )}>
                                        {/* Description */}
                                        <div className="w-[45%] flex flex-col justify-center px-8 py-3 border-r border-transparent print:px-8">
                                            <p className="font-bold text-slate-800 line-clamp-2 md:text-sm">{item.service_name || item.serviceName}</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1 opacity-80">
                                                {item.description}
                                            </p>
                                        </div>
                                        {/* Numbers */}
                                        <div className="flex-1 flex items-center justify-between px-4 text-slate-700 font-semibold print:px-4">
                                            <div className="w-1/4 text-center shrink-0">
                                                ₹ {parseFloat(item.rate || (item.amount / (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="w-1/4 text-center text-slate-900 shrink-0">
                                                {item.quantity || 1}
                                            </div>
                                            <div className="w-1/4 text-center shrink-0">
                                                <span className={clsx(
                                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm border border-transparent",
                                                    (item.payment_status || 'Pending') === 'Paid'
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : "bg-amber-100 text-amber-800 border-amber-200"
                                                )}>
                                                    {item.payment_status || 'Pending'}
                                                </span>
                                            </div>
                                            <div className="w-1/4 text-right font-bold text-slate-800 shrink-0 pr-4">
                                                ₹ {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Bottom Section - Print safe layout */}
                        <div className="mt-auto px-10 pb-12 pt-6 print:px-8 print:pb-8 relative">

                            <div className="flex justify-between gap-10 items-start">
                                {/* Left: Payment Info */}
                                <div className="pt-2 w-1/2 flex items-start gap-8">
                                    {(qrCodeUrl || true) && (
                                        <div className="shrink-0 pt-2"> {/* QR Code Left */}
                                            {qrCodeUrl ? (
                                                <img src={qrCodeUrl} alt="QR" className="w-24 h-24 object-contain border p-1 rounded-lg bg-white shadow-md" />
                                            ) : (
                                                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center text-[8px] text-gray-400 text-center p-2">
                                                    QR Code
                                                </div>
                                            )}
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide text-center mt-2">Scan to Pay</p>
                                        </div>
                                    )}

                                    <div className="flex-1 pt-1"> {/* Text Details Right */}
                                        <h4 className="font-black text-slate-800 uppercase mb-3 text-xs tracking-widest border-b-2 border-[#facc15] pb-1 w-full max-w-[120px]">Payment Info</h4>
                                        <div className="text-[11px] text-slate-600 space-y-2 font-semibold">
                                            <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">Bank</span>
                                                <span>{bank?.bankName || 'Bank Name'}</span>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">Account</span>
                                                <span className="tracking-wide">{bank?.accountNumber || '0000 0000 0000 00'}</span>
                                            </div>
                                            <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                                                <span className="font-bold text-slate-400 uppercase text-[9px]">IFSC</span>
                                                <span className="tracking-wide">{bank?.ifsc || 'ABCD000'}</span>
                                            </div>
                                            {invoice.gpay_number && (
                                                <div className="grid grid-cols-[60px_1fr] gap-2 items-center">
                                                    <span className="font-bold text-slate-400 uppercase text-[9px]">GPay</span>
                                                    <span>{invoice.gpay_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Totals */}
                                <div className="w-[45%] max-w-[300px]">
                                    <div className="px-4 pb-4 space-y-2.5 text-xs font-bold text-slate-600 border-l-2 border-gray-100 pl-6">
                                        {discount > 0 && (
                                            <div className="flex justify-between text-slate-500">
                                                <span>Discount</span>
                                                <span>- ₹ {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="uppercase tracking-wider text-[10px]">Sub Total</span>
                                            <span className="text-slate-800">₹ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="uppercase tracking-wider text-[10px]">Tax Vat {gst}%</span>
                                            <span className="text-slate-800">₹ {gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    {/* Grand Total Bar */}
                                    <div className="bg-[#facc15] text-slate-900 py-3 px-2 flex justify-between items-center font-bold shadow-md uppercase tracking-wider rounded-lg print:py-2 print:shadow-none mt-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-full bg-white/10 skew-x-12 -mr-4"></div>
                                        <span className="text-sm md:text-xl pl-6 tracking-widest font-black">Total</span>
                                        <span className="text-xl md:text-2xl relative z-10 pr-4">  {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Signature - Stick to bottom */}
                            <div className="mt-16 flex justify-between items-end print:mt-10 border-t border-gray-100 pt-8">
                                <div className="max-w-[50%]">
                                    <h3 className="font-black text-slate-800 text-lg mb-2 tracking-tight">Thank you for your business!</h3>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        <span className="font-bold text-slate-600 mr-2 uppercase tracking-wider">Terms:</span>
                                        {companySettings?.terms || 'Payment within 30 days. Late fee 2%.'}
                                    </p>
                                </div>
                                <div className="text-center min-w-[180px]">
                                    <div className="font-signature text-3xl text-slate-800 mb-2 transform -rotate-2">
                                        {companySettings?.name || 'Administrator'}
                                    </div>
                                    <div className="h-0.5 bg-slate-300 w-full mb-2 rounded-full"></div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-[0.2em]">Authorized Signatory</p>
                                </div>
                            </div>

                            {/* Enhanced Footer - Curved Waves */}
                            <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden z-0 pointer-events-none print:h-[20mm]">
                                <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                                    <path fill="#facc15" fillOpacity="1" d="M0,160L40,176C80,192,160,224,240,224C320,224,400,192,480,192C560,192,640,224,720,240C800,256,880,256,960,240C1040,224,1120,192,1200,176C1280,160,1360,160,1400,160L1440,160L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
                                    <path fill="#1f2937" fillOpacity="1" d="M0,224L48,240C96,256,192,288,288,293.3C384,299,480,277,576,261.3C672,245,768,235,864,240C960,245,1056,267,1152,272C1248,277,1344,267,1392,261.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                </svg>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
