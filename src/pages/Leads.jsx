import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Plus, Upload, Download, LayoutList, Kanban, Calendar,
  MoreHorizontal, CheckCircle2, Clock, CheckSquare, AlertCircle, Trash2, Edit2, Eye, Phone, MessageSquare, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Building2, MapPin, X, ArrowRight, FileText, StickyNote, Loader2, Save, Send, Target, MapPin as LocationIcon, Briefcase, Activity, Filter, Search, Mail
} from 'lucide-react';
import { getAssignees, saveAssignee, saveLead, getLeadNotes, createLeadNote, updateLeadNote, deleteLeadNote } from '../services/db';
import { useQueryClient } from '@tanstack/react-query';
import { useLeads, useSaveLead, useDeleteLead } from '../hooks/useApiQueries';
import { queryKeys } from '../query/queryKeys';
import clsx from 'clsx';
import SetFollowUpModal from '../components/SetFollowUpModal';
import LogCallModal from '../components/LogCallModal';
import FollowUpCalendar from './FollowUpCalendar';
import { TableSkeleton } from '../components/Skeleton';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import ToolbarSearch from '../components/ui/ToolbarSearch';
import EmptyState from '../components/ui/EmptyState';
import { FilterSelect, ClearFiltersButton } from '../components/ui/FilterControls';
import { TableSectionHeader, TablePagination } from '../components/ui/DataTableSection';
import { ActionIconButton } from '../components/ui/TableRowActions';
import SlideOver from '../components/ui/SlideOver';

const LeadModal = ({ isOpen, onClose, lead, onSave, assignees = [], onAddAssignee }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        company: '', jobTitle: '', location: '', status: 'New', source: '',
        priority: 'Medium', score: 0, value: 0,
        assignedTo: 'Unassigned', qualified: false, notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('identity');

    useEffect(() => {
        if (lead) setFormData(lead);
        else setFormData({
            firstName: '', lastName: '', email: '', phone: '',
            company: '', jobTitle: '', location: '', status: 'New', source: '',
            priority: 'Medium', score: 0, value: 0,
            assignedTo: 'Unassigned', qualified: false, notes: ''
        });
        setActiveTab('identity');
    }, [lead, isOpen]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({ ...formData, id: lead ? lead.id : null });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const Label = ({ children, required }) => (
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {children} {required && <span className="text-rose-500">*</span>}
        </label>
    );

    const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm";

    const TABS = [
        { id: 'identity', label: 'Lead Identity', icon: User },
        { id: 'positioning', label: 'Strategic Positioning', icon: Target },
        { id: 'notes', label: 'Interaction Notes', icon: StickyNote },
    ];

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={lead ? 'Modify Strategic Lead' : 'Initialize New Prospect'}
            size="5xl"
            footer={(
                <div className="flex justify-between items-center w-full px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Potential Value</span>
                            <span className="text-[18px] font-black text-slate-900 font-mono italic mt-1 leading-none">₹{(formData.value || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span>{isSaving ? 'Synchronizing...' : (lead ? 'Save Changes' : 'Initialize Lead')}</span>
                        </button>
                    </div>
                </div>
            )}
        >
            <div className="flex h-full min-h-[600px] relative">
                {/* Sidebar Navigation */}
                <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
                    <div className="flex flex-col gap-2 sticky top-0">
                        {TABS.map((tab, idx) => (
                            <div key={tab.id}>
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                                        activeTab === tab.id
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    {activeTab === tab.id && (
                                        <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                                    )}
                                    <tab.icon className={clsx("h-4 w-4", activeTab === tab.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    <span>{tab.label}</span>
                                </button>
                                {idx < TABS.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 pl-10">
                    <div className="pb-20">
                        {activeTab === 'identity' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <Label required>First Name</Label>
                                        <input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputCls} placeholder="John" required />
                                    </div>
                                    <div>
                                        <Label required>Last Name</Label>
                                        <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputCls} placeholder="Doe" required />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Company Entity</Label>
                                        <div className="relative">
                                            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className={clsx(inputCls, "pl-11")} placeholder="Corporate designation..." />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Email Address</Label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={clsx(inputCls, "pl-11")} placeholder="john.doe@company.com" />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Phone Connection</Label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={clsx(inputCls, "pl-11")} placeholder="+91 00000 00000" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'positioning' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <Label>Lifecycle Status</Label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={clsx(inputCls, "appearance-none")}>
                                            <option>New</option>
                                            <option>Contacted</option>
                                            <option>Working</option>
                                            <option>Qualified</option>
                                            <option>Lost</option>
                                            <option>Converted</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Strategic Priority</Label>
                                        <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className={clsx(inputCls, "appearance-none")}>
                                            <option>Low</option>
                                            <option>Medium</option>
                                            <option>High</option>
                                            <option>Urgent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Estimated Value (₹)</Label>
                                        <input type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className={clsx(inputCls, "font-mono italic")} />
                                    </div>
                                    <div>
                                        <Label>Executive Assignee</Label>
                                        <div className="flex gap-2">
                                            <select value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} className={clsx(inputCls, "flex-1 appearance-none")}>
                                                <option>Unassigned</option>
                                                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                            <button type="button" onClick={() => {
                                                const name = prompt('Stakeholder Name:');
                                                if (name) onAddAssignee(name);
                                            }} className="px-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95">
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Lead Source</Label>
                                        <input type="text" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className={inputCls} placeholder="Organic, Referral, LinkedIn etc." />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <Label>Engagement Notes & Strategic Insights</Label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className={clsx(inputCls, "min-h-[300px] resize-none py-6")}
                                        placeholder="Add critical background, interaction history, or strategic notes..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideOver>
    );
};

const OverdueModal = ({ isOpen, onClose, overdueLeads, onReschedule, onView }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 shadow-sm">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Overdue Follow-ups</h3>
                            <p className="text-sm text-slate-500 mt-0.5"><span className="font-semibold text-red-600">{overdueLeads.length} lead{overdueLeads.length !== 1 ? 's' : ''}</span> require immediate attention</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    {overdueLeads.map(lead => {
                        const overdueFollowUp = lead.followUps?.find(f => f.status !== 'completed' && new Date(f.scheduled_at) < new Date());
                        if (!overdueFollowUp) return null;

                        const daysOverdue = Math.floor((new Date() - new Date(overdueFollowUp.scheduled_at)) / (1000 * 60 * 60 * 24));

                        return (
                            <div key={lead.id} className="bg-white border border-gray-200/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="font-mono text-[10px] text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded border border-brand-100/50">LEAD-{lead.id}</span>
                                                <h4 className="font-bold text-slate-800 text-base">{lead.firstName} {lead.lastName}</h4>
                                                {lead.company && <span className="text-slate-500 text-sm">at {lead.company}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    Due: <span className="text-slate-700 font-medium">{new Date(overdueFollowUp.scheduled_at).toLocaleString()}</span>
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 space-y-1 pt-2">
                                                <div className="flex items-center gap-3">
                                                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-brand-600 transition-colors">
                                                        <User size={12} /> {lead.email}
                                                    </a>
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1.5 text-slate-600">
                                                            <Phone size={12} /> {lead.phone}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Assigned to: <span className="text-slate-700 font-medium">{lead.assignedTo}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => {
                                            onClose();
                                            onView(lead);
                                        }} className="px-3 py-1.5 bg-white border border-gray-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-gray-50 hover:text-brand-600 shadow-sm transition-all">View</button>
                                        <button onClick={() => {
                                            onClose();
                                            onReschedule(lead, overdueFollowUp);
                                        }} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 shadow-sm shadow-brand-200 transition-all flex items-center gap-1">
                                            <CalendarIcon size={12} /> Reschedule
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-gray-100 bg-white flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
};

const NOTE_TYPES = ['General Note', 'Call Note', 'Follow-up Note', 'Meeting Note', 'Important'];

const AddNoteModal = ({ isOpen, onClose, leadId, existingNote, onSaved }) => {
    const [note, setNote] = useState('');
    const [noteType, setNoteType] = useState('General Note');
    const [followUpDate, setFollowUpDate] = useState('');
    const [reminder, setReminder] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!existingNote;

    useEffect(() => {
        if (isOpen) {
            if (existingNote) {
                setNote(existingNote.note || '');
                setNoteType(existingNote.noteType || 'General Note');
                setFollowUpDate(existingNote.followUpDate ? existingNote.followUpDate.slice(0, 10) : '');
                setReminder(!!existingNote.reminder);
            } else {
                setNote('');
                setNoteType('General Note');
                setFollowUpDate('');
                setReminder(false);
            }
            setError('');
        }
    }, [isOpen, existingNote, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const trimmed = (note || '').trim();
        if (!trimmed) {
            setError('Note is required.');
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                await updateLeadNote(existingNote.id, {
                    note: trimmed,
                    noteType,
                    followUpDate: followUpDate || null,
                    reminder,
                });
            } else {
                await createLeadNote(leadId, {
                    note: trimmed,
                    noteType,
                    followUpDate: followUpDate || null,
                    reminder,
                });
            }
            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save note.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Note' : 'Add Note'}</h3>
                    <p className="text-sm text-slate-500 mt-1">{(isEdit ? 'Update' : 'Add')} a note for this lead.</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Note <span className="text-red-500">*</span></label>
                        <textarea
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="input resize-none w-full"
                            placeholder="Enter note..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Note Type</label>
                        <select
                            value={noteType}
                            onChange={(e) => setNoteType(e.target.value)}
                            className="input w-full"
                        >
                            {NOTE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Follow-up Date (optional)</label>
                        <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            className="input w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <input
                            type="checkbox"
                            id="reminder"
                            checked={reminder}
                            onChange={(e) => setReminder(e.target.checked)}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="reminder" className="text-sm font-medium text-slate-700 cursor-pointer">Reminder</label>
                    </div>
                    <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ViewLeadModal = ({ isOpen, onClose, lead, onEdit, onSetFollowUp, onLogCall }) => {
    const [activeTab, setActiveTab] = useState('activity');
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [addNoteOpen, setAddNoteOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [viewingNote, setViewingNote] = useState(null);

    useEffect(() => {
        if (isOpen && lead?.id) {
            setNotesLoading(true);
            getLeadNotes(lead.id).then((data) => {
                setNotes(data);
                setNotesLoading(false);
            }).catch(() => setNotesLoading(false));
        } else {
            setNotes([]);
        }
    }, [isOpen, lead?.id]);

    if (!isOpen || !lead) return null;

    // Helper for timeline items
    const TimelineItem = ({ act }) => (
        <div className="relative pl-8 pb-8 group last:pb-0">
            {/* Line connecting items */}
            <div className={`absolute left-3.5 top-3.5 bottom-0 w-0.5 bg-gray-100 group-last:hidden`}></div>

            {/* Icon/Dot */}
            <div className={`absolute left-0 top-1 h-7 w-7 rounded-full border-2 flex items-center justify-center bg-white z-10 
                ${act.type === 'call_log' ? 'border-purple-200 text-purple-600' :
                    act.type === 'follow_up' ? 'border-brand-200 text-brand-600' :
                        act.type === 'note' ? 'border-amber-200 text-amber-600' : 'border-gray-200 text-slate-400'}`}>
                {act.type === 'call_log' ? <Phone size={12} /> :
                    act.type === 'follow_up' ? <CalendarIcon size={12} /> :
                        act.type === 'note' ? <FileText size={12} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <div>
                    <h5 className="text-sm font-bold text-slate-800">
                        {act.type === 'call_log' ? 'Call Logged' :
                            act.type === 'follow_up' ? 'Follow-up Scheduled' :
                                act.type === 'note' ? 'Note Added' : 'Lead Created'}
                    </h5>
                    {act.type === 'call_log' ? (
                        <div className="text-sm text-slate-600 mt-1 bg-purple-50 p-3 rounded-xl border border-purple-100/50">
                            <div className="flex items-center gap-3 mb-1.5 text-xs font-medium text-purple-700">
                                <span>Outcome: {act.outcome || 'N/A'}</span>
                                {act.duration && <span>• {act.duration}m</span>}
                            </div>
                            <p className="italic text-slate-600 text-xs leading-relaxed">"{act.notes}"</p>
                        </div>
                    ) : act.type === 'follow_up' ? (
                        <p className="text-sm text-slate-600 mt-1">
                            Follow-up scheduled for <span className="font-semibold text-brand-700">{new Date(act.scheduled_at).toLocaleString()}</span>.
                            {act.notes && <span className="block mt-1 text-xs text-slate-500 italic">Note: {act.notes}</span>}
                        </p>
                    ) : act.type === 'note' ? (
                        <p className="text-sm text-slate-600 mt-1 bg-amber-50 p-3 rounded-xl border border-amber-100/50">
                            "{act.note}"
                            <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wide">By {act.createdBy || 'Admin'}</p>
                        </p>
                    ) : (
                        <p className="text-sm text-slate-500 mt-1">Lead was created in the system</p>
                    )}
                    {act.type !== 'note' && <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wide">By: Default Admin</p>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    {act.date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
            </div>
        </div>
    );

    const activities = [
        ...(lead.followUps || []).map(f => ({ ...f, type: 'follow_up', date: new Date(f.created_at || f.createdAt) })),
        ...(lead.callLogs || []).map(c => ({ ...c, type: 'call_log', date: new Date(c.created_at || c.createdAt) })),
        ...notes.map(n => ({ type: 'note', note: n.note, createdBy: n.createdBy, date: new Date(n.created_at || n.createdAt) }))
    ].sort((a, b) => b.date - a.date);

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{lead.firstName} {lead.lastName}</h3>
                            <span className={`badge ${lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                                {lead.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 font-mono flex items-center gap-2">
                            LEAD-{lead.id}
                            {lead.company && <span className="flex items-center gap-1 before:content-['•'] before:mx-1 before:text-slate-300 text-slate-600">{lead.company}</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <div className="flex flex-col lg:flex-row h-full">
                        {/* Sidebar */}
                        <div className="w-full lg:w-1/3 bg-slate-50 border-r border-gray-100 p-6 space-y-8 overflow-y-auto">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Details</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                            <MessageSquare size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Email</p>
                                            <a href={`mailto:${lead.email}`} className="text-sm font-medium text-brand-600 hover:underline break-all">{lead.email}</a>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                            <Phone size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Phone</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                            <Building2 size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Company</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.company || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                            <MapPin size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Location</p>
                                            <p className="text-sm font-medium text-slate-700">{lead.location || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Properties</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Priority</p>
                                        <span className={`inline-flex mt-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border
                                            ${lead.priority === 'Urgent' ? "bg-red-50 text-red-700 border-red-100" :
                                                lead.priority === 'High' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                    "bg-blue-50 text-blue-700 border-blue-100"
                                            }`}>
                                            {lead.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Score</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{lead.score}/100</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Source</p>
                                        <p className="text-sm font-medium text-slate-700 mt-1">{lead.source || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Assigned</p>
                                        <p className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-1">
                                            <User size={12} className="text-slate-400" /> {lead.assignedTo}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content - Tabs: Activity | Notes */}
                        <div className="w-full flex-1 flex flex-col bg-white min-h-0">
                            <div className="px-6 lg:px-8 pt-6">
                                <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200 shadow-sm">
                                    {['activity', 'notes'].map((t, idx) => (
                                        <React.Fragment key={t}>
                                            {idx > 0 && <div className="w-px bg-slate-200 my-2 shadow-[0_0_1px_rgba(0,0,0,0.1)]"></div>}
                                            <button
                                                onClick={() => setActiveTab(t)}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                                    activeTab === t
                                                        ? "bg-white text-violet-600 shadow-md"
                                                        : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                {t === 'activity' ? 'Timeline Activity' : 'Internal Notes'}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                                {activeTab === 'activity' && (
                                    <div className="space-y-6">
                                        {activities.map((act, i) => (
                                            <TimelineItem key={`${act.type}-${i}`} act={act} />
                                        ))}
                                        <TimelineItem act={{ type: 'created', date: new Date(lead.createdAt || lead.created_at || Date.now()) }} />
                                    </div>
                                )}
                                {activeTab === 'notes' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Notes Log</h4>
                                            <button
                                                type="button"
                                                onClick={() => { setEditingNote(null); setAddNoteOpen(true); }}
                                                className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 shadow-sm flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Add Note
                                            </button>
                                        </div>
                                        {notesLoading ? (
                                            <p className="text-sm text-slate-500 py-8 text-center">Loading notes...</p>
                                        ) : notes.length === 0 ? (
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 text-center">
                                                <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500 font-medium">No notes yet</p>
                                                <p className="text-sm text-slate-400 mt-1">Add a note to track activities for this lead.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddNoteOpen(true)}
                                                    className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700"
                                                >
                                                    Add Note
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-0">
                                                {notes.map((n) => (
                                                    <div key={n.id} className="relative pl-8 pb-6 group last:pb-0 border-b border-gray-100 last:border-0">
                                                        <div className="absolute left-3.5 top-3.5 bottom-0 w-0.5 bg-gray-100 group-last:hidden" />
                                                        <div className="absolute left-0 top-1 h-7 w-7 rounded-full border-2 border-amber-200 text-amber-600 flex items-center justify-center bg-white z-10">
                                                            <FileText size={12} />
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="text-sm font-bold text-slate-800">{n.noteType}</h5>
                                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.note}</p>
                                                                {n.followUpDate && (
                                                                    <p className="text-xs text-brand-600 mt-1 font-medium">Follow-up: {new Date(n.followUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                                                )}
                                                                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide">By {n.createdBy || 'Admin'}</p>
                                                                <p className="text-[10px] text-slate-400">{new Date(n.created_at || n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-2 sm:mt-0">
                                                                <button type="button" onClick={() => setViewingNote(n)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors" title="View full note"><Eye className="w-4 h-4" /></button>
                                                                <button type="button" onClick={() => { setEditingNote(n); setAddNoteOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                                <button type="button" onClick={() => { if (window.confirm('Delete this note?')) { deleteLeadNote(n.id).then(() => getLeadNotes(lead.id).then(setNotes)); } }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* View full note modal */}
                {viewingNote && (
                    <div className="fixed inset-0 bg-slate-900/60 z-[55] flex items-center justify-center p-4" onClick={() => setViewingNote(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{viewingNote.noteType}</h4>
                            <p className="text-slate-700 whitespace-pre-wrap">{viewingNote.note}</p>
                            {viewingNote.followUpDate && <p className="text-sm text-brand-600 mt-2">Follow-up: {new Date(viewingNote.followUpDate).toLocaleDateString()}</p>}
                            <p className="text-xs text-slate-400 mt-4">By {viewingNote.createdBy || 'Admin'} · {new Date(viewingNote.created_at || viewingNote.createdAt).toLocaleString()}</p>
                            <button type="button" onClick={() => setViewingNote(null)} className="mt-4 btn-secondary">Close</button>
                        </div>
                    </div>
                )}

                <AddNoteModal
                    isOpen={addNoteOpen}
                    onClose={() => { setAddNoteOpen(false); setEditingNote(null); }}
                    leadId={lead.id}
                    existingNote={editingNote}
                    onSaved={() => getLeadNotes(lead.id).then(setNotes)}
                />

                <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-white flex-shrink-0 z-10">
                    <div className="flex gap-3">
                        <button onClick={() => onLogCall(lead)} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 font-semibold transition flex items-center gap-2 text-sm shadow-sm">
                            <Phone className="h-4 w-4" /> Log Call
                        </button>
                        <button onClick={() => onSetFollowUp(lead)} className="px-4 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-100 font-semibold transition flex items-center gap-2 text-sm shadow-sm">
                            <CalendarIcon className="h-4 w-4" /> Set Follow-up
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn-secondary">Close</button>
                        <button onClick={() => onEdit(lead)} className="btn-primary">Edit Lead</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card hover:border-brand-200/50 group h-36 flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
            <div className={`p-3.5 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
            </div>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className={`h-full rounded-full ${color} opacity-30`} style={{ width: '70%' }}></div>
        </div>
    </div>
);

const OverdueFollowUpsCard = ({ count, onClick, hasOverdue }) => (
    <button
        type="button"
        onClick={onClick}
        className={clsx(
            "card group h-36 flex flex-col justify-between p-6 text-left bg-amber-50/70 border-amber-200 shadow-sm transition-all relative",
            hasOverdue ? "hover:border-amber-300/60 hover:shadow-md" : "cursor-default"
        )}
    >
        {hasOverdue && (
            <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm animate-pulse" title="Overdue follow-ups exist" />
        )}
        <div className="flex justify-between items-start">
            <div className="p-3.5 rounded-xl bg-amber-100 border border-amber-200">
                <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-right">
                <p className="text-sm font-medium text-slate-600 mb-1">Overdue Follow-ups</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{count}</h3>
            </div>
        </div>
        <div className="flex flex-col gap-1 mt-4">
            <p className="text-xs text-slate-500">
                {hasOverdue ? 'Number of leads with overdue follow-up date' : 'No overdue follow-ups'}
            </p>
            {hasOverdue && (
                <span className="text-xs font-semibold text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                    Click to view <ArrowRight className="w-3.5 h-3.5" />
                </span>
            )}
        </div>
        <div className="w-full bg-amber-100/80 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400 opacity-40" style={{ width: hasOverdue ? '70%' : '0%' }}></div>
        </div>
    </button>
);

const ViewToggle = ({ active, onChange }) => (
    <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
        {[
            { id: 'list', icon: LayoutList, label: 'List' },
            { id: 'kanban', icon: Kanban, label: 'Kanban' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' }
        ].map(view => (
            <button
                key={view.id}
                onClick={() => onChange(view.id)}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    active === view.id
                        ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100"
                        : "text-slate-500 hover:text-slate-700 hover:bg-gray-50"
                )}
            >
                <view.icon className="w-4 h-4" />
                {view.label}
            </button>
        ))}
    </div>
);

const KanbanView = ({ leads, onView }) => {
    const columns = [
        { id: 'New', label: 'New', color: 'border-blue-500', bg: 'bg-blue-50' },
        { id: 'Contacted', label: 'Contacted', color: 'border-yellow-500', bg: 'bg-yellow-50' },
        { id: 'Qualified', label: 'Qualified', color: 'border-cyan-500', bg: 'bg-cyan-50' },
        { id: 'Proposal Sent', label: 'Proposal Sent', color: 'border-purple-500', bg: 'bg-purple-50' },
        { id: 'Negotiation', label: 'Negotiation', color: 'border-orange-500', bg: 'bg-orange-50' },
        { id: 'Converted', label: 'Converted', color: 'border-emerald-500', bg: 'bg-emerald-50' },
        { id: 'Lost', label: 'Lost', color: 'border-red-500', bg: 'bg-red-50' }
    ];

    const getColumnLeads = (status) => leads.filter(l => l.status === status);

    return (
        <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-280px)] px-1">
            {columns.map(col => (
                <div key={col.id} className="min-w-[320px] bg-gray-50/50 rounded-2xl flex flex-col h-full border border-gray-100/50 shadow-sm">
                    <div className={`p-4 border-b border-gray-100 bg-white rounded-t-2xl flex justify-between items-center sticky top-0 z-10 shadow-sm`}>
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className={`w-2 h-8 rounded-full ${col.bg.replace('bg-', 'bg-')} ${col.color.replace('border-', 'bg-')}`}></div>
                            <h3 className="font-bold text-slate-800">{col.label}</h3>
                        </div>
                        <span className="bg-gray-100 text-slate-600 py-1 px-2.5 rounded-lg text-xs font-bold shadow-inner">
                            {getColumnLeads(col.id).length}
                        </span>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {getColumnLeads(col.id).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                                <div className="w-12 h-12 rounded-full bg-gray-100/50 flex items-center justify-center mb-2">
                                    <LayoutList className="w-5 h-5 opacity-50" />
                                </div>
                                <p>No leads yet</p>
                            </div>
                        ) : (
                            getColumnLeads(col.id).map(lead => (
                                <div key={lead.id} className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:border-brand-200/50 transition-all cursor-pointer group relative"
                                    onClick={() => onView(lead)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-brand-700 transition-colors">{lead.firstName} {lead.lastName}</h4>
                                        <span className={clsx("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide",
                                            lead.priority === 'Urgent' ? "bg-red-50 text-red-700 border border-red-100" :
                                                lead.priority === 'High' ? "bg-orange-50 text-orange-700 border border-orange-100" :
                                                    lead.priority === 'Medium' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-100 text-gray-600"
                                        )}>{lead.priority}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mb-3 flex items-center gap-1">
                                        <span className="opacity-50">#</span>{lead.id}
                                    </p>

                                    {lead.company && <p className="text-xs text-slate-600 mb-2 truncate flex items-center gap-1.5"><Building2 size={10} className="text-slate-400" /> {lead.company}</p>}

                                    {(lead.notesCount ?? 0) > 0 && (
                                        <div className="text-xs mb-2">
                                            <span className="text-amber-600 font-medium flex items-center gap-1"><FileText size={10} /> Notes ({lead.notesCount})</span>
                                            {lead.lastNote?.note && <p className="text-slate-400 italic truncate mt-0.5" title={lead.lastNote.note}>{lead.lastNote.note}</p>}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-xs text-slate-400 mt-3 pt-3 border-t border-gray-50">
                                        <span className="font-semibold text-slate-500">Score: {lead.score}</span>
                                        <span className="text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-md">
                                            View <span className="text-sm leading-none">&rarr;</span>
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const Leads = () => {
    const [activeView, setActiveView] = useState('list');
    const [openModal, setOpenModal] = useState(false);
    const [editLead, setEditLead] = useState(null);
    const [viewLeadModalOpen, setViewLeadModalOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [assignees, setAssignees] = useState([]);
    const [followUpOpen, setFollowUpOpen] = useState(false);
    const [logCallOpen, setLogCallOpen] = useState(false);
    const [targetLead, setTargetLead] = useState(null);
    const [showOverdue, setShowOverdue] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const queryClient = useQueryClient();
    const filters = useMemo(() => ({
        search: searchDebounced.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        page: currentPage,
        per_page: 25,
    }), [searchDebounced, statusFilter, priorityFilter, currentPage]);

    const { data: leadsResult, isLoading } = useLeads(filters);
    const saveMutation = useSaveLead();
    const deleteMutation = useDeleteLead();

    const data = Array.isArray(leadsResult?.data) ? leadsResult.data : [];
    const meta = leadsResult?.meta ?? null;

    useEffect(() => {
        setAssignees(getAssignees());
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchDebounced, statusFilter, priorityFilter]);

    const handleSaveLead = async (lead) => {
        try {
            await saveMutation.mutateAsync(lead);
            toast.success('Lead strategy synchronized');
            setOpenModal(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Synchronization failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to purge this record from the pipeline?")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Lead purged');
        } catch (err) {
            toast.error('Purge failed');
        }
    };

    const openViewLead = (lead) => {
        setViewingLead(lead);
        setViewLeadModalOpen(true);
    };

    const handleAddAssignee = (name) => {
        const updated = saveAssignee(name);
        setAssignees(updated);
    };

    const EXCLUDED_OVERDUE_STATUSES = ['Lost', 'Converted', 'Closed'];
    const overdueLeads = data.filter(l => {
        if (EXCLUDED_OVERDUE_STATUSES.includes(l.status)) return false;
        return (l.followUps || []).some(f => {
            if (f.status === 'completed') return false;
            const d = new Date(f.scheduled_at);
            return !isNaN(d.getTime()) && d < new Date();
        });
    });

    const stats = {
        total: meta?.total || data.length,
        value: data.reduce((acc, l) => acc + (parseFloat(l.value) || 0), 0),
        contacted: data.filter(l => l.status === 'Contacted').length
    };

    const filteredLeads = data; // Already filtered by API

    return (
        <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
            {/* Header section with Stats */}
            <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
                <PageHeader
                    title="Intelligence Pipeline"
                    subtitle="Manage strategic leads, opportunity scoring, and stakeholder engagement across the conversion lifecycle."
                    primaryAction={(
                        <button onClick={() => { setEditLead(null); setOpenModal(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
                            <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                                <Plus size={16} />
                            </div>
                            <span>Create Prospect</span>
                        </button>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                    <StatCard title="Total Inventory" value={stats.total} icon={Target} color="bg-slate-800" />
                    <StatCard title="Pipeline Value" value={`$${stats.value.toLocaleString()}`} icon={Activity} color="bg-indigo-600" />
                    <StatCard title="Engagement Ratio" value={`${stats.total ? Math.round((stats.contacted / stats.total) * 100) : 0}%`} icon={Users} color="bg-violet-600" />
                    <OverdueFollowUpsCard 
                        count={overdueLeads.length} 
                        onClick={() => overdueLeads.length > 0 && setShowOverdue(true)} 
                        hasOverdue={overdueLeads.length > 0} 
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-white">
                <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
                    <div className="flex-1 min-w-[240px]">
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, company, or identification..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ViewToggle active={activeView} onChange={setActiveView} />
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <FilterSelect icon={Target} value={statusFilter} onChange={setStatusFilter}>
                            <option value="all">All Stages</option>
                            <option value="New">Initial Prospect</option>
                            <option value="Contacted">Active Outreach</option>
                            <option value="Working">Engaged/Nurture</option>
                            <option value="Qualified">Sales Ready</option>
                            <option value="Converted">Realized/Closed</option>
                            <option value="Lost">Closed/Lost</option>
                        </FilterSelect>
                        <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                            className={clsx(
                                "p-2.5 rounded-xl border transition-all shadow-sm active:scale-95",
                                showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-500/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Filter size={18} />
                        </button>
                        {(searchQuery || statusFilter !== "all" || priorityFilter !== "all") && (
                            <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("all"); setPriorityFilter("all"); }} />
                        )}
                    </div>
                </div>

                {showAdvancedFilters && (
                    <div className="bg-white px-6 lg:px-8 py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Priority State</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" 
                                value={priorityFilter} 
                                onChange={e => setPriorityFilter(e.target.value)}
                            >
                                <option value="all">All Priorities</option>
                                <option value="Urgent">Critical/Urgent</option>
                                <option value="High">Strategic/High</option>
                                <option value="Medium">Standard/Medium</option>
                                <option value="Low">Trivial/Low</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden relative">
                    {activeView === 'list' && (
                        <div className="h-full overflow-auto custom-scrollbar">
                            <div className="min-w-full">
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                                            <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-56">Lead Profile</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Contact Logic</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-36">Execution</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Valuation</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Pipeline Status</th>
                                            <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {isLoading ? (
                                            <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing Intelligence Pipeline...</td></tr>
                                        ) : filteredLeads.length === 0 ? (
                                            <tr><td colSpan="6" className="p-20"><EmptyState icon={Target} title="No Prospect Matches" description="Adjust your parameters or initialize a new record." /></td></tr>
                                        ) : (
                                            filteredLeads.map((item) => (
                                                <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                                                    <td className="px-6 lg:px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-11 h-11 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black text-lg shadow-inner border border-slate-200/50">
                                                                {item.firstName.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[14px] font-black text-slate-900 leading-none">{item.firstName} {item.lastName}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                                    {item.company || "Independent Entity"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 text-slate-600 text-[12px] font-bold">
                                                                <Mail size={12} className="text-indigo-400" /> {item.email}
                                                            </div>
                                                            {item.phone && (
                                                                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                                                                    <Phone size={11} className="text-slate-300" /> {item.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <User size={12} className="text-slate-300" />
                                                            {item.assignedTo}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <span className="font-mono text-[16px] font-black text-slate-900 italic tracking-tight">
                                                            ${item.value?.toLocaleString() || '0'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={clsx(
                                                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] inline-flex items-center gap-2 border shadow-sm",
                                                            item.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                        )}>
                                                            <div className={clsx('w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]', 
                                                                item.status === 'Converted' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-indigo-500 shadow-indigo-500/50"
                                                            )} />
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 lg:px-8 py-5 text-right">
                                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                            <ActionIconButton onClick={() => openViewLead(item)} title="Audit Lifecycle" icon={Eye} tone="view" />
                                                            <ActionIconButton onClick={() => { setEditLead(item); setOpenModal(true); }} title="Modify Intel" icon={Edit2} tone="edit" />
                                                            <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Record" icon={Trash2} tone="delete" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeView === 'kanban' && (
                        <div className="h-full bg-slate-50/50 p-6 lg:px-8 overflow-hidden">
                            <KanbanView leads={filteredLeads} onView={openViewLead} />
                        </div>
                    )}

                    {activeView === 'calendar' && (
                        <div className="h-full bg-white overflow-auto custom-scrollbar">
                            <FollowUpCalendar leads={data} onLeadClick={openViewLead} />
                        </div>
                    )}
                </div>

                <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
                    <div className="flex justify-between items-center">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Indexed {filteredLeads.length} Strategy Targets</span>
                         {meta && <TablePagination 
                            summary={`Showing ${(meta.current_page - 1) * meta.per_page + 1}–${Math.min(meta.current_page * meta.per_page, meta.total)} of ${meta.total}`} 
                            onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            onNext={() => setCurrentPage(p => p + 1)} 
                            previousDisabled={meta.current_page <= 1} 
                            nextDisabled={meta.current_page >= meta.last_page} 
                         />}
                    </div>
                </div>
            </div>

            <LeadModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                lead={editLead}
                onSave={handleSaveLead}
                assignees={assignees}
                onAddAssignee={handleAddAssignee}
            />

            <ViewLeadModal
                isOpen={viewLeadModalOpen}
                onClose={() => setViewLeadModalOpen(false)}
                lead={viewingLead}
                onEdit={(l) => {
                    setViewLeadModalOpen(false);
                    setEditLead(l);
                    setOpenModal(true);
                }}
                onSetFollowUp={(l) => {
                    setTargetLead(l);
                    setFollowUpOpen(true);
                }}
                onLogCall={(l) => {
                    setTargetLead(l);
                    setLogCallOpen(true);
                }}
            />

            <OverdueModal
                isOpen={showOverdue}
                onClose={() => setShowOverdue(false)}
                overdueLeads={overdueLeads}
                onReschedule={(l, f) => {
                    setTargetLead(l);
                    setFollowUpOpen(true);
                }}
                onView={openViewLead}
            />

            <SetFollowUpModal
                isOpen={followUpOpen}
                onClose={() => setFollowUpOpen(false)}
                lead={targetLead}
                onSaved={() => {
                    setFollowUpOpen(false);
                    invalidateCache('/leads');
                    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
                }}
            />

            <LogCallModal
                isOpen={logCallOpen}
                onClose={() => setLogCallOpen(false)}
                lead={targetLead}
                onSaved={() => {
                    setLogCallOpen(false);
                    invalidateCache('/leads');
                    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
                }}
            />
        </div>
    );
};

export default Leads;
