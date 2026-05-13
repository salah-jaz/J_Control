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
        { id: 'basic', label: 'Corporate Profile', icon: Building2 },
        { id: 'contact', label: 'Contact Infrastructure', icon: User },
        { id: 'address', label: 'Geographic Registry', icon: MapPin },
        { id: 'tax', label: 'Regulatory Compliance', icon: FileText },
        { id: 'bank', label: 'Treasury Nodes', icon: Landmark },
    ];
    // Standard J-Control Label
    const Label = ({ children, required }) => (
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {children} {required && <span className="text-rose-500 font-black">*</span>}
        </label>
    );

    const inputCls = (fieldName, alsoErrorKey) => {
        const isTouched = touched[fieldName] || (alsoErrorKey && touched[alsoErrorKey]);
        const error = errors[fieldName] || (alsoErrorKey && errors[alsoErrorKey]);
        const hasError = isTouched && error;

        return clsx(
            "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none transition-all duration-200 shadow-sm",
            hasError 
                ? "border-rose-400 bg-rose-50/30 focus:border-rose-500" 
                : "text-slate-800 focus:border-indigo-500 focus:bg-white hover:border-slate-300",
            readOnly ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 opacity-60" : ""
        );
    };

    const ValidationIcon = ({ fieldName, value, alsoErrorKey }) => {
        const isTouched = touched[fieldName] || (alsoErrorKey && touched[alsoErrorKey]);
        const error = errors[fieldName] || (alsoErrorKey && errors[alsoErrorKey]);
        
        if (!isTouched || readOnly) return null;
        if (error) return <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 animate-in fade-in zoom-in duration-200" />;
        if (value?.toString().trim()) return <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in fade-in zoom-in duration-200" />;
        return null;
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="col-span-2">
                                <Label required>Client Nomenclature / Identity</Label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        name="client_name"
                                        className={clsx(inputCls('client_name', 'client_or_company'), "pl-12")}
                                        placeholder="Full Name / Principal"
                                        value={formData.client_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        readOnly={readOnly}
                                    />
                                    <ValidationIcon fieldName="client_name" value={formData.client_name} alsoErrorKey="client_or_company" />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <Label required>Corporate Designation / Organization</Label>
                                <div className="relative group">
                                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        name="company_name"
                                        className={clsx(inputCls('company_name', 'client_or_company'), "pl-12")}
                                        placeholder="Legal Corporate Name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        readOnly={readOnly}
                                    />
                                    <ValidationIcon fieldName="company_name" value={formData.company_name} alsoErrorKey="client_or_company" />
                                </div>
                                {errors.client_or_company && touched.client_name && (
                                    <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest">{errors.client_or_company}</p>
                                )}
                            </div>

                            <div>
                                <Label>Entity Structure</Label>
                                <select 
                                    name="company_type"
                                    className={clsx(inputCls('company_type'), "appearance-none")}
                                    value={formData.company_type}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                >
                                    <option>Proprietorship</option>
                                    <option>Partnership</option>
                                    <option>LLP</option>
                                    <option>Private Limited</option>
                                    <option>Public Limited</option>
                                    <option>Trust/NGO</option>
                                    <option>Global</option>
                                </select>
                            </div>

                            <div>
                                <Label>Transactional Currency</Label>
                                <select 
                                    name="default_currency"
                                    className={clsx(inputCls('default_currency'), "appearance-none")}
                                    value={formData.default_currency}
                                    onChange={handleChange}
                                    disabled={readOnly}
                                >
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <Label>Primary Liaison</Label>
                                <input name="contact_person_name" className={inputCls('contact_person_name')} placeholder="Full Name" value={formData.contact_person_name} onChange={handleChange} readOnly={readOnly} />
                            </div>
                            <div>
                                <Label>Official Email Pipeline</Label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input name="email_address" className={clsx(inputCls('email_address'), "pl-12")} placeholder="corporate@domain.com" value={formData.email_address} onChange={handleChange} onBlur={handleBlur} readOnly={readOnly} />
                                    <ValidationIcon fieldName="email_address" value={formData.email_address} />
                                </div>
                            </div>
                            <div>
                                <Label>Primary Access Line</Label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input name="mobile_number" className={clsx(inputCls('mobile_number'), "pl-12")} placeholder="10-digit Mobile" value={formData.mobile_number} onChange={handleChange} onBlur={handleBlur} readOnly={readOnly} />
                                    <ValidationIcon fieldName="mobile_number" value={formData.mobile_number} />
                                </div>
                            </div>
                            <div>
                                <Label>Secondary Access Line</Label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input name="secondary_mobile_number" className={clsx(inputCls('secondary_mobile_number'), "pl-12")} placeholder="Alternate Number" value={formData.secondary_mobile_number} onChange={handleChange} readOnly={readOnly} />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Label>Corporate Digital Mark (Website)</Label>
                                <input name="website_url" className={inputCls('website_url')} placeholder="https://www.company.com" value={formData.website_url} onChange={handleChange} readOnly={readOnly} />
                            </div>
                        </div>
                    </div>
                );
            case 'address':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="space-y-10">
                            <div>
                                <Label>Headquarters Registry / Line 1</Label>
                                <div className="relative group">
                                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input name="address_line_1" className={clsx(inputCls('address_line_1'), "pl-12")} placeholder="Street, Building, Unit" value={formData.address_line_1} onChange={handleChange} readOnly={readOnly} />
                                </div>
                            </div>
                            <div>
                                <Label>Administrative Locality / Line 2</Label>
                                <input name="address_line_2" className={inputCls('address_line_2')} placeholder="Area, Landmark" value={formData.address_line_2} onChange={handleChange} readOnly={readOnly} />
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                <div>
                                    <Label>Jurisdiction (City)</Label>
                                    <input name="city" className={inputCls('city')} placeholder="City" value={formData.city} onChange={handleChange} readOnly={readOnly} />
                                </div>
                                <div>
                                    <Label>Administrative State</Label>
                                    <input name="state" className={inputCls('state')} placeholder="State" value={formData.state} onChange={handleChange} readOnly={readOnly} />
                                </div>
                                <div>
                                    <Label>Postal Index Code (PIN)</Label>
                                    <input name="pincode" className={inputCls('pincode')} placeholder="6-digit PIN" value={formData.pincode} onChange={handleChange} readOnly={readOnly} />
                                </div>
                                <div>
                                    <Label>Sovereign Territory</Label>
                                    <input name="country" className={inputCls('country')} placeholder="Country" value={formData.country} onChange={handleChange} readOnly={readOnly} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'tax':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="col-span-2">
                                <Label>Compliance Module (GST)</Label>
                                <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                    {['Regular', 'Composition', 'Unregistered', 'Overseas'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => !readOnly && handleChange({ target: { name: 'gst_registration_type', value: type } })}
                                            className={clsx(
                                                "flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                                                formData.gst_registration_type === type
                                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-100"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {formData.gst_registration_type !== 'Unregistered' && (
                                <>
                                    <div className="col-span-2">
                                        <Label>Tax Identification (GSTIN)</Label>
                                        <div className="relative group">
                                            <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input name="gst_number" className={clsx(inputCls('gst_number'), "pl-12 font-mono uppercase")} placeholder="15-character GSTIN" value={formData.gst_number} onChange={handleChange} readOnly={readOnly} />
                                            <ValidationIcon fieldName="gst_number" value={formData.gst_number} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Registry State Code</Label>
                                        <input name="gst_state_code" className={inputCls('gst_state_code')} placeholder="e.g. 27" value={formData.gst_state_code} onChange={handleChange} readOnly={readOnly} />
                                    </div>
                                </>
                            )}
                            <div>
                                <Label>Fiscal Account Index (PAN)</Label>
                                <input name="pan_number" className={clsx(inputCls('pan_number'), "font-mono uppercase")} placeholder="10-character PAN" value={formData.pan_number} onChange={handleChange} readOnly={readOnly} />
                            </div>
                            <div>
                                <Label>Corporate Identity (CIN)</Label>
                                <input name="cin_number" className={clsx(inputCls('cin_number'), "font-mono uppercase")} placeholder="21-character CIN" value={formData.cin_number} onChange={handleChange} readOnly={readOnly} />
                            </div>
                        </div>
                    </div>
                );
            case 'bank':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        {!readOnly && (
                            <div className="p-10 bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                                    <Landmark size={200} />
                                </div>
                                <div className="relative z-10">
                                    <h4 className="text-[14px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                        {editingBankIndex !== null ? 'Modify Treasury Node' : 'Initialize New Node'}
                                    </h4>
                                    
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Institutional Name</label>
                                            <input 
                                                name="bank_name"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold outline-none focus:bg-white/10 focus:border-white/30 transition-all"
                                                placeholder="e.g. Federal Reserve Bank"
                                                value={bankForm.bank_name}
                                                onChange={handleBankFormChange}
                                            />
                                            {bankFormError && <p className="text-[10px] text-rose-400 mt-2 font-black uppercase tracking-widest">{bankFormError}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Account Beneficiary</label>
                                            <input name="account_holder_name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold outline-none focus:bg-white/10 focus:border-white/30 transition-all" placeholder="Holder Name" value={bankForm.account_holder_name} onChange={handleBankFormChange} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Functional Account Number</label>
                                            <input name="account_number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold outline-none focus:bg-white/10 focus:border-white/30 transition-all font-mono" placeholder="Digits only" value={bankForm.account_number} onChange={handleBankFormChange} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Routing Protocol (IFSC)</label>
                                            <input name="ifsc_code" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold outline-none focus:bg-white/10 focus:border-white/30 transition-all font-mono uppercase" placeholder="Bank Code" value={bankForm.ifsc_code} onChange={handleBankFormChange} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Digital Identity (UPI)</label>
                                            <input name="upi_id" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold outline-none focus:bg-white/10 focus:border-white/30 transition-all" placeholder="id@bank" value={bankForm.upi_id} onChange={handleBankFormChange} />
                                        </div>
                                    </div>

                                    <div className="mt-12 flex justify-end gap-4">
                                        {editingBankIndex !== null && (
                                            <button type="button" onClick={handleCancelEditBank} className="px-6 py-3 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Discard</button>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={handleAddOrUpdateBank}
                                            className="px-10 py-4 bg-indigo-600 text-white text-[13px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/50 flex items-center gap-3 active:scale-95"
                                        >
                                            {editingBankIndex !== null ? <Edit2 size={18} /> : <Plus size={18} strokeWidth={3} />}
                                            <span>{editingBankIndex !== null ? 'Update Node' : 'Authorize Node'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Authorized Financial Registry</h5>
                            {bankList.length === 0 ? (
                                <div className="p-16 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-center group hover:border-slate-200 transition-colors">
                                    <Landmark className="text-slate-100 mb-4 group-hover:scale-110 transition-transform duration-500" size={64} />
                                    <p className="text-[13px] font-black text-slate-300 uppercase tracking-widest">No Treasury Data Initialized</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {bankList.map((bank, idx) => (
                                        <div key={idx} className="group p-8 bg-white border-2 border-slate-100 rounded-[32px] flex items-center justify-between transition-all hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100 relative overflow-hidden">
                                            {editingBankIndex === idx && <div className="absolute inset-0 bg-indigo-50/50 backdrop-blur-[2px] z-10 animate-in fade-in duration-300" />}
                                            <div className="flex items-center gap-8 relative z-20">
                                                <div className="h-16 w-16 rounded-[20px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                    <Landmark size={24} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[15px] font-black text-slate-900 leading-tight">{bank.bank_name}</p>
                                                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{bank.account_holder_name} • <span className="font-mono">{bank.account_number}</span></p>
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100">IFSC: {bank.ifsc_code}</span>
                                                        {bank.upi_id && <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">{bank.upi_id}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {!readOnly && (
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 relative z-20">
                                                    <button type="button" onClick={() => handleEditBank(idx)} className="p-4 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all shadow-sm"><Edit2 size={18} /></button>
                                                    <button type="button" onClick={() => handleDeleteBank(idx)} className="p-4 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all shadow-sm"><Trash2 size={18} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
            size="5xl"
            title={readOnly ? 'Review Client Profile' : (client ? 'Modify Corporate Identity' : 'Introduce New Client Entity')}
            footer={(
                <div className="flex justify-end items-center w-full px-1 gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Discard Changes</button>
                    {!readOnly && (
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSaving} 
                            className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>{isSaving ? 'Synchronizing...' : (client ? 'Commit Changes' : 'Record Registry')}</span>
                        </button>
                    )}
                </div>
            )}
        >
            <div className="flex h-full min-h-[650px] relative">
                {/* Sidebar Navigation */}
                <div className="w-72 border-r-2 border-slate-100 pr-10 shrink-0 hidden md:block">
                    <div className="flex flex-col gap-2 sticky top-0">
                        {tabs.map((t, idx) => (
                            <div key={t.id}>
                                <button
                                    onClick={() => setActiveTab(t.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                                        activeTab === t.id
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                >
                                    {activeTab === t.id && (
                                        <div className="absolute -right-[42px] top-4 bottom-4 w-1 bg-indigo-600 rounded-l-full z-10" />
                                    )}
                                    <t.icon className={clsx("h-4 w-4", activeTab === t.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    <span>{t.label}</span>
                                </button>
                                {idx < tabs.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 pl-12 overflow-y-auto">
                    <div className="pb-24">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </SlideOver>
    );
};

export default ClientForm;
