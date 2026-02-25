import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, MapPin, FileText, Landmark, Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyBankForm = () => ({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    mobile_number: '',
    cheque_print_name: ''
});

const ClientForm = ({ isOpen, onClose, client, onSave, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [errors, setErrors] = useState({});
    const [bankList, setBankList] = useState([]);
    const [editingBankIndex, setEditingBankIndex] = useState(null);
    const [bankForm, setBankForm] = useState(emptyBankForm());
    const [bankFormError, setBankFormError] = useState('');
    const [formData, setFormData] = useState({
        // Basic
        client_name: '',
        company_name: '',
        company_logo: '',
        company_type: 'Proprietorship',
        default_currency: 'INR',
        financial_year: '',

        // Contact
        primary_contact_name: '',
        contact_person_name: '',
        mobile_number: '',
        secondary_mobile_number: '',
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

        // Legacy single bank (kept for backward compat; primary data is bankList)
        bank_name: '',
        account_holder_name: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
        cheque_print_name: ''
    });

    useEffect(() => {
        if (client) {
            setFormData({ ...client, company_type: client.company_type || 'Proprietorship' });
            // Initialize bank list: prefer bank_details array, else legacy single bank
            if (client.bank_details && Array.isArray(client.bank_details) && client.bank_details.length > 0) {
                setBankList(client.bank_details);
            } else if (client.bank_name && client.bank_name.trim()) {
                setBankList([{
                    bank_name: client.bank_name || '',
                    account_holder_name: client.account_holder_name || '',
                    account_number: client.account_number || '',
                    ifsc_code: client.ifsc_code || '',
                    upi_id: client.upi_id || '',
                    mobile_number: client.mobile_number || '',
                    cheque_print_name: client.cheque_print_name || ''
                }]);
            } else {
                setBankList([]);
            }
            setBankForm(emptyBankForm());
            setEditingBankIndex(null);
            setBankFormError('');
        } else {
            setFormData({
                client_name: '', company_name: '', company_logo: '', company_type: 'Proprietorship', default_currency: 'INR', financial_year: '',
                primary_contact_name: '', contact_person_name: '', mobile_number: '', secondary_mobile_number: '', email_address: '', website_url: '',
                address_line_1: '', address_line_2: '', city: '', state: '', country: '', pincode: '',
                gst_registration_type: 'Regular', gst_state_code: '', gst_number: '', pan_number: '', cin_number: '', msme_number: '', tan_number: '',
                bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '', cheque_print_name: ''
            });
            setBankList([]);
            setBankForm(emptyBankForm());
            setEditingBankIndex(null);
            setBankFormError('');
            setErrors({});
            setActiveTab('basic');
        }
    }, [client, isOpen]);

    const validate = (data) => {
        const newErrors = {};

        // 1. Mandatory Fields — at least one of Client Name or Company Name
        const hasClientName = !!data.client_name?.trim();
        const hasCompanyName = !!data.company_name?.trim();
        if (!hasClientName && !hasCompanyName) {
            newErrors.client_or_company = "Please enter Client Name or Company Name";
        }
        // Contact fields are optional; validate email format only when provided
        if (data.email_address?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
            newErrors.email_address = "Invalid email address";
        }

        // Address and Tax & Compliance sections are fully optional — no validation

        return newErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix the validation errors");

            // Auto switch tab to where the first error is?
            // Optional but good UX.
            return;
        }

        onSave({ ...formData, bank_details: bankList, id: client ? client.id : null });
    };

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value } = e.target;

        // Restrict mobile numbers and account_number to integers only
        if (['mobile_number', 'secondary_mobile_number', 'account_number'].includes(name)) {
            if (value && !/^\d*$/.test(value)) return;
        }

        let updatedData = { ...formData, [name]: value };

        // Conditional Logic: Unregistered -> Clear GST Number
        if (name === 'gst_registration_type' && value === 'Unregistered') {
            updatedData.gst_number = '';
        }

        setFormData(updatedData);

        // Real-time validation for the changed field
        const currentErrors = validate(updatedData);
        if (currentErrors[name]) {
            setErrors(prev => ({ ...prev, [name]: currentErrors[name] }));
        } else {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[name];
                return newErrs;
            });
        }

        // Also re-validate dependencies (including client/company name pair)
        if (['gst_registration_type', 'company_type', 'gst_number', 'client_name', 'company_name'].includes(name)) {
            setErrors(currentErrors);
        }
    };

    const handleBankFormChange = (e) => {
        if (readOnly) return;
        const { name, value } = e.target;
        if (name === 'account_number' && value && !/^\d*$/.test(value)) return;
        setBankForm(prev => ({ ...prev, [name]: value }));
        if (bankFormError) setBankFormError('');
    };

    const handleAddOrUpdateBank = (e) => {
        e.preventDefault();
        const name = (bankForm.bank_name || '').trim();
        if (!name) {
            setBankFormError('Bank Name is required');
            return;
        }
        const entry = {
            bank_name: name,
            account_holder_name: (bankForm.account_holder_name || '').trim(),
            account_number: (bankForm.account_number || '').trim(),
            ifsc_code: (bankForm.ifsc_code || '').trim(),
            upi_id: (bankForm.upi_id || '').trim(),
            mobile_number: (bankForm.mobile_number || '').trim(),
            cheque_print_name: (bankForm.cheque_print_name || '').trim()
        };
        if (editingBankIndex !== null) {
            setBankList(prev => prev.map((b, i) => i === editingBankIndex ? entry : b));
            setEditingBankIndex(null);
            toast.success('Bank updated');
        } else {
            setBankList(prev => [...prev, entry]);
            toast.success('Bank added');
        }
        setBankForm(emptyBankForm());
        setBankFormError('');
    };

    const handleEditBank = (index) => {
        const b = bankList[index];
        setBankForm({
            bank_name: b.bank_name || '',
            account_holder_name: b.account_holder_name || '',
            account_number: b.account_number || '',
            ifsc_code: b.ifsc_code || '',
            upi_id: b.upi_id || '',
            mobile_number: b.mobile_number || '',
            cheque_print_name: b.cheque_print_name || ''
        });
        setEditingBankIndex(index);
        setBankFormError('');
    };

    const handleDeleteBank = (index) => {
        setBankList(prev => prev.filter((_, i) => i !== index));
        if (editingBankIndex === index) {
            setBankForm(emptyBankForm());
            setEditingBankIndex(null);
        } else if (editingBankIndex !== null && editingBankIndex > index) {
            setEditingBankIndex(editingBankIndex - 1);
        }
        toast.success('Bank removed');
    };

    const handleCancelEditBank = () => {
        setBankForm(emptyBankForm());
        setEditingBankIndex(null);
        setBankFormError('');
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'contact', label: 'Contact', icon: User },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'tax', label: 'Tax & Compliance', icon: FileText },
        { id: 'bank', label: 'Bank Details', icon: Landmark },
    ];

    // Helper to get input classes based on error state (optional: alsoErrorKey for shared validation e.g. client_or_company)
    const getInputClassName = (fieldName, alsoErrorKey) => {
        const hasError = errors[fieldName] || (alsoErrorKey && errors[alsoErrorKey]);
        return `
        input
        ${hasError ? '!border-red-500 bg-red-50 focus:!ring-red-200 focus:!border-red-500' : ''}
        ${readOnly ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : ''}
    `;
    };

    // Helper to render error message
    const ErrorMsg = ({ field }) => errors[field] ? (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium animate-fadeIn">
            <span className="w-1 h-1 rounded-full bg-red-500"></span> {errors[field]}
        </p>
    ) : null;

    // Helper for Label with Mandatory Mark
    const Label = ({ children, required }) => (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
            {children} {required && <span className="text-red-500 ml-1">*</span>}
        </label>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-slide-up">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                            {readOnly ? 'Company Details' : (client ? 'Edit Company' : 'New Client Company')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {readOnly ? 'View client and tax information' : 'Fill in the details below to manage client.'}
                        </p>
                    </div>

                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-slate-50 border-r border-gray-100 overflow-y-auto hidden md:block py-6">
                        <nav className="px-4 space-y-1">
                            {tabs.map(tab => {
                                // Check if tab has errors
                                const hasTabErrors = (
                                    (tab.id === 'basic' && (errors.client_or_company || errors.company_name || errors.company_type)) ||
                                    (tab.id === 'contact' && errors.email_address)
                                );

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                            ? 'bg-white text-brand-700 shadow-sm ring-1 ring-gray-200/50'
                                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <tab.icon className={`h-[18px] w-[18px] ${hasTabErrors ? 'text-red-500' : (activeTab === tab.id ? 'text-brand-600' : 'text-slate-400')}`} />
                                            {tab.label}
                                        </div>
                                        {hasTabErrors && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm"></span>}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
                        {/* Mobile Tab Select */}
                        <div className="md:hidden mb-6">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value)}
                                className="input"
                            >
                                {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                            </select>
                        </div>

                        <form id="client-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
                            <fieldset disabled={readOnly} className="contents">

                                {activeTab === 'basic' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 mb-2">
                                            <h4 className="text-lg font-bold text-slate-800">Company Information</h4>
                                            <p className="text-sm text-slate-500">Legal entity details and branding.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-2">
                                                <Label>Client Name</Label>
                                                <input
                                                    type="text"
                                                    name="client_name"
                                                    value={formData.client_name}
                                                    onChange={handleChange}
                                                    className={getInputClassName('client_name', 'client_or_company')}
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Label>Company Name</Label>
                                                <input
                                                    type="text"
                                                    name="company_name"
                                                    value={formData.company_name}
                                                    onChange={handleChange}
                                                    className={getInputClassName('company_name', 'client_or_company')}
                                                    placeholder="e.g. Acme Corp"
                                                />
                                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    For individual clients use Client Name, for business clients use Company Name.
                                                </p>
                                                <ErrorMsg field="client_or_company" />
                                            </div>
                                            <div>
                                                <Label>Company Type</Label>
                                                <select
                                                    name="company_type"
                                                    value={formData.company_type}
                                                    onChange={handleChange}
                                                    className={getInputClassName('company_type')}
                                                >
                                                    <option value="Proprietorship">Proprietorship</option>
                                                    <option value="Partnership">Partnership</option>
                                                    <option value="LLP">LLP</option>
                                                    <option value="Private Limited">Private Limited</option>
                                                    <option value="Public Limited">Public Limited</option>
                                                    <option value="Trust">Trust/Society</option>
                                                    <option value="HUF">HUF</option>
                                                    <option value="Global">Global</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <ErrorMsg field="company_type" />
                                            </div>
                                            <div>
                                                <Label>Default Currency</Label>
                                                <select name="default_currency" value={formData.default_currency} onChange={handleChange} className={getInputClassName('default_currency')}>
                                                    <option value="INR">INR (₹)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Financial Year</Label>
                                                <input type="text" name="financial_year" value={formData.financial_year} onChange={handleChange} className={getInputClassName('financial_year')} placeholder="e.g. 2024-2025" />
                                            </div>
                                            <div className="col-span-2">
                                                <Label>Company Logo URL</Label>
                                                <input type="text" name="company_logo" value={formData.company_logo} onChange={handleChange} className={getInputClassName('company_logo')} placeholder="https://example.com/logo.png" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contact' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 mb-2">
                                            <h4 className="text-lg font-bold text-slate-800">Contact Details</h4>
                                            <p className="text-sm text-slate-500">All fields are optional. Add contact information when available.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div>
                                                <Label>Contact Person Name</Label>
                                                <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} className={getInputClassName('contact_person_name')} placeholder="Optional" />
                                                <ErrorMsg field="contact_person_name" />
                                            </div>
                                            <div>
                                                <Label>Primary Mobile Number</Label>
                                                <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className={getInputClassName('mobile_number')} placeholder="Optional" />
                                                <ErrorMsg field="mobile_number" />
                                            </div>
                                            <div>
                                                <Label>Secondary Mobile Number</Label>
                                                <input type="tel" name="secondary_mobile_number" value={formData.secondary_mobile_number} onChange={handleChange} className={getInputClassName('secondary_mobile_number')} placeholder="Optional" />
                                            </div>
                                            <div>
                                                <Label>Email Address</Label>
                                                <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} className={getInputClassName('email_address')} placeholder="Optional" />
                                                <ErrorMsg field="email_address" />
                                            </div>
                                            <div className="col-span-2">
                                                <Label>Website URL</Label>
                                                <input type="url" name="website_url" value={formData.website_url} onChange={handleChange} className={getInputClassName('website_url')} placeholder="https://" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'address' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 mb-2">
                                            <h4 className="text-lg font-bold text-slate-800">Address Details</h4>
                                            <p className="text-sm text-slate-500">Billing and shipping locations.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-2">
                                                <Label>Address Line 1</Label>
                                                <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className={getInputClassName('address_line_1')} />
                                            </div>
                                            <div className="col-span-2">
                                                <Label>Address Line 2</Label>
                                                <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className={getInputClassName('address_line_2')} />
                                            </div>
                                            <div>
                                                <Label>City</Label>
                                                <input type="text" name="city" value={formData.city} onChange={handleChange} className={getInputClassName('city')} />
                                            </div>
                                            <div>
                                                <Label>State</Label>
                                                <input type="text" name="state" value={formData.state} onChange={handleChange} className={getInputClassName('state')} />
                                            </div>
                                            <div>
                                                <Label>Country</Label>
                                                <input type="text" name="country" value={formData.country} onChange={handleChange} className={getInputClassName('country')} />
                                            </div>
                                            <div>
                                                <Label>Pincode</Label>
                                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className={getInputClassName('pincode')} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'tax' && (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 mb-2">
                                            <h4 className="text-lg font-bold text-slate-800">Tax & Compliance</h4>
                                            <p className="text-sm text-slate-500">GST, PAN, and other regulatory details.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div>
                                                <Label>GST Registration Type</Label>
                                                <select name="gst_registration_type" value={formData.gst_registration_type} onChange={handleChange} className={getInputClassName('gst_registration_type')}>
                                                    <option value="Regular">Regular</option>
                                                    <option value="Composition">Composition</option>
                                                    <option value="Unregistered">Unregistered</option>
                                                    <option value="Overseas">Overseas</option>
                                                    <option value="Consumer">Consumer</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>GST State Code</Label>
                                                <input type="text" name="gst_state_code" value={formData.gst_state_code} onChange={handleChange} className={getInputClassName('gst_state_code')} />
                                            </div>
                                            <div>
                                                <Label>GST Number</Label>
                                                <input
                                                    type="text"
                                                    name="gst_number"
                                                    value={formData.gst_number}
                                                    onChange={handleChange}
                                                    className={getInputClassName('gst_number')}
                                                    disabled={formData.gst_registration_type === 'Unregistered'}
                                                    placeholder={formData.gst_registration_type === 'Unregistered' ? 'Not Applicable' : ''}
                                                />
                                            </div>
                                            <div>
                                                <Label>PAN Number</Label>
                                                <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} className={getInputClassName('pan_number')} />
                                            </div>
                                            <div>
                                                <Label>CIN Number</Label>
                                                <input
                                                    type="text"
                                                    name="cin_number"
                                                    value={formData.cin_number}
                                                    onChange={handleChange}
                                                    className={getInputClassName('cin_number')}
                                                    placeholder="For Pvt Ltd"
                                                />
                                            </div>
                                            <div>
                                                <Label>MSME Number</Label>
                                                <input type="text" name="msme_number" value={formData.msme_number} onChange={handleChange} className={getInputClassName('msme_number')} />
                                            </div>
                                            <div>
                                                <Label>TAN Number</Label>
                                                <input type="text" name="tan_number" value={formData.tan_number} onChange={handleChange} className={getInputClassName('tan_number')} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bank' && (
                                    <div className="space-y-8 animate-fadeIn max-w-3xl">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
                                            <h4 className="text-lg font-bold text-slate-800">Bank Details</h4>
                                            <p className="text-sm text-slate-500">Add one or more bank accounts for invoicing and payments. Changes are saved when you save the client.</p>
                                        </div>

                                        {/* Add Bank Form - Top Section */}
                                        {!readOnly && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm">
                                                <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Add Bank</h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="sm:col-span-2">
                                                        <Label required>Bank Name</Label>
                                                        <input
                                                            type="text"
                                                            value={bankForm.bank_name}
                                                            onChange={handleBankFormChange}
                                                            name="bank_name"
                                                            className={`input w-full ${bankFormError ? '!border-red-500 bg-red-50 focus:!ring-red-200' : ''} ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                            placeholder="e.g. State Bank of India"
                                                        />
                                                        {bankFormError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5 font-medium"><span className="w-1 h-1 rounded-full bg-red-500"></span> {bankFormError}</p>}
                                                    </div>
                                                    <div>
                                                        <Label>Account Holder Name</Label>
                                                        <input type="text" name="account_holder_name" value={bankForm.account_holder_name} onChange={handleBankFormChange} className="input w-full" placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <Label>Account Number</Label>
                                                        <input type="text" name="account_number" value={bankForm.account_number} onChange={handleBankFormChange} className="input w-full" placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <Label>IFSC Code</Label>
                                                        <input type="text" name="ifsc_code" value={bankForm.ifsc_code} onChange={handleBankFormChange} className="input w-full" placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <Label>UPI ID</Label>
                                                        <input type="text" name="upi_id" value={bankForm.upi_id} onChange={handleBankFormChange} className="input w-full" placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <Label>Mobile Number</Label>
                                                        <input type="text" name="mobile_number" value={bankForm.mobile_number} onChange={handleBankFormChange} className="input w-full" placeholder="Mobile Number" />
                                                    </div>
                                                    <div>
                                                        <Label>Cheque Print Name</Label>
                                                        <input type="text" name="cheque_print_name" value={bankForm.cheque_print_name} onChange={handleBankFormChange} className="input w-full" placeholder="Optional" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddOrUpdateBank}
                                                        className="btn-primary flex items-center gap-2 h-10 px-4"
                                                    >
                                                        {editingBankIndex !== null ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                        {editingBankIndex !== null ? 'Update Bank' : '+ Add Bank'}
                                                    </button>
                                                    {editingBankIndex !== null && (
                                                        <button type="button" onClick={handleCancelEditBank} className="btn-secondary h-10 px-4">
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bank List - View: cards with all fields; Edit: table */}
                                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wide px-5 py-4 bg-slate-50 border-b border-slate-200">Bank List</h5>
                                            {bankList.length === 0 ? (
                                                <div className="px-5 py-10 text-center text-slate-500">
                                                    <Landmark className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                                                    <p className="font-medium">No banks added</p>
                                                    {!readOnly && <p className="text-sm mt-1">Use the form above to add bank details.</p>}
                                                </div>
                                            ) : readOnly ? (
                                                <div className="p-5 space-y-4">
                                                    {bankList.map((row, index) => (
                                                        <div key={index} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bank Name</p>
                                                                    <p className="font-medium text-slate-800">{row.bank_name || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Account Holder Name</p>
                                                                    <p className="font-medium text-slate-800">{row.account_holder_name || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Account Number</p>
                                                                    <p className="font-medium text-slate-800">{row.account_number || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">IFSC Code</p>
                                                                    <p className="font-medium text-slate-800">{row.ifsc_code || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Mobile Number</p>
                                                                    <p className="font-medium text-slate-800">{row.mobile_number || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">UPI ID</p>
                                                                    <p className="font-medium text-slate-800">{row.upi_id || '—'}</p>
                                                                </div>
                                                                <div className="sm:col-span-2">
                                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Cheque Print Name</p>
                                                                    <p className="font-medium text-slate-800">{row.cheque_print_name || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="bg-slate-100/80 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                                                                <th className="px-5 py-3">Bank Name</th>
                                                                <th className="px-5 py-3">Account Number</th>
                                                                <th className="px-5 py-3">IFSC Code</th>
                                                                <th className="px-5 py-3 text-right w-28">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {bankList.map((row, index) => (
                                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-5 py-3 font-medium text-slate-800">{row.bank_name || '—'}</td>
                                                                    <td className="px-5 py-3 text-slate-600">{row.account_number || '—'}</td>
                                                                    <td className="px-5 py-3 text-slate-600">{row.ifsc_code || '—'}</td>
                                                                    <td className="px-5 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <button type="button" onClick={() => handleEditBank(index)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Edit">
                                                                                <Pencil className="h-4 w-4" />
                                                                            </button>
                                                                            <button type="button" onClick={() => handleDeleteBank(index)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-white flex-shrink-0">
                    <div className="text-xs text-gray-500 italic mt-2">
                        {!readOnly && <span className="text-red-500">* Required fields</span>}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="btn-secondary">
                            {readOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!readOnly && (
                            <button
                                form="client-form"
                                type="submit"
                                disabled={Object.keys(errors).length > 0}
                                className={`btn-primary flex items-center gap-2
                                    ${Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                            >
                                <Save className="h-4 w-4" />
                                Save Client
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default ClientForm;
