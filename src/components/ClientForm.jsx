import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, MapPin, FileText, Landmark, Plus, Pencil, Trash2, Loader2, Edit2, ChevronDown, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SlideOver from './ui/SlideOver';

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
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [bankList, setBankList] = useState([]);
    const [editingBankIndex, setEditingBankIndex] = useState(null);
    const [bankForm, setBankForm] = useState(emptyBankForm());
    const [bankFormError, setBankFormError] = useState('');
    const [touched, setTouched] = useState({});
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
        const sanitise = (obj) => {
            const newObj = { ...obj };
            Object.keys(newObj).forEach(key => {
                if (newObj[key] === null) newObj[key] = '';
            });
            return newObj;
        };

        if (client) {
            setFormData({ ...sanitise(client), company_type: client.company_type || 'Proprietorship' });
            // Initialize bank list: prefer bank_details array, else legacy single bank
            if (client.bank_details && Array.isArray(client.bank_details) && client.bank_details.length > 0) {
                setBankList(client.bank_details.map(b => sanitise(b)));
            } else if (client.bank_name && client.bank_name.trim()) {
                setBankList([sanitise({
                    bank_name: client.bank_name || '',
                    account_holder_name: client.account_holder_name || '',
                    account_number: client.account_number || '',
                    ifsc_code: client.ifsc_code || '',
                    upi_id: client.upi_id || '',
                    mobile_number: client.mobile_number || '',
                    cheque_print_name: client.cheque_print_name || ''
                })]);
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
            setTouched({});
            setActiveTab('basic');
        }
        // Always reset saving state when modal opens / client changes
        setIsSaving(false);
    }, [client, isOpen]);

    const validate = (data) => {
        const newErrors = {};

        // 1. Mandatory Fields — at least one of Client Name or Company Name
        const hasClientName = !!data.client_name?.trim();
        const hasCompanyName = !!data.company_name?.trim();
        if (!hasClientName && !hasCompanyName) {
            newErrors.client_or_company = "This field is required";
        }
        // Email format validation
        if (data.email_address?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
            newErrors.email_address = "Please enter a valid email address";
        }

        // Phone length validation (standard 10 digits as baseline)
        if (data.mobile_number?.trim() && data.mobile_number.length < 10) {
            newErrors.mobile_number = "Phone number must be at least 10 digits";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSaving) return;

        const validationErrors = validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Mark all potentially erroneous fields as touched to show errors
            const allTouched = {};
            Object.keys(validationErrors).forEach(key => allTouched[key] = true);
            if (validationErrors.client_or_company) {
                allTouched.client_name = true;
                allTouched.company_name = true;
            }
            setTouched(prev => ({ ...prev, ...allTouched }));
            toast.error("Please fix the validation errors");
            return;
        }

        setIsSaving(true);
        try {
            const payload = { ...formData, bank_details: bankList, id: client ? client.id : null };
            await Promise.resolve(onSave(payload));
            // Success: parent closes modal and refreshes list; no need to update state (modal unmounts)
        } catch (err) {
            setIsSaving(false);
            // Error toast is shown by parent
        }
    };

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value } = e.target;

        if (['mobile_number', 'secondary_mobile_number', 'account_number'].includes(name)) {
            if (value && !/^\d*$/.test(value)) return;
        }

        let updatedData = { ...formData, [name]: value };

        if (name === 'gst_registration_type' && value === 'Unregistered') {
            updatedData.gst_number = '';
        }

        setFormData(updatedData);

        // Real-time validation
        const currentErrors = validate(updatedData);
        setErrors(currentErrors);

        // Instant success transition if it was already touched or becomes valid
        if (value.length > (name === 'mobile_number' ? 9 : 2)) {
            setTouched(prev => ({ ...prev, [name]: true }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
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
    ];    // Updated Input Class Helper
    const getInputClassName = (fieldName, value, alsoErrorKey) => {
        const isTouched = touched[fieldName] || (alsoErrorKey && touched[alsoErrorKey]);
        const error = errors[fieldName] || (alsoErrorKey && errors[alsoErrorKey]);
        const hasError = isTouched && error;

        return clsx(
            "w-full px-3 py-2 bg-white border rounded text-[13px] font-medium outline-none transition-all duration-200 pr-10",
            hasError 
                ? "border-rose-300 bg-rose-50/50 focus:border-rose-500" 
                : "border-slate-200 text-slate-700 focus:border-indigo-500 hover:border-slate-300",
            readOnly ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100" : ""
        );
    };

    const ValidationIcon = ({ fieldName, value, alsoErrorKey }) => {
        const isTouched = touched[fieldName] || (alsoErrorKey && touched[alsoErrorKey]);
        const error = errors[fieldName] || (alsoErrorKey && errors[alsoErrorKey]);
        
        if (!isTouched || readOnly) return null;
        if (error) return <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 animate-in fade-in zoom-in duration-200" />;
        if (value?.toString().trim()) return <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in fade-in zoom-in duration-200" />;
        return null;
    };

    const ErrorMsg = ({ field }) => {
        const isTouched = touched[field] || (field === 'client_or_company' && (touched.client_name || touched.company_name));
        return isTouched && errors[field] ? (
            <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-2 font-bold uppercase tracking-wider animate-in slide-in-from-top-1">
                <span className="h-1 w-1 rounded-full bg-rose-500"></span> {errors[field]}
            </p>
        ) : null;
    };

    // Premium Label Component
    const Label = ({ children, required }) => (
        <label className="block text-[12px] font-bold text-slate-700 mb-1">
            {children} {required && <span className="text-rose-500">*</span>}
        </label>
    );

    // Section Header for grouping
    const SectionHeader = ({ title, subtitle }) => (
        <div className="mb-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-400 font-medium mb-2">{subtitle}</p>}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Basic Information" subtitle="Legal identity and core configuration" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="col-span-2 md:col-span-1">
                                <Label required>Client Name</Label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="client_name"
                                        value={formData.client_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={getInputClassName('client_name', formData.client_name, 'client_or_company')}
                                        placeholder="Enter client name"
                                    />
                                    <ValidationIcon fieldName="client_name" value={formData.client_name} alsoErrorKey="client_or_company" />
                                </div>
                                <ErrorMsg field="client_or_company" />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <Label required>Company Name</Label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={getInputClassName('company_name', formData.company_name, 'client_or_company')}
                                        placeholder="Enter company name"
                                    />
                                    <ValidationIcon fieldName="company_name" value={formData.company_name} alsoErrorKey="client_or_company" />
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <Label>Client Type</Label>
                                <div className="relative">
                                    <select
                                        name="company_type"
                                        value={formData.company_type}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={clsx(getInputClassName('company_type', formData.company_type), "appearance-none")}
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
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <Label>Default Currency</Label>
                                <div className="relative">
                                    <select name="default_currency" value={formData.default_currency} onBlur={handleBlur} onChange={handleChange} className={clsx(getInputClassName('default_currency', formData.default_currency), "appearance-none")}>
                                        <option value="INR">INR (₹) - Indian Rupee</option>
                                        <option value="USD">USD ($) - US Dollar</option>
                                        <option value="EUR">EUR (€) - Euro</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Contact Details" subtitle="Communication channels and digital reach" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <Label>Contact Person</Label>
                                <div className="relative">
                                    <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('contact_person_name', formData.contact_person_name)} placeholder="Enter contact person name" />
                                    <ValidationIcon fieldName="contact_person_name" value={formData.contact_person_name} />
                                </div>
                            </div>
                            <div>
                                <Label>Email Address</Label>
                                <div className="relative">
                                    <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('email_address', formData.email_address)} placeholder="Enter email address" />
                                    <ValidationIcon fieldName="email_address" value={formData.email_address} />
                                </div>
                                <ErrorMsg field="email_address" />
                            </div>
                            <div>
                                <Label>Phone Number</Label>
                                <div className="relative">
                                    <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('mobile_number', formData.mobile_number)} placeholder="Enter phone number" />
                                    <ValidationIcon fieldName="mobile_number" value={formData.mobile_number} />
                                </div>
                                <ErrorMsg field="mobile_number" />
                            </div>
                            <div>
                                <Label>Secondary Phone</Label>
                                <div className="relative">
                                    <input type="tel" name="secondary_mobile_number" value={formData.secondary_mobile_number} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('secondary_mobile_number', formData.secondary_mobile_number)} placeholder="Alternative phone number" />
                                    <ValidationIcon fieldName="secondary_mobile_number" value={formData.secondary_mobile_number} />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Label>Corporate Website</Label>
                                <div className="relative">
                                    <input type="url" name="website_url" value={formData.website_url} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('website_url', formData.website_url)} placeholder="https://www.example.com" />
                                    <ValidationIcon fieldName="website_url" value={formData.website_url} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'address':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Location Details" subtitle="Physical headquarters and operational centers" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="col-span-2">
                                <Label>Full Address</Label>
                                <div className="relative">
                                    <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('address_line_1', formData.address_line_1)} placeholder="Street address, building number, etc." />
                                    <ValidationIcon fieldName="address_line_1" value={formData.address_line_1} />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="relative">
                                    <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('address_line_2', formData.address_line_2)} placeholder="Additional address details (optional)" />
                                    <ValidationIcon fieldName="address_line_2" value={formData.address_line_2} />
                                </div>
                            </div>
                            <div>
                                <Label>City</Label>
                                <div className="relative">
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('city', formData.city)} placeholder="City name" />
                                    <ValidationIcon fieldName="city" value={formData.city} />
                                </div>
                            </div>
                            <div>
                                <Label>State</Label>
                                <div className="relative">
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('state', formData.state)} placeholder="State / Province" />
                                    <ValidationIcon fieldName="state" value={formData.state} />
                                </div>
                            </div>
                            <div>
                                <Label>Country</Label>
                                <div className="relative">
                                    <input type="text" name="country" value={formData.country} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('country', formData.country)} placeholder="Country name" />
                                    <ValidationIcon fieldName="country" value={formData.country} />
                                </div>
                            </div>
                            <div>
                                <Label>Postal Pincode</Label>
                                <div className="relative">
                                    <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('pincode', formData.pincode)} placeholder="Pincode / ZIP" />
                                    <ValidationIcon fieldName="pincode" value={formData.pincode} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'tax':
                return (
                    <div className="space-y-8">
                        <SectionHeader title="Tax Information" subtitle="Regulatory compliance and tax identifiers" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <Label>Tax Status</Label>
                                <div className="relative">
                                    <select name="gst_registration_type" value={formData.gst_registration_type} onChange={handleChange} onBlur={handleBlur} className={clsx(getInputClassName('gst_registration_type', formData.gst_registration_type), "appearance-none")}>
                                        <option value="Regular">Regular Taxpayer</option>
                                        <option value="Composition">Composition Scheme</option>
                                        <option value="Unregistered">Unregistered Entity</option>
                                        <option value="Overseas">Overseas Professional</option>
                                        <option value="Consumer">Direct Consumer</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <Label>GST Number (GSTIN)</Label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="gst_number"
                                        value={formData.gst_number}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={getInputClassName('gst_number', formData.gst_number)}
                                        disabled={formData.gst_registration_type === 'Unregistered'}
                                        placeholder={formData.gst_registration_type === 'Unregistered' ? 'NOT APPLICABLE' : 'Enter GSTIN'}
                                    />
                                    <ValidationIcon fieldName="gst_number" value={formData.gst_number} />
                                </div>
                            </div>
                            <div>
                                <Label>PAN Number</Label>
                                <div className="relative">
                                    <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('pan_number', formData.pan_number)} placeholder="Enter PAN number" />
                                    <ValidationIcon fieldName="pan_number" value={formData.pan_number} />
                                </div>
                            </div>
                            <div>
                                <Label>Corporate ID (CIN)</Label>
                                <div className="relative">
                                    <input type="text" name="cin_number" value={formData.cin_number} onChange={handleChange} onBlur={handleBlur} className={getInputClassName('cin_number', formData.cin_number)} placeholder="For Private/Public entities" />
                                    <ValidationIcon fieldName="cin_number" value={formData.cin_number} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'bank':
                return (
                    <div className="space-y-10">
                        <SectionHeader title="Bank Details" subtitle="Financial nodes for transactions and payments" />
                        
                        {!readOnly && (
                            <div className="card p-6 mb-6">
                                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-50 flex items-center gap-2">
                                    <Plus className="h-3 w-3" />
                                    Register New Account
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="sm:col-span-2">
                                        <Label required>Bank Name</Label>
                                        <input
                                            type="text"
                                            value={bankForm.bank_name}
                                            onChange={handleBankFormChange}
                                            name="bank_name"
                                            className={clsx(
                                                "w-full px-3 py-2 bg-white border rounded text-[13px] font-medium outline-none transition-all duration-200 pr-10",
                                                bankFormError ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                                            )}
                                            placeholder="Enter bank name"
                                        />
                                        {bankFormError && <p className="text-[10px] text-rose-500 mt-1 font-bold uppercase tracking-wider flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-rose-500"></span> {bankFormError}</p>}
                                    </div>
                                    <div>
                                        <Label>Account Holder Title</Label>
                                        <input type="text" name="account_holder_name" value={bankForm.account_holder_name} onChange={handleBankFormChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500" placeholder="E.g. Acme Corp" />
                                    </div>
                                    <div>
                                        <Label>Account Identifier</Label>
                                        <input type="text" name="account_number" value={bankForm.account_number} onChange={handleBankFormChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500" placeholder="Digits only" />
                                    </div>
                                    <div>
                                        <Label>Swift / IFSC Code</Label>
                                        <input type="text" name="ifsc_code" value={bankForm.ifsc_code} onChange={handleBankFormChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500" placeholder="RTGS/NEFT Code" />
                                    </div>
                                    <div>
                                        <Label>UPI Alias</Label>
                                        <input type="text" name="upi_id" value={bankForm.upi_id} onChange={handleBankFormChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[13px] font-medium outline-none focus:border-indigo-500" placeholder="payment@bank" />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-50">
                                    <button
                                        type="button"
                                        onClick={handleAddOrUpdateBank}
                                        className="btn-primary py-2 flex items-center gap-2"
                                    >
                                        {editingBankIndex !== null ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                        {editingBankIndex !== null ? 'Update Bank' : 'Add Bank'}
                                    </button>
                                    {editingBankIndex !== null && (
                                        <button type="button" onClick={handleCancelEditBank} className="btn-secondary py-2">
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {bankList.length > 0 && (
                            <div className="card overflow-hidden mt-6">
                                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Validated Portfolios</h5>
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-400">{bankList.length} Accounts</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {bankList.map((row, index) => (
                                        <div key={index} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border border-violet-100/50">
                                                    {row.bank_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-[15px] font-semibold text-slate-800">{row.bank_name}</span>
                                                    <span className="text-[13px] font-medium text-slate-500">
                                                        AC: <span className="text-slate-700">{row.account_number || 'HIDDEN'}</span> • IFSC: <span className="text-slate-700">{row.ifsc_code || 'NA'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            {!readOnly && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => handleEditBank(index)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all" title="Edit Bank">
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => handleDeleteBank(index)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete Bank">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={readOnly ? 'Client Intelligence' : (client ? 'Edit Client Profile' : 'New Client Profile')}
            size="2xl"
            footer={(
                <div className="flex justify-end gap-3 w-full">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-bold hover:bg-slate-50 transition-all active:scale-95"
                    >
                        {readOnly ? 'Dismiss' : 'Cancel'}
                    </button>
                    {!readOnly && (
                        <button
                            form="client-form"
                            type="submit"
                            disabled={Object.keys(errors).length > 0 || isSaving}
                            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Saving Account...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>Save Client</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        >
            <div className="flex h-full min-h-[600px]">
                {/* Sidebar Tabs */}
                <div className="w-64 border-r border-slate-100 pr-6 shrink-0 hidden md:block">
                    <div className="flex flex-col gap-1 sticky top-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all",
                                    activeTab === tab.id
                                        ? "text-indigo-600 bg-indigo-50 shadow-sm"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <tab.icon className={clsx("h-4 w-4", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 pl-8">
                    <form id="client-form" onSubmit={handleSubmit} className="pb-10">
                        <fieldset disabled={readOnly} className="contents">
                            <div key={activeTab} className="animate-in fade-in slide-in-from-right-2 duration-300">
                                {renderTabContent()}
                            </div>
                        </fieldset>
                    </form>
                </div>
            </div>
        </SlideOver>
    );
};


export default ClientForm;
