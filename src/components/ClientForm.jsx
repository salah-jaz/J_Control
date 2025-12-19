import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, MapPin, FileText, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

const ClientForm = ({ isOpen, onClose, client, onSave, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [formData, setFormData] = useState({
        // Basic
        company_name: '',
        company_logo: '',
        default_currency: 'INR',
        financial_year: '',

        // Contact
        primary_contact_name: '',
        contact_person_name: '',
        mobile_number: '',
        email_address: '',
        website_url: '',

        // Address
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        country: '',
        pincode: '',

        // Tax
        gst_registration_type: 'Regular',
        gst_state_code: '',
        gst_number: '',
        pan_number: '',
        cin_number: '',
        msme_number: '',
        tan_number: '',

        // Bank
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
        cheque_print_name: ''
    });

    useEffect(() => {
        if (client) {
            setFormData(client);
        } else {
            setFormData({
                company_name: '', company_logo: '', default_currency: 'INR', financial_year: '',
                primary_contact_name: '', contact_person_name: '', mobile_number: '', email_address: '', website_url: '',
                address_line_1: '', address_line_2: '', city: '', state: '', country: '', pincode: '',
                gst_registration_type: 'Regular', gst_state_code: '', gst_number: '', pan_number: '', cin_number: '', msme_number: '', tan_number: '',
                bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '', cheque_print_name: ''
            });
        }
    }, [client, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.company_name) {
            toast.error("Company Name is required");
            return;
        }
        onSave({ ...formData, id: client ? client.id : null });
    };

    const handleChange = (e) => {
        if (readOnly) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'contact', label: 'Contact', icon: User },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'tax', label: 'Tax & Compliance', icon: FileText },
        { id: 'bank', label: 'Bank Details', icon: Landmark },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">
                        {readOnly ? 'View Client Company' : (client ? 'Edit Client Company' : 'Add New Client Company')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                        <nav className="p-4 space-y-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <tab.icon className="h-5 w-5" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white p-8">
                        <form id="client-form" onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                            {/* Wrap fields in a fieldset to easily disable all */}
                            <fieldset disabled={readOnly} className="contents">

                                {activeTab === 'basic' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Basic Company Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Acme Corp" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo URL</label>
                                                <input type="text" name="company_logo" value={formData.company_logo} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                                                <select name="default_currency" value={formData.default_currency} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                    <option value="INR">INR (₹)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                                                <input type="text" name="financial_year" value={formData.financial_year} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 2024-2025" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contact' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Contact Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Name</label>
                                                <input type="text" name="primary_contact_name" value={formData.primary_contact_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
                                                <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                                <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                                <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                                                <input type="url" name="website_url" value={formData.website_url} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'address' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Address Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                                <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                                <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                                <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'tax' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Tax & Compliance</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">GST Registration Type</label>
                                                <select name="gst_registration_type" value={formData.gst_registration_type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                    <option value="Regular">Regular</option>
                                                    <option value="Composition">Composition</option>
                                                    <option value="Unregistered">Unregistered</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">GST State Code</label>
                                                <input type="text" name="gst_state_code" value={formData.gst_state_code} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                                <input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                                <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">CIN Number</label>
                                                <input type="text" name="cin_number" value={formData.cin_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="For Pvt Ltd" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">MSME Number</label>
                                                <input type="text" name="msme_number" value={formData.msme_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">TAN Number</label>
                                                <input type="text" name="tan_number" value={formData.tan_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bank' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Bank Details</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                                                <input type="text" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                                <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                                                <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                                                <input type="text" name="upi_id" value={formData.upi_id} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Print Name</label>
                                                <input type="text" name="cheque_print_name" value={formData.cheque_print_name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        {readOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button form="client-form" type="submit" className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
                            <Save className="h-4 w-4" />
                            Save Client
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientForm;
