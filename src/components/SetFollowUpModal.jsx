import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { saveFollowUp } from '../services/db';

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
                date.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7)); // Simple next Monday logic (if today is Monday, it gives today, maybe want +7? sticking to simple for now or logic: (8 - day) % 7 || 7)
                if (date <= now) date.setDate(date.getDate() + 7);
                break;
            case 'nextWeek':
                date.setDate(now.getDate() + 7);
                break;
            default:
                break;
        }

        // Format to YYYY-MM-DDTHH:mm
        date.setHours(10, 0, 0, 0); // Default to 10 AM
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        setScheduledAt(localISOTime);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Convert local datetime-local string to UTC for storage
            const utcDate = new Date(scheduledAt).toISOString();

            await saveFollowUp({
                lead_id: lead.id,
                scheduled_at: utcDate,
                notes,
                status: 'pending'
            });

            // If rescheduling, mark previous one as completed/rescheduled
            if (previousFollowUp) {
                await saveFollowUp({
                    ...previousFollowUp,
                    status: 'completed', // Or 'rescheduled' if we want to track that specifically
                    notes: previousFollowUp.notes + ' (Rescheduled)'
                });
            }

            onSave && onSave();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to set follow-up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">Set Follow-up Date</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">Schedule a follow-up for {lead?.firstName} {lead?.lastName} ({lead?.id})</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => handleQuickSelect('today')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Today</button>
                                    <button type="button" onClick={() => handleQuickSelect('tomorrow')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Tomorrow</button>
                                    <button type="button" onClick={() => handleQuickSelect('nextMonday')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Next Monday</button>
                                    <button type="button" onClick={() => handleQuickSelect('nextWeek')} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Next Week</button>
                                </div>
                            </div>

                            <form id="followup-form" onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date & Time *</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <input
                                            type="datetime-local"
                                            name="scheduledAt"
                                            id="scheduledAt"
                                            required
                                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Reminder Note</label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        rows="3"
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                        placeholder="e.g., Client requested callback on Monday. Discuss pricing and features."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="submit"
                            form="followup-form"
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            {loading ? 'Saving...' : 'Set Follow-up'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetFollowUpModal;
