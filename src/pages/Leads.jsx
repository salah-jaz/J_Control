import { useState, useEffect, useRef } from 'react';
import {
    Users, Plus, Upload, Download, Search, LayoutList, Kanban, Calendar,
    MoreHorizontal, CheckCircle2, Clock, CheckSquare, AlertCircle, Trash2, Edit2, Eye, Phone, MessageSquare, ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Building2, MapPin, X, ArrowRight
} from 'lucide-react';
import { getLeads, saveLead, deleteLead, getAssignees, saveAssignee } from '../services/db';
import clsx from 'clsx';
import SetFollowUpModal from '../components/SetFollowUpModal';
import LogCallModal from '../components/LogCallModal';
import FollowUpCalendar from './FollowUpCalendar';

const LeadModal = ({ isOpen, onClose, lead, onSave, assignees = [], onAddAssignee }) => {
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        company: '', jobTitle: '', location: '', status: 'New', source: '',
        priority: 'Medium', score: 0, value: 0,
        assignedTo: 'Unassigned', qualified: false, notes: ''
    });

    useEffect(() => {
        if (lead) {
            setFormData(lead);
        } else {
            setFormData({
                firstName: '', lastName: '', email: '', phone: '',
                company: '', jobTitle: '', location: '', status: 'New', source: '',
                priority: 'Medium', score: 0, value: 0,
                assignedTo: 'Unassigned', qualified: false, notes: ''
            });
        }
    }, [lead, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, id: lead ? lead.id : null });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{lead ? 'Edit Lead' : 'Add New Lead'}</h3>
                        <p className="text-sm text-slate-500 mt-1">Fill in the details below to manage this lead.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-red-500">*</span></label>
                                <input type="text" required className="input"
                                    value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                                <input type="text" required className="input"
                                    value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
                                <input type="email" required className="input"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                                <input type="text" className="input"
                                    value={formData.phone} onChange={e => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d+$/.test(val)) {
                                            setFormData({ ...formData, phone: val });
                                        }
                                    }} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                <input type="text" className="input"
                                    value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Job Title</label>
                                <input type="text" className="input"
                                    value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                                <input type="text" className="input"
                                    value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                                <select className="input"
                                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="New">New</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal Sent">Proposal Sent</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Converted">Converted</option>
                                    <option value="Lost">Lost</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Source</label>
                                <select className="input"
                                    value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                                    <option value="">Select Source</option>
                                    <option value="Website">Website</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Social Media">Social Media</option>
                                    <option value="Email Campaign">Email Campaign</option>
                                    <option value="Trade Show">Trade Show</option>
                                    <option value="Cold Call">Cold Call</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                                <select className="input"
                                    value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Score (0-100)</label>
                                <input type="number" min="0" max="100" className="input"
                                    value={formData.score} onChange={e => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Value (USD)</label>
                                <input type="number" min="0" step="0.01" className="input"
                                    value={formData.value} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned To</label>
                                <div className="flex gap-2">
                                    <select className="input"
                                        value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}>
                                        <option value="Unassigned">Unassigned</option>
                                        {assignees.map(user => (
                                            <option key={user} value={user}>{user}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => {
                                        const name = prompt("Enter new assignee name:");
                                        if (name) onAddAssignee(name);
                                    }} className="p-2.5 bg-gray-50 text-slate-600 rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors" title="Add New Assignee">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-4 bg-brand-50 rounded-xl border border-brand-100 cursor-pointer" onClick={() => setFormData({ ...formData, qualified: !formData.qualified })}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.qualified ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`}>
                                {formData.qualified && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">Mark as Qualified Lead</span>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                            <textarea rows="3" className="input resize-none"
                                value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Add any additional notes here..."></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white flex-shrink-0">
                    <button type="button" onClick={onClose}
                        className="btn-secondary"
                    >Cancel</button>
                    <button type="submit" form="lead-form"
                        className="btn-primary"
                    >Create Lead</button>
                </div>
            </div >
        </div >
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

const ViewLeadModal = ({ isOpen, onClose, lead, onEdit, onSetFollowUp, onLogCall }) => {
    if (!isOpen || !lead) return null;

    // Helper for timeline items
    const TimelineItem = ({ act }) => (
        <div className="relative pl-8 pb-8 group last:pb-0">
            {/* Line connecting items */}
            <div className={`absolute left-3.5 top-3.5 bottom-0 w-0.5 bg-gray-100 group-last:hidden`}></div>

            {/* Icon/Dot */}
            <div className={`absolute left-0 top-1 h-7 w-7 rounded-full border-2 flex items-center justify-center bg-white z-10 
                ${act.type === 'call_log' ? 'border-purple-200 text-purple-600' :
                    act.type === 'follow_up' ? 'border-brand-200 text-brand-600' : 'border-gray-200 text-slate-400'}`}>
                {act.type === 'call_log' ? <Phone size={12} /> :
                    act.type === 'follow_up' ? <CalendarIcon size={12} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <div>
                    <h5 className="text-sm font-bold text-slate-800">
                        {act.type === 'call_log' ? 'Call Logged' :
                            act.type === 'follow_up' ? 'Follow-up Scheduled' : 'Lead Created'}
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
                    ) : (
                        <p className="text-sm text-slate-500 mt-1">Lead was created in the system</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wide">By: Default Admin</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    {act.date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
            </div>
        </div>
    );

    const activities = [
        ...(lead.followUps || []).map(f => ({ ...f, type: 'follow_up', date: new Date(f.created_at) })),
        ...(lead.callLogs || []).map(c => ({ ...c, type: 'call_log', date: new Date(c.created_at) }))
    ].sort((a, b) => b.date - a.date);

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-slide-up">
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

                        {/* Main Content */}
                        <div className="flex-1 p-6 lg:p-8 bg-white">
                            <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Clock className="text-brand-500" size={20} /> Activity Timeline
                            </h4>
                            <div className="space-y-6">
                                {activities.map((act, i) => (
                                    <TimelineItem key={`${act.type}-${i}`} act={act} />
                                ))}

                                <TimelineItem act={{ type: 'created', date: new Date(lead.createdAt || Date.now()) }} />
                            </div>
                        </div>
                    </div>
                </div>

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
                        <div className="flex items-center gap-2">
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
                                                    lead.priority === 'Medium' ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-gray-100 text-gray-600"
                                        )}>{lead.priority}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mb-3 flex items-center gap-1">
                                        <span className="opacity-50">#</span>{lead.id}
                                    </p>

                                    {lead.company && <p className="text-xs text-slate-600 mb-2 truncate flex items-center gap-1.5"><Building2 size={10} className="text-slate-400" /> {lead.company}</p>}

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
    const [leads, setLeads] = useState([]);
    const [viewMode, setViewMode] = useState('list');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [sourceFilter, setSourceFilter] = useState('All Sources');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [assigneeFilter, setAssigneeFilter] = useState('All Assignees');
    const [assignees, setAssignees] = useState([]);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [followUpLead, setFollowUpLead] = useState(null);
    const [previousFollowUp, setPreviousFollowUp] = useState(null);

    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
    const [logCallLead, setLogCallLead] = useState(null);

    useEffect(() => {
        setAssignees(getAssignees());
    }, []);

    const handleAddAssignee = (name) => {
        if (name) {
            const updated = saveAssignee(name);
            setAssignees(updated);
        }
    };

    const fileInputRef = useRef(null);

    const fetchLeads = async () => {
        const data = await getLeads();
        setLeads(data);
        return data;
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleSave = async (lead) => {
        const leadWithDate = {
            ...lead,
        };
        await saveLead(leadWithDate);
        fetchLeads();
    };

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this lead?")) {
            await deleteLead(id);
            fetchLeads();
        }
    }

    const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
    const [filterByOverdue, setFilterByOverdue] = useState(false);

    // Overdue: follow-up date < today AND lead status is NOT Lost, Converted, or Closed
    const EXCLUDED_OVERDUE_STATUSES = ['Lost', 'Converted', 'Closed'];
    const overdueLeads = leads.filter(l => {
        if (EXCLUDED_OVERDUE_STATUSES.includes(l.status)) return false;
        return (l.followUps || []).some(f => {
            if (f.status === 'completed') return false;
            const d = new Date(f.scheduled_at);
            return !isNaN(d.getTime()) && d < new Date();
        });
    });

    const handleEdit = (lead) => {
        setEditingLead(lead);
        setIsViewMode(false);
        setIsFormOpen(true);
    };

    const handleView = (lead) => {
        setEditingLead(lead);
        setIsViewMode(true);
        setIsFormOpen(true);
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title', 'Status', 'Source', 'Priority', 'Score', 'Value', 'Assigned To', 'Qualified', 'Notes', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => [
                lead.id,
                `"${lead.firstName}"`,
                `"${lead.lastName}"`,
                `"${lead.email}"`,
                `"${lead.phone || ''}"`,
                `"${lead.company || ''}"`,
                `"${lead.jobTitle || ''}"`,
                lead.status,
                lead.source,
                lead.priority,
                lead.score,
                lead.value,
                lead.assignedTo,
                lead.qualified,
                `"${(lead.notes || '').replace(/"/g, '""')}"`,
                lead.createdAt || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'leads_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleImportLeads = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n');
                // Skip header row
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue;

                    // Simple CSV parsing (this is basic and might break on commas in quotes, but sufficient for now)
                    // For robust parsing, a library like PapaParse is recommended, but we'll try a regex approach or simple split if complexity is low
                    // Trying a slightly better split that handles quotes
                    const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    // Fallback to simple split if regex fails or for simple testing
                    const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());

                    if (cols.length >= 3) { // Ensure at least name and email
                        const newLead = {
                            firstName: cols[1] || 'Unknown',
                            lastName: cols[2] || 'Unknown',
                            email: cols[3] || '',
                            phone: cols[4] || '',
                            company: cols[5] || '',
                            jobTitle: cols[6] || '',
                            status: cols[7] || 'New',
                            source: cols[8] || 'Other',
                            priority: cols[9] || 'Medium',
                            score: parseInt(cols[10]) || 0,
                            value: parseFloat(cols[11]) || 0,
                            assignedTo: cols[12] || 'Unassigned',
                            qualified: cols[13] === 'true',
                            notes: cols[14] || '',
                            createdAt: cols[15] || new Date().toISOString()
                        };
                        // Using temporary ID to allow saveLead to generate proper one if needed, or if ID is column 0 but we ignore imports usually to create new
                        saveLead(newLead);
                    }
                }
                setLeads(getLeads()); // Refresh state
                alert('Leads imported successfully!');
            };
            reader.readAsText(file);
        }
        event.target.value = null; // Reset input
    };

    const baseLeadsForFilter = filterByOverdue ? overdueLeads : leads;
    const filteredLeads = baseLeadsForFilter.filter(lead => {
        const matchesSearch =
            (lead.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.company?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All Statuses' || lead.status === statusFilter;
        const matchesSource = sourceFilter === 'All Sources' || lead.source === sourceFilter;
        const matchesPriority = priorityFilter === 'All Priorities' || lead.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === 'All Assignees' || lead.assignedTo === assigneeFilter;

        return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesAssignee;
    });

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'New').length,
        qualified: leads.filter(l => l.status === 'Qualified').length,
        converted: leads.filter(l => l.status === 'Converted').length
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Lead Pipeline</h1>
                    <p className="text-slate-500 mt-1 text-base md:text-lg">Manage and track your potential customers effectively.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => { setEditingLead(null); setIsFormOpen(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30">
                        <Plus className="w-5 h-5" /> Add New Lead
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".csv"
                    />
                    <button onClick={handleImportLeads} className="p-2.5 bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-gray-50 shadow-sm transition-colors" title="Import CSV">
                        <Upload className="w-5 h-5" />
                    </button>
                    <button onClick={handleExportCSV} className="p-2.5 bg-white border border-gray-200 text-slate-600 rounded-xl hover:bg-gray-50 shadow-sm transition-colors" title="Export Leads">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Overdue Alert */}
            {overdueLeads.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-red-900">Attention Needed</p>
                            <p className="text-sm text-red-700">You have <span className="font-bold">{overdueLeads.length} overdue</span> follow-up tasks requiring action.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOverdueModalOpen(true)}
                        className="px-4 py-2 bg-white text-red-600 text-sm font-bold rounded-xl shadow-sm hover:shadow border border-red-100 transition-all"
                    >
                        View Overdue Items
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <StatCard title="Total Leads" value={stats.total} icon={Users} color="bg-blue-600" />
                <StatCard title="New Leads" value={stats.new} icon={Plus} color="bg-brand-600" />
                <StatCard title="Qualified" value={stats.qualified} icon={CheckCircle2} color="bg-emerald-600" />
                <StatCard title="Converted" value={stats.converted} icon={CheckSquare} color="bg-indigo-600" />
                <OverdueFollowUpsCard
                    count={overdueLeads.length}
                    hasOverdue={overdueLeads.length > 0}
                    onClick={() => {
                        if (overdueLeads.length > 0) {
                            setFilterByOverdue(true);
                            setViewMode('list');
                            setIsOverdueModalOpen(true);
                        }
                    }}
                />
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Overdue filter active indicator */}
                {filterByOverdue && (
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
                        <p className="text-sm font-medium text-amber-800">
                            Showing <span className="font-bold">{overdueLeads.length} overdue</span> follow-up lead{overdueLeads.length !== 1 ? 's' : ''} only.
                        </p>
                        <button
                            type="button"
                            onClick={() => setFilterByOverdue(false)}
                            className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
                        >
                            Clear filter
                        </button>
                    </div>
                )}

                {/* Filters & Actions Bar */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <ViewToggle active={viewMode} onChange={setViewMode} />
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search leads..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all shadow-sm"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                            >
                                <option value="All Statuses">All Statuses</option>
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Qualified">Qualified</option>
                                <option value="Proposal Sent">Proposal Sent</option>
                                <option value="Negotiation">Negotiation</option>
                                <option value="Converted">Converted</option>
                                <option value="Lost">Lost</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                            >
                                <option value="All Priorities">All Priorities</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                            >
                                <option value="All Assignees">All Assignees</option>
                                <option value="Unassigned">Unassigned</option>
                                {assignees.map(user => (
                                    <option key={user} value={user}>{user}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <h3 className="font-bold text-slate-800">All Leads</h3>
                            <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
                                Showing {filteredLeads.length} of {leads.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left min-w-[1000px]">
                                <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" /></th>
                                        <th className="px-6 py-4">Lead Info</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Value</th>
                                        <th className="px-6 py-4">Assigned To</th>
                                        <th className="px-6 py-4">Next Action</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500 italic">
                                                No leads found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLeads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" /></td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-sm">{lead.firstName} {lead.lastName}</span>
                                                        <span className="text-xs text-slate-500">{lead.company}</span>
                                                        <a href={`mailto:${lead.email}`} className="text-xs text-brand-600 hover:underline mt-0.5">{lead.email}</a>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                                                        lead.status === 'Converted' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            lead.status === 'Lost' ? "bg-red-50 text-red-700 border-red-100" :
                                                                lead.status === 'New' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                    "bg-gray-50 text-gray-700 border-gray-100"
                                                    )}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-bold",
                                                        lead.priority === 'Urgent' ? "bg-red-50 text-red-700" :
                                                            lead.priority === 'High' ? "bg-orange-50 text-orange-700" :
                                                                "bg-gray-100 text-gray-700"
                                                    )}>
                                                        {lead.priority}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                                    {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                            {(lead.assignedTo || 'U').charAt(0)}
                                                        </div>
                                                        {lead.assignedTo}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {lead.followUps && lead.followUps.length > 0 ? (
                                                        <span className="text-xs text-slate-600 flex items-center gap-1">
                                                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                                            {new Date(lead.followUps.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0].scheduled_at).toLocaleDateString()}
                                                        </span>
                                                    ) : <span className="text-xs text-slate-400 italic">None scheduled</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setFollowUpLead(lead); setIsFollowUpModalOpen(true); }} className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Set Follow-up"><CalendarIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => handleView(lead)} className="p-2 text-slate-500 hover:bg-gray-100 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => handleEdit(lead)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDelete(lead.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

                {viewMode === 'kanban' && <KanbanView leads={filteredLeads} onView={handleView} />}
                {viewMode === 'calendar' && <FollowUpCalendar />}
            </div>

            {isViewMode && editingLead ? (
                <ViewLeadModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    lead={editingLead}
                    onEdit={handleEdit}
                    onSetFollowUp={(lead) => {
                        setFollowUpLead(lead);
                        setIsFollowUpModalOpen(true);
                    }}
                    onLogCall={(lead) => {
                        setLogCallLead(lead);
                        setIsLogCallModalOpen(true);
                    }}
                />
            ) : (
                <LeadModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    lead={editingLead}
                    onSave={handleSave}
                    assignees={assignees}
                    onAddAssignee={handleAddAssignee}
                />
            )}
            <SetFollowUpModal
                isOpen={isFollowUpModalOpen}
                onClose={() => {
                    setIsFollowUpModalOpen(false);
                    setPreviousFollowUp(null);
                }}
                lead={followUpLead}
                previousFollowUp={previousFollowUp}
                onSave={async () => {
                    await fetchLeads();
                    setPreviousFollowUp(null);
                    // Update the currently viewed lead if it matches
                    if (editingLead) {
                        const data = await getLeads();
                        const updated = data.find(l => l.id === editingLead.id);
                        if (updated) setEditingLead(updated);
                    }
                }}
            />
            <OverdueModal
                isOpen={isOverdueModalOpen}
                onClose={() => setIsOverdueModalOpen(false)}
                overdueLeads={overdueLeads}
                onReschedule={(lead, followUp) => {
                    setFollowUpLead(lead);
                    setPreviousFollowUp(followUp);
                    setIsFollowUpModalOpen(true);
                }}
                onView={handleView}
            />
            <LogCallModal
                isOpen={isLogCallModalOpen}
                onClose={() => setIsLogCallModalOpen(false)}
                lead={logCallLead}
                onSave={async () => {
                    await fetchLeads();
                    if (editingLead) {
                        const data = await getLeads();
                        const updated = data.find(l => l.id === editingLead.id);
                        if (updated) setEditingLead(updated);
                    }
                }}
            />
        </div>
    );
};

export default Leads;
