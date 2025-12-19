import { useState, useEffect, useRef } from 'react';
import {
    Users, Plus, Upload, Download, Search, LayoutList, Kanban, Calendar,
    MoreHorizontal, CheckCircle2, Clock, CheckSquare, AlertCircle, Trash2, Edit2, Eye, Phone, MessageSquare, ChevronLeft, ChevronRight, Calendar as CalendarIcon
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">{lead ? 'Edit Lead' : 'Add New Lead'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                <input type="text" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="tel" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
                                <input type="number" min="0" max="100" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.score} onChange={e => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value (USD)</label>
                                <input type="number" min="0" step="0.01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.value} onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                <div className="flex gap-2">
                                    <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}>
                                        <option value="Unassigned">Unassigned</option>
                                        {assignees.map(user => (
                                            <option key={user} value={user}>{user}</option>
                                        ))}
                                    </select>
                                    <button type="button" onClick={() => {
                                        const name = prompt("Enter new assignee name:");
                                        if (name) onAddAssignee(name);
                                    }} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 border border-gray-200" title="Add New Assignee">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="qualified" className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                checked={formData.qualified} onChange={e => setFormData({ ...formData, qualified: e.target.checked })} />
                            <label htmlFor="qualified" className="text-sm font-medium text-gray-700">Qualified Lead</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea rows="3" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3 bg-white flex-shrink-0 rounded-b-xl">
                    <button type="button" onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >Cancel</button>
                    <button type="submit" form="lead-form"
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition"
                    >Create Lead</button>
                </div>
            </div >
        </div >
    );
};

const OverdueModal = ({ isOpen, onClose, overdueLeads, onReschedule, onView }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-50/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white rounded-lg border border-orange-100 shadow-sm">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Overdue Follow-ups</h3>
                            <p className="text-xs text-orange-600 font-medium">{overdueLeads.length} lead{overdueLeads.length !== 1 ? 's' : ''} needs immediate attention</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                    {overdueLeads.map(lead => {
                        const overdueFollowUp = lead.followUps?.find(f => f.status !== 'completed' && new Date(f.scheduled_at) < new Date());
                        if (!overdueFollowUp) return null;

                        const daysOverdue = Math.floor((new Date() - new Date(overdueFollowUp.scheduled_at)) / (1000 * 60 * 60 * 24));

                        return (
                            <div key={lead.id} className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">LEAD-{lead.id}</span>
                                                <h4 className="font-bold text-gray-900 text-sm">{lead.firstName} {lead.lastName} <span className="text-gray-500 font-normal">({lead.company || 'No Company'})</span></h4>
                                                <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-4">
                                                <span>Follow-up Due: <span className="text-gray-900 font-medium">{new Date(overdueFollowUp.scheduled_at).toLocaleString()}</span></span>
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-0.5 pt-1">
                                                <p>Email: <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a></p>
                                                <p>Phone: {lead.phone || 'N/A'}</p>
                                                <p>Assigned to: <span className="text-gray-700 font-medium">{lead.assignedTo}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            onClose();
                                            onView(lead);
                                        }} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition">View</button>
                                        <button onClick={() => {
                                            onClose();
                                            onReschedule(lead, overdueFollowUp);
                                        }} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-200 transition">Reschedule</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex justify-end flex-shrink-0 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-sm transition">Close</button>
                </div>
            </div>
        </div>
    );
};

const ViewLeadModal = ({ isOpen, onClose, lead, onEdit, onSetFollowUp, onLogCall }) => {
    if (!isOpen || !lead) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 flex-shrink-0">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{lead.firstName} {lead.lastName}</h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">LEAD-{lead.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-base font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">Contact Information</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
                                    <p className="text-gray-800">{lead.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Phone</p>
                                    <p className="text-gray-800">{lead.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Company</p>
                                    <p className="text-gray-800">{lead.company || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Job Title</p>
                                    <p className="text-gray-800">{lead.jobTitle || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Location</p>
                                    <p className="text-gray-800">{lead.location || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-base font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">Lead Details</h4>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase mt-1",
                                        lead.status === 'Converted' ? "bg-green-50 text-green-700 border-green-100" :
                                            lead.status === 'Lost' ? "bg-red-50 text-red-700 border-red-100" :
                                                lead.status === 'Proposal Sent' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                    lead.status === 'Negotiation' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                        "bg-blue-50 text-blue-700 border-blue-100"
                                    )}>
                                        {lead.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Source</p>
                                    <p className="text-gray-800">{lead.source || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Priority</p>
                                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1",
                                        lead.priority === 'Urgent' ? "bg-red-100 text-red-800 border border-red-200 font-bold" :
                                            lead.priority === 'High' ? "bg-orange-50 text-orange-700 border border-orange-100" :
                                                lead.priority === 'Medium' ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                                                    "bg-gray-50 text-gray-700 border border-gray-100"
                                    )}>
                                        {lead.priority}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Score</p>
                                    <p className="text-gray-800">{lead.score}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium">Assigned To</p>
                                    <p className="text-gray-800">{lead.assignedTo}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-base font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">Activity Timeline</h4>
                        <div className="relative border-l-2 border-gray-100 pl-6 ml-2 space-y-6">
                            {(() => {
                                const activities = [
                                    ...(lead.followUps || []).map(f => ({ ...f, type: 'follow_up', date: new Date(f.created_at) })),
                                    ...(lead.callLogs || []).map(c => ({ ...c, type: 'call_log', date: new Date(c.created_at) }))
                                ].sort((a, b) => b.date - a.date);

                                return activities.map(act => (
                                    <div key={`${act.type}-${act.id}`} className="relative">
                                        <div className={`absolute -left-[29px] top-1 h-3 w-3 rounded-full ring-4 ring-white border ${act.type === 'call_log' ? 'bg-purple-100 border-purple-400' : 'bg-blue-100 border-blue-400'}`}></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="text-sm font-bold text-gray-900">{act.type === 'call_log' ? 'Call Logged' : 'Follow-up Scheduled'}</h5>
                                                {act.type === 'call_log' ? (
                                                    <div className="text-xs text-gray-600 mt-0.5">
                                                        <p>Outcome: <span className="font-medium text-gray-800">{act.outcome || 'N/A'}</span> • Duration: {act.duration ? `${act.duration}m` : 'N/A'}</p>
                                                        <p className="mt-1 italic">{act.notes}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        Follow-up scheduled for {new Date(act.scheduled_at).toLocaleString()}.
                                                        {act.notes && <span className="opacity-80"> Note: {act.notes}</span>}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium tracking-wide">By: Default Admin</p>
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">{act.date.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                                        </div>
                                    </div>
                                ));
                            })()}

                            <div className="relative">
                                <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-gray-200 ring-4 ring-white"></div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-900">Lead Created</h5>
                                        <p className="text-xs text-gray-500 mt-0.5">Lead was created in the system</p>
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(lead.createdAt || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between gap-3 bg-white flex-shrink-0 rounded-b-xl">
                    <div className="flex gap-2">
                        <button onClick={() => onLogCall(lead)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm text-sm">
                            <Phone className="h-4 w-4" /> Log Call
                        </button>
                        <button onClick={() => onSetFollowUp(lead)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition shadow-sm text-sm">
                            <Calendar className="h-4 w-4" /> Set Follow-up
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm">Close</button>
                        <button onClick={() => onEdit(lead)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition shadow-sm text-sm">Edit Lead</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
        <div className={clsx("p-3 rounded-lg w-fit", color)}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
        </div>
    </div>
);

const ViewToggle = ({ active, onChange }) => (
    <div className="flex bg-gray-100 p-1 rounded-lg">
        {[
            { id: 'list', icon: LayoutList, label: 'List View' },
            { id: 'kanban', icon: Kanban, label: 'Kanban View' },
            { id: 'calendar', icon: Calendar, label: 'Calendar View' }
        ].map(view => (
            <button
                key={view.id}
                onClick={() => onChange(view.id)}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                    active === view.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
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
        { id: 'New', label: 'New', color: 'bg-blue-500 border-blue-200' },
        { id: 'Contacted', label: 'Contacted', color: 'bg-yellow-500 border-yellow-200' },
        { id: 'Qualified', label: 'Qualified', color: 'bg-cyan-500 border-cyan-200' },
        { id: 'Proposal Sent', label: 'Proposal Sent', color: 'bg-purple-500 border-purple-200' },
        { id: 'Negotiation', label: 'Negotiation', color: 'bg-orange-500 border-orange-200' },
        { id: 'Converted', label: 'Converted', color: 'bg-emerald-500 border-emerald-200' },
        { id: 'Lost', label: 'Lost', color: 'bg-red-500 border-red-200' }
    ];

    const getColumnLeads = (status) => leads.filter(l => l.status === status);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
            {columns.map(col => (
                <div key={col.id} className="min-w-[300px] bg-gray-50 rounded-xl flex flex-col h-full border border-gray-200">
                    <div className={`p-4 border-b border-gray-200 rounded-t-xl bg-white flex justify-between items-center ${col.color.replace('bg-', 'border-l-4 border-')}`}>
                        <h3 className="font-bold text-gray-700">{col.label}</h3>
                        <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs font-medium">
                            {getColumnLeads(col.id).length}
                        </span>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3">
                        {getColumnLeads(col.id).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm italic">
                                No leads in this stage
                            </div>
                        ) : (
                            getColumnLeads(col.id).map(lead => (
                                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group relative"
                                    onClick={() => onView(lead)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800">{lead.firstName} {lead.lastName}</h4>
                                        <span className={clsx("px-2 py-0.5 rounded text-[10px] uppercase font-bold",
                                            lead.priority === 'Urgent' ? "bg-red-100 text-red-800 border border-red-200" :
                                                lead.priority === 'High' ? "bg-orange-50 text-orange-700" :
                                                    lead.priority === 'Medium' ? "bg-yellow-50 text-yellow-600" : "bg-gray-100 text-gray-600"
                                        )}>{lead.priority}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono mb-3">LEAD-{lead.id}</p>

                                    <div className="flex justify-between items-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                                        <span>Score: {lead.score}</span>
                                        <span className="text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            View <span className="text-lg leading-none">&rarr;</span>
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

    const fetchLeads = async () => {
        const data = await getLeads();
        setLeads(data);
        return data; // Return data for chaining
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleSave = async (lead) => {
        const leadWithDate = {
            ...lead,
            // Only add default date for new ones if needed, backend handles it usually
        };
        await saveLead(leadWithDate);
        // Refresh list
        const data = await getLeads();
        setLeads(data);
    };

    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to delete this lead?")) {
            await deleteLead(id);
            // Refresh list
            const data = await getLeads();
            setLeads(data);
        }
    }

    const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

    const overdueLeads = leads.filter(l =>
        (l.followUps || []).some(f => {
            if (f.status === 'completed') return false;
            const d = new Date(f.scheduled_at);
            return !isNaN(d.getTime()) && d < new Date();
        })
    );
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

    const fileInputRef = useRef(null);

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

    const stats = {
        total: leads.length,
        qualified: leads.filter(l => l.qualified).length,
        converted: leads.filter(l => l.status === 'Converted').length,
        conversionLink: leads.length > 0 ? ((leads.filter(l => l.status === 'Converted').length / leads.length) * 100).toFixed(1) : 0,
        overdue: leads.filter(l => (l.followUps || []).some(f => {
            if (f.status === 'completed') return false;
            const d = new Date(f.scheduled_at);
            return !isNaN(d.getTime()) && d < new Date();
        })).length
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch =
            (l.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All Statuses' || l.status === statusFilter;
        const matchesSource = sourceFilter === 'All Sources' || l.source === sourceFilter;
        const matchesPriority = priorityFilter === 'All Priorities' || l.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === 'All Assignees' || l.assignedTo === assigneeFilter;

        return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesAssignee;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Users className="h-8 w-8 text-indigo-600" />
                        Lead Management
                    </h2>
                    <p className="text-gray-500 mt-1">Manage and track all leads in your system</p>
                </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                    <button onClick={handleImportLeads} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition shadow-sm">
                        <Upload className="h-4 w-4" /> Import Leads
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition shadow-sm">
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                    <button onClick={() => { setEditingLead(null); setIsViewMode(false); setIsFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition shadow-sm shadow-indigo-200">
                        <Plus className="h-4 w-4" /> Add Lead
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Leads" value={stats.total} icon={Users} color="bg-gray-600" />
                <StatCard title="Qualified Leads" value={stats.qualified} icon={CheckCircle2} color="bg-green-500" />
                <StatCard title="Converted" value={stats.converted} icon={CheckSquare} color="bg-emerald-500" />
                <StatCard title="Conversion Rate" value={`${stats.conversionLink}%`} icon={Clock} color="bg-blue-500" />

                {/* Overdue Follow-ups Card */}
                <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-shadow relative overflow-hidden group ${overdueLeads.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                    {overdueLeads.length > 0 && <span className="absolute top-3 right-3 w-3 h-3 bg-red-600 rounded-full animate-pulse ring-4 ring-red-100"></span>}
                    <div className={`p-3 rounded-lg w-fit ${overdueLeads.length > 0 ? 'bg-red-500' : 'bg-orange-500'}`}>
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${overdueLeads.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Overdue Follow-ups</p>
                        <h3 className={`text-2xl font-bold ${overdueLeads.length > 0 ? 'text-red-800' : 'text-gray-800'}`}>{overdueLeads.length}</h3>
                        {overdueLeads.length > 0 && (
                            <button onClick={() => setIsOverdueModalOpen(true)} className="text-[10px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-1 hover:underline">
                                <AlertCircle className="w-3 h-3" /> Click to view &rarr;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Overdue Alert Section */}
            {overdueLeads.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-full text-orange-500 shadow-sm mt-1">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-800 text-lg flex items-center gap-2">
                                {overdueLeads.length} Lead{overdueLeads.length !== 1 ? 's' : ''} with Overdue Follow-ups!
                            </h4>
                            <div className="flex flex-col gap-1 mt-1">
                                {overdueLeads.slice(0, 2).map(l => {
                                    const due = l.followUps.find(f => f.status !== 'completed' && new Date(f.scheduled_at) < new Date());
                                    return (
                                        <p key={l.id} className="text-sm text-orange-700">
                                            <span className="font-mono font-bold">{l.id}</span> - {l.firstName} {l.lastName}
                                            <span className="text-orange-600 opacity-80 text-xs ml-2">(Due: {new Date(due?.scheduled_at).toLocaleDateString()})</span>
                                        </p>
                                    );
                                })}
                                {overdueLeads.length > 2 && <p className="text-xs text-orange-600 font-medium mt-1">...and {overdueLeads.length - 2} more</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 self-end md:self-center">
                        <button onClick={() => {
                            // Refresh logic could be here
                            const fetchLeads = async () => {
                                const data = await getLeads();
                                setLeads(data);
                            };
                            fetchLeads();
                        }} className="px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 text-sm font-medium shadow-sm transition flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" /> Refresh
                        </button>
                        <button onClick={() => setIsOverdueModalOpen(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium shadow-md shadow-orange-200 transition">
                            View All ({overdueLeads.length})
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search leads..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 outline-none focus:border-indigo-500 cursor-pointer"
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
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="All Sources">All Sources</option>
                        <option value="Website">Website</option>
                        <option value="Referral">Referral</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Email Campaign">Email Campaign</option>
                        <option value="Trade Show">Trade Show</option>
                        <option value="Cold Call">Cold Call</option>
                        <option value="Other">Other</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 outline-none focus:border-indigo-500 cursor-pointer"
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
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-600 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="All Assignees">All Assignees</option>
                        <option value="Unassigned">Unassigned</option>
                        {assignees.map(user => (
                            <option key={user} value={user}>{user}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <ViewToggle active={viewMode} onChange={setViewMode} />
                <span className="text-sm text-gray-500">Showing {filteredLeads.length} of {leads.length} leads</span>
            </div>

            {viewMode === 'list' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded border-gray-300" /></th>
                                    <th className="px-4 py-3 font-semibold">Lead #</th>
                                    <th className="px-4 py-3 font-semibold">Name</th>
                                    <th className="px-4 py-3 font-semibold">Contact</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Score</th>
                                    <th className="px-4 py-3 font-semibold">Priority</th>
                                    <th className="px-4 py-3 font-semibold">Value</th>
                                    <th className="px-4 py-3 font-semibold">Assigned To</th>
                                    <th className="px-4 py-3 font-semibold">Created</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{lead.id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{lead.firstName} {lead.lastName}</td>
                                        <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase")}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-900">{lead.score}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium",
                                                lead.priority === 'High' ? "bg-red-50 text-red-700" :
                                                    lead.priority === 'Medium' ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {lead.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{lead.value ? `$${lead.value}` : '-'}</td>
                                        <td className="px-4 py-3 text-gray-500">{lead.assignedTo}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setFollowUpLead(lead); setIsFollowUpModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Set Follow-up"><CalendarIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleView(lead)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="View Details"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => handleEdit(lead)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Placeholders for Kanban and Calendar views */}
            {viewMode === 'kanban' && <KanbanView leads={filteredLeads} onView={handleView} />}
            {viewMode === 'calendar' && <FollowUpCalendar />}

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
                    const data = await fetchLeads();
                    setPreviousFollowUp(null);
                    // Update the currently viewed lead if it matches
                    if (editingLead) {
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
                    const data = await fetchLeads();
                    // Update the currently viewed lead if it matches
                    if (editingLead) {
                        const updated = data.find(l => l.id === editingLead.id);
                        if (updated) setEditingLead(updated);
                    }
                }}
            />
        </div>
    );
};

export default Leads;
