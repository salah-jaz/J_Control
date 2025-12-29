import { useState, useEffect, useRef } from 'react';
import { Printer, X, Phone, Mail, MapPin } from 'lucide-react';
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

                        {/* 100% Accurate Header Design */}
                        <div className="relative bg-white pt-12 pb-6 px-10 overflow-hidden">
                            {/* Large Rounded Black Corner Shape */}
                            <div className="absolute top-0 right-0 bg-[#1d1d1d] w-[40%] h-[155px] rounded-bl-[100px] -z-0"></div>

                            {/* Red Decorative Bar with Curve end */}
                            <div className="absolute top-[160px] left-0 bg-[#e11d24] w-[65%] h-12 mt-10 -z-0"></div>

                            <div className="relative z-10 flex justify-between items-start ">
                                {/* Logo & Company Branding */}
                                <div className="flex items-center gap-4">
                                    {companySettings?.logo ? (
                                        <img src={companySettings.logo} alt="Logo" className="h-12 w-auto object-contain" />
                                    ) : (
                                        <div className="h-12 w-12 bg-[#e11d24] rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                                            {companySettings?.name?.charAt(0) || 'J'}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline">
                                            <h2 className="text-3xl font-black text-[#1d1d1d] uppercase">
                                                {companySettings?.name || 'JAZ'}
                                            </h2>
                                        </div>
                                    </div>
                                </div>vv

                                {/* Large Invoice Header & Specific Details */}
                                <div className="text-right pr-6">
                                    <h1 className="text-3xl font-black tracking-tighter text-white leading-none mb-2 pr-12 uppercase">
                                        INVOICE
                                    </h1>
                                    <div className="space-y-2 text-xs font-bold text-white">
                                        <div className="flex justify-end gap-x-8">
                                            <span className="text-gray-400 font-medium">Invoice No:</span>
                                            <span className="w-24 text-left">#{invoice.id || '5'}</span>
                                        </div>
                                        <div className="flex justify-end gap-x-8">
                                            <span className="text-gray-400 font-medium">Due Date:</span>
                                            <span className="w-24 text-left">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '24 Dec 2025'}</span>
                                        </div>
                                        <div className="flex justify-end gap-x-8">
                                            <span className="text-gray-400 font-medium">Invoice Date:</span>
                                            <span className="w-24 text-left">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info Bar (Overlaying the red shape) */}
                            <div className="relative z-10 mt-12  h-12 flex items-center pl-10">
                                <div className="flex items-center gap-12 text-white text-[11px] font-bold">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-1 rounded-full"><Phone className="w-3.5 h-3.5 fill-white" /></div>
                                        <span>{companySettings?.phone || '9870605010'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-1 rounded-full"><Mail className="w-3.5 h-3.5 fill-white" /></div>
                                        <span>{companySettings?.email || 'jaz@gamil.com'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-1 rounded-full"><MapPin className="w-3.5 h-3.5 fill-white" /></div>
                                        <span>{companySettings?.address || 'NGO B Colony , Tirunelveli'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Info with Accurate Spacing */}
                        <div className="flex justify-between px-10 pt-16 pb-12">
                            <div className="max-w-[400px]">
                                <h3 className="text-[#e11d24] font-bold text-xs uppercase mb-4 italic tracking-widest">INVOICE TO:</h3>
                                <h2 className="text-3xl font-black text-[#1d1d1d] mb-3 leading-none">
                                    {client ? (client.company_name || client.name) : 'JAZ'}
                                </h2>
                                <p className="text-[12px] text-slate-400 font-bold mb-6 uppercase tracking-tight">{client?.role || 'MANAGING DIRECTOR, COMPANY LTD.'}</p>
                                <div className="text-[11px] space-y-2 font-bold text-slate-500">
                                    <p>Phone: {client?.mobile_number || '1234567890'}</p>
                                    <p>Email: {client?.email_address || 'jaz@gmail.com'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="px-10 flex-1">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-[#e11d24] text-white text-[12px] font-black uppercase italic tracking-widest">
                                        <th className="py-3 px-4 text-left w-16">NO.</th>
                                        <th className="py-3 px-4 text-left">PRODUCT DESCRIPTION</th>
                                        <th className="py-3 px-4 text-center">PRICE</th>
                                        <th className="py-3 px-4 text-center">QTY.</th>
                                        <th className="py-3 px-4 text-right">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(items.length > 0 ? items : [{ service_name: 'Service', amount: invoice.amount, quantity: 1, rate: invoice.amount }]).map((item, index) => (
                                        <tr key={index} className="border-b border-slate-100 last:border-0">
                                            <td className="py-6 px-4 text-left text-xs font-bold text-slate-400 italic">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="py-6 px-4 text-left">
                                                <p className="text-[15px] font-black text-[#1a1a1a] italic">{item.service_name || item.serviceName}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                                                    {item.description || 'Lorem ipsum dolor sit amet.'}
                                                </p>
                                            </td>
                                            <td className="py-6 px-4 text-center text-xs font-bold text-slate-700 italic">
                                                ₹{parseFloat(item.rate || (item.amount / (item.quantity || 1))).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-6 px-4 text-center text-xs font-bold text-slate-700 italic">
                                                {item.quantity || 1}
                                            </td>
                                            <td className="py-6 px-4 text-right text-[15px] font-black text-[#1a1a1a] italic">
                                                ₹{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals & Payment Details (Down Side) */}
                        <div className="px-10 py-12 flex justify-between items-start bg-white border-t border-slate-50">
                            <div className="flex flex-col gap-8 max-w-lg">
                                {/* Bank & QR for the bottom left */}
                                <div className="flex items-start gap-8">
                                    {/* QR Code Section */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="bg-white p-2 border-2 border-slate-100 rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                            {qrCodeUrl ? (
                                                <img src={qrCodeUrl} alt="Payment QR" className="w-20 h-20 object-contain" />
                                            ) : (
                                                <div className="w-20 h-20 bg-slate-50 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                                                    <div className="bg-[#1d1d1d] w-10 h-10 rounded opacity-10 mb-1"></div>
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">QR CODE</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[8px] font-black text-[#e11d24] italic uppercase tracking-widest">Scan to Pay</span>
                                    </div>

                                    <div className='ml-4'>
                                        <h3 className="text-[#e11d24] font-bold text-[11px] uppercase mb-3 italic tracking-widest">PAYMENT INFO</h3>
                                        <div className="text-[10px] space-y-1.5 font-bold text-[#1d1d1d]">
                                            <p><span className="text-slate-400 uppercase font-medium inline-block w-24">Bank Name:</span> {bank?.bank_name || bank?.bankName || 'YOUR BANK NAME'}</p>
                                            <p><span className="text-slate-400 uppercase font-medium inline-block w-24">Account No:</span> {bank?.account_number || bank?.accountNumber || '888000222888'}</p>
                                            <p><span className="text-slate-400 uppercase font-medium inline-block w-24">IFSC Code:</span> {bank?.ifsc_code || bank?.ifsc || 'HDFC000123'}</p>
                                            <p><span className="text-slate-400 uppercase font-medium inline-block w-24">Branch:</span> {bank?.branch_name || bank?.branchName || 'TIRUNELVELI'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className='mt-16'>
                                    <h4 className="text-[#e11d24] font-bold text-[11px] uppercase mb-3 italic tracking-wider">Terms & Conditions:</h4>
                                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                        {companySettings?.terms || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}
                                    </p>
                                    <p className="text-[#e11d24] text-sm font-black italic mt-6">Thank you for your business with us.</p>
                                </div>
                            </div>

                            <div className="w-[320px]">
                                <div className="space-y-4 pb-8 text-xs font-bold italic">
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-slate-500 uppercase">Subtotal:</span>
                                        <span className="text-[#1a1a1a] text-sm">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-slate-500 uppercase">Discount:</span>
                                        <span className="text-[#1a1a1a] text-sm">₹{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-slate-500 uppercase">Tax ({gst}%):</span>
                                        <span className="text-[#1a1a1a] text-sm">₹{gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="relative bg-[#e11d24] h-12 flex items-center px-6" style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}>
                                    <div className="w-full flex justify-between items-center text-white font-black text-[15px] italic">
                                        <span>TOTAL AMOUNT :</span>
                                        <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <div className="mt-16 text-center px-10">
                                    <div className="relative inline-block w-full">
                                        {/* Signature Section */}
                                        <div className="h-14 flex items-end justify-center pb-2">
                                            <svg className="w-32 h-14 text-slate-700 opacity-60" viewBox="0 0 120 40">
                                                <path d="M10 30 C 30 10, 50 10, 70 30 S 110 30, 110 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                        <div className="border-t-[1.5px] border-slate-300 pt-2.5">
                                            <p className="text-[11px] font-black uppercase text-[#1a1a1a] italic tracking-tight">Your Name & Signature</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="relative h-10 mt-auto">
                            <div className="absolute inset-0 bg-[#1a1a1a]"
                                style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 48% 0, 42% 100%, 0 100%)' }}>
                            </div>
                            <div className="absolute inset-0 bg-[#e11d24]"
                                style={{ clipPath: 'polygon(0 100%, 42% 100%, 48% 0, 0 0)' }}>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;

