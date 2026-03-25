import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, MapPin, FileText, Landmark, Plus, Pencil, Trash2, Loader2, Edit2, ChevronDown, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
        const hasSuccess = isTouched && !error && value?.toString().trim();

        return clsx(
            "w-full px-4 py-3 bg-white border rounded-lg text-sm transition-all duration-300 outline-none placeholder:text-slate-400 placeholder:font-normal pr-10",
            hasError 
                ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" 
                : hasSuccess
                    ? "border-emerald-400 bg-emerald-50/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    : "border-slate-200 text-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 hover:border-slate-300",
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
        <label className="block text-[13px] font-medium text-slate-700 mb-1.5 ml-0.5">
            {children} {required && <span className="text-rose-500 ml-1 font-bold text-sm">*</span>}
        </label>
    );

    // Section Header for grouping
    const SectionHeader = ({ title, subtitle }) => (
        <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4 mb-6 mt-2">
            <h4 className="text-[18px] font-semibold text-slate-900">{title}</h4>
            {subtitle && <p className="text-[13px] font-medium text-slate-500">{subtitle}</p>}
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
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group hover:border-violet-200 transition-colors duration-300">
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <h5 className="text-[16px] font-semibold text-slate-900 mb-6 flex items-center gap-3">
                                    <div className="h-8 w-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center font-bold shadow-sm">
                                        <Plus className="h-4 w-4" />
                                    </div>
                                    Register New Account
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="sm:col-span-2">
                                        <Label required>Bank Name</Label>
                                        <input
                                            type="text"
                                            value={bankForm.bank_name}
                                            onChange={handleBankFormChange}
                                            name="bank_name"
                                            className={clsx(
                                                "w-full px-5 py-4 bg-white border rounded-lg text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none",
                                                bankFormError ? "border-rose-300 ring-2 ring-rose-500/20" : "border-slate-200"
                                            )}
                                            placeholder="Enter bank name"
                                        />
                                        {bankFormError && <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-wider flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-rose-500"></span> {bankFormError}</p>}
                                    </div>
                                    <div>
                                        <Label>Account Holder Title</Label>
                                        <input type="text" name="account_holder_name" value={bankForm.account_holder_name} onChange={handleBankFormChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all font-medium" placeholder="E.g. Acme Corp" />
                                    </div>
                                    <div>
                                        <Label>Account Identifier</Label>
                                        <input type="text" name="account_number" value={bankForm.account_number} onChange={handleBankFormChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all font-medium" placeholder="Digits only" />
                                    </div>
                                    <div>
                                        <Label>Swift / IFSC Code</Label>
                                        <input type="text" name="ifsc_code" value={bankForm.ifsc_code} onChange={handleBankFormChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all font-medium" placeholder="RTGS/NEFT Code" />
                                    </div>
                                    <div>
                                        <Label>UPI Alias</Label>
                                        <input type="text" name="upi_id" value={bankForm.upi_id} onChange={handleBankFormChange} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all font-medium" placeholder="payment@bank" />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={handleAddOrUpdateBank}
                                        className="px-6 py-2.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl text-[14px] font-medium shadow-sm active:scale-[0.98] flex items-center gap-2 transition-all duration-[250ms] border border-violet-100"
                                    >
                                        {editingBankIndex !== null ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        {editingBankIndex !== null ? 'Sync Changes' : 'Commit Bank'}
                                    </button>
                                    {editingBankIndex !== null && (
                                        <button type="button" onClick={handleCancelEditBank} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:bg-slate-50 transition-all duration-[250ms] active:scale-[0.98] shadow-sm">
                                            Abort
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {bankList.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mt-8">
                                <div className="px-8 py-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                                    <h5 className="text-[14px] font-semibold text-slate-700">Validated Portfolios</h5>
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[12px] font-medium text-slate-500 shadow-sm">{bankList.length} Active</span>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-[250ms]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/40 animate-in zoom-in-[0.98] duration-[250ms] ease-out">
                
                {/* Fixed Header */}
                <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-20">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.3)] group-hover:scale-105 transition-transform duration-[250ms]">
                            {readOnly ? <FileText className="h-5 w-5" /> : (client ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5 stroke-[2.5]" />)}
                        </div>
                        <div>
                            <h3 className="text-[22px] font-bold text-slate-900 tracking-tight">
                                {readOnly ? 'Company Overview' : (client ? 'Edit Client Profile' : 'Add Client Profile')}
                            </h3>
                            <p className="text-[13px] font-medium text-slate-500 mt-1">
                                {readOnly ? 'Strategic Account Intelligence' : 'Account Onboarding & Configuration'}
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="h-10 w-10 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-sm border border-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body with Sidebar */}
                <div className="flex flex-1 overflow-hidden relative">
                    {/* Sidebar Tabs */}
                    <div className="w-72 bg-slate-50/50 border-r border-slate-100 overflow-y-auto hidden md:block py-8">
                        <div className="relative flex flex-col px-4 gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "relative flex items-center gap-4 px-5 py-3 rounded-xl text-[14px] font-medium transition-all duration-[250ms] ease-out group overflow-hidden focus:outline-none",
                                        activeTab === tab.id
                                            ? "text-violet-800 bg-violet-100/50"
                                            : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                    )}
                                >
                                    {/* Sliding Indicator visually represented by a subtle left border/glow effect inside active item */}
                                    {activeTab === tab.id && (
                                        <div className="absolute left-0 top-[10%] bottom-[10%] w-1.5 bg-violet-600 rounded-r-full shadow-[0_0_12px_rgba(124,58,237,0.4)] animate-in slide-in-from-left-2 duration-[250ms]"></div>
                                    )}
                                    <tab.icon className={clsx("h-[18px] w-[18px] transition-colors duration-[250ms] relative z-10", activeTab === tab.id ? "text-violet-600" : "text-slate-400 group-hover:text-violet-500")} />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white p-10 relative">
                        <form id="client-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto pb-10 min-h-[550px]">
                            <fieldset disabled={readOnly} className="contents">
                                <div key={activeTab} className="animate-in fade-in slide-in-from-right-4 duration-500 ease-out">
                                    {renderTabContent()}
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="px-10 py-5 border-t border-slate-100 flex justify-end items-center bg-slate-50/50 z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all duration-[250ms] shadow-sm active:scale-[0.98]"
                        >
                            {readOnly ? 'Dismiss' : 'Reset & Exit'}
                        </button>
                        {!readOnly && (
                            <button
                                form="client-form"
                                type="submit"
                                disabled={Object.keys(errors).length > 0 || isSaving}
                                className={clsx(
                                    "px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-xl text-[14px] font-medium shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_12px_24px_rgba(124,58,237,0.35)] transition-all duration-[250ms] hover:-translate-y-[2px] active:scale-[0.98] group flex items-center justify-center min-w-[160px]",
                                    (Object.keys(errors).length > 0 || isSaving) && "opacity-60 grayscale cursor-not-allowed shadow-none hover:translate-y-0 active:scale-100"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 stroke-[2.5]" />
                                            Commit Account
                                        </>
                                    )}
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default ClientForm;
