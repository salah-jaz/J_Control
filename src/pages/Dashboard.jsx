import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, FileText, Activity, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import { useDashboardData } from '../hooks/useApiQueries';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatCardsSkeleton } from '../components/Skeleton';

const StatCard = ({ title, value, icon: Icon, trend, color, subValue = null, subLabel = null }) => (
    <div className="card min-h-[190px] h-auto flex flex-col justify-between group cursor-default relative">
        {/* Isolated background decoration with overflow-hidden */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className={clsx("absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity bg-current", color.replace('bg-', 'text-'))}></div>
        </div>

        <div className="flex justify-between items-start z-10 gap-2 mb-4">
            <div className="min-w-0 flex-1">
                <div className={clsx("inline-flex p-3 rounded-2xl mb-3 transition-transform group-hover:scale-110", color.replace('bg-', 'bg-').replace('500', '50'))}>
                    <Icon className={clsx("w-6 h-6", color.replace('bg-', 'text-').replace('500', '600'))} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight" title={value}>
                    {value}
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1 truncate">{title}</p>
            </div>

            {/* Trend indicator */}
            {trend && (
                <div className={clsx("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-white shadow-sm border border-gray-100 flex-shrink-0 mt-1", trend > 0 ? "text-emerald-600" : "text-red-600")}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div className="mt-auto z-10 w-full">
            {subValue && (
                <div className="flex items-center justify-between gap-2 text-xs font-medium">
                    <span className="truncate text-slate-400">{subLabel}</span>
                    <span className="text-slate-900 font-bold bg-gray-100 px-2 py-1 rounded flex-shrink-0">{subValue}</span>
                </div>
            )}
            {!subValue && (
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full w-2/3 opacity-50", color)}></div>
                </div>
            )}
        </div>
    </div>
);



const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

const Dashboard = () => {
    const navigate = useNavigate();
    const { stats, todayIncome, todaysEvents, isLoading, isFetching } = useDashboardData();

    // Prepare data for Pie Chart
    const pieData = stats.invoiceStatusCounts?.map(item => ({
        name: item.status,
        value: item.count
    })) || [];

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 lg:p-10 w-full mx-auto space-y-6 md:space-y-8 animate-fade-in">
                <StatCardsSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card lg:col-span-2 h-[400px] animate-pulse rounded-2xl bg-gray-100/50" />
                    <div className="card h-[400px] animate-pulse rounded-2xl bg-gray-100/50" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full mx-auto space-y-6 md:space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
                    icon={DollarSign}
                    trend={12.5}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Active Clients"
                    value={stats.activeClients}
                    subValue={stats.totalClients}
                    subLabel="Total Registered"
                    icon={Users}
                    color="bg-blue-500"
                    trend={8.2}
                />
                <StatCard
                    title="Pending Invoices"
                    value={`₹${stats.pendingAmount.toLocaleString('en-IN')}`}
                    icon={FileText}
                    trend={-2.4}
                    color="bg-amber-500"
                />
                <StatCard
                    title="Conversion Rate"
                    value="24.5%"
                    icon={Activity}
                    trend={4.1}
                    color="bg-brand-500"
                />
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="card lg:col-span-2 px-2 md:px-6">
                    <div className="flex justify-between items-center mb-6 px-2 md:px-0">
                        <h3 className="text-lg font-bold text-slate-800">Recent Invoices</h3>
                        <button
                            className="text-sm font-medium text-brand-600 hover:text-brand-700"
                            onClick={() => navigate('/invoices')}
                        >
                            View All
                        </button>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[600px]">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 rounded-lg">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Invoice ID</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stats.recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="group hover:bg-gray-50/80 transition-colors">
                                        <td className="px-4 py-4 font-mono font-medium text-brand-600 group-hover:text-brand-700">{inv.id}</td>
                                        <td className="px-4 py-4 font-semibold text-slate-700">{inv.client_name}</td>
                                        <td className="px-4 py-4 text-slate-500">{inv.date}</td>
                                        <td className="px-4 py-4 font-bold text-slate-900">₹{inv.amount.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-4">
                                            <span className={clsx(
                                                "badge",
                                                inv.status === 'Paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    inv.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                        "bg-red-50 text-red-700 border-red-100"
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-gray-400 italic">No recent activity</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Quick Actions & Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 p-6 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => navigate('/invoices', { state: { openForm: true } })}
                                className="flex items-center justify-between p-4 rounded-xl bg-brand-50 hover:bg-brand-100/80 transition-all group border border-brand-100/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-white text-brand-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">Add Invoice</p>
                                        <p className="text-xs text-brand-600/80 font-medium">Create & Send</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-brand-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>

                            <button
                                onClick={() => navigate('/clients', { state: { openForm: true } })}
                                className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100/80 transition-all group border border-blue-100/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-800">Add Client</p>
                                        <p className="text-xs text-blue-600/80 font-medium">Manage Clients</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        </div>

                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 text-xs">Today's Overview</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100/50">
                                <p className="text-xs font-semibold text-emerald-600 mb-1">Income</p>
                                <p className="text-lg font-bold text-slate-800 truncate" title={`₹${todayIncome}`}>
                                    ₹{todayIncome.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div
                                className="p-4 rounded-xl bg-amber-50 border border-amber-100/50 cursor-pointer hover:bg-amber-100/50 transition-colors"
                                onClick={() => navigate('/invoices', { state: { initialStatus: 'Pending' } })}
                            >
                                <p className="text-xs font-semibold text-amber-600 mb-1">Pending</p>
                                <p className="text-lg font-bold text-slate-800 truncate">
                                    View All
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Today's Commitments */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100/60 p-6 flex flex-col h-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">Today&apos;s Commitments</h3>
                        {todaysEvents.length === 0 ? (
                            <p className="text-sm text-slate-400">No events scheduled for today.</p>
                        ) : (
                            <ul className="space-y-3">
                                {todaysEvents.map((ev) => {
                                    const status = ev.status || 'scheduled';
                                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                    const color =
                                        status === 'completed' ? '#10B981' :
                                            status === 'cancelled' ? '#EF4444' :
                                                status === 'missed' ? '#FB923C' :
                                                    status === 'rescheduled' ? '#F59E0B' :
                                                        ev.category === 'payment' ? '#10B981' :
                                                            ev.category === 'deadline' ? '#EF4444' :
                                                                ev.category === 'reminder' ? '#FACC15' :
                                                                    '#3B82F6';

                                    return (
                                        <li key={ev.id} className="flex items-start gap-3">
                                            <div
                                                className="mt-1 h-2 w-2 rounded-full"
                                                style={{ backgroundColor: color }}
                                            ></div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {ev.title} <span className="text-xs text-slate-500">– {statusLabel}</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {ev.start_time
                                                        ? new Date(`1970-01-01T${ev.start_time}`).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : 'All day'}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="card lg:col-span-2 p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Overview</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyRevenue || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="revenue"
                                    fill="#3B82F6"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Invoice Status</h3>
                    <div className="h-[300px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#10B981' : entry.name === 'Pending' ? '#F59E0B' : entry.name === 'Overdue' ? '#EF4444' : COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '0.5rem' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                    </div>
                    <div className="flex justify-center gap-4 mt-2 flex-wrap">
                        {pieData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.name === 'Paid' ? '#10B981' : entry.name === 'Pending' ? '#F59E0B' : entry.name === 'Overdue' ? '#EF4444' : COLORS[index % COLORS.length] }}></div>
                                <span className="text-xs font-medium text-slate-600">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
