import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, FileText, User } from 'lucide-react';
import { getFollowUps, saveFollowUp } from '../services/db';
import SetFollowUpModal from '../components/SetFollowUpModal';
import clsx from 'clsx';

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

    useEffect(() => {
        calculateStats();
    }, [followUps]);

    const fetchData = async () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
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
        const currentDay = now.getDay();
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
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
            total: followUps.length
        });
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

        const days = [];
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ day: prevMonthDays - startingDayOfWeek + i + 1, type: 'prev', date: new Date(year, month - 1, prevMonthDays - startingDayOfWeek + i + 1) });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, type: 'current', date: new Date(year, month, i) });
        }

        const remaining = 42 - days.length;
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

    const StatCard = ({ title, value, icon: Icon, color, textColor }) => (
        <div className={`p-5 rounded-2xl border ${color} bg-opacity-30 flex justify-between items-center shadow-sm`}>
            <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${textColor} opacity-80`}>{title}</p>
                <p className={`text-3xl font-bold ${textColor} mt-1`}>{value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-white bg-opacity-60`}>
                <Icon className={`h-6 w-6 ${textColor}`} />
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Follow-up Calendar</h1>
                    <p className="text-slate-500 mt-1 text-base md:text-lg">Manage your tasks and schedule.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Overdue" value={stats.overdue} icon={AlertCircle} color="bg-red-50 border-red-100" textColor="text-red-700" />
                <StatCard title="Today" value={stats.today} icon={CalendarIcon} color="bg-orange-50 border-orange-100" textColor="text-orange-700" />
                <StatCard title="This Week" value={stats.thisWeek} icon={Clock} color="bg-blue-50 border-blue-100" textColor="text-blue-700" />
                <StatCard title="Total" value={stats.total} icon={FileText} color="bg-green-50 border-green-100" textColor="text-green-700" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8 min-h-[600px] lg:h-[calc(100vh-320px)]">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {monthNames[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-50 rounded-xl border border-gray-200 text-slate-500 hover:text-brand-600 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-50 rounded-xl border border-gray-200 text-slate-500 hover:text-brand-600 transition-colors"><ChevronRight className="h-5 w-5" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                        {daysOfWeek.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-gray-100/30 gap-[1px]">
                        {getDaysInMonth().map((d, index) => {
                            const dateFollowUps = getFollowUpsForDate(d.date);
                            const hasFollowUps = dateFollowUps.length > 0;
                            const isSelected = isSameDate(d.date, selectedDate);
                            const isToday = isSameDate(d.date, new Date());

                            return (
                                <div
                                    key={index}
                                    onClick={() => setSelectedDate(d.date)}
                                    className={clsx(
                                        "p-2 cursor-pointer transition-all relative flex flex-col items-start gap-1 group bg-white",
                                        d.type !== 'current' && "bg-gray-50/50 text-gray-300",
                                        isSelected && "ring-2 ring-inset ring-brand-500 z-10",
                                        !isSelected && d.type === 'current' && "hover:bg-slate-50"
                                    )}
                                >
                                    <span className={clsx(
                                        "text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                                        isToday ? "bg-brand-600 text-white shadow-md shadow-brand-200" :
                                            isSelected ? "bg-brand-50 text-brand-700" :
                                                "text-slate-600 group-hover:bg-gray-200"
                                    )}>
                                        {d.day}
                                    </span>

                                    <div className="flex flex-col gap-1 w-full mt-1 px-1">
                                        {dateFollowUps.slice(0, 3).map((f, i) => (
                                            <div key={i} className={clsx(
                                                "h-1.5 rounded-full w-full",
                                                f.status === 'completed' ? "bg-emerald-200/50" :
                                                    new Date(f.scheduled_at) < new Date() ? "bg-red-400" : "bg-brand-400"
                                            )}></div>
                                        ))}
                                        {dateFollowUps.length > 3 && (
                                            <span className="text-[10px] text-slate-400 font-bold pl-1">+{dateFollowUps.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px] lg:h-full overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30">
                        <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                        </p>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{getFollowUpsForDate(selectedDate).length}</span> task{getFollowUpsForDate(selectedDate).length !== 1 ? 's' : ''} scheduled
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {getFollowUpsForDate(selectedDate).length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-dotted-pattern">
                                <div className="p-4 bg-gray-50 rounded-full mb-4">
                                    <CalendarIcon className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="font-medium text-slate-600">No tasks for this day</p>
                                <p className="text-xs mt-1">Enjoy your free time!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {getFollowUpsForDate(selectedDate).map(f => (
                                    <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${f.status === 'completed' ? 'bg-emerald-500' : new Date(f.scheduled_at) < new Date() ? 'bg-red-500' : 'bg-brand-500'}`}></div>
                                        <div className="flex justify-between items-start mb-2 pl-3">
                                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide border ${f.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                {f.status}
                                            </span>
                                            <span className="text-xs font-mono text-slate-400">
                                                {new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="pl-3">
                                            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                                                {f.lead?.first_name} {f.lead?.last_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 mb-3 bg-gray-50 p-2 rounded-lg italic">"{f.notes}"</p>

                                            <div className="flex gap-2">
                                                {f.status !== 'completed' && (
                                                    <button
                                                        onClick={async () => {
                                                            await saveFollowUp({ ...f, status: 'completed' });
                                                            fetchData();
                                                        }}
                                                        className="flex-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 border border-emerald-100 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <CheckCircle size={12} /> Mark Done
                                                    </button>
                                                )}
                                                <button className="flex-1 text-xs bg-gray-50 text-slate-600 hover:bg-gray-100 border border-gray-200 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1">
                                                    <User size={12} /> Profile
                                                </button>
                                            </div>
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
