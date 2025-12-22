import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { saveFollowUp } from '../services/db';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const SetFollowUpModal = ({ isOpen, onClose, lead, onSave, previousFollowUp }) => {
    const [scheduledAt, setScheduledAt] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setScheduledAt('');
            setNotes('');
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
            default:
                break;
        }

        date.setHours(10, 0, 0, 0);
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        setScheduledAt(localISOTime);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!scheduledAt) {
            toast.error("Please select a date and time");
            return;
        }
        setLoading(true);
        try {
            const utcDate = new Date(scheduledAt).toISOString();

            await saveFollowUp({
                lead_id: lead.id,
                scheduled_at: utcDate,
                notes,
                status: 'pending'
            });

            if (previousFollowUp) {
                await saveFollowUp({
                    ...previousFollowUp,
                    status: 'completed',
                    notes: previousFollowUp.notes + ' (Rescheduled)'
                });
            }

            toast.success("Follow-up scheduled successfully");
            onSave && onSave();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to set follow-up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Schedule Follow-up</h3>
                        <p className="text-sm text-slate-500 mt-1">Set a reminder for {lead?.first_name} {lead?.last_name}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="label">Quick Select</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => handleQuickSelect('today')} className="btn-secondary !px-4 !py-2 text-xs flex items-center justify-center gap-2">
                                <Clock size={14} /> Today
                            </button>
                            <button type="button" onClick={() => handleQuickSelect('tomorrow')} className="btn-secondary !px-4 !py-2 text-xs flex items-center justify-center gap-2">
                                <Calendar size={14} /> Tomorrow
                            </button>
                            <button type="button" onClick={() => handleQuickSelect('nextMonday')} className="btn-secondary !px-4 !py-2 text-xs">Next Monday</button>
                            <button type="button" onClick={() => handleQuickSelect('nextWeek')} className="btn-secondary !px-4 !py-2 text-xs">Next Week</button>
                        </div>
                    </div>

                    <form id="followup-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="scheduledAt" className="label">Follow-up Date & Time <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                name="scheduledAt"
                                id="scheduledAt"
                                required
                                className="input"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="notes" className="label">Reminder Note</label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows="3"
                                className="input min-h-[100px]"
                                placeholder="What needs to be discussed? e.g. Call to discuss pricing..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="followup-form"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                <CheckCircle size={18} />
                                Set Follow-up
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetFollowUpModal;
