import { useState, useEffect } from "react";
import {
    Plus, Eye, X, User, Layout, Calendar, Filter, Sparkles, ShieldAlert,
    Pencil, Trash2, ChevronRight, ChevronLeft, Building2, Target, StickyNote,
    Layers, Briefcase, Info, Image as ImageIcon, Check, Loader2, Save, FileText,
    TrendingUp, FileSpreadsheet, Search, Download, BadgeCheck, Activity
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
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";

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

const StatCard = ({ title, value, icon: Icon, colorClass, subLabel }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
    <div className="flex items-start justify-between relative z-10">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</span>
        <h3 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mt-1">{value}</h3>
      </div>
      <div className={clsx("p-2.5 rounded-xl text-white shadow-lg", colorClass)}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
    </div>
    <div className="mt-6 relative z-10">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{subLabel || 'Contractual Metrics'}</p>
      <p className="text-[13px] font-black text-slate-700 tracking-tight italic">Operational Pipeline</p>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

export default function Agreements() {
    const [listData, setListData] = useState({ agreements: [], summary: null });
    const [clients, setClients] = useState([]);
    const [openForm, setOpenForm] = useState(false);
    const [openPreview, setOpenPreview] = useState(false);
    const [editId, setEditId] = useState(null);
    const [selectedAgreement, setSelectedAgreement] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [clientFilter, setClientFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSelection, setShowSelection] = useState(false);

    useEffect(() => {
        loadData();
        loadClients();
    }, []);

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
            toast.error("Failed to load agreements");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => loadData(), 500);
        return () => clearTimeout(t);
    }, [searchQuery, statusFilter, clientFilter]);

    const handleSave = async (formData) => {
        try {
            if (editId) {
                await agreementService.update(editId, formData);
                toast.success("Legal instrument updated");
            } else {
                await agreementService.create(formData);
                toast.success("New agreement recorded");
            }
            loadData();
            setOpenForm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to sync agreement");
            throw err;
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this legal instrument?")) return;
        try {
            await agreementService.delete(id);
            toast.success("Instrument purged");
            loadData();
        } catch (e) {
            toast.error("Operation failed");
        }
    };

    const openAdd = () => setShowSelection(true);

    const startWithTemplate = async (templateType) => {
        setShowSelection(false);
        try {
            const res = await agreementService.getNextNumber();
            const nextNo = res.data?.next_no || res.data?.agreement_no || res.data;
            let initialContent = [];
            
            if (templateType === 'quotation') {
                initialContent = [{ id: '1', type: 'heading', content: 'Project Agreement' }, { id: '2', type: 'paragraph', content: 'Execution terms based on quotation parameters.' }];
            } else if (templateType === 'lease') {
                initialContent = [{ id: '1', type: 'heading', content: 'Lease Agreement' }, { id: '2', type: 'paragraph', content: 'Standard leasing terms and conditions.' }];
            } else {
                initialContent = [{ id: '1', type: 'heading', content: 'Master Service Agreement' }, { id: '2', type: 'paragraph', content: 'Operational framework for services rendered.' }];
            }

            setEditId(null);
            setSelectedAgreement({ ...emptyForm, agreement_no: nextNo, content: initialContent });
            setOpenForm(true);
        } catch (e) {
            toast.error("Failed to sequence next ID");
        }
    };

    const summary = listData.summary || {};
    const agreements = listData.agreements || [];

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Legal & Agreements"
                subtitle="Manage professional contracts, service agreements, and binding legal instruments"
                primaryAction={(
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/20">
                        <Plus size={18} strokeWidth={3} />
                        <span>Create Agreement</span>
                    </button>
                )}
                secondaryActions={(
                    <button onClick={() => toast.error("Export not implemented")} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
                )}
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="Aggregated Index" value={summary.total ?? 0} icon={FileSpreadsheet} colorClass="bg-slate-800" />
                <StatCard title="Draft Stage" value={summary.draft ?? 0} icon={Clock} colorClass="bg-amber-600" />
                <StatCard title="Sent / Pending" value={summary.sent ?? 0} icon={FileText} colorClass="bg-blue-600" />
                <StatCard title="Signed / Active" value={summary.signed ?? 0} icon={BadgeCheck} colorClass="bg-emerald-600" />
                <StatCard title="Expired / Void" value={summary.expired ?? 0} icon={ShieldAlert} colorClass="bg-rose-600" />
            </div>

            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 sticky top-4 z-20">
                <div className="flex-1 min-w-[240px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by ID, client, or title..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-violet-500 transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <FilterSelect icon={Activity} value={statusFilter} onChange={setStatusFilter}>
                        <option value="All">All Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </FilterSelect>
                    <FilterSelect icon={User} value={clientFilter} onChange={setClientFilter}>
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                    </FilterSelect>
                    {(searchQuery || statusFilter !== "All" || clientFilter) && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setClientFilter(""); }} />}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <TableSectionHeader title="Agreement Registry" summary={`${agreements.length} instruments listed`} />
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Protocol ID</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Identification</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client Principal</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Effective Date</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">Synchronizing legal data...</td></tr>
                            ) : agreements.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-[13px] font-black text-slate-900 italic tracking-tight">{a.agreement_no}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 text-[13px]">{a.title}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-500">{a.client?.company_name?.[0] || '—'}</div>
                                            <span className="text-[13px] font-medium text-slate-700 truncate max-w-[180px]">{a.client?.company_name || a.client?.client_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[12px] font-bold text-slate-500">{a.date ? new Date(a.date).toLocaleDateString() : "—"}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                            a.status === "Signed" ? "bg-emerald-100 text-emerald-700" :
                                            a.status === "Draft" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <ActionIconButton onClick={() => { setEditId(a.id); setSelectedAgreement(a); setOpenForm(true); }} title="Modify" icon={Pencil} tone="edit" />
                                            <ActionIconButton onClick={() => handleDelete(a.id)} title="Purge" icon={Trash2} tone="delete" />
                                            <ActionIconButton onClick={() => { setSelectedAgreement(a); setOpenPreview(true); }} title="Visual Preview" icon={Eye} tone="view" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AgreementFormOverlay
                isOpen={openForm}
                onClose={() => setOpenForm(false)}
                agreement={selectedAgreement}
                clients={clients}
                onSave={handleSave}
            />

            {showSelection && (
                <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select Legal Structure</h2>
                                <p className="text-slate-500 text-sm mt-1">Initialize your document from a curated architectural base.</p>
                            </div>
                            <button onClick={() => setShowSelection(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[{ id: 'quotation', name: 'Service Provision', icon: FileText, color: 'bg-indigo-500' }, { id: 'lease', name: 'Asset Leasing', icon: Building2, color: 'bg-emerald-500' }, { id: 'blank', name: 'Custom Framework', icon: Sparkles, color: 'bg-violet-500' }].map(t => (
                                <button key={t.id} onClick={() => startWithTemplate(t.id)} className="group flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-violet-500 hover:bg-white hover:shadow-xl transition-all">
                                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg", t.color)}><t.icon size={24}/></div>
                                    <p className="font-black text-slate-800 text-[14px]">{t.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedAgreement && (
                <AgreementPreviewModal
                    isOpen={openPreview}
                    onClose={() => { setOpenPreview(false); setSelectedAgreement(null); }}
                    agreement={selectedAgreement}
                    onEdit={() => { setOpenPreview(false); setEditId(selectedAgreement.id); setOpenForm(true); }}
                    onDelete={() => { setOpenPreview(false); handleDelete(selectedAgreement.id); }}
                />
            )}
        </div>
    );
}

const AgreementFormOverlay = ({ isOpen, onClose, agreement, clients, onSave }) => {
    const [form, setForm] = useState(emptyForm);
    const [tab, setTab] = useState("basic");
    const [isSaving, setIsSaving] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [livePreviewTemplateId, setLivePreviewTemplateId] = useState("standard");
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        if (agreement && isOpen) setForm({ ...emptyForm, ...agreement });
        else setForm(emptyForm);
        setTab("basic");
        setTemplates(getTemplates().filter(t => t.module === 'agreements'));
    }, [agreement, isOpen]);

    const getLivePreviewHtml = () => {
        if (!livePreviewTemplateId || livePreviewTemplateId === 'standard') return null;
        const template = templates.find(t => t.id === livePreviewTemplateId);
        if (!template) return null;
        let templateHtml = getEffectiveTemplateHtml(template, 'agreements');
        const printData = buildAgreementPrintData(form, {}, null, { template, templateHasBodySection: templateHtml?.includes('print-section-body'), templateHtml });
        return resolveTemplateHtmlWithData(templateHtml, 'agreements', { agreement: printData });
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onSave(form);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={form.id ? 'Modify Legal Framework' : 'Assemble Agreement'}
            size="full"
            footer={(
                <div className="flex justify-end items-center w-full px-2 gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Discard Changes</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-10 py-2.5 bg-violet-600 text-white text-[14px] font-bold rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-500/20 flex items-center gap-2">
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        <Save size={18} />
                        <span>{form.id ? 'Commit Update' : 'Finalize Instrument'}</span>
                    </button>
                </div>
            )}
        >
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 sticky top-0 z-20 border border-slate-200">
                {['basic', 'content'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={clsx("flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all", tab === t ? "bg-white text-violet-600 shadow-md" : "text-slate-500 hover:text-slate-700")}>
                        {t === 'basic' ? 'Operational Specs' : 'Architectural Builder'}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden h-full">
                {tab === 'basic' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-w-4xl mx-auto">
                        <section className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-[12px] font-bold text-slate-700 mb-1.5 block">Document Designation</label>
                                    <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[15px] font-black tracking-tight outline-none focus:border-violet-500 shadow-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Master Service Agreement" />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-slate-700 mb-1.5 block">Client Principal</label>
                                    <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-violet-500 shadow-sm" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                                        <option value="">Select Principal...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[12px] font-bold text-slate-700 mb-1.5 block">Effective Date</label>
                                        <input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-violet-500 shadow-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[12px] font-bold text-slate-700 mb-1.5 block">Status</label>
                                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-violet-500 shadow-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={14}/> Branding Parameters</h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="text-[11px] font-bold text-slate-500 mb-1 block">Entity Designation</label><input className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-bold" value={form.override_company_name} onChange={e => setForm({...form, override_company_name: e.target.value})} /></div>
                                <div><label className="text-[11px] font-bold text-slate-500 mb-1 block">Brand Tagline</label><input className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-bold" value={form.tagline} onChange={e => setForm({...form, tagline: e.target.value})} /></div>
                            </div>
                        </section>
                    </div>
                )}
                {tab === 'content' && (
                    <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className={clsx("flex flex-col transition-all duration-500", showPreview ? "lg:w-1/2" : "w-full")}>
                            <AgreementBuilder value={form.content || []} onChange={v => setForm({...form, content: v})} />
                        </div>
                        {showPreview && (
                            <div className="hidden lg:flex flex-col flex-1 bg-slate-200/50 rounded-3xl border border-slate-200 overflow-hidden shadow-inner">
                                <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Optical Renderer</span></div>
                                    <select className="text-[10px] font-black bg-slate-100 border-none rounded px-2 py-1" value={livePreviewTemplateId} onChange={e => setLivePreviewTemplateId(e.target.value)}>
                                        <option value="standard">Standard Form</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                                    <div className="w-[210mm] bg-white shadow-2xl min-h-[297mm] transform origin-top scale-[0.65] xl:scale-[0.8]">
                                        {livePreviewTemplateId === 'standard' ? (
                                            <div className="p-16">
                                                <div className="flex justify-between items-start mb-12"><div className="space-y-1"><p className="text-[20px] font-black tracking-tighter">{form.override_company_name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{form.tagline}</p></div><div className="text-right"><p className="text-[12px] font-bold">{form.agreement_no}</p><p className="text-[10px] text-slate-400">{form.date}</p></div></div>
                                                <div className="w-full h-1 bg-indigo-600 mb-12 rounded-full" />
                                                <h1 className="text-[32px] font-black text-center mb-12 uppercase tracking-tighter">{form.title}</h1>
                                                <AgreementContentDisplay blocks={form.content} />
                                            </div>
                                        ) : <div dangerouslySetInnerHTML={{ __html: getLivePreviewHtml() }} />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </SlideOver>
    );
};
