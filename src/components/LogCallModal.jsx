import { useState, useEffect } from 'react';
import { X, Calendar, Clock, PhoneCall, CheckCircle, ChevronRight } from 'lucide-react';
import { saveFollowUp, saveCallLog } from '../services/db';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const LogCallModal = ({ isOpen, onClose, lead, onSave }) => {
    const [callNotes, setCallNotes] = useState('');
    const [callOutcome, setCallOutcome] = useState('');
    const [duration, setDuration] = useState('');
    const [loading, setLoading] = useState(false);

    // Follow-up state
    const [showFollowUp, setShowFollowUp] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [followUpNotes, setFollowUpNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCallNotes('');
            setCallOutcome('');
            setDuration('');
            setScheduledAt('');
            setFollowUpNotes('');
            setShowFollowUp(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleQuickSelect = (type) => {
        const now = new Date();
        let date = new Date();

        switch (type) {
            case 'today':
                date = now;
                break;
            case 'tomorrow':
                date.setDate(now.getDate() + 1);
                break;
            case 'nextMonday':
                date.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
                if (date <= now) date.setDate(date.getDate() + 7);
                break;
            case 'nextWeek':
                date.setDate(now.getDate() + 7);
                break;
            case 'clear':
                setScheduledAt('');
                return;
            default:
                break;
        }

        date.setHours(10, 0, 0, 0);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        setScheduledAt(localISOTime);
        setShowFollowUp(true);
    };

    const handleSubmit = async (e, shouldSaveFollowUp) => {
        e.preventDefault();
        if (!callNotes) {
            toast.error("Call notes are required");
            return;
        }
        setLoading(true);
        try {
            // 1. Save Call Log
            await saveCallLog({
                lead_id: lead.id,
                notes: callNotes,
                outcome: callOutcome,
                duration: duration ? parseInt(duration) : null
            });

            // 2. Save Follow-up if scheduled
            if (shouldSaveFollowUp && scheduledAt) {
                const utcDate = new Date(scheduledAt).toISOString();
                await saveFollowUp({
                    lead_id: lead.id,
                    scheduled_at: utcDate,
                    notes: followUpNotes,
                    status: 'pending'
                });
            }

            toast.success("Call activity logged successfully");
            onSave && onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to log call activity');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <PhoneCall className="text-brand-600" size={24} />
                            Log Call Activity
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Record discussion for {lead?.first_name} {lead?.last_name}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Call Details Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Activity Details
                        </h4>
                        <div>
                            <label className="label">Call Notes <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                rows="3"
                                className="input min-h-[100px]"
                                placeholder="Summary of the conversation..."
                                value={callNotes}
                                onChange={e => setCallNotes(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Call Outcome</label>
                                <select
                                    className="input"
                                    value={callOutcome}
                                    onChange={e => setCallOutcome(e.target.value)}
                                >
                                    <option value="">Select outcome</option>
                                    <option value="Connected">Connected</option>
                                    <option value="Left Voicemail">Left Voicemail</option>
                                    <option value="No Answer">No Answer</option>
                                    <option value="Interested">Interested</option>
                                    <option value="Not Interested">Not Interested</option>
                                    <option value="Busy">Busy</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Duration (minutes)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="number"
                                        min="0"
                                        className="input !pl-10"
                                        placeholder="e.g. 15"
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Follow-up Section */}
                    <div className="pt-6 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                            Schedule Next Step
                        </h4>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6">
                            <div>
                                <label className="label text-xs !mb-3">Quick Schedule</label>
                                <div className="flex flex-wrap gap-2">
                                    {['today', 'tomorrow', 'nextMonday', 'nextWeek'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => handleQuickSelect(t)}
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-all shadow-sm"
                                        >
                                            {t.replace(/([A-Z])/g, ' $1').trim()}
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => handleQuickSelect('clear')} className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm ml-auto">
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Next Follow-up Date</label>
                                    <input
                                        type="datetime-local"
                                        className="input"
                                        value={scheduledAt}
                                        onChange={e => setScheduledAt(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label">Follow-up Goal</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Goal for next call..."
                                        value={followUpNotes}
                                        onChange={e => setFollowUpNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row-reverse gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading || !scheduledAt}
                        className={clsx(
                            "btn-primary flex items-center justify-center gap-2",
                            (!scheduledAt || loading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {loading && scheduledAt ? 'Processing...' : (
                            <>
                                <CheckCircle size={18} />
                                Log & Schedule
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, false)}
                        disabled={loading}
                        className="btn-secondary !bg-white flex items-center justify-center gap-2"
                    >
                        {loading && !scheduledAt ? 'Processing...' : (
                            <>
                                <PhoneCall size={18} />
                                Log Call Only
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary !border-transparent !bg-transparent text-slate-400 hover:text-slate-600 sm:mr-auto"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogCallModal;
