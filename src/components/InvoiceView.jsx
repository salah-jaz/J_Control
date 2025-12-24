import { useState, useEffect, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { getClients, getSettings } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import clsx from 'clsx';
import { useReactToPrint } from 'react-to-print';

const InvoiceView = ({ isOpen, onClose, invoice }) => {
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
                <div className="flex-1 overflow-y-auto p-0 md:p-8 bg-gray-100 print:bg-white print:p-0">
                    <div ref={componentRef} className="bg-white shadow-sm max-w-4xl mx-auto print:shadow-none print:w-full print:max-w-none min-h-[1050px] flex flex-col">

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
                                        <p><span className="font-bold ">Invoice Id:  {invoice.id}</span></p>
                                        <p><span className="font-bold ">{new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Client & Sender Info */}
                        <div className="flex flex-col md:flex-row justify-between px-6 md:px-10 py-6 md:py-8 bg-white gap-6 md:gap-0">
                            <div className="w-full md:w-1/2">
                                <h3 className="text-[#ea580c] font-bold text-xs uppercase mb-2 md:mb-3 tracking-wider">Invoice To:</h3>
                                <div className="text-[#1b2537]">
                                    <p className="text-xl md:text-2xl font-black mb-1">{client ? client.company_name : 'Client Name'}</p>
                                    <p className="text-xs text-slate-500 font-medium mb-2">{client?.role || 'Managing Director, Company ltd.'}</p>
                                    <div className="text-sm space-y-0.5 font-medium opacity-90">
                                        <p><span className="font-bold">Phone:</span> {client?.mobile_number}</p>
                                        <p><span className="font-bold">Email:</span> {client?.email_address}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 text-left md:text-right">
                                <h3 className="text-[#ea580c] font-bold text-xs uppercase mb-2 md:mb-3 tracking-wider">Invoice From:</h3>
                                <div className="text-[#1b2537]">
                                    <p className="text-xl md:text-2xl font-black mb-1">{companySettings?.name || 'John Smith'}</p>
                                    <p className="text-xs text-slate-500 font-medium mb-2">Service Provider</p>
                                    <div className="text-sm space-y-0.5 font-medium opacity-90">
                                        <p><span className="font-bold">Phone:</span> {companySettings?.phone}</p>
                                        <p><span className="font-bold">Email:</span> {companySettings?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Items Table */}
                        <div className="px-4 md:px-10 flex-1 overflow-x-auto">
                            <table className="w-full border-collapse min-w-[600px] md:min-w-0">
                                <thead>
                                    <tr className="text-white text-[11px] uppercase tracking-tighter">
                                        <th className="relative py-3 px-6 text-left bg-[#ea580c] font-bold"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)' }}>
                                            Description
                                        </th>
                                        <th className="relative py-3 px-4 text-center bg-[#ea580c] font-bold"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)' }}>
                                            Price
                                        </th>
                                        <th className="relative py-3 px-4 text-center bg-[#ea580c] font-bold"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 0%, 100% 100%, 0 100%)' }}>
                                            Payment Status
                                        </th>
                                        <th className="relative py-3 px-6 text-right bg-[#ea580c] font-bold"
                                            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 100% 100%, 0 100%)' }}>
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(items.length > 0 ? items : [{ service_name: 'Service', amount: invoice.amount, quantity: 1 }]).map((item, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs md:text-sm">
                                            <td className="py-4 px-6 font-semibold text-slate-700">{item.service_name || item.serviceName}</td>
                                            <td className="py-4 px-4 text-center font-medium text-slate-600">
                                                ₹ {parseFloat(item.rate || (item.amount / (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                                    (item.payment_status || 'Pending') === 'Paid'
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {item.payment_status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold text-slate-800">
                                                ₹ {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Payment & Totals Section */}
                        <div className="px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row justify-between items-start mt-auto gap-8 md:gap-0">
                            {/* Left Side: Bank & Contact Info */}
                            <div className={clsx("w-full md:w-7/12 grid gap-6 md:gap-8", qrCodeUrl ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                                <div className="bg-slate-50/50 p-4 md:p-0 rounded-xl md:bg-transparent">
                                    <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4">Bank Details:</h4>
                                    <div className="text-[11px] space-y-1.5 font-medium text-slate-600">
                                        <div className="flex"><span className="w-20 md:w-16 font-bold">Account No:</span> <span>{bank?.accountNumber || '1234 5678 910'}</span></div>
                                        <div className="flex"><span className="w-20 md:w-16 font-bold">Acc Name:</span> <span>{bank?.accountName || 'Jhon Doe.'}</span></div>
                                        <div className="flex"><span className="w-20 md:w-16 font-bold">IFSC:</span> <span>{bank?.ifsc || 'XYZ'}</span></div>
                                        {invoice.gpay_number && <div className="flex"><span className="w-20 md:w-16 font-bold">GPay:</span> <span>{invoice.gpay_number}</span></div>}
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 p-4 md:p-0 rounded-xl md:bg-transparent">
                                    <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4">Contact Info:</h4>
                                    <div className="text-[11px] space-y-1.5 font-medium text-slate-600">
                                        <div className="flex"><span className="w-14 md:w-12 font-bold">Phone:</span> <span>{companySettings?.phone || '+123 4567 8910'}</span></div>
                                        <div className="flex"><span className="w-14 md:w-12 font-bold">Email:</span> <span>{companySettings?.email || 'example@mail.com'}</span></div>
                                        {/* <div className="flex"><span className="w-14 md:w-12 font-bold">Web:</span> <span>{companySettings?.website || 'www.sitename.com'}</span></div> */}
                                    </div>
                                </div>
                                {qrCodeUrl && (
                                    <div className="bg-slate-50/50 p-4 md:p-0 rounded-xl md:bg-transparent flex flex-col items-center sm:items-start">
                                        <h4 className="text-xs font-bold text-slate-800 mb-3 border-b-2 border-[#ea580c] pb-1 w-fit pr-4 self-start">Scan to Pay:</h4>
                                        <div className="w-24 h-24 border border-slate-100 p-1 bg-white shadow-sm rounded-lg flex items-center justify-center">
                                            <img src={qrCodeUrl} alt="Payment QR" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Totals */}
                            <div className="w-full md:w-4/12 border-t md:border-t-0 pt-6 md:pt-0">
                                <div className="space-y-2 border-b-2 border-slate-100 pb-4">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>SUBTOTAL:</span>
                                        <span>₹ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>TAX ({gst}%):</span>
                                        <span>₹ {gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>DISCOUNT:</span>
                                        <span>₹ {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="relative mt-2 h-12 flex items-center px-6">
                                    <div className="absolute inset-0 bg-[#ea580c]" style={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0 100%)' }}></div>
                                    <div className="relative w-full flex justify-between text-white font-black text-lg">
                                        <span>TOTAL:</span>
                                        <span>₹ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1 px-2">
                                    <div className="flex justify-between text-[10px] font-bold text-green-600">
                                        <span>PAID AMOUNT:</span>
                                        <span>₹ {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-red-500">
                                        <span>BALANCE DUE:</span>
                                        <span>₹ {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
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
                                <div className="border-b border-slate-300 w-full mb-2 h-12 md:h-16 flex items-end justify-center">
                                    {/* Placeholder for signature */}
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

