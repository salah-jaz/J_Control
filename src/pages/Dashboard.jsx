import { useEffect, useState } from 'react';
import { DollarSign, Users, FileText, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboardStats } from '../services/db';
import clsx from 'clsx';

const StatCard = ({ title, value, icon: Icon, trend, color, subValue = null, subLabel = null }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all duration-300">
        <div className={clsx("absolute top-0 right-0 p-4 opacity-10 rounded-bl-3xl transition-transform transform group-hover:scale-110", color)}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="flex justify-between items-start z-10">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
            </div>
            <div className={clsx("p-2 rounded-lg", color.replace('bg-', 'bg-opacity-20 text-').replace('text-', 'bg-'))}>
                <Icon className={clsx("w-5 h-5", color.replace('bg-', 'text-'))} />
            </div>
        </div>

        <div className="mt-auto flex items-center z-10">
            {trend && (
                <span className={clsx("text-xs font-medium flex items-center gap-1", trend > 0 ? "text-green-600" : "text-red-500")}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(trend)}%
                    <span className="text-gray-400 font-normal ml-1">vs last month</span>
                </span>
            )}
            {subValue && (
                <span className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{subValue}</span> {subLabel}
                </span>
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
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    trend={12.5}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Clients"
                    value={stats.activeClients}
                    subValue={stats.totalClients}
                    subLabel="Total"
                    icon={Users}
                    color="bg-blue-500"
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
                    color="bg-indigo-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Invoices</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3">Invoice ID</th>
                                    <th className="px-4 py-3">Client</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {stats.recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{inv.id}</td>
                                        <td className="px-4 py-3 text-gray-600">{inv.client_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{inv.date}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">${inv.amount.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                                inv.status === 'Paid' ? "bg-green-100 text-green-700" :
                                                    inv.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                                                        "bg-red-100 text-red-700"
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {stats.recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No recent activity</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-indigo-900 rounded-xl shadow-lg p-6 text-white text-center flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-800 rounded-full opacity-50 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-purple-600 rounded-full opacity-50 blur-xl"></div>

                    <h3 className="text-xl font-bold mb-2 z-10">Pro Plan</h3>
                    <p className="text-indigo-200 text-sm mb-6 max-w-[200px] z-10">Upgrade to manage more clients and unlock advanced analytics.</p>
                    <button className="bg-white text-indigo-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition z-10">
                        Upgrade Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
