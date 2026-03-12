import { useState, useEffect } from "react";
import {
    FileText,
    Plus,
    Search,
    Eye,
    X,
    User,
    Layout,
    Calendar,
    Filter,
    Sparkles,
    ShieldAlert,
    Pencil,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import agreementService from "../services/agreementService";
import { getClients } from "../services/db";
import AgreementBuilder from "../components/AgreementBuilder";
import AgreementPreviewModal from "../components/AgreementPreviewModal";
import AgreementContentDisplay from "../components/AgreementContentDisplay";
import { getEffectiveTemplateHtml, buildAgreementPrintData, resolveTemplateHtmlWithData } from "../config/printTemplateModules";
import { getTemplates } from "../utils/printTemplateStorage";

const emptyForm = {
    client_id: "",
    agreement_no: "",
    title: "",
    tagline: "Build, automate, scale — without limits.",
    override_company_name: "JAZ INFOTECH",
    company_logo: null,
    date: new Date().toISOString().split("T")[0],
    status: "Draft",
    notes: "",
    content: [],
};

const STATUS_OPTIONS = ["Draft", "Sent", "Signed", "Expired"];

function Agreements() {
    const [listData, setListData] = useState({ agreements: [], summary: null });
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [tab, setTab] = useState("basic");
    const [openForm, setOpenForm] = useState(false);
    const [openPreview, setOpenPreview] = useState(false);
    const [editId, setEditId] = useState(null);
    const [selectedAgreement, setSelectedAgreement] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [clientFilter, setClientFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSelection, setShowSelection] = useState(false);

    // Live preview state added
    const [templates, setTemplates] = useState([]);
    const [livePreviewTemplateId, setLivePreviewTemplateId] = useState("standard");

    useEffect(() => {
        loadData();
        loadClients();
        setTemplates(getTemplates().filter(t => t.module === 'agreements'));
    }, []);

    const getLivePreviewHtml = (previewData = form) => {
        if (!livePreviewTemplateId || livePreviewTemplateId === 'standard') return null;
        const template = templates.find(t => t.id === livePreviewTemplateId);
        if (!template) return null;

        let templateHtml = getEffectiveTemplateHtml(template, 'agreements');
        if (!templateHtml) return null;

        const dummyTextRegex = /This space is used for agreement,\s*proposal or letter content\.?\s*You can dynamically load your agreement content here\.?/gi;
        if (dummyTextRegex.test(templateHtml)) {
            templateHtml = templateHtml.replace(dummyTextRegex, '{{agreement.agreement_content}}');
        }

        const printData = buildAgreementPrintData(previewData, {}, null, {
            template,
            templateHasBodySection: templateHtml.includes('print-section-body'),
            templateHtml,
            styles: t.styles
        });

        return resolveTemplateHtmlWithData(templateHtml, 'agreements', { agreement: printData });
    };

    const loadClients = async () => {
        const data = await getClients();
        setClients(data);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (searchQuery.trim()) params.search = searchQuery.trim();
            if (statusFilter !== "All") params.status = statusFilter;
            if (clientFilter) params.client_id = clientFilter;

            const response = await agreementService.getAll(params);
            setListData({
                agreements: response.data.agreements || [],
                summary: response.data.summary || null
            });
        } catch (e) {
            console.error("Failed to load agreements", e);
            toast.error("Failed to load agreements");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, statusFilter, clientFilter]);

    const openAdd = async () => {
        setShowSelection(true);
    };

    const confirmAdd = async (templateType = 'blank') => {
        setShowSelection(false);
        try {
            const res = await agreementService.getNextNumber();
            const nextNo = res.data?.next_no || res.data?.agreement_no || res.data;
            let initialContentBlocks = [];

            if (templateType === 'quotation') {
                initialContentBlocks = [
                    { id: `b_${Date.now()}_1`, type: 'heading', content: 'Project Agreement' },
                    { id: `b_${Date.now()}_2`, type: 'paragraph', content: 'This agreement outlines the scope of work and deliverables based on the associated quotation.' },
                    { id: `b_${Date.now()}_3`, type: 'section', content: 'Deliverables' },
                    { id: `b_${Date.now()}_4`, type: 'bullets', content: ['Item 1', 'Item 2'] },
                    { id: `b_${Date.now()}_5`, type: 'section', content: 'Terms' },
                    { id: `b_${Date.now()}_6`, type: 'paragraph', content: 'Payment terms: 50% advance, 50% on completion.' }
                ];
            } else if (templateType === 'invoice') {
                initialContentBlocks = [
                    { id: `b_${Date.now()}_1`, type: 'heading', content: 'Service Agreement' },
                    { id: `b_${Date.now()}_2`, type: 'paragraph', content: 'Agreement corresponding to services rendered as per the invoice.' },
                    { id: `b_${Date.now()}_3`, type: 'section', content: 'Scope' },
                    { id: `b_${Date.now()}_4`, type: 'paragraph', content: 'Description of services.' },
                    { id: `b_${Date.now()}_5`, type: 'section', content: 'Financials' },
                    { id: `b_${Date.now()}_6`, type: 'paragraph', content: 'As per the invoice.' }
                ];
            } else if (templateType === 'lease') {
                initialContentBlocks = [
                    { id: `b_${Date.now()}_1`, type: 'heading', content: 'Lease Agreement' },
                    { id: `b_${Date.now()}_2`, type: 'paragraph', content: 'This Lease Agreement is made between the Landlord and Tenant.' },
                    { id: `b_${Date.now()}_3`, type: 'section', content: 'Term' },
                    { id: `b_${Date.now()}_4`, type: 'paragraph', content: 'The lease will begin on __________ and end on ___________.' },
                    { id: `b_${Date.now()}_5`, type: 'section', content: 'Rent' },
                    { id: `b_${Date.now()}_6`, type: 'paragraph', content: 'Monthly lease amount: $' }
                ];
            } else {
                initialContentBlocks = [
                    { id: `b_${Date.now()}_1`, type: 'heading', content: 'Scope of Work' },
                    { id: `b_${Date.now()}_2`, type: 'paragraph', content: 'Enter your project description here...' }
                ];
            }

            setForm({
                ...emptyForm,
                agreement_no: nextNo,
                date: new Date().toISOString().split("T")[0],
                content: initialContentBlocks,
            });
            setErrors({});
            setEditId(null);
            setTab("basic");
            setOpenForm(true);
        } catch (e) {
            toast.error("Failed to fetch next agreement number");
        }
    };

    const openEdit = (a) => {
        setForm({
            client_id: a.client_id || "",
            agreement_no: a.agreement_no || "",
            title: a.title || "",
            tagline: a.tagline || "",
            override_company_name: a.override_company_name || "",
            company_logo: a.company_logo || null,
            date: a.date ? (typeof a.date === 'string' ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0]) : "",
            status: a.status || "Draft",
            notes: a.notes || "",
            content: Array.isArray(a.content) ? a.content : [],
        });
        setErrors({});
        setEditId(a.id);
        setTab("basic");
        setOpenForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this agreement?")) return;
        try {
            await agreementService.delete(id);
            toast.success("Agreement deleted");
            loadData();
        } catch (e) {
            toast.error("Failed to delete agreement");
        }
    };

    const validate = () => {
        const e = {};
        if (!form.client_id) e.client_id = "Client is required";
        if (!form.title) e.title = "Agreement Title is required";
        if (!form.date) e.date = "Date is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            toast.error("Please fill all required fields in the General Details tab.");
            setTab("basic");
            return;
        }
        try {
            if (editId) {
                await agreementService.update(editId, form);
                toast.success("Agreement updated");
            } else {
                await agreementService.create(form);
                toast.success("Agreement created");
            }
            loadData();
            setOpenForm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save agreement");
        }
    };

    const openPreviewModal = (a) => {
        setSelectedAgreement(a);
        setOpenPreview(true);
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
        </div>
    );

    const inputClass = (f) => clsx(
        "input w-full",
        errors[f] && "border-red-500 focus:border-red-500 focus:ring-red-200"
    );

    const summary = listData.summary || {};
    const agreements = listData.agreements || [];

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Agreement Module</h1>
                    <p className="text-slate-500 mt-1">Manage and generate professional agreements.</p>
                </div>
                <button
                    onClick={openAdd}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/20"
                >
                    <Plus size={20} />
                    Create Agreement
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Agreements" value={summary.total ?? 0} icon={FileText} color="bg-slate-600" />
                <StatCard title="Draft" value={summary.draft ?? 0} icon={FileText} color="bg-amber-600" />
                <StatCard title="Sent" value={summary.sent ?? 0} icon={FileText} color="bg-blue-600" />
                <StatCard title="Signed" value={summary.signed ?? 0} icon={FileText} color="bg-emerald-600" />
                <StatCard title="Expired" value={summary.expired ?? 0} icon={FileText} color="bg-rose-600" />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by ID, Title or Client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-brand-500/20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl text-sm py-2 px-4 focus:ring-2 focus:ring-brand-500/20 min-w-[120px]"
                    >
                        <option value="All">All Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl text-sm py-2 px-4 focus:ring-2 focus:ring-brand-500/20 min-w-[160px]"
                    >
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                    </select>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Loading agreements...</td></tr>
                            ) : agreements.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic">No agreements found.</td></tr>
                            ) : (
                                agreements.map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-mono font-semibold text-slate-600">{a.agreement_no}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{a.title}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {a.client ? (a.client.company_name || a.client.client_name) : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {a.date ? new Date(a.date).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase",
                                                a.status === "Draft" && "bg-gray-100 text-gray-600",
                                                a.status === "Sent" && "bg-blue-100 text-blue-600",
                                                a.status === "Signed" && "bg-emerald-100 text-emerald-600",
                                                a.status === "Expired" && "bg-rose-100 text-rose-600",
                                            )}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(a)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openPreviewModal(a)}
                                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                    title="Preview & Print"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {openForm && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-[1600px] xl:w-[95vw] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-slide-up overflow-hidden transition-all duration-300">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                    {editId ? "Edit Agreement" : "Create Agreement"}
                                </h2>
                                <p className="text-sm text-slate-400 mt-0.5">{form.agreement_no}</p>
                            </div>
                            <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex px-4 md:px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto">
                            {[
                                { id: "basic", label: "General Details", icon: Layout },
                                { id: "content", label: "Agreement Content", icon: FileText },
                            ].map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setTab(id)}
                                    className={clsx(
                                        "px-6 py-4 text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 border-b-2",
                                        tab === id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className={clsx(
                            "flex-1 overflow-y-auto bg-slate-50/30",
                            tab === "basic" ? "p-4 md:p-8" : "p-0"
                        )}>
                            {tab === "basic" && (
                                <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Agreement Title *</label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                className={clsx(inputClass("title"), "text-lg font-bold py-3")}
                                                placeholder="e.g. Website Development Agreement"
                                            />
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Company Name (Header)</label>
                                                <input
                                                    type="text"
                                                    value={form.override_company_name}
                                                    onChange={(e) => setForm({ ...form, override_company_name: e.target.value })}
                                                    className="input w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tagline (Header)</label>
                                                <input
                                                    type="text"
                                                    value={form.tagline}
                                                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                                                    className="input w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Logo URL</label>
                                                <input
                                                    type="text"
                                                    value={form.company_logo || ''}
                                                    onChange={(e) => setForm({ ...form, company_logo: e.target.value })}
                                                    className="input w-full"
                                                    placeholder="URL or base64..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Client *</label>
                                            <select
                                                value={form.client_id}
                                                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                                                className={inputClass("client_id")}
                                            >
                                                <option value="">Select client</option>
                                                {clients.map((c) => (
                                                    <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Date *</label>
                                                <input
                                                    type="date"
                                                    value={form.date}
                                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                                    className={inputClass("date")}
                                                />
                                            </div>
                                            <div>
                                                <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                                                <select
                                                    value={form.status}
                                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                    className="input w-full"
                                                >
                                                    {STATUS_OPTIONS.map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Internal Notes</label>
                                            <textarea
                                                value={form.notes}
                                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                                className="input min-h-[100px] w-full"
                                                placeholder="Private notes for team only..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tab === "content" && (
                                <div className="h-full flex flex-col lg:flex-row bg-slate-50/50">
                                    <div className="flex-1 lg:max-w-[60%] border-b lg:border-b-0 lg:border-r border-gray-200">
                                        <AgreementBuilder
                                            value={form.content || []}
                                            onChange={(v) => setForm({ ...form, content: v })}
                                        />
                                    </div>
                                    <div className="hidden lg:flex flex-1 flex-col bg-slate-100 overflow-hidden relative">
                                        <div className="p-3 border-b border-gray-200 bg-white shadow-sm z-10 flex justify-between items-center shrink-0">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Eye size={14} className="text-brand-500" /> Live Preview
                                            </span>
                                            <select
                                                value={livePreviewTemplateId}
                                                onChange={e => setLivePreviewTemplateId(e.target.value)}
                                                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                                            >
                                                <option value="standard">Standard Form</option>
                                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 flex justify-center perspective-[1000px] bg-slate-200/50 custom-scrollbar">
                                            <div className="bg-white border border-slate-200 shadow-md rounded-[2px] w-[210mm] max-w-none origin-top transform scale-[0.6] 2xl:scale-[0.75] transition-transform duration-300 min-h-[297mm] pointer-events-none">
                                                {livePreviewTemplateId === 'standard' ? (
                                                    <div className="p-12 text-slate-800">
                                                        <div className="flex justify-between items-start mb-8 gap-4">
                                                            <div className="text-slate-600">
                                                                <p className="font-bold text-xl text-slate-800 tracking-tight">{form.override_company_name}</p>
                                                            </div>
                                                            <div className="text-right text-slate-500">
                                                                <p className="text-sm"><span className="font-bold text-slate-700">Agreement No:</span> {form.agreement_no || "Draft"}</p>
                                                                <p className="text-sm"><span className="font-bold text-slate-700">Date:</span> {form.date}</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1 bg-amber-400 mb-8 rounded-full" />
                                                        <h1 className="text-3xl font-extrabold text-slate-900 mb-8 mt-4 pb-4 border-b border-gray-200 text-center uppercase tracking-tight">
                                                            {form.title || "Untitled Agreement"}
                                                        </h1>
                                                        {form.content?.length > 0 ? (
                                                            <AgreementContentDisplay blocks={form.content} />
                                                        ) : (
                                                            <p className="text-center text-slate-400 italic mt-8">Start adding content to see preview...</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const previewProps = {
                                                            ...form,
                                                            client: clients.find(c => c.id === Number(form.client_id)) || {},
                                                            content: form.content
                                                        };
                                                        const html = getLivePreviewHtml(previewProps);
                                                        return html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div className="p-12 text-center text-slate-500">Preview not available</div>;
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end items-center gap-3">
                            <button type="button" onClick={() => setOpenForm(false)} className="btn-secondary h-11 px-8">Discard</button>
                            <button type="button" onClick={handleSave} className="btn-primary h-11 px-10 shadow-lg shadow-brand-500/30">Save Agreement</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Selection Overlay */}
            {showSelection && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full animate-scale-in">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select Agreement Template</h2>
                                <p className="text-slate-500 mt-1">Choose a starting point for your new agreement.</p>
                            </div>
                            <button onClick={() => setShowSelection(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { id: 'quotation', name: 'Quotation Based', desc: 'Optimized for project proposals', icon: FileText, color: 'bg-brand-500' },
                                { id: 'invoice', name: 'Invoice Format', desc: 'Focus on payments & terms', icon: Sparkles, color: 'bg-indigo-500' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => confirmAdd(t.id)}
                                    className="group flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-brand-500 hover:bg-white hover:shadow-xl hover:shadow-brand-500/10 transition-all"
                                >
                                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-current/10 transition-transform group-hover:rotate-6 group-hover:scale-110", t.color)}>
                                        <t.icon size={24} />
                                    </div>
                                    <p className="font-black text-slate-800 text-sm mb-1">{t.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-widest">{t.desc}</p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Select a structure to begin</p>
                        </div>
                    </div>
                </div>
            )}

            {selectedAgreement && (
                <AgreementPreviewModal
                    isOpen={openPreview}
                    onClose={() => { setOpenPreview(false); setSelectedAgreement(null); }}
                    agreement={selectedAgreement}
                    onEdit={() => {
                        setOpenPreview(false);
                        openEdit(selectedAgreement);
                    }}
                    onDelete={() => {
                        setOpenPreview(false);
                        handleDelete(selectedAgreement.id);
                    }}
                />
            )}
        </div>
    );
}

export default Agreements;
