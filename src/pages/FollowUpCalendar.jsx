import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { getFollowUps, saveFollowUp } from '../services/db';
import SetFollowUpModal from '../components/SetFollowUpModal';

const FollowUpCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [followUps, setFollowUps] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ overdue: 0, today: 0, thisWeek: 0, total: 0 });
    const [selectedLeadForModal, setSelectedLeadForModal] = useState(null);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    // Update stats when followUps change
    useEffect(() => {
        calculateStats();
    }, [followUps]);

    const fetchData = async () => {
        // Calculate start and end of the month view (including padding days)
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Fetch slightly wider range to be safe
        const startStr = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const endStr = new Date(year, month + 2, 0).toISOString().slice(0, 10);

        try {
            const data = await getFollowUps({ start_date: startStr, end_date: endStr });
            setFollowUps(data);
        } catch (error) {
            console.error(error);
        }
    };

    const calculateStats = () => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Start/End of this week (assuming Sun-Sat or Mon-Sun)
        // Let's go with Monday start for consistency with UI
        const currentDay = now.getDay(); // 0 is Sun
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        let o = 0, t = 0, w = 0;

        followUps.forEach(f => {
            const fDate = new Date(f.scheduled_at);
            const fDateStr = fDate.toISOString().slice(0, 10);

            if (f.status !== 'completed' && fDate < new Date() && fDateStr !== todayStr) {
                o++;
            }
            if (fDateStr === todayStr) {
                t++;
            }
            if (fDate >= startOfWeek && fDate <= endOfWeek) {
                w++;
            }
        });

        setStats({
            overdue: o,
            today: t,
            thisWeek: w,
            total: followUps.length // Total in view or total pending? UI says "Total 2", maybe total for month? Let's use total retrieved.
        });
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // 0 for Mon, 6 for Sun

        const days = [];
        // Previous month padding
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ day: prevMonthDays - startingDayOfWeek + i + 1, type: 'prev', date: new Date(year, month - 1, prevMonthDays - startingDayOfWeek + i + 1) });
        }

        // Current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, type: 'current', date: new Date(year, month, i) });
        }

        // Next month padding
        const remaining = 42 - days.length; // 6 rows * 7 cols
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, type: 'next', date: new Date(year, month + 1, i) });
        }
        return days;
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const isSameDate = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const getFollowUpsForDate = (date) => {
        return followUps.filter(f => isSameDate(new Date(f.scheduled_at), date));
    };

    return (
        <div className="h-full">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center">
                    <div>
                        <p className="text-red-600 text-xs font-bold uppercase tracking-wider">Overdue</p>
                        <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-300" />
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex justify-between items-center">
                    <div>
                        <p className="text-orange-600 text-xs font-bold uppercase tracking-wider">Today</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.today}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-orange-300" />
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                    <div>
                        <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">This Week</p>
                        <p className="text-2xl font-bold text-blue-700">{stats.thisWeek}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-300" />
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                    <div>
                        <p className="text-green-600 text-xs font-bold uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-bold text-green-700">{stats.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-300" />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-indigo-700 rounded"><ChevronLeft className="h-5 w-5" /></button>
                        <h2 className="font-semibold text-lg">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-indigo-700 rounded"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                    <div className="grid grid-cols-7 border-b border-gray-200">
                        {daysOfWeek.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {getDaysInMonth().map((d, index) => {
                            const dateFollowUps = getFollowUpsForDate(d.date);
                            const hasFollowUps = dateFollowUps.length > 0;
                            const isSelected = isSameDate(d.date, selectedDate);
                            const isToday = isSameDate(d.date, new Date());

                            return (
                                <div
                                    key={index}
                                    onClick={() => setSelectedDate(d.date)}
                                    className={`min-h-[100px] border-b border-r border-gray-100 p-2 cursor-pointer transition-colors relative
                                        ${d.type !== 'current' ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-900'}
                                        ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-indigo-400' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    <span className={`text-sm font-medium block mb-1 ${isToday ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                                        {d.day}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {hasFollowUps && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                {dateFollowUps.length}
                                            </span>
                                        )}
                                        {dateFollowUps.some(f => f.status !== 'completed' && new Date(f.scheduled_at) < new Date() && !isSameDate(new Date(f.scheduled_at), new Date())) && (
                                            <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2"></span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Details */}
                <div className="lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-fit">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        <h3 className="font-semibold text-gray-800">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {getFollowUpsForDate(selectedDate).length} follow-up(s)
                        </p>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[600px]">
                        {getFollowUpsForDate(selectedDate).length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                                <CalendarIcon className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm">No follow-ups scheduled</p>
                                <p className="text-xs mt-1 text-green-600 font-medium">This date is free! 🎉</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {getFollowUpsForDate(selectedDate).map(f => (
                                    <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {f.status}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-gray-900 mb-1">{f.lead?.first_name} {f.lead?.last_name}</h4>
                                        <p className="text-xs text-gray-500 mb-2 truncate">{f.notes}</p>
                                        <div className="flex gap-2">
                                            <button className="flex-1 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-1.5 rounded text-center">
                                                View Lead
                                            </button>
                                            {f.status !== 'completed' && (
                                                <button
                                                    onClick={async () => {
                                                        await saveFollowUp({ ...f, status: 'completed' });
                                                        fetchData();
                                                    }}
                                                    className="flex-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 py-1.5 rounded text-center"
                                                >
                                                    Mark Done
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <SetFollowUpModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lead={selectedLeadForModal}
                onSave={fetchData}
            />
        </div>
    );
};

export default FollowUpCalendar;
