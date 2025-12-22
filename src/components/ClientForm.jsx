import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, MapPin, FileText, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';

const ClientForm = ({ isOpen, onClose, client, onSave, readOnly = false }) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        // Basic
        company_name: '',
        company_logo: '',
        company_type: 'Proprietorship',
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
            setFormData({ ...client, company_type: client.company_type || 'Proprietorship' });
        } else {
            setFormData({
                company_name: '', company_logo: '', company_type: 'Proprietorship', default_currency: 'INR', financial_year: '',
                primary_contact_name: '', contact_person_name: '', mobile_number: '', email_address: '', website_url: '',
                address_line_1: '', address_line_2: '', city: '', state: '', country: '', pincode: '',
                gst_registration_type: 'Regular', gst_state_code: '', gst_number: '', pan_number: '', cin_number: '', msme_number: '', tan_number: '',
                bank_name: '', account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '', cheque_print_name: ''
            });
            setErrors({});
            setActiveTab('basic');
        }
    }, [client, isOpen]);

    const validate = (data) => {
        const newErrors = {};

        // 1. Mandatory Fields
        if (!data.company_name?.trim()) newErrors.company_name = "Company Name is required";
        if (!data.contact_person_name?.trim()) newErrors.contact_person_name = "Contact Person Name is required";
        if (!data.mobile_number?.trim()) newErrors.mobile_number = "Mobile Number is required";

        if (!data.email_address?.trim()) {
            newErrors.email_address = "Email Address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
            newErrors.email_address = "Invalid email address";
        }

        if (!data.city?.trim()) newErrors.city = "City is required";
        if (!data.state?.trim()) newErrors.state = "State is required";
        if (!data.country?.trim()) newErrors.country = "Country is required";
        if (!data.pincode?.trim()) newErrors.pincode = "Pincode is required";
        if (!data.gst_registration_type) newErrors.gst_registration_type = "GST Registration Type is required";

        // 2. Conditional Validation
        // GST Validation
        if (['Regular', 'Composition'].includes(data.gst_registration_type)) {
            if (!data.gst_number?.trim()) {
                newErrors.gst_number = "GST Number is required for Regular/Composition";
            }
        }

        // CIN Validation (Private Limited)
        if (data.company_type === 'Private Limited') {
            if (!data.cin_number?.trim()) {
                newErrors.cin_number = "CIN Number is required for Private Limited";
            }
        }

        // PAN Validation (Required if GST is missing)
        if (!data.gst_number?.trim()) {
            if (!data.pan_number?.trim()) {
                newErrors.pan_number = "PAN Number is required (if GST not provided)";
            }
        }

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

        onSave({ ...formData, id: client ? client.id : null });
    };

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value } = e.target;

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

        // Also re-validate dependencies
        if (['gst_registration_type', 'company_type', 'gst_number'].includes(name)) {
            setErrors(currentErrors); // Sync all relevant errors logic
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Building2 },
        { id: 'contact', label: 'Contact', icon: User },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'tax', label: 'Tax & Compliance', icon: FileText },
        { id: 'bank', label: 'Bank Details', icon: Landmark },
    ];

    // Helper to get input classes based on error state
    const getInputClassName = (fieldName) => `
        input
        ${errors[fieldName]
            ? '!border-red-500 bg-red-50 focus:!ring-red-200 focus:!border-red-500'
            : ''}
        ${readOnly ? 'bg-gray-100 text-slate-500 cursor-not-allowed' : ''}
    `;

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
                                    (tab.id === 'basic' && (errors.company_name || errors.company_type)) ||
                                    (tab.id === 'contact' && (errors.contact_person_name || errors.mobile_number || errors.email_address)) ||
                                    (tab.id === 'address' && (errors.city || errors.state || errors.country || errors.pincode)) ||
                                    (tab.id === 'tax' && (errors.gst_registration_type || errors.gst_number || errors.cin_number || errors.pan_number))
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
                                                <Label required>Company Name</Label>
                                                <input
                                                    type="text"
                                                    name="company_name"
                                                    value={formData.company_name}
                                                    onChange={handleChange}
                                                    className={getInputClassName('company_name')}
                                                    placeholder="e.g. Acme Corp"
                                                />
                                                <ErrorMsg field="company_name" />
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
                                            <p className="text-sm text-slate-500">Primary point of contact for this client.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div>
                                                <Label required>Contact Person Name</Label>
                                                <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} className={getInputClassName('contact_person_name')} />
                                                <ErrorMsg field="contact_person_name" />
                                            </div>
                                            <div>
                                                <Label>Primary Contact Name (Optional)</Label>
                                                <input type="text" name="primary_contact_name" value={formData.primary_contact_name} onChange={handleChange} className={getInputClassName('primary_contact_name')} />
                                            </div>
                                            <div>
                                                <Label required>Mobile Number</Label>
                                                <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className={getInputClassName('mobile_number')} />
                                                <ErrorMsg field="mobile_number" />
                                            </div>
                                            <div>
                                                <Label required>Email Address</Label>
                                                <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} className={getInputClassName('email_address')} />
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
                                                <Label required>City</Label>
                                                <input type="text" name="city" value={formData.city} onChange={handleChange} className={getInputClassName('city')} />
                                                <ErrorMsg field="city" />
                                            </div>
                                            <div>
                                                <Label required>State</Label>
                                                <input type="text" name="state" value={formData.state} onChange={handleChange} className={getInputClassName('state')} />
                                                <ErrorMsg field="state" />
                                            </div>
                                            <div>
                                                <Label required>Country</Label>
                                                <input type="text" name="country" value={formData.country} onChange={handleChange} className={getInputClassName('country')} />
                                                <ErrorMsg field="country" />
                                            </div>
                                            <div>
                                                <Label required>Pincode</Label>
                                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className={getInputClassName('pincode')} />
                                                <ErrorMsg field="pincode" />
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
                                                <Label required>GST Registration Type</Label>
                                                <select name="gst_registration_type" value={formData.gst_registration_type} onChange={handleChange} className={getInputClassName('gst_registration_type')}>
                                                    <option value="Regular">Regular</option>
                                                    <option value="Composition">Composition</option>
                                                    <option value="Unregistered">Unregistered</option>
                                                    <option value="Overseas">Overseas</option>
                                                    <option value="Consumer">Consumer</option>
                                                </select>
                                                <ErrorMsg field="gst_registration_type" />
                                            </div>
                                            <div>
                                                <Label>GST State Code</Label>
                                                <input type="text" name="gst_state_code" value={formData.gst_state_code} onChange={handleChange} className={getInputClassName('gst_state_code')} />
                                            </div>
                                            <div>
                                                <Label required={['Regular', 'Composition'].includes(formData.gst_registration_type)}>GST Number</Label>
                                                <input
                                                    type="text"
                                                    name="gst_number"
                                                    value={formData.gst_number}
                                                    onChange={handleChange}
                                                    className={getInputClassName('gst_number')}
                                                    disabled={formData.gst_registration_type === 'Unregistered'}
                                                    placeholder={formData.gst_registration_type === 'Unregistered' ? 'Not Applicable' : ''}
                                                />
                                                <ErrorMsg field="gst_number" />
                                            </div>
                                            <div>
                                                <Label required={!formData.gst_number}>PAN Number</Label>
                                                <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} className={getInputClassName('pan_number')} />
                                                <ErrorMsg field="pan_number" />
                                            </div>
                                            <div>
                                                <Label required={formData.company_type === 'Private Limited'}>CIN Number</Label>
                                                <input
                                                    type="text"
                                                    name="cin_number"
                                                    value={formData.cin_number}
                                                    onChange={handleChange}
                                                    className={getInputClassName('cin_number')}
                                                    placeholder="For Pvt Ltd"
                                                />
                                                <ErrorMsg field="cin_number" />
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
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4 mb-2">
                                            <h4 className="text-lg font-bold text-slate-800">Bank Details</h4>
                                            <p className="text-sm text-slate-500">For invoice generation and payments.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-2">
                                                <Label>Bank Name</Label>
                                                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className={getInputClassName('bank_name')} />
                                            </div>
                                            <div>
                                                <Label>Account Holder Name</Label>
                                                <input type="text" name="account_holder_name" value={formData.account_holder_name} onChange={handleChange} className={getInputClassName('account_holder_name')} />
                                            </div>
                                            <div>
                                                <Label>Account Number</Label>
                                                <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className={getInputClassName('account_number')} />
                                            </div>
                                            <div>
                                                <Label>IFSC Code</Label>
                                                <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className={getInputClassName('ifsc_code')} />
                                            </div>
                                            <div>
                                                <Label>UPI ID</Label>
                                                <input type="text" name="upi_id" value={formData.upi_id} onChange={handleChange} className={getInputClassName('upi_id')} />
                                            </div>
                                            <div>
                                                <Label>Cheque Print Name</Label>
                                                <input type="text" name="cheque_print_name" value={formData.cheque_print_name} onChange={handleChange} className={getInputClassName('cheque_print_name')} />
                                            </div>
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
