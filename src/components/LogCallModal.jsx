import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { saveFollowUp, saveCallLog } from '../services/db';

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

            onSave && onSave();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to log call');
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

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                            <div>
                                <h3 className="text-lg font-medium leading-6 text-gray-900">Log Call & Set Follow-up</h3>
                                <p className="text-xs text-gray-500 mt-1">Record what was discussed and schedule next steps</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form id="log-call-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Call Notes *</label>
                                <textarea
                                    required
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    placeholder="e.g., Client said they need to discuss with their team..."
                                    value={callNotes}
                                    onChange={e => setCallNotes(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Call Outcome</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                                        value={callOutcome}
                                        onChange={e => setCallOutcome(e.target.value)}
                                    >
                                        <option value="">Select outcome</option>
                                        <option value="Connected">Connected</option>
                                        <option value="Left Voicemail">Left Voicemail</option>
                                        <option value="No Answer">No Answer</option>
                                        <option value="Wrong Number">Wrong Number</option>
                                        <option value="Busy">Busy</option>
                                        <option value="Interested">Interested</option>
                                        <option value="Not Interested">Not Interested</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        placeholder="e.g. 15"
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <label className="block text-sm font-medium text-gray-900 mb-3">Set Follow-up (Optional)</label>

                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Quick Select</label>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={() => handleQuickSelect('today')} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">Today</button>
                                            <button type="button" onClick={() => handleQuickSelect('tomorrow')} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">Tomorrow</button>
                                            <button type="button" onClick={() => handleQuickSelect('nextMonday')} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">Next Monday</button>
                                            <button type="button" onClick={() => handleQuickSelect('nextWeek')} className="px-3 py-1.5 border border-gray-300 rounded bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">Next Week</button>
                                            <button type="button" onClick={() => handleQuickSelect('clear')} className="px-3 py-1.5 border border-red-200 rounded bg-white text-xs font-medium text-red-600 hover:bg-red-50 ml-auto">Clear</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            value={scheduledAt}
                                            onChange={e => setScheduledAt(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Note</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            placeholder="e.g. Client requested callback..."
                                            value={followUpNotes}
                                            onChange={e => setFollowUpNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={loading || !scheduledAt}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm ${!scheduledAt ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading && scheduledAt ? 'Saving...' : 'Log Call + Set Follow-up'}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => handleSubmit(e, false)}
                            disabled={loading}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                        >
                            {loading && !scheduledAt ? 'Saving...' : 'Log Call Only'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogCallModal;
