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
    History,
    DollarSign,
    Bell,
    User,
    LayoutList,
    Kanban,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import ToolbarSearch from '../components/ui/ToolbarSearch';
import EmptyState from '../components/ui/EmptyState';
import { FilterSelect, ClearFiltersButton } from '../components/ui/FilterControls';
import { ActionIconButton } from '../components/ui/TableRowActions';

const CATEGORY_COLORS = {
    meeting: '#3B82F6', // Blue
    payment: '#10B981', // Green
    deadline: '#EF4444', // Red
    reminder: '#F59E0B', // Yellow
    personal: '#8B5CF6', // Purple
};

// History modal column colors (Meeting Blue, Payment Green, Deadline Orange, Reminder Purple, Personal Gray)
const HISTORY_CATEGORY = [
    { key: 'meeting', label: 'Meeting', color: '#3B82F6', icon: CalendarDays },
    { key: 'payment', label: 'Payment', color: '#10B981', icon: DollarSign },
    { key: 'deadline', label: 'Deadline', color: '#F97316', icon: Clock3 },
    { key: 'reminder', label: 'Reminder', color: '#8B5CF6', icon: Bell },
    { key: 'personal', label: 'Personal', color: '#6B7280', icon: User },
];

const STATUS_COLORS = {
    scheduled: '#3B82F6', // Blue
    completed: '#10B981', // Green
    rescheduled: '#F59E0B', // Yellow
    cancelled: '#EF4444', // Red
    overdue: '#ff3b3b', // Red (overdue)
    missed: '#FB923C', // Orange (legacy, treated as overdue)
};

// Reminder before event: fire at these many minutes before start (smallest first so we trigger the closest one)
const REMINDER_BEFORE_MINUTES = [10, 30];

// Do not show "before" reminder popup for events created within this window (avoids popup right after save)
const REMINDER_GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes

// Default stats so stats cards render instantly (like Client module). API updates these after load.
const DEFAULT_STATS = {
    total_events: 0,
    today_events: 0,
    completed_events: 0,
    upcoming_events: 0,
    cancelled_events: 0,
    overdue_events: 0,
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
    const [viewMode, setViewMode] = useState('calendar');
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
    const [dateFilter, setDateFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [reminderEvent, setReminderEvent] = useState(null);
    const reminderAudioRef = useRef(null);
    const triggeredReminderRef = useRef(new Set());
    const triggeredOverdueRef = useRef(new Set());
    const triggeredBeforeRef = useRef(new Set()); // keys: `${eventId}_${minutes}` e.g. "42_10", "42_30"
    const eventsRef = useRef([]);
    const [eventForm, setEventForm] = useState({
        id: null,
        title: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        category: 'meeting',
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
    const [overduePopupEvent, setOverduePopupEvent] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyDetailsEvent, setHistoryDetailsEvent] = useState(null);
    // Stats with defaults so cards render instantly; API updates after load (same pattern as Client module).
    const [stats, setStats] = useState(DEFAULT_STATS);

    // Lookups: run once on mount, do not block render.
    useEffect(() => {
        const loadLookups = async () => {
            const [clientResult, userResult] = await Promise.all([
                getClients({ per_page: 100 }).then((r) => r?.data ?? r ?? []).catch(() => []),
                getUsers({ per_page: 100 }).catch(() => null),
            ]);
            setClients(Array.isArray(clientResult) ? clientResult : []);
            const users = userResult?.data ?? userResult ?? [];
            setUsers(Array.isArray(users) ? users : []);
        };
        loadLookups();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch stats and independent notes in parallel after mount (single effect, no blocking).
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [statsData, notesData] = await Promise.all([
                    getPlannerStats().catch(() => null),
                    getPlannerNotes({ only_orphaned: true }).catch(() => []),
                ]);
                if (cancelled) return;
                if (statsData) {
                    setStats({
                        total_events: statsData.total_events ?? 0,
                        today_events: statsData.today_events ?? 0,
                        completed_events: statsData.completed_events ?? 0,
                        upcoming_events: statsData.upcoming_events ?? 0,
                        cancelled_events: statsData.cancelled_events ?? 0,
                        overdue_events: statsData.overdue_events ?? 0,
                    });
                }
                setIndependentNotes(Array.isArray(notesData) ? notesData : []);
            } catch (err) {
                if (!cancelled) console.error(err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

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
                    overdue_events: data.overdue_events ?? 0,
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchEvents = useCallback(async () => {
        if (!calendarRange.start || !calendarRange.end) return [];
        const params = {
            start: calendarRange.start,
            end: calendarRange.end,
        };
        if (categoryFilter !== 'all') params.categories = categoryFilter;
        if (clientFilter) params.client_id = clientFilter;
        if (userFilter) params.user_id = userFilter;

        const raw = await getPlannerEvents(params);
        const data = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setEvents(data);
        return data;
    }, [calendarRange.start, calendarRange.end, categoryFilter, clientFilter, userFilter]);

    // Events: fetch only when calendar range is set (FullCalendar fires datesSet on mount). Do not block initial render.
    useEffect(() => {
        if (calendarRange.start && calendarRange.end) {
            fetchEvents();
        }
    }, [calendarRange.start, calendarRange.end, categoryFilter, clientFilter, userFilter, fetchEvents]);

    // Single Audio instance for in-app reminder (path: /sounds/reminder.mp3)
    useEffect(() => {
        reminderAudioRef.current = new Audio('/sounds/reminder.mp3');
        reminderAudioRef.current.volume = 1;
        return () => {
            if (reminderAudioRef.current) reminderAudioRef.current.pause();
        };
    }, []);

    // Fallback beep using Web Audio (plays when MP3 is missing or browser blocks file)
    const playFallbackBeep = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (_) {}
    }, []);

    // Unlock browser audio (required: browsers block sound until user interaction)
    useEffect(() => {
        const unlockAudio = () => {
            if (reminderAudioRef.current) {
                reminderAudioRef.current
                    .play()
                    .then(() => {
                        reminderAudioRef.current.pause();
                        reminderAudioRef.current.currentTime = 0;
                    })
                    .catch(() => {});
            }
        };
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    const playReminderSound = useCallback(() => {
        if (reminderAudioRef.current) {
            reminderAudioRef.current.currentTime = 0;
            reminderAudioRef.current
                .play()
                .then(() => {})
                .catch(() => {
                    playFallbackBeep();
                });
        } else {
            playFallbackBeep();
        }
    }, [playFallbackBeep]);

    const closeReminder = useCallback(() => {
        if (reminderAudioRef.current) reminderAudioRef.current.pause();
        setReminderEvent(null);
    }, []);

    // Keep ref in sync for timer callbacks
    eventsRef.current = events;

    const showReminderPopup = useCallback((event, minutesBefore = null) => {
        setReminderEvent({ title: event.title, time: event.start_time, minutesBefore, ...event });
    }, []);

    const showOverduePopup = useCallback((event) => {
        setOverduePopupEvent({ title: event.title, time: event.start_time, ...event });
    }, []);

    const checkPlannerEvents = useCallback(() => {
        const eventList = eventsRef.current;
        const now = new Date();

        eventList.forEach((event) => {
            if (!event.event_date || !event.start_time) return;
            const status = event.status || 'scheduled';
            if (status === 'completed' || status === 'cancelled') return;

            const dateStr = String(event.event_date).slice(0, 10);
            const timeStr = String(event.start_time).slice(0, 5);
            const eventDateTime = new Date(`${dateStr}T${timeStr}`);
            const eventTime = eventDateTime.getTime();
            if (Number.isNaN(eventTime)) return;

            const diffMinutes = Math.floor((now.getTime() - eventTime) / 60000);
            const isPastEventTime = now.getTime() > eventTime;
            const minutesUntil = Math.ceil((eventTime - now.getTime()) / 60000);

            /* OVERDUE ALERT - current time past event time (e.g. 12:32 when event was 12:31); only once per event */
            if (isPastEventTime && (status === 'scheduled' || status === 'rescheduled')) {
                if (!triggeredOverdueRef.current.has(event.id)) {
                    showOverduePopup(event);
                    playReminderSound();
                    triggeredOverdueRef.current.add(event.id);
                    setEvents((prev) =>
                        prev.map((e) =>
                            e.id === event.id ? { ...e, status: 'overdue' } : e
                        )
                    );
                }
                return;
            }

            /* EVENT TIME REMINDER - same minute (diffMinutes === 0); only once per event */
            if (diffMinutes === 0) {
                const createdAtForReminder = event.created_at ? new Date(event.created_at).getTime() : 0;
                const isNewlyCreatedForReminder = createdAtForReminder && (now.getTime() - createdAtForReminder) < REMINDER_GRACE_PERIOD_MS;
                if (!isNewlyCreatedForReminder && !triggeredReminderRef.current.has(event.id)) {
                    showReminderPopup(event);
                    playReminderSound();
                    triggeredReminderRef.current.add(event.id);
                }
                return;
            }

            /* REMINDER BEFORE EVENT - 10 min, 30 min, etc.; only once per event per threshold */
            if (eventTime > now.getTime()) {
                const createdAt = event.created_at ? new Date(event.created_at).getTime() : 0;
                const isNewlyCreated = createdAt && (now.getTime() - createdAt) < REMINDER_GRACE_PERIOD_MS;
                if (isNewlyCreated) return; // do not show reminder popup right after event creation

                for (const threshold of REMINDER_BEFORE_MINUTES) {
                    if (minutesUntil <= threshold && !triggeredBeforeRef.current.has(`${event.id}_${threshold}`)) {
                        showReminderPopup(event, threshold);
                        playReminderSound();
                        triggeredBeforeRef.current.add(`${event.id}_${threshold}`);
                        break; // one popup per check (closest threshold only)
                    }
                }
            }
        });
    }, [showReminderPopup, showOverduePopup, playReminderSound]);

    // Check every 5 seconds so overdue alert triggers shortly after event time (e.g. 12:21 when event was 12:20)
    useEffect(() => {
        checkPlannerEvents();
        const intervalId = setInterval(checkPlannerEvents, 5000);
        return () => clearInterval(intervalId);
    }, [events, checkPlannerEvents]);

    // Play reminder sound when event-time popup appears; stop when dismissed
    useEffect(() => {
        if (!reminderEvent) {
            reminderAudioRef.current?.pause();
            return;
        }
        playReminderSound();
    }, [reminderEvent, playReminderSound]);

    const closeOverduePopup = useCallback(() => {
        setOverduePopupEvent(null);
    }, []);

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
            if (statusFilter !== 'all') {
                const matchOverdue = statusFilter === 'overdue' && (status === 'overdue' || status === 'missed');
                if (!matchOverdue && status !== statusFilter) {
                    return false;
                }
            }

            if (categoryFilter !== 'all' && e.category !== categoryFilter) {
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
    }, [events, searchDebounced, statusFilter, categoryFilter, dateFilter]);

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

                const status = e.status || 'scheduled';
                const isOverdue = status === 'overdue' || status === 'missed';
                const statusColor = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
                const color = statusColor || CATEGORY_COLORS[e.category] || '#3B82F6';

                return {
                    id: String(e.id),
                    title: e.title,
                    start,
                    end,
                    allDay: !e.start_time && !e.end_time,
                    backgroundColor: color,
                    borderColor: color,
                    classNames: isOverdue ? ['event-overdue'] : [],
                    extendedProps: {
                        ...e,
                        status: isOverdue ? 'overdue' : e.status,
                    },
                };
            }),
        [filteredEvents],
    );

    // Stats for the currently viewed calendar range (month / week / day) — not global DB counts
    const viewStats = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return {
            total_events: events.length,
            today_events: events.filter((e) => String(e.event_date || '').slice(0, 10) === todayStr).length,
            completed_events: events.filter((e) => e.status === 'completed').length,
            upcoming_events: events.filter((e) => e.status === 'scheduled').length,
            cancelled_events: events.filter((e) => e.status === 'cancelled').length,
            overdue_events: events.filter((e) => e.status === 'overdue' || e.status === 'missed').length,
        };
    }, [events]);

    // Current calendar month for History modal: calendarRange.start or fallback to today
    const historyMonthDate = useMemo(() => {
        if (calendarRange?.start) {
            const d = new Date(calendarRange.start + 'T12:00:00');
            if (!Number.isNaN(d.getTime())) return d;
        }
        return new Date();
    }, [calendarRange?.start]);

    const historyMonth = historyMonthDate.getMonth();
    const historyYear = historyMonthDate.getFullYear();

    // Events for the selected month only (for History modal)
    const historyMonthEvents = useMemo(() => {
        return events.filter((e) => {
            const d = new Date(String(e.event_date || '').slice(0, 10) + 'T12:00:00');
            if (Number.isNaN(d.getTime())) return false;
            return d.getMonth() === historyMonth && d.getFullYear() === historyYear;
        });
    }, [events, historyMonth, historyYear]);

    // Group history events by category for the 5 columns (case-insensitive)
    const historyByCategory = useMemo(() => ({
        meeting: historyMonthEvents.filter((e) => (e.category || '').toLowerCase() === 'meeting'),
        payment: historyMonthEvents.filter((e) => (e.category || '').toLowerCase() === 'payment'),
        deadline: historyMonthEvents.filter((e) => (e.category || '').toLowerCase() === 'deadline'),
        reminder: historyMonthEvents.filter((e) => (e.category || '').toLowerCase() === 'reminder'),
        personal: historyMonthEvents.filter((e) => (e.category || '').toLowerCase() === 'personal'),
    }), [historyMonthEvents]);

    // Kanban: group events by status for board columns
    const kanbanGrouped = useMemo(() => ({
        scheduled: filteredEvents.filter((e) => (e.status || 'scheduled') === 'scheduled' || (e.status === 'rescheduled')),
        completed: filteredEvents.filter((e) => e.status === 'completed'),
        cancelled: filteredEvents.filter((e) => e.status === 'cancelled'),
        overdue: filteredEvents.filter((e) => e.status === 'overdue' || e.status === 'missed'),
    }), [filteredEvents]);

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
            const id = Number(eventId);
            if (!Number.isNaN(id)) {
                triggeredReminderRef.current.delete(id);
                triggeredOverdueRef.current.delete(id);
                const prefix = `${id}_`;
                for (const key of triggeredBeforeRef.current) {
                    if (String(key).startsWith(prefix)) triggeredBeforeRef.current.delete(key);
                }
            }
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
        const isOverdue = status === 'overdue' || status === 'missed';
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
            status: isOverdue ? 'overdue' : raw.status,
            client_id: raw.client_id,
            reminder_time: raw.reminder_time,
        };

        return (
            <div
                className={clsx('group flex items-center justify-between gap-1 text-[11px]', isOverdue && 'event-overdue')}
                title={isOverdue ? 'Overdue' : undefined}
            >
                <div className="flex items-center gap-1 min-w-0">
                    <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                    />
                    <span className={clsx('truncate', isOverdue && 'event-overdue')}>{eventInfo.event.title}</span>
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
            {/* In-app event reminder popup at event time */}
            {reminderEvent && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-[360px] p-6 text-center animate-fade-in">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                            <span role="img" aria-label="reminder">🔔</span>
                            {reminderEvent.minutesBefore != null ? 'Reminder' : 'Event Reminder'}
                        </h2>
                        <p className="mt-3 text-slate-700">
                            <span className="font-semibold text-slate-900">Title:</span>{' '}
                            {reminderEvent.title || 'Event'}
                        </p>
                        {reminderEvent.minutesBefore != null ? (
                            <p className="mt-1 text-slate-600 font-medium">
                                Starts in {reminderEvent.minutesBefore} minute{reminderEvent.minutesBefore !== 1 ? 's' : ''}
                            </p>
                        ) : (
                            <p className="mt-1 text-slate-600">
                                <span className="font-semibold text-slate-900">Time:</span>{' '}
                                {(reminderEvent.start_time || '').toString().slice(0, 5)}
                            </p>
                        )}
                        {reminderEvent.notes && (
                            <p className="mt-2 text-sm text-slate-500">
                                <span className="font-semibold text-slate-700">Notes:</span>{' '}
                                {reminderEvent.notes}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    const ev = reminderEvent;
                                    closeReminder();
                                    if (ev?.id) {
                                        lastClickedEventIdRef.current = ev.id;
                                        setSelectedEvent(ev);
                                        fetchEventNotes(ev.id);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 shadow-sm"
                            >
                                View Event
                            </button>
                            <button
                                type="button"
                                onClick={closeReminder}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overdue event popup when planner opens with overdue events */}
            {overduePopupEvent && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-red-100 w-full max-w-[360px] p-6 text-center animate-fade-in">
                        <h2 className="text-lg font-bold text-red-600 flex items-center justify-center gap-2">
                            <span role="img" aria-label="overdue">⚠️</span>
                            Event Overdue
                        </h2>
                        <p className="mt-3 text-slate-700">
                            <span className="font-semibold text-slate-900">Meeting:</span>{' '}
                            {overduePopupEvent.title || 'Event'}
                        </p>
                        <p className="mt-1 text-slate-600">
                            <span className="font-semibold text-slate-900">Scheduled:</span>{' '}
                            {(overduePopupEvent.start_time || overduePopupEvent.time || '').toString().slice(0, 5)}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    const ev = overduePopupEvent;
                                    closeOverduePopup();
                                    if (ev?.id) {
                                        lastClickedEventIdRef.current = ev.id;
                                        setSelectedEvent(ev);
                                        fetchEventNotes(ev.id);
                                        handleOpenCompleteModal(ev, ev.id);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm"
                            >
                                Mark Completed
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const ev = overduePopupEvent;
                                    closeOverduePopup();
                                    if (ev?.id) {
                                        lastClickedEventIdRef.current = ev.id;
                                        setSelectedEvent(ev);
                                        fetchEventNotes(ev.id);
                                        handleOpenRescheduleModal(ev, ev.id);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 shadow-sm"
                            >
                                Reschedule
                            </button>
                            <button
                                type="button"
                                onClick={closeOverduePopup}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-gray-50"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Planner Monthly History modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-[1000px] my-8 flex flex-col max-h-[90vh] animate-fade-in">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-900">
                                Planner Monthly History — {historyMonthDate.toLocaleString('default', { month: 'long' })} {historyYear}
                            </h2>
                            <button
                                type="button"
                                onClick={() => { setIsHistoryModalOpen(false); setHistoryDetailsEvent(null); }}
                                className="p-2 rounded-lg border border-gray-200 text-slate-500 hover:bg-gray-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="grid grid-cols-5 gap-3 min-h-[280px]">
                                {HISTORY_CATEGORY.map(({ key, label, color, icon: Icon }) => {
                                            const list = historyByCategory[key] || [];
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex flex-col rounded-xl border border-gray-200 overflow-hidden flex-shrink-0 w-[calc(100%-0px)]"
                                                    style={{ minWidth: 0 }}
                                                >
                                                    <div
                                                        className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0 sticky top-0 bg-white z-10"
                                                        style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                                                    >
                                                        <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
                                                        <span className="font-semibold text-slate-800 text-sm truncate">{label}</span>
                                                        <span className="text-slate-500 text-xs ml-auto">({list.length})</span>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto min-h-[120px] p-2 bg-gray-50/50">
                                                        {list.length === 0 ? (
                                                            <p className="text-xs text-slate-400 py-4 text-center">No events this month</p>
                                                        ) : (
                                                            list.map((ev) => {
                                                                const evDate = ev.event_date ? new Date(String(ev.event_date).slice(0, 10) + 'T12:00:00') : null;
                                                                const dateStr = evDate && !Number.isNaN(evDate.getTime())
                                                                    ? evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                                    : '—';
                                                                const t = (ev.start_time || '').toString().slice(0, 5);
                                                                const timeStr = t ? (() => { const [h, m] = t.split(':'); const hh = parseInt(h, 10); return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; })() : '—';
                                                                const statusLabel = (ev.status === 'missed' ? 'overdue' : ev.status) || 'scheduled';
                                                                return (
                                                                    <button
                                                                        key={ev.id}
                                                                        type="button"
                                                                        onClick={() => setHistoryDetailsEvent(ev)}
                                                                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors mb-1 last:mb-0"
                                                                    >
                                                                        <p className="font-medium text-slate-900 text-xs truncate">{ev.title || 'Untitled'}</p>
                                                                        <p className="text-[11px] text-slate-500 mt-0.5">{dateStr} • {timeStr}</p>
                                                                        <p className="text-[11px] text-slate-500">Status: {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</p>
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monthly Summary</p>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                                    <span>Total Events: <strong>{historyMonthEvents.length}</strong></span>
                                    <span>Completed: <strong>{historyMonthEvents.filter((e) => e.status === 'completed').length}</strong></span>
                                    <span>Upcoming: <strong>{historyMonthEvents.filter((e) => e.status === 'scheduled').length}</strong></span>
                                    <span>Cancelled: <strong>{historyMonthEvents.filter((e) => e.status === 'cancelled').length}</strong></span>
                                    <span>Overdue: <strong>{historyMonthEvents.filter((e) => e.status === 'overdue' || e.status === 'missed').length}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History: event details popup inside history modal */}
            {isHistoryModalOpen && historyDetailsEvent && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-4" onClick={() => setHistoryDetailsEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-[400px] p-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-slate-900 mb-3">Event Details</h3>
                        <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">Title:</span> {historyDetailsEvent.title || 'Untitled'}</p>
                        <p className="text-sm text-slate-700 mt-1"><span className="font-semibold text-slate-900">Category:</span> {(historyDetailsEvent.category || 'meeting').charAt(0).toUpperCase() + (historyDetailsEvent.category || '').slice(1)}</p>
                        <p className="text-sm text-slate-700 mt-1"><span className="font-semibold text-slate-900">Date:</span> {historyDetailsEvent.event_date ? new Date(historyDetailsEvent.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
                        <p className="text-sm text-slate-700 mt-1"><span className="font-semibold text-slate-900">Time:</span> {(historyDetailsEvent.start_time || '').toString().slice(0, 5) || '—'}</p>
                        <p className="text-sm text-slate-700 mt-1"><span className="font-semibold text-slate-900">Status:</span> {((historyDetailsEvent.status === 'missed' ? 'overdue' : historyDetailsEvent.status) || 'scheduled').charAt(0).toUpperCase() + ((historyDetailsEvent.status === 'missed' ? 'overdue' : historyDetailsEvent.status) || 'scheduled').slice(1)}</p>
                        {historyDetailsEvent.description && <p className="text-sm text-slate-700 mt-1"><span className="font-semibold text-slate-900">Notes:</span> {historyDetailsEvent.description}</p>}
                        <div className="flex flex-wrap gap-2 mt-4">
                            <button type="button" onClick={() => { setSelectedEvent(historyDetailsEvent); setHistoryDetailsEvent(null); setIsHistoryModalOpen(false); fetchEventNotes(historyDetailsEvent.id); }} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold">View in Panel</button>
                            <button type="button" onClick={() => { handleOpenCompleteModal(historyDetailsEvent, historyDetailsEvent.id); setHistoryDetailsEvent(null); setIsHistoryModalOpen(false); }} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">Mark Completed</button>
                            <button type="button" onClick={() => { handleOpenRescheduleModal(historyDetailsEvent, historyDetailsEvent.id); setHistoryDetailsEvent(null); setIsHistoryModalOpen(false); }} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">Reschedule</button>
                            <button type="button" onClick={() => { handleOpenCancelModal(historyDetailsEvent, historyDetailsEvent.id); setHistoryDetailsEvent(null); setIsHistoryModalOpen(false); }} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-100">Cancel</button>
                            <button type="button" onClick={() => setHistoryDetailsEvent(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-slate-600 text-xs font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Planner"
                subtitle="Manage events, reminders, and notes from a single productivity hub."
                secondaryActions={(
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                        <button
                            onClick={() => setCurrentView('dayGridMonth')}
                            className={clsx(
                                'px-3 py-1.5 text-xs font-medium rounded-lg',
                                currentView === 'dayGridMonth'
                                    ? 'bg-violet-600 text-white shadow-sm'
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
                                    ? 'bg-violet-600 text-white shadow-sm'
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
                                    ? 'bg-violet-600 text-white shadow-sm'
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
                        Filters
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-slate-600 hover:bg-gray-50 shadow-sm"
                        title="Planner Monthly History"
                    >
                        <History className="h-4 w-4" />
                        History
                    </button>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Total Events"
                    description="Events in current view"
                    value={viewStats.total_events}
                    icon={CalendarDays}
                    iconBgClass="bg-blue-50 border-blue-100"
                    iconColorClass="text-blue-600"
                />
                <StatCard
                    title="Today's Events"
                    description="Events scheduled today"
                    value={viewStats.today_events}
                    icon={Clock3}
                    iconBgClass="bg-emerald-50 border-emerald-100"
                    iconColorClass="text-emerald-600"
                />
                <StatCard
                    title="Completed Meetings"
                    description="Meetings finished"
                    value={viewStats.completed_events}
                    icon={CheckCircle2}
                    iconBgClass="bg-green-50 border-green-100"
                    iconColorClass="text-green-600"
                />
                <StatCard
                    title="Upcoming Meetings"
                    description="Future meetings"
                    value={viewStats.upcoming_events}
                    icon={CalendarClock}
                    iconBgClass="bg-indigo-50 border-indigo-100"
                    iconColorClass="text-indigo-600"
                />
                <StatCard
                    title="Cancelled Meetings"
                    description="Cancelled events"
                    value={viewStats.cancelled_events}
                    icon={XCircle}
                    iconBgClass="bg-red-50 border-red-100"
                    iconColorClass="text-red-600"
                />
                <StatCard
                    title="Overdue Events"
                    description="Missed / past due"
                    value={viewStats.overdue_events}
                    icon={AlertTriangle}
                    iconBgClass="bg-red-50 border-red-200"
                    iconColorClass="text-red-600"
                />
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 flex-wrap items-center lg:items-end">
                    <ToolbarSearch
                        placeholder="Search events or meetings..."
                        value={search}
                        onChange={setSearch}
                        className="min-w-[200px]"
                    />
                    <FilterSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        minWidthClass="min-w-[150px]"
                    >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="overdue">Overdue</option>
                    </FilterSelect>
                    <FilterSelect
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        minWidthClass="min-w-[150px]"
                    >
                        <option value="all">All Categories</option>
                        <option value="meeting">Meeting</option>
                        <option value="payment">Payment</option>
                        <option value="deadline">Deadline</option>
                        <option value="reminder">Reminder</option>
                        <option value="personal">Personal</option>
                    </FilterSelect>
                    <FilterSelect
                        value={dateFilter}
                        onChange={setDateFilter}
                        minWidthClass="min-w-[140px]"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </FilterSelect>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <ClearFiltersButton
                            onClick={() => {
                                setSearch('');
                                setSearchDebounced('');
                                setStatusFilter('all');
                                setCategoryFilter('all');
                                setDateFilter('all');
                            }}
                        />
                        <button
                            onClick={openNewEventModal}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/30 h-[38px]"
                        >
                            <Plus className="h-5 w-5" />
                            Create Event
                        </button>
                    </div>
                </div>
            </div>

            {filtersOpen && (
                <div className="card !border-0 p-4 md:p-5 space-y-3">
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

            {/* View Switch Section — separate bar between filters and content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="flex items-center gap-2">
                    {[
                        { id: 'list', icon: LayoutList, label: 'List View' },
                        { id: 'kanban', icon: Kanban, label: 'Kanban View' },
                        { id: 'calendar', icon: CalendarDays, label: 'Calendar View' },
                    ].map((view) => (
                        <button
                            key={view.id}
                            type="button"
                            onClick={() => setViewMode(view.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                                viewMode === view.id
                                    ? 'bg-violet-600 text-white shadow-sm'
                                    : 'text-slate-600 bg-gray-100 hover:bg-gray-200'
                            )}
                        >
                            <view.icon className="w-4 h-4" />
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
                <div className="flex-1 card !border-0 overflow-hidden flex flex-col min-h-[500px]">
                    {viewMode === 'list' && (
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-sm text-left min-w-[900px]">
                                <thead className="bg-gray-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Title</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Start Time</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Linked Client</th>
                                        <th className="px-4 py-3">Created</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredEvents.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-2">
                                                <EmptyState
                                                    icon={CalendarDays}
                                                    title="No events found"
                                                    description="Add an event or adjust filters."
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEvents.map((ev) => {
                                            const evDate = ev.event_date ? new Date(String(ev.event_date).slice(0, 10) + 'T12:00:00') : null;
                                            const dateStr = evDate && !Number.isNaN(evDate.getTime()) ? evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                            const timeStr = (ev.start_time || '').toString().slice(0, 5) || '—';
                                            const statusLabel = (ev.status === 'missed' ? 'overdue' : ev.status) || 'scheduled';
                                            const createdStr = ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                            return (
                                                <tr
                                                    key={ev.id}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                    onClick={() => { setSelectedEvent(ev); fetchEventNotes(ev.id); }}
                                                >
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-600">EVT-{ev.id}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{ev.title || 'Untitled'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-slate-700">
                                                            {(ev.category || 'meeting').charAt(0).toUpperCase() + (ev.category || 'meeting').slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{dateStr}</td>
                                                    <td className="px-4 py-3 text-slate-600">{timeStr}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={clsx(
                                                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                                                                (statusLabel === 'overdue' || statusLabel === 'cancelled') ? 'bg-red-50 text-red-700 border-red-100' :
                                                                statusLabel === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                'bg-blue-50 text-blue-700 border-blue-100'
                                                            )}
                                                        >
                                                            {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{ev.client_name || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">{createdStr}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <ActionIconButton
                                                                onClick={(e) => { e.stopPropagation(); openEditEventModal(ev); }}
                                                                title="Edit"
                                                                icon={Edit3}
                                                                tone="edit"
                                                            />
                                                            <ActionIconButton
                                                                onClick={(e) => { e.stopPropagation(); handleOpenCompleteModal(ev, ev.id); }}
                                                                title="Complete"
                                                                icon={CheckCircle2}
                                                                tone="view"
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {viewMode === 'kanban' && (
                        <div className="grid grid-cols-4 gap-4 w-full flex-1 min-h-0 p-4">
                            {[
                                { id: 'scheduled', label: 'Scheduled', bg: 'bg-blue-50', border: 'border-blue-200' },
                                { id: 'completed', label: 'Completed', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                { id: 'cancelled', label: 'Cancelled', bg: 'bg-red-50', border: 'border-red-200' },
                                { id: 'overdue', label: 'Overdue', bg: 'bg-amber-50', border: 'border-amber-200' },
                            ].map((col) => {
                                const list = kanbanGrouped[col.id] || [];
                                return (
                                    <div
                                        key={col.id}
                                        className={clsx(
                                            'rounded-xl border flex flex-col overflow-hidden min-h-[500px] p-3',
                                            col.bg,
                                            col.border
                                        )}
                                    >
                                        <div className="flex justify-between items-center font-semibold mb-2.5 flex-shrink-0">
                                            <h3 className="text-slate-800 text-sm">{col.label}</h3>
                                            <span className="bg-white/90 text-slate-600 py-1 px-2 rounded-lg text-xs font-bold shadow-sm">{list.length}</span>
                                        </div>
                                        <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0 flex-1 custom-scrollbar max-h-[600px]">
                                            {list.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic py-6 text-center">No events</p>
                                            ) : (
                                                list.map((ev) => {
                                                    const evDate = ev.event_date ? new Date(String(ev.event_date).slice(0, 10) + 'T12:00:00') : null;
                                                    const dateStr = evDate && !Number.isNaN(evDate.getTime()) ? evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                                                    const t = (ev.start_time || '').toString().slice(0, 5);
                                                    const timeStr = t ? (() => { const [h, m] = t.split(':'); const hh = parseInt(h, 10); return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`; })() : '—';
                                                    return (
                                                        <button
                                                            key={ev.id}
                                                            type="button"
                                                            onClick={() => { setSelectedEvent(ev); fetchEventNotes(ev.id); }}
                                                            className="w-full text-left bg-white rounded-lg p-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.08)] border border-gray-100 hover:shadow-md hover:border-violet-200/50 transition-all"
                                                        >
                                                            <p className="font-semibold text-slate-900 text-sm truncate">{ev.title || 'Untitled'}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{dateStr} • {timeStr}</p>
                                                            <span className="inline-flex mt-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-slate-600">
                                                                {(ev.category || 'meeting').charAt(0).toUpperCase() + (ev.category || 'meeting').slice(1)}
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {viewMode === 'calendar' && (
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
                    )}
                </div>

                <div className="w-full lg:w-96 card !border-0 flex flex-col min-h-[400px]">
                    <div className="p-4 md:p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">
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
                                    {selectedEvent.status && (
                                        <span
                                            className={clsx(
                                                'inline-flex items-center gap-1 px-2 py-1 rounded-full border',
                                                (selectedEvent.status === 'overdue' || selectedEvent.status === 'missed')
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-gray-50 text-slate-600 border-gray-200'
                                            )}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        STATUS_COLORS[selectedEvent.status] ||
                                                        STATUS_COLORS.scheduled,
                                                }}
                                            />
                                            Status:{' '}
                                            {(selectedEvent.status === 'missed' ? 'overdue' : selectedEvent.status).charAt(0).toUpperCase() +
                                                (selectedEvent.status === 'missed' ? 'overdue' : selectedEvent.status).slice(1)}
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
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold"
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
                                {eventForm.id ? 'Edit Event' : 'Create Event'}
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
                                    className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60"
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
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold"
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

