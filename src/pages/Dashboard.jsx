import { useEffect, useState } from 'react';
import { DollarSign, Users, FileText, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboardStats } from '../services/db';
import clsx from 'clsx';

const StatCard = ({ title, value, icon: Icon, trend, color, subValue = null, subLabel = null }) => (
    <div className="card h-40 flex flex-col justify-between group cursor-default relative overflow-hidden">
        {/* Subtle background gradient based on color */}
        <div className={clsx("absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity bg-current", color.replace('bg-', 'text-'))}></div>

        <div className="flex justify-between items-start z-10">
            <div>
                <div className={clsx("inline-flex p-3 rounded-2xl mb-4 transition-transform group-hover:scale-110", color.replace('bg-', 'bg-').replace('500', '50'))}>
                    <Icon className={clsx("w-6 h-6", color.replace('bg-', 'text-').replace('500', '600'))} />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
            </div>

            {/* Trend indicator */}
            {trend && (
                <div className={clsx("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-white shadow-sm border border-gray-100", trend > 0 ? "text-emerald-600" : "text-red-600")}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div className="mt-auto z-10">
            {subValue && (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span className="text-slate-900 font-bold bg-gray-100 px-1.5 py-0.5 rounded">{subValue}</span>
                    {subLabel}
                </div>
            )}
            {!subValue && (
                <div className="h-1 w-full bg-gray-50 rounded-full mt-2 overflow-hidden">
                    <div className={clsx("h-full rounded-full w-2/3 opacity-50", color)}></div>
                </div>
            )}
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalClients: 0,
        activeClients: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        pendingAmount: 0,
        recentInvoices: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            const data = await getDashboardStats();
            setStats(data);
        };
        fetchStats();
    }, []);

    return (
        <div className="p-6 lg:p-10 w-full mx-auto space-y-8 animate-fade-in overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
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
                    value={`$${stats.pendingAmount.toLocaleString()}`}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="card lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Recent Invoices</h3>
                        <button className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
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
                                        <td className="px-4 py-4 font-bold text-slate-900">${inv.amount.toLocaleString()}</td>
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

                <div className="bg-slate-900 rounded-2xl shadow-xl p-8 text-white text-center flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[300px]">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-600/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none"></div>

                    <div className="z-10 relative">
                        <div className="h-14 w-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/20 rotate-3">
                            <Activity className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Upgrade to Pro</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-[240px] mx-auto">
                            Unlock advanced analytics, unlimited users, and priority support.
                        </p>
                        <button className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-brand-50 hover:text-brand-700 transition-all shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-lg active:scale-95">
                            Upgrade Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
