import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
    getPlannerEvents,
    savePlannerEvent,
    deletePlannerEvent,
    getPlannerNotes,
    savePlannerNote,
    deletePlannerNote,
    getClients,
    getUsers,
    completePlannerEvent,
    reschedulePlannerEvent,
    createNextPlannerMeeting,
    cancelPlannerEvent,
    getPlannerStats,
} from '../services/db';
import {
    Calendar as CalendarIcon,
    Plus,
    Filter,
    Trash2,
    AlertTriangle,
    Edit3,
    X,
    CheckCircle2,
    Clock3,
    Search,
    CalendarDays,
    CalendarClock,
    XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

const CATEGORY_COLORS = {
    meeting: '#3B82F6', // Blue
    payment: '#10B981', // Green
    deadline: '#EF4444', // Red
    reminder: '#F59E0B', // Yellow
    personal: '#8B5CF6', // Purple
};

const PRIORITY_COLORS = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
};

const STATUS_COLORS = {
    scheduled: '#3B82F6', // Blue
    completed: '#10B981', // Green
    rescheduled: '#F59E0B', // Yellow
    cancelled: '#EF4444', // Red
    missed: '#FB923C', // Orange
};

const StatCard = ({ title, description, value, icon: Icon, iconBgClass, iconColorClass }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
                <p className="text-xs text-slate-400 mt-1.5">{description}</p>
            </div>
            <div className={`flex-shrink-0 p-3 rounded-xl shadow-sm border ${iconBgClass} ${iconColorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
);

const Planner = () => {
    const [currentView, setCurrentView] = useState('dayGridMonth');
    const [calendarRange, setCalendarRange] = useState({ start: null, end: null });
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventNotes, setEventNotes] = useState([]);
    const [independentNotes, setIndependentNotes] = useState([]);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventForm, setEventForm] = useState({
        id: null,
        title: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        category: 'meeting',
        priority: 'medium',
        client_id: '',
        invoice_id: '',
        reminder_time: '',
        notes: '',
        attachment: null,
    });
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        category: 'personal',
        priority: 'medium',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [noteError, setNoteError] = useState('');
    const [eventError, setEventError] = useState('');
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [isNextMeetingModalOpen, setIsNextMeetingModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [completionForm, setCompletionForm] = useState({ meeting_notes: '', outcome: '' });
    const [rescheduleForm, setRescheduleForm] = useState({
        event_date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });
    const [nextMeetingForm, setNextMeetingForm] = useState({
        event_date: '',
        start_time: '',
        end_time: '',
        meeting_notes: '',
    });
    const [cancelForm, setCancelForm] = useState({ cancel_reason: '' });
    const actionEventIdRef = useRef(null);
    const lastClickedEventIdRef = useRef(null);
    const [stats, setStats] = useState({
        total_events: 0,
        today_events: 0,
        completed_events: 0,
        upcoming_events: 0,
        cancelled_events: 0,
    });

    useEffect(() => {
        const loadLookups = async () => {
            const [clientList, userList] = await Promise.all([
                getClients().catch(() => []),
                getUsers().catch(() => []),
            ]);
            setClients(clientList || []);
            setUsers(userList || []);
        };
        loadLookups();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getPlannerStats();
            if (data) {
                setStats({
                    total_events: data.total_events ?? 0,
                    today_events: data.today_events ?? 0,
                    completed_events: data.completed_events ?? 0,
                    upcoming_events: data.upcoming_events ?? 0,
                    cancelled_events: data.cancelled_events ?? 0,
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (calendarRange.start && calendarRange.end) {
            fetchEvents();
        }
    }, [calendarRange, categoryFilter, priorityFilter, clientFilter, userFilter]);

    useEffect(() => {
        fetchIndependentNotes();
    }, []);

    const fetchEvents = async () => {
        const params = {
            start: calendarRange.start,
            end: calendarRange.end,
        };
        if (categoryFilter !== 'all') {
            params.categories = categoryFilter;
        }
        if (priorityFilter !== 'all') {
            params.priorities = priorityFilter;
        }
        if (clientFilter) params.client_id = clientFilter;
        if (userFilter) params.user_id = userFilter;

        const data = await getPlannerEvents(params);
        setEvents(data);
        return data;
    };

    const fetchEventNotes = async (eventId) => {
        const notes = await getPlannerNotes({ event_id: eventId });
        setEventNotes(notes);
    };

    const fetchIndependentNotes = async () => {
        const notes = await getPlannerNotes({ only_orphaned: true });
        setIndependentNotes(notes);
    };

    const handleDatesSet = (arg) => {
        setCalendarRange({
            start: arg.startStr,
            end: arg.endStr,
        });
    };

    const filteredEvents = useMemo(() => {
        const searchLower = searchDebounced.toLowerCase();
        const todayStr = new Date().toISOString().slice(0, 10);
        const now = new Date();

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        return events.filter((e) => {
            if (searchLower) {
                const haystack = [
                    e.title,
                    e.description,
                    e.meeting_notes,
                    e.client_name,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!haystack.includes(searchLower)) {
                    return false;
                }
            }

            const status = e.status || 'scheduled';
            if (statusFilter !== 'all' && status !== statusFilter) {
                return false;
            }

            if (categoryFilter !== 'all' && e.category !== categoryFilter) {
                return false;
            }

            if (priorityFilter !== 'all' && e.priority !== priorityFilter) {
                return false;
            }

            if (dateFilter !== 'all' && e.event_date) {
                const eventDateObj = new Date(`${e.event_date}T00:00:00`);
                if (!Number.isNaN(eventDateObj.getTime())) {
                    if (dateFilter === 'today' && e.event_date !== todayStr) {
                        return false;
                    }
                    if (dateFilter === 'week') {
                        if (eventDateObj < startOfWeek || eventDateObj > endOfWeek) {
                            return false;
                        }
                    }
                    if (dateFilter === 'month') {
                        if (eventDateObj < startOfMonth || eventDateObj > endOfMonth) {
                            return false;
                        }
                    }
                }
            }

            return true;
        });
    }, [events, searchDebounced, statusFilter, categoryFilter, priorityFilter, dateFilter]);

    const mappedEvents = useMemo(
        () =>
            filteredEvents.map((e) => {
                const hasPreformatted = !!(e.start && e.end);

                const start = hasPreformatted
                    ? e.start
                    : e.start_time
                        ? `${e.event_date}T${e.start_time}`
                        : `${e.event_date}T00:00:00`;

                const end = hasPreformatted
                    ? e.end
                    : e.end_time
                        ? `${e.event_date}T${e.end_time}`
                        : e.start_time
                            ? `${e.event_date}T${e.start_time}`
                            : `${e.event_date}T23:59:00`;

                const statusColor = STATUS_COLORS[e.status] || STATUS_COLORS.scheduled;
                const color = statusColor || CATEGORY_COLORS[e.category] || '#3B82F6';

                return {
                    id: String(e.id),
                    title: e.title,
                    start,
                    end,
                    allDay: !e.start_time && !e.end_time,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: {
                        ...e,
                    },
                };
            }),
        [filteredEvents],
    );

    const handleEventClick = async (clickInfo) => {
        const eventId = clickInfo.event.id;
        const event = events.find((ev) => String(ev.id) === eventId);
        if (event) {
            lastClickedEventIdRef.current = event.id;
            setSelectedEvent(event);
            await fetchEventNotes(event.id);
        }
    };

    const handleEventDropOrResize = async (changeInfo) => {
        const { event } = changeInfo;
        const id = event.id;
        const start = event.start;
        const end = event.end || event.start;

        const updated = {
            event_date: start.toISOString().slice(0, 10),
            start_time: start.toTimeString().slice(0, 5),
            end_time: end.toTimeString().slice(0, 5),
        };

        try {
            await savePlannerEvent({ id, ...updated });
            await fetchEvents();
            await fetchStats();
        } catch (err) {
            console.error(err);
        }
    };

    const openNewEventModal = () => {
        setEventForm({
            id: null,
            title: '',
            description: '',
            event_date: calendarRange.start || '',
            start_time: '',
            end_time: '',
            category: 'meeting',
            priority: 'medium',
            client_id: '',
            invoice_id: '',
            reminder_time: '',
            notes: '',
            attachment: null,
        });
        setIsEventModalOpen(true);
    };

    const openEditEventModal = (eventOverride = null) => {
        const base = eventOverride || selectedEvent;
        if (!base) return;
        setEventForm({
            id: base.id,
            title: base.title,
            description: base.description || '',
            event_date: base.event_date,
            start_time: base.start_time || '',
            end_time: base.end_time || '',
            category: base.category || 'meeting',
            priority: base.priority || 'medium',
            client_id: base.client_id || '',
            invoice_id: base.invoice_id || '',
            reminder_time: base.reminder_time || '',
            notes: '',
            attachment: null,
        });
        setSelectedEvent(base);
        setIsEventModalOpen(true);
    };

    const handleEventFormChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'attachment') {
            setEventForm((prev) => ({ ...prev, attachment: files?.[0] || null }));
        } else {
            setEventForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        setEventError('');

        if (!eventForm.title.trim()) {
            setEventError('Title is required');
            return;
        }
        if (!eventForm.event_date) {
            setEventError('Event date is required');
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            if (eventForm.id) formData.append('id', eventForm.id);
            formData.append('title', eventForm.title);
            if (eventForm.description) formData.append('description', eventForm.description);
            formData.append('event_date', eventForm.event_date);
            if (eventForm.start_time) formData.append('start_time', eventForm.start_time);
            if (eventForm.end_time) formData.append('end_time', eventForm.end_time);
            if (eventForm.category) formData.append('category', eventForm.category);
            if (eventForm.priority) formData.append('priority', eventForm.priority);
            if (eventForm.client_id) formData.append('client_id', eventForm.client_id);
            if (eventForm.invoice_id) formData.append('invoice_id', eventForm.invoice_id);
            if (eventForm.reminder_time) formData.append('reminder_time', eventForm.reminder_time);
            if (eventForm.notes) formData.append('notes', eventForm.notes);
            if (eventForm.attachment) formData.append('attachment', eventForm.attachment);

            await savePlannerEvent(formData);
            setIsEventModalOpen(false);
            await fetchEvents();
            await fetchStats();
        } catch (err) {
            console.error(err);
            setEventError('Failed to save event. Please check the required fields.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        if (!window.confirm('Delete this event?')) return;
        try {
            await deletePlannerEvent(selectedEvent.id);
            setSelectedEvent(null);
            setEventNotes([]);
            await fetchEvents();
            toast.success('Event deleted');
            await fetchStats();
        } catch (err) {
            console.error(err);
        }
    };

    const refreshSelectedEvent = (updatedId) => {
        if (!updatedId) return;
        setEvents((prev) => {
            const list = prev.map((e) => (e.id === updatedId ? { ...e } : e));
            const found = list.find((e) => e.id === updatedId);
            if (found) {
                setSelectedEvent(found);
            }
            return list;
        });
    };

    const handleOpenCompleteModal = (eventOverride = null, explicitEventId = null) => {
        const base = eventOverride || selectedEvent;
        if (!base) return;
        const id = explicitEventId != null && explicitEventId !== '' && String(explicitEventId) !== 'undefined'
            ? explicitEventId
            : (base.id != null && base.id !== '' && String(base.id) !== 'undefined' ? base.id : resolveEventId(base));
        actionEventIdRef.current = id;
        if (id != null && id !== '' && String(id) !== 'undefined') lastClickedEventIdRef.current = id;
        setSelectedEvent(id != null ? { ...base, id } : base);
        setCompletionForm({ meeting_notes: '', outcome: '' });
        setIsCompleteModalOpen(true);
    };

    const handleSubmitComplete = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        const eventId = getEventIdForAction();
        if (eventId == null || eventId === '' || String(eventId) === 'undefined') {
            toast.error('Invalid event. Please select the event again.');
            return;
        }
        try {
            await completePlannerEvent(eventId, {
                meeting_notes: completionForm.meeting_notes,
                outcome: completionForm.outcome,
            });
            setIsCompleteModalOpen(false);
            setCompletionForm({ meeting_notes: '', outcome: '' });
            const list = await fetchEvents();
            await fetchStats();
            const updatedEvent = list.find((ev) => String(ev.id) === String(eventId));
            if (updatedEvent) setSelectedEvent(updatedEvent);
            toast.success('Meeting marked as completed');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to mark meeting as completed');
        }
    };

    const handleOpenRescheduleModal = (eventOverride = null, explicitEventId = null) => {
        const base = eventOverride || selectedEvent;
        if (!base) return;
        const id = explicitEventId != null && explicitEventId !== '' && String(explicitEventId) !== 'undefined'
            ? explicitEventId
            : (base.id != null && base.id !== '' && String(base.id) !== 'undefined' ? base.id : resolveEventId(base));
        actionEventIdRef.current = id;
        setRescheduleForm({
            event_date: base.event_date || '',
            start_time: base.start_time || '',
            end_time: base.end_time || '',
            reason: '',
        });
        setSelectedEvent(id != null ? { ...base, id } : base);
        setIsRescheduleModalOpen(true);
    };

    const handleSubmitReschedule = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        const eventId = getEventIdForAction();
        if (eventId == null || eventId === '' || String(eventId) === 'undefined') {
            toast.error('Invalid event. Please select the event again.');
            return;
        }
        try {
            await reschedulePlannerEvent(eventId, {
                event_date: rescheduleForm.event_date,
                start_time: rescheduleForm.start_time || null,
                end_time: rescheduleForm.end_time || null,
                reason: rescheduleForm.reason || null,
            });
            setIsRescheduleModalOpen(false);
            const list = await fetchEvents();
            await fetchStats();
            const updatedEvent = list.find((ev) => String(ev.id) === String(eventId));
            if (updatedEvent) setSelectedEvent(updatedEvent);
            toast.success('Meeting rescheduled');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to reschedule meeting');
        }
    };

    const handleOpenNextMeetingModal = (eventOverride = null, explicitEventId = null) => {
        const base = eventOverride || selectedEvent;
        if (!base) return;
        const id = explicitEventId != null && explicitEventId !== '' && String(explicitEventId) !== 'undefined'
            ? explicitEventId
            : (base.id != null && base.id !== '' && String(base.id) !== 'undefined' ? base.id : resolveEventId(base));
        actionEventIdRef.current = id;
        setNextMeetingForm({
            event_date: '',
            start_time: '',
            end_time: '',
            meeting_notes: '',
        });
        setSelectedEvent(id != null ? { ...base, id } : base);
        setIsNextMeetingModalOpen(true);
    };

    const handleSubmitNextMeeting = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        const eventId = getEventIdForAction();
        if (eventId == null || eventId === '' || String(eventId) === 'undefined') {
            toast.error('Invalid event. Please select the event again.');
            return;
        }
        try {
            await createNextPlannerMeeting(eventId, {
                title: selectedEvent.title,
                description: selectedEvent.description,
                event_date: nextMeetingForm.event_date,
                start_time: nextMeetingForm.start_time || null,
                end_time: nextMeetingForm.end_time || null,
                category: selectedEvent.category,
                priority: selectedEvent.priority,
                client_id: selectedEvent.client_id,
                reminder_time: selectedEvent.reminder_time,
                meeting_notes: nextMeetingForm.meeting_notes || null,
            });
            setIsNextMeetingModalOpen(false);
            await fetchEvents();
            await fetchStats();
            toast.success('Next meeting scheduled');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to schedule next meeting');
        }
    };

    const handleOpenCancelModal = (eventOverride = null, explicitEventId = null) => {
        const base = eventOverride || selectedEvent;
        if (!base) return;
        const id = explicitEventId != null && explicitEventId !== '' && String(explicitEventId) !== 'undefined'
            ? explicitEventId
            : (base.id != null && base.id !== '' && String(base.id) !== 'undefined' ? base.id : resolveEventId(base));
        actionEventIdRef.current = id;
        setCancelForm({ cancel_reason: '' });
        setSelectedEvent(id != null ? { ...base, id } : base);
        setIsCancelModalOpen(true);
    };

    const handleSubmitCancel = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        const eventId = getEventIdForAction();
        if (eventId == null || eventId === '' || String(eventId) === 'undefined') {
            toast.error('Invalid event. Please select the event again.');
            return;
        }
        try {
            await cancelPlannerEvent(eventId, {
                cancel_reason: cancelForm.cancel_reason || null,
            });
            setIsCancelModalOpen(false);
            const list = await fetchEvents();
            await fetchStats();
            const updatedEvent = list.find((ev) => String(ev.id) === String(eventId));
            if (updatedEvent) setSelectedEvent(updatedEvent);
            toast.success('Meeting cancelled');
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to cancel meeting');
        }
    };

    const handleAddNote = async (eventBound = false) => {
        setNoteError('');

        if (!newNote.title.trim()) {
            setNoteError('Title is required');
            return;
        }

        const payload = {
            title: newNote.title || (eventBound && selectedEvent ? selectedEvent.title : 'Note'),
            content: newNote.content,
            category: newNote.category,
            priority: newNote.priority,
            event_id: eventBound && selectedEvent ? selectedEvent.id : null,
        };
        try {
            const saved = await savePlannerNote(payload);
            setNewNote({
                title: '',
                content: '',
                category: 'personal',
                priority: 'medium',
            });
            if (eventBound && selectedEvent) {
                setEventNotes((prev) => [saved, ...prev]);
            } else {
                setIndependentNotes((prev) => [saved, ...prev]);
            }
        } catch (err) {
            console.error(err);
            setNoteError('Failed to save note. Please try again.');
        }
    };

    const handleDeleteNote = async (note, eventBound = false) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await deletePlannerNote(note.id);
            if (eventBound) {
                setEventNotes((prev) => prev.filter((n) => n.id !== note.id));
            } else {
                setIndependentNotes((prev) => prev.filter((n) => n.id !== note.id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const resolveEventId = (ev) => {
        if (ev == null) return null;
        const id = ev.id;
        if (id != null && id !== '' && String(id) !== 'undefined') return id;
        const evDate = ev.event_date ? String(ev.event_date).slice(0, 10) : '';
        const evTitle = (ev.title || '').trim();
        const evStart = (ev.start_time || '').toString().slice(0, 5);
        const fromList = events.find(
            (e) =>
                (e.title || '').trim() === evTitle &&
                (e.event_date ? String(e.event_date).slice(0, 10) : '') === evDate &&
                (e.start_time || '').toString().slice(0, 5) === evStart,
        );
        if (fromList) return fromList.id;
        const byTitleDate = events.find(
            (e) => (e.title || '').trim() === evTitle && (e.event_date ? String(e.event_date).slice(0, 10) : '') === evDate,
        );
        return byTitleDate ? byTitleDate.id : null;
    };

    const getEventIdForAction = () => {
        const valid = (id) => id != null && id !== '' && String(id) !== 'undefined';
        if (valid(actionEventIdRef.current)) return actionEventIdRef.current;
        if (valid(lastClickedEventIdRef.current)) return lastClickedEventIdRef.current;
        if (selectedEvent) {
            if (valid(selectedEvent.id)) return selectedEvent.id;
            const resolved = resolveEventId(selectedEvent);
            if (valid(resolved)) return resolved;
        }
        if (selectedEvent && events.length > 0) {
            const byTitle = events.find((e) => (e.title || '') === (selectedEvent.title || ''));
            if (byTitle && valid(byTitle.id)) return byTitle.id;
            const byTitleDate = events.find(
                (e) =>
                    (e.title || '') === (selectedEvent.title || '') &&
                    String(e.event_date || '').slice(0, 10) === String(selectedEvent.event_date || '').slice(0, 10),
            );
            if (byTitleDate && valid(byTitleDate.id)) return byTitleDate.id;
        }
        return null;
    };

    const renderEventContent = (eventInfo) => {
        const status = eventInfo.event.extendedProps.status || 'scheduled';
        const statusColor = STATUS_COLORS[status] || '#6B7280';
        const raw = eventInfo.event.extendedProps;
        const fcId = eventInfo.event.id;
        const rawId = raw?.id;
        const eventId = (fcId != null && fcId !== '' && String(fcId) !== 'undefined')
            ? fcId
            : (rawId != null && rawId !== '' && String(rawId) !== 'undefined' ? rawId : null);
        const baseEvent = {
            id: eventId,
            title: raw.title,
            description: raw.description,
            event_date: raw.event_date,
            start_time: raw.start_time,
            end_time: raw.end_time,
            category: raw.category,
            priority: raw.priority,
            status: raw.status,
            client_id: raw.client_id,
            reminder_time: raw.reminder_time,
        };

        return (
            <div className="group flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1 min-w-0">
                    <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                    ></span>
                    <span className="truncate">{eventInfo.event.title}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditEventModal(baseEvent);
                        }}
                        className="p-0.5 rounded hover:bg-gray-100"
                    >
                        <Edit3 className="h-3 w-3 text-slate-500" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCompleteModal(baseEvent, eventInfo.event.id ?? baseEvent.id);
                        }}
                        className="p-0.5 rounded hover:bg-gray-100"
                    >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRescheduleModal(baseEvent, eventInfo.event.id ?? baseEvent.id);
                        }}
                        className="p-0.5 rounded hover:bg-gray-100"
                    >
                        <Clock3 className="h-3 w-3 text-amber-500" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarIcon className="h-7 w-7 text-brand-600" />
                        Planner
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base">
                        Manage events, reminders, and notes from a single productivity hub.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                        <button
                            onClick={() => setCurrentView('dayGridMonth')}
                            className={clsx(
                                'px-3 py-1.5 text-xs font-medium rounded-lg',
                                currentView === 'dayGridMonth'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-gray-50',
                            )}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setCurrentView('timeGridWeek')}
                            className={clsx(
                                'px-3 py-1.5 text-xs font-medium rounded-lg',
                                currentView === 'timeGridWeek'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-gray-50',
                            )}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setCurrentView('timeGridDay')}
                            className={clsx(
                                'px-3 py-1.5 text-xs font-medium rounded-lg',
                                currentView === 'timeGridDay'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-gray-50',
                            )}
                        >
                            Day
                        </button>
                    </div>
                    <button
                        onClick={() => setFiltersOpen((v) => !v)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-slate-600 hover:bg-gray-50 shadow-sm"
                    >
                        <Filter className="h-4 w-4" />
                        More Filters
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <StatCard
                    title="Total Events"
                    description="Total events in planner"
                    value={stats.total_events}
                    icon={CalendarDays}
                    iconBgClass="bg-blue-50 border-blue-100"
                    iconColorClass="text-blue-600"
                />
                <StatCard
                    title="Today's Events"
                    description="Events scheduled today"
                    value={stats.today_events}
                    icon={Clock3}
                    iconBgClass="bg-emerald-50 border-emerald-100"
                    iconColorClass="text-emerald-600"
                />
                <StatCard
                    title="Completed Meetings"
                    description="Meetings finished"
                    value={stats.completed_events}
                    icon={CheckCircle2}
                    iconBgClass="bg-green-50 border-green-100"
                    iconColorClass="text-green-600"
                />
                <StatCard
                    title="Upcoming Meetings"
                    description="Future meetings"
                    value={stats.upcoming_events}
                    icon={CalendarClock}
                    iconBgClass="bg-indigo-50 border-indigo-100"
                    iconColorClass="text-indigo-600"
                />
                <StatCard
                    title="Cancelled Meetings"
                    description="Cancelled events"
                    value={stats.cancelled_events}
                    icon={XCircle}
                    iconBgClass="bg-red-50 border-red-100"
                    iconColorClass="text-red-600"
                />
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 flex-wrap items-end">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search events or meetings..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[150px]"
                    >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="missed">Missed</option>
                    </select>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[150px]"
                    >
                        <option value="all">All Categories</option>
                        <option value="meeting">Meeting</option>
                        <option value="payment">Payment</option>
                        <option value="deadline">Deadline</option>
                        <option value="reminder">Reminder</option>
                        <option value="personal">Personal</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                    >
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setSearchDebounced('');
                                setStatusFilter('all');
                                setCategoryFilter('all');
                                setPriorityFilter('all');
                                setDateFilter('all');
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
                        >
                            Reset Filters
                        </button>
                        <button
                            onClick={openNewEventModal}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 h-[38px]"
                        >
                            <Plus className="h-5 w-5" />
                            Add Event
                        </button>
                    </div>
                </div>
            </div>

            {filtersOpen && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 space-y-3">
                    <div className="flex flex-wrap gap-4 items-start">
                        <div className="flex-1 min-w-[160px]">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                                Client
                            </p>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white"
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                            >
                                <option value="">All Clients</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name || c.company_name || c.client_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                                User
                            </p>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white"
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                            >
                                <option value="">All Users</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        These filters further narrow down planner events by linked client and user.
                    </p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView={currentView}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: '',
                        }}
                        height="100%"
                        events={mappedEvents}
                        eventContent={renderEventContent}
                        selectable
                        editable
                        droppable={false}
                        eventClick={handleEventClick}
                        eventDrop={handleEventDropOrResize}
                        eventResize={handleEventDropOrResize}
                        datesSet={handleDatesSet}
                        dayMaxEvents={3}
                        moreLinkContent={(args) => `+${args.num} More Events`}
                    />
                </div>

                <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                    <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
                                {selectedEvent ? 'Event Details' : 'Quick Notes'}
                            </p>
                            <h3 className="text-lg font-bold text-slate-900">
                                {selectedEvent ? selectedEvent.title : 'Notes & Ideas'}
                            </h3>
                        </div>
                        {selectedEvent && (
                            <div className="flex gap-2">
                                <button
                                    onClick={openEditEventModal}
                                    className="p-2 rounded-lg border border-gray-200 text-slate-500 hover:bg-gray-50"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleDeleteEvent}
                                    className="p-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {selectedEvent && (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {selectedEvent.category && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-slate-600 border border-gray-200">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        CATEGORY_COLORS[selectedEvent.category] ||
                                                        '#3B82F6',
                                                }}
                                            ></span>
                                            {selectedEvent.category.charAt(0).toUpperCase() +
                                                selectedEvent.category.slice(1)}
                                        </span>
                                    )}
                                    {selectedEvent.priority && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-slate-600 border border-gray-200">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        PRIORITY_COLORS[selectedEvent.priority] ||
                                                        '#6B7280',
                                                }}
                                            ></span>
                                            Priority:{' '}
                                            {selectedEvent.priority.charAt(0).toUpperCase() +
                                                selectedEvent.priority.slice(1)}
                                        </span>
                                    )}
                                    {selectedEvent.status && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-slate-600 border border-gray-200">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        STATUS_COLORS[selectedEvent.status] ||
                                                        STATUS_COLORS.scheduled,
                                                }}
                                            ></span>
                                            Status:{' '}
                                            {selectedEvent.status.charAt(0).toUpperCase() +
                                                selectedEvent.status.slice(1)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">
                                    {selectedEvent.event_date}{' '}
                                    {selectedEvent.start_time &&
                                        `• ${selectedEvent.start_time} - ${selectedEvent.end_time || ''}`}
                                </p>
                                {selectedEvent.description && (
                                    <p className="text-sm text-slate-700 bg-gray-50 border border-gray-100 rounded-xl p-3">
                                        {selectedEvent.description}
                                    </p>
                                )}

                                <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Actions
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={handleOpenCompleteModal}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100 hover:bg-emerald-100"
                                        >
                                            Mark Completed
                                        </button>
                                        <button
                                            onClick={handleOpenRescheduleModal}
                                            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100 hover:bg-amber-100"
                                        >
                                            Reschedule
                                        </button>
                                        <button
                                            onClick={handleOpenNextMeetingModal}
                                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 hover:bg-blue-100"
                                        >
                                            Schedule Next Meeting
                                        </button>
                                        <button
                                            onClick={handleOpenCancelModal}
                                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-100 hover:bg-red-100"
                                        >
                                            Cancel Meeting
                                        </button>
                                    </div>
                                </div>

                                <EventNotesSection
                                    eventNotes={eventNotes}
                                    newNote={newNote}
                                    setNewNote={setNewNote}
                                    handleAddNote={handleAddNote}
                                    handleDeleteNote={handleDeleteNote}
                                />
                            </div>
                        )}

                        {!selectedEvent && (
                            <div className="space-y-4">
                                <div className="border border-dashed border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                        Quick Note
                                    </p>
                                    {noteError && (
                                        <p className="mb-2 text-[11px] text-red-600">
                                            {noteError}
                                        </p>
                                    )}
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2"
                                        placeholder="Note title"
                                        value={newNote.title}
                                        onChange={(e) =>
                                            setNewNote((prev) => ({ ...prev, title: e.target.value }))
                                        }
                                    />
                                    <textarea
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs mb-2 min-h-[60px]"
                                        placeholder="What do you need to remember?"
                                        value={newNote.content}
                                        onChange={(e) =>
                                            setNewNote((prev) => ({ ...prev, content: e.target.value }))
                                        }
                                    />
                                    <div className="flex justify-between items-center">
                                        <select
                                            className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-slate-600"
                                            value={newNote.category}
                                            onChange={(e) =>
                                                setNewNote((prev) => ({
                                                    ...prev,
                                                    category: e.target.value,
                                                }))
                                            }
                                        >
                                            <option value="personal">Personal</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="payment">Payment</option>
                                            <option value="deadline">Deadline</option>
                                            <option value="reminder">Reminder</option>
                                        </select>
                                        <button
                                            onClick={() => handleAddNote(false)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[11px] font-semibold"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Save Note
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                        Independent Notes
                                    </p>
                                    {independentNotes.length === 0 && (
                                        <p className="text-[11px] text-slate-400">
                                            No notes yet. Capture quick thoughts here.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-1 gap-3">
                                        {independentNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="relative bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs shadow-[0_6px_0_rgba(251,191,36,0.4)]"
                                            >
                                                <button
                                                    onClick={() => handleDeleteNote(note, false)}
                                                    className="absolute top-2 right-2 text-yellow-500 hover:text-red-500"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                                <p className="font-semibold text-yellow-900 mb-1">
                                                    {note.title}
                                                </p>
                                                <p className="text-yellow-800 whitespace-pre-wrap">
                                                    {note.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full mx-4">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">
                                {eventForm.id ? 'Edit Event' : 'Add Event'}
                            </h2>
                            <button
                                onClick={() => setIsEventModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEvent} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={eventForm.title}
                                    onChange={handleEventFormChange}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={eventForm.description}
                                    onChange={handleEventFormChange}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[60px]"
                                />
                            </div>
                            {eventError && (
                                <p className="text-xs text-red-600">
                                    {eventError}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        name="event_date"
                                        required
                                        value={eventForm.event_date}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Category
                                    </label>
                                    <select
                                        name="category"
                                        value={eventForm.category}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    >
                                        <option value="meeting">Meeting</option>
                                        <option value="payment">Payment</option>
                                        <option value="deadline">Deadline</option>
                                        <option value="reminder">Reminder</option>
                                        <option value="personal">Personal</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        name="start_time"
                                        value={eventForm.start_time}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        name="end_time"
                                        value={eventForm.end_time}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        name="priority"
                                        value={eventForm.priority}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Reminder
                                    </label>
                                    <select
                                        name="reminder_time"
                                        value={eventForm.reminder_time}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    >
                                        <option value="">No Reminder</option>
                                        <option value="10">10 minutes before</option>
                                        <option value="30">30 minutes before</option>
                                        <option value="60">1 hour before</option>
                                        <option value="1440">1 day before</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Linked Client
                                    </label>
                                    <select
                                        name="client_id"
                                        value={eventForm.client_id}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    >
                                        <option value="">None</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name || c.company_name || c.client_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Notes (optional)
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={eventForm.notes}
                                        onChange={handleEventFormChange}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[40px]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Attachment
                                </label>
                                <input
                                    type="file"
                                    name="attachment"
                                    onChange={handleEventFormChange}
                                    className="w-full text-xs text-slate-600"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEventModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving...' : eventForm.id ? 'Update Event' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isCompleteModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Mark Completed</h2>
                            <button
                                onClick={() => setIsCompleteModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitComplete} className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Meeting Notes
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[80px]"
                                    value={completionForm.meeting_notes}
                                    onChange={(e) =>
                                        setCompletionForm((prev) => ({
                                            ...prev,
                                            meeting_notes: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Outcome (optional)
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    value={completionForm.outcome}
                                    onChange={(e) =>
                                        setCompletionForm((prev) => ({
                                            ...prev,
                                            outcome: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCompleteModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isRescheduleModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Reschedule Meeting</h2>
                            <button
                                onClick={() => setIsRescheduleModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitReschedule} className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        New Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                        value={rescheduleForm.event_date}
                                        onChange={(e) =>
                                            setRescheduleForm((prev) => ({
                                                ...prev,
                                                event_date: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        New Start Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                        value={rescheduleForm.start_time}
                                        onChange={(e) =>
                                            setRescheduleForm((prev) => ({
                                                ...prev,
                                                start_time: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    New End Time
                                </label>
                                <input
                                    type="time"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    value={rescheduleForm.end_time}
                                    onChange={(e) =>
                                        setRescheduleForm((prev) => ({
                                            ...prev,
                                            end_time: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Reason (optional)
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[60px]"
                                    value={rescheduleForm.reason}
                                    onChange={(e) =>
                                        setRescheduleForm((prev) => ({
                                            ...prev,
                                            reason: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRescheduleModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isNextMeetingModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Schedule Next Meeting</h2>
                            <button
                                onClick={() => setIsNextMeetingModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitNextMeeting} className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                        value={nextMeetingForm.event_date}
                                        onChange={(e) =>
                                            setNextMeetingForm((prev) => ({
                                                ...prev,
                                                event_date: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                        value={nextMeetingForm.start_time}
                                        onChange={(e) =>
                                            setNextMeetingForm((prev) => ({
                                                ...prev,
                                                start_time: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                                    value={nextMeetingForm.end_time}
                                    onChange={(e) =>
                                        setNextMeetingForm((prev) => ({
                                            ...prev,
                                            end_time: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Notes (optional)
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[60px]"
                                    value={nextMeetingForm.meeting_notes}
                                    onChange={(e) =>
                                        setNextMeetingForm((prev) => ({
                                            ...prev,
                                            meeting_notes: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNextMeetingModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                                >
                                    Create Meeting
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isCancelModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full mx-4">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-900">Cancel Meeting</h2>
                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="p-1.5 rounded-full hover:bg-gray-100 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitCancel} className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Cancel Reason
                                </label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-[60px]"
                                    value={cancelForm.cancel_reason}
                                    onChange={(e) =>
                                        setCancelForm((prev) => ({
                                            ...prev,
                                            cancel_reason: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-slate-600 hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                                >
                                    Confirm Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const EventNotesSection = ({ eventNotes, newNote, setNewNote, handleAddNote, handleDeleteNote }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide"
            >
                <span>Notes for this Event</span>
                <span className="text-[10px] text-slate-400">{open ? 'Hide' : 'Show'}</span>
            </button>
            <div
                className={`px-3 pb-3 space-y-3 overflow-hidden transition-all duration-200 ${
                    open ? 'max-h-[260px]' : 'max-h-0'
                }`}
            >
                {open && (
                    <>
                        {eventNotes.length === 0 && (
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3" />
                                No notes yet. Add context below.
                            </div>
                        )}
                        <div className="space-y-2">
                            {eventNotes.map((note) => (
                                <div
                                    key={note.id}
                                    className="bg-white border border-gray-100 rounded-xl p-3 text-xs flex justify-between gap-2"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 mb-1">
                                            {note.title}
                                        </p>
                                        <p className="text-slate-600 whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteNote(note, true)}
                                        className="text-slate-300 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-2 space-y-2">
                            <input
                                type="text"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
                                placeholder="Note title"
                                value={newNote.title}
                                onChange={(e) =>
                                    setNewNote((prev) => ({ ...prev, title: e.target.value }))
                                }
                            />
                            <textarea
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs min-h-[60px]"
                                placeholder="Note details"
                                value={newNote.content}
                                onChange={(e) =>
                                    setNewNote((prev) => ({ ...prev, content: e.target.value }))
                                }
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleAddNote(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[11px] font-semibold"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add Note
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Planner;

