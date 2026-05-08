import { useState, useEffect } from "react";
import {
    Plus, Eye, X, User, Layout, Calendar, Filter, Sparkles, ShieldAlert,
    Pencil, Trash2, ChevronRight, ChevronLeft, Building2, Target, StickyNote,
    Layers, Briefcase, Info, Image as ImageIcon, Check, Loader2, Save, FileText
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
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect } from "../components/ui/FilterControls";
import { TableSectionHeader } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";

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
    const [showPreview, setShowPreview] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

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
        const result = await getClients({ per_page: 200 });
        setClients(Array.isArray(result?.data) ? result.data : []);
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
        setIsSaving(true);
        try {
            const payload = {
                ...form,
                client_id: Number(form.client_id)
            };
            if (editId) {
                await agreementService.update(editId, payload);
                toast.success("Agreement updated");
            } else {
                await agreementService.create(payload);
                toast.success("Agreement created");
            }
            loadData();
            setOpenForm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save agreement");
        } finally {
            setIsSaving(false);
        }
    };

    const openPreviewModal = (a) => {
        setSelectedAgreement(a);
        setOpenPreview(true);
    };

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <div className="card group relative overflow-hidden cursor-default !border-0 p-5 h-[140px] flex flex-col justify-between">
            {/* Top Gradient Line */}
            <div className={clsx("absolute top-0 left-0 right-0 h-[2px]", "bg-gradient-to-r from-violet-500 to-fuchsia-500")} />
            
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                    <p className="text-[12px] font-semibold text-slate-500 capitalize">{title.toLowerCase()}</p>
                    <h3 className="text-[26px] font-bold text-slate-900 leading-none mt-1">{value}</h3>
                </div>
                <div className={clsx(
                    "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    color.replace('bg-', 'bg-opacity-10 '),
                    color.replace('bg-', 'text-')
                )}>
                    <Icon className="w-5 h-5 font-bold" />
                </div>
            </div>
            
            <div className="space-y-2 mt-4">
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full transition-all duration-1000", color)} style={{ width: '70%' }}></div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium tracking-tight">Contractual status metrics</p>
            </div>
        </div>
    );

    const inputClass = (f) => clsx(
        "input w-full",
        errors[f] && "border-red-500 focus:border-red-500 focus:ring-red-200"
    );

    const summary = listData.summary || {};
    const agreements = listData.agreements || [];

    const SectionHeader = ({ icon: Icon, title, color }) => {
        const colors = {
            violet: "from-violet-600 to-fuchsia-500 shadow-violet-500/20",
            indigo: "from-indigo-600 to-blue-500 shadow-indigo-500/20",
            rose: "from-rose-600 to-pink-500 shadow-rose-500/20"
        };
        return (
            <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className={clsx("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-lg", colors[color] || colors.violet)}>
                        <Icon size={16} className="stroke-[2.5]" />
                    </div>
                    <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest leading-none">
                        {title}
                    </h4>
                </div>
            </div>
        );
    };

    const Label = ({ text, required }) => (
        <label className="text-[13px] font-bold text-slate-700 ml-0.5 flex items-center gap-1">
            {text}
            {required && <span className="text-rose-500 font-black">*</span>}
        </label>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Background Strip */}
            <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-violet-50/50 to-transparent pointer-events-none" />

            <div className="relative p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header Section */}
                <PageHeader
                    title="Agreements"
                    subtitle="Manage and generate professional agreements for your clients."
                    primaryAction={(
                        <button
                            onClick={openAdd}
                            className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
                            <Plus size={20} className="relative z-10" />
                            <span className="relative z-10">Create Agreement</span>
                        </button>
                    )}
                />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                <StatCard title="Total" value={summary.total ?? 0} icon={FileText} color="bg-slate-500" />
                <StatCard title="Draft" value={summary.draft ?? 0} icon={FileText} color="bg-amber-500" />
                <StatCard title="Sent" value={summary.sent ?? 0} icon={FileText} color="bg-blue-500" />
                <StatCard title="Signed" value={summary.signed ?? 0} icon={FileText} color="bg-emerald-500" />
                <StatCard title="Expired" value={summary.expired ?? 0} icon={FileText} color="bg-rose-500" />
            </div>

            {/* Filters Bar */}
            <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
                <ToolbarSearch
                    placeholder="Search agreements..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                />
                <div className="flex flex-wrap items-center gap-2">
                    <FilterSelect
                        icon={Filter}
                        value={statusFilter}
                        onChange={setStatusFilter}
                    >
                            <option value="All">All Status</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </FilterSelect>
                    <FilterSelect
                        icon={User}
                        value={clientFilter}
                        onChange={setClientFilter}
                    >
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                    </FilterSelect>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <TableSectionHeader title="Agreement List" summary={`Showing ${agreements.length}`} />
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
                                <tr>
                                    <td colSpan="6" className="px-6 py-2">
                                        <EmptyState
                                            icon={FileText}
                                            title="No agreements found"
                                            description="Create an agreement or adjust your filters."
                                        />
                                    </td>
                                </tr>
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
                                                <ActionIconButton onClick={() => openEdit(a)} title="Edit" icon={Pencil} tone="edit" />
                                                <ActionIconButton onClick={() => handleDelete(a.id)} title="Delete" icon={Trash2} tone="delete" />
                                                <ActionIconButton onClick={() => openPreviewModal(a)} title="Preview & Print" icon={Eye} tone="view" />
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[6px] animate-in fade-in duration-[300ms]">
                    <div className="bg-white w-full max-w-[1100px] xl:w-[85vw] rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/50">
                        {/* Improved Modal Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-20">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <FileText className="h-6 w-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="text-[20px] font-bold text-slate-900">
                                        {editId ? "Modify Agreement" : "Draft New Agreement"}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                            {form.agreement_no || "DRAFT-SYS-ID"}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <p className="text-[12px] font-medium text-slate-400 font-mono italic">
                                            {form.date}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {tab === "content" && (
                                    <button 
                                        onClick={() => setShowPreview(!showPreview)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                            showPreview 
                                              ? "bg-violet-50 border-violet-200 text-violet-700 shadow-sm" 
                                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <Eye size={16} />
                                        {showPreview ? "Hide Preview" : "Show Preview"}
                                    </button>
                                )}
                                <button onClick={() => setOpenForm(false)} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* NEW Sidebar Navigation */}
                            <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-1.5 shrink-0">
                                {[
                                    { id: 'basic', label: 'Agreement Details', icon: Layout, desc: 'Client & Dates' },
                                    { id: 'content', label: 'Agreement Builder', icon: Pencil, desc: 'Interactive Content' },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-xl transition-all group text-left relative overflow-hidden",
                                            tab === t.id 
                                                ? "bg-white text-violet-600 shadow-md ring-1 ring-slate-100" 
                                                : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                                        )}
                                    >
                                        {tab === t.id && <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-violet-600 rounded-full" />}
                                        <div className={clsx(
                                            "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                                            tab === t.id ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
                                        )}>
                                            <t.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold leading-tight">{t.label}</p>
                                            <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">{t.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-hidden relative flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {tab === "basic" && (
                                        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="space-y-8">
                                                <section className="space-y-5">
                                                   <SectionHeader icon={ShieldAlert} title="Basic Details" color="violet" />
                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                       <div className="md:col-span-2 space-y-1.5">
                                                           <Label text="Agreement Title" required />
                                                           <input
                                                               type="text"
                                                               value={form.title}
                                                               onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                               className={clsx("input-premium font-bold py-3.5", errors.title && "border-rose-400")}
                                                               placeholder="e.g. Master Service Agreement - 2026"
                                                           />
                                                       </div>
                                                       <div className="space-y-1.5">
                                                           <Label text="Select Client" required />
                                                           <select
                                                               value={form.client_id}
                                                               onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                                                               className={clsx("input-premium", errors.client_id && "border-rose-400")}
                                                           >
                                                               <option value="">Select Client...</option>
                                                               {clients.map((c) => (
                                                                   <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                                                               ))}
                                                           </select>
                                                       </div>
                                                       <div className="grid grid-cols-2 gap-3">
                                                           <div className="space-y-1.5">
                                                               <Label text="Agreement Date" required />
                                                               <input
                                                                   type="date"
                                                                   value={form.date}
                                                                   onChange={(e) => setForm({ ...form, date: e.target.value })}
                                                                   className={clsx("input-premium", errors.date && "border-rose-400")}
                                                               />
                                                           </div>
                                                           <div className="space-y-1.5">
                                                               <Label text="Status" />
                                                               <select
                                                                   value={form.status}
                                                                   onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                                   className="input-premium"
                                                               >
                                                                   {STATUS_OPTIONS.map((s) => (
                                                                       <option key={s} value={s}>{s}</option>
                                                                   ))}
                                                               </select>
                                                           </div>
                                                       </div>
                                                   </div>
                                                </section>

                                                <section className="space-y-5 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                                                   <SectionHeader icon={Building2} title="Branding Overrides" color="indigo" />
                                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                       <div className="space-y-1.5">
                                                           <Label text="Company Name" />
                                                           <input
                                                               type="text"
                                                               value={form.override_company_name}
                                                               onChange={(e) => setForm({ ...form, override_company_name: e.target.value })}
                                                               className="input-premium h-10"
                                                           />
                                                       </div>
                                                       <div className="space-y-1.5">
                                                           <Label text="Tagline" />
                                                           <input
                                                               type="text"
                                                               value={form.tagline}
                                                               onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                                                               className="input-premium h-10"
                                                           />
                                                       </div>
                                                       <div className="space-y-1.5">
                                                            <Label text="Company Logo" />
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={form.company_logo || ''}
                                                                    onChange={(e) => setForm({ ...form, company_logo: e.target.value })}
                                                                    className="input-premium h-10"
                                                                    placeholder="Logo URL..."
                                                                />
                                                                <button className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 transition-colors shadow-sm">
                                                                    <ImageIcon size={16} />
                                                                </button>
                                                            </div>
                                                       </div>
                                                   </div>
                                                </section>

                                                <section className="space-y-5">
                                                   <SectionHeader icon={StickyNote} title="Internal Notes" color="rose" />
                                                   <div className="space-y-1.5">
                                                       <Label text="Private Notes" />
                                                       <textarea
                                                           value={form.notes}
                                                           onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                                           className="input-premium min-h-[100px] py-3 text-[13px]"
                                                           placeholder="Private records, audit trails, or restricted context notes..."
                                                       />
                                                   </div>
                                                </section>
                                            </div>
                                        </div>
                                    )}

                                    {tab === "content" && (
                                        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden lg:flex-row">
                                            <div className={clsx(
                                                "transition-all duration-500 flex flex-col",
                                                showPreview ? "flex-1 lg:max-w-[55%] xl:max-w-[50%] border-r border-slate-200" : "flex-1"
                                            )}>
                                                <AgreementBuilder
                                                    value={form.content || []}
                                                    onChange={(v) => setForm({ ...form, content: v })}
                                                />
                                            </div>
                                            
                                            {showPreview && (
                                                <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden animate-in slide-in-from-right-10 duration-500">
                                                    <div className="p-3 border-b border-slate-200 bg-white shadow-sm z-10 flex justify-between items-center shrink-0">
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 rounded-lg">
                                                            <Eye size={12} className="text-violet-600 font-black" />
                                                            <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                                                                Optical Live Preview
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Renderer:</span>
                                                            <select
                                                                value={livePreviewTemplateId}
                                                                onChange={e => setLivePreviewTemplateId(e.target.value)}
                                                                className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
                                                            >
                                                                <option value="standard">Legacy Standard</option>
                                                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto p-8 flex justify-center perspective-[1000px] bg-slate-200/40 custom-scrollbar scroll-smooth">
                                                        <div className="bg-white border border-slate-200 shadow-2xl rounded-[1px] w-[210mm] max-w-none origin-top hover:scale-[0.8] transform scale-[0.6] 2xl:scale-[0.7] transition-all duration-500 min-h-[297mm] ring-1 ring-slate-900/5 relative mb-40">
                                                            {livePreviewTemplateId === 'standard' ? (
                                                                <div className="p-16 text-slate-800">
                                                                    <div className="flex justify-between items-start mb-12 gap-8">
                                                                        <div className="space-y-1">
                                                                            <p className="font-extrabold text-[24px] text-slate-900 tracking-tighter leading-none">{form.override_company_name}</p>
                                                                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">{form.tagline}</p>
                                                                        </div>
                                                                        <div className="text-right flex flex-col items-end gap-1 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Descriptor</p>
                                                                            <p className="text-[13px] font-bold text-slate-800 tracking-tight">{form.agreement_no || "PROVISIONAL"}</p>
                                                                            <p className="text-[11px] font-medium text-slate-500 mt-1">{form.date}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-full h-[6px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400 mb-12 rounded-full shadow-lg shadow-violet-500/10" />
                                                                    <h1 className="text-[40px] font-black text-slate-900 mb-12 mt-4 pb-8 border-b border-slate-100 text-center uppercase tracking-tighter leading-none">
                                                                        {form.title || "Untitled Document"}
                                                                    </h1>
                                                                    {form.content?.length > 0 ? (
                                                                        <AgreementContentDisplay blocks={form.content} />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center py-40 text-slate-300">
                                                                            <Layers size={48} className="opacity-20 mb-4" />
                                                                            <p className="text-lg font-bold italic tracking-tight uppercase opacity-40">Assemble Matrix Blocks</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                (() => {
                                                                    const previewProps = {
                                                                        ...form,
                                                                        client: clients.find(c => String(c.id) === String(form.client_id)) || {},
                                                                        content: form.content
                                                                    };
                                                                    const html = getLivePreviewHtml(previewProps);
                                                                    return html ? <div dangerouslySetInnerHTML={{ __html: html }} className="animate-in fade-in zoom-in-95 duration-700" /> : <div className="p-20 text-center text-slate-400 font-bold italic">Module Execution Error</div>;
                                                                })()
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 z-20">
                                    <button 
                                        onClick={() => setOpenForm(false)} 
                                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-bold hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-sm"
                                    >
                                        Discard Changes
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {tab === "basic" && (
                                            <button 
                                                onClick={() => setTab("content")} 
                                                className="px-6 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-[14px] font-bold hover:bg-violet-100 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                Next Construction <ChevronRight size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-10 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-xl text-[14px] font-bold shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 transition-all hover:-translate-y-[2px] active:scale-95 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                            <div className="flex items-center gap-2 relative z-10">
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                <span>{isSaving ? 'Processing...' : (editId ? 'Commit Update' : 'Finalize Agreement')}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                                { id: 'quotation', name: 'Quotation Based', desc: 'Optimized for project proposals', icon: FileText, color: 'bg-violet-500' },
                                { id: 'invoice', name: 'Invoice Format', desc: 'Focus on payments & terms', icon: Sparkles, color: 'bg-indigo-500' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => confirmAdd(t.id)}
                                    className="group flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-violet-500 hover:bg-white hover:shadow-xl hover:shadow-violet-500/10 transition-all"
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
        </div>
    );
}

export default Agreements;
