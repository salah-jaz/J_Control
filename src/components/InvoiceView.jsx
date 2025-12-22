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

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: invoice ? `Invoice_${invoice.id}` : 'Invoice',
    });

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
                        <button onClick={handlePrint} className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 py-2 text-sm">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-100 print:bg-white print:p-0" >
                    <div ref={componentRef} className="bg-white shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:w-full print:max-w-none">

                        {/* Row 1: Company & Client Details */}
                        <div className="flex justify-between items-start mb-12">
                            {/* Left Side: Company Details */}
                            <div className="w-1/2">
                                {companySettings?.logo && (
                                    <img
                                        src={companySettings.logo}
                                        alt="Company Logo"
                                        className="h-16 w-auto object-contain mb-4"
                                    />
                                )}
                                <h1 className="text-2xl font-bold text-brand-600 mb-2">{companySettings?.name || 'Company Name'}</h1>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>{companySettings?.address}</p>
                                    <p>{companySettings?.email}</p>
                                    <p>{companySettings?.phone}</p>
                                    {companySettings?.gst && <p>GST: {companySettings?.gst}</p>}
                                </div>
                            </div>

                            {/* Right Side: Client Details */}
                            <div className="w-1/2 text-right">
                                <h2 className="text-xl font-semibold text-gray-800 mb-2">Invoice To:</h2>
                                {client ? (
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p className="font-bold text-gray-900">{client.company_name}</p>
                                        <p>{client.address_line_1}</p>
                                        {client.city && <p>{client.city}, {client.state}</p>}
                                        <p>{client.email_address}</p>
                                        <p>{client.mobile_number}</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-400">Client details not available</p>
                                )}
                                <div className="mt-4">
                                    <p className="text-sm bg-gray-50 inline-block px-3 py-1 rounded border border-gray-100">
                                        <span className="font-semibold text-gray-600">Invoice ID:</span> #{invoice.id}
                                    </p>
                                    <p className="text-sm mt-1">
                                        <span className="font-semibold text-gray-600">Date:</span> {new Date(invoice.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Service Details Box */}
                        <div className="mb-12">
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-6 py-3 text-center w-16 border-r border-gray-200">S.No</th>
                                            <th className="px-6 py-3 text-left border-r border-gray-200">Service Description</th>
                                            <th className="px-6 py-3 text-center w-32 border-r border-gray-200">Payment Status</th>
                                            <th className="px-6 py-3 text-right w-32">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {items.length > 0 ? items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 text-center text-gray-500 border-r border-gray-200">{item.sNo || index + 1}</td>
                                                <td className="px-6 py-4 text-gray-800 font-medium border-r border-gray-200">{item.service_name || item.serviceName}</td>
                                                <td className="px-6 py-4 text-center text-gray-600 border-r border-gray-200">
                                                    <span className={clsx(
                                                        "px-2 py-1 rounded text-xs font-medium",
                                                        (item.payment_status || 'Pending') === 'Paid'
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-amber-50 text-amber-700"
                                                    )}>
                                                        {item.payment_status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-800">
                                                    ₹ {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td className="px-6 py-4 text-center border-r border-gray-200">1</td>
                                                <td className="px-6 py-4 text-gray-800 border-r border-gray-200">Service</td>
                                                <td className="px-6 py-4 text-center border-r border-gray-200">-</td>
                                                <td className="px-6 py-4 text-right text-gray-800">
                                                    ₹ {parseFloat(invoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Row 3: Payment & Totals */}
                        <div className="flex justify-between items-start mb-12">
                            {/* Left Side: Bank Details & QR */}
                            <div className="w-1/2 pr-8 space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Bank Details</h3>
                                    {bank ? (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Bank Name:</span>
                                                <span className="font-semibold text-gray-800">{bank.bankName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Account No:</span>
                                                <span className="font-semibold text-gray-800">{bank.accountNumber}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">IFSC Code:</span>
                                                <span className="font-semibold text-gray-800">{bank.ifsc}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Account Name:</span>
                                                <span className="font-semibold text-gray-800">{bank.accountName}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No bank details added.</p>
                                    )}
                                    {invoice.gpay_number && (
                                        <div className="mt-4 text-sm">
                                            <span className="font-bold text-gray-700">GPay:</span> {invoice.gpay_number}
                                        </div>
                                    )}
                                </div>

                                {qrCodeUrl && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Scan to Pay</h3>
                                        <div className="w-32 h-32 border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center">
                                            <img src={qrCodeUrl} alt="Payment QR" className="w-full h-full object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Totals */}
                            <div className="w-1/3">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Sub Total</span>
                                        <span>₹ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {gst > 0 && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>GST ({gst}%)</span>
                                            <span>+ ₹ {gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {discount > 0 && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Discount</span>
                                            <span>- ₹ {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-gray-800 pt-3 border-t border-gray-200">
                                        <span>Grand Total</span>
                                        <span>₹ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Paid & Balance (Visual Indicators) */}
                                    <div className="mt-6 space-y-2 pt-4 border-t border-dashed border-gray-200">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 font-medium">Paid Amount</span>
                                            <span className="text-green-600 font-bold">₹ {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-red-600 font-medium">Balance Due</span>
                                            <span className="text-red-600 font-bold">₹ {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Company Contacts */}
                        <div className="border-t-2 border-brand-500 pt-6 mt-12 text-center">
                            <p className="text-brand-600 font-bold text-lg italic">Thank you for your business!</p>
                            <div className="flex justify-center gap-6 mt-2 text-sm text-gray-500">
                                {companySettings?.phone && (
                                    <span className="flex items-center gap-1">
                                        📞 {companySettings.phone}
                                    </span>
                                )}
                                {companySettings?.email && (
                                    <span className="flex items-center gap-1">
                                        ✉️ {companySettings.email}
                                    </span>
                                )}
                                {companySettings?.website && (
                                    <span className="flex items-center gap-1">
                                        🌐 {companySettings.website}
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
