import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Users, FileText, Activity, ArrowUpRight, ArrowDownRight, 
  ArrowRight, Landmark, Wallet, TrendingUp, AlertCircle, Receipt,
  CheckCircle2, Clock, Briefcase, Plus, Filter, Search, Download,
  Layers, UserCheck, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { useDashboardData } from '../hooks/useApiQueries';
import clsx from 'clsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { StatCardsSkeleton } from '../components/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import { TableSectionHeader } from '../components/ui/DataTableSection';

const StatCard = ({ title, value, icon: Icon, trend, colorClass, subValue, subLabel }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
    <div className="flex items-start justify-between relative z-10">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</span>
        <h3 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mt-1">{value}</h3>
      </div>
      <div className={clsx("p-2.5 rounded-xl text-white shadow-lg", colorClass)}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
    </div>
    
    <div className="flex items-center justify-between mt-6 relative z-10">
      <div className="flex flex-col">
        {subValue && (
          <>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{subLabel}</span>
            <span className="text-[13px] font-black text-slate-700 tracking-tight">{subValue}</span>
          </>
        )}
      </div>
      {trend && (
        <div className={clsx(
          "flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-black shadow-sm",
          trend > 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
        )}>
          {trend > 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    
    {/* Subtle Background Pattern */}
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
    const navigate = useNavigate();
    const { stats = {}, todayIncome = [], todaysEvents = [], isLoading } = useDashboardData();

    const pieData = (stats.invoiceStatusCounts ?? []).map(item => ({
        name: item.status,
        value: item.count
    }));

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
                <StatCardsSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl border border-slate-200 h-[400px] animate-pulse" />
                    <div className="bg-white rounded-2xl border border-slate-200 h-[400px] animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header with Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Corporate Intelligence</p>
                    <h1 className="text-[32px] font-black text-slate-900 tracking-tighter leading-none">Command Overview</h1>
                    <p className="text-slate-500 text-[14px] font-medium mt-2">Real-time financial synchronization and operational trajectory.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => navigate('/income')} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10">
                        <Plus size={16} strokeWidth={3} />
                        Income
                    </button>
                    <button onClick={() => navigate('/expense')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Plus size={16} strokeWidth={2.5} />
                        Expense
                    </button>
                    <button className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all">
                        <Download size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Top Stat Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Gross Revenue"
                    value={`₹${(stats.totalRevenue ?? 0).toLocaleString('en-IN')}`}
                    icon={DollarSign}
                    trend={12.5}
                    colorClass="bg-indigo-600 shadow-indigo-200"
                    subLabel="YTD Trajectory"
                    subValue={`₹${(stats.totalRevenue * 0.85).toLocaleString('en-IN')}`}
                />
                <StatCard
                    title="Market Reach"
                    value={stats.activeClients ?? 0}
                    subValue={stats.totalClients ?? 0}
                    subLabel="Total Client Base"
                    icon={Users}
                    trend={8.2}
                    colorClass="bg-emerald-600 shadow-emerald-200"
                />
                <StatCard
                    title="Outstanding Capital"
                    value={`₹${(stats.pendingAmount ?? 0).toLocaleString('en-IN')}`}
                    icon={Clock}
                    trend={-2.4}
                    colorClass="bg-amber-500 shadow-amber-200"
                    subLabel="Collection Queue"
                    subValue="12 Invoices"
                />
                <StatCard
                    title="Conversion Rate"
                    value="24.5%"
                    icon={TrendingUp}
                    trend={4.1}
                    colorClass="bg-violet-600 shadow-violet-200"
                    subLabel="Lead Pipeline"
                    subValue="84 Active Opportunities"
                />
            </div>

            {/* Visual Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trajectory */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <BarChart3 size={18} className="text-indigo-600" />
                                Revenue Absorption
                            </h4>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Monthly financial performance</p>
                        </div>
                        <div className="flex gap-1.5 p-1 bg-slate-50 rounded-lg">
                            {['7D', '30D', '1Y'].map(p => (
                                <button key={p} className={clsx("px-2.5 py-1 rounded text-[10px] font-black transition-all", p === '30D' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>{p}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyRevenue?.length > 0 ? stats.monthlyRevenue.map(m => ({ name: m.month, rev: m.revenue })) : [
                                { name: 'Jan', rev: 0 }, { name: 'Feb', rev: 0 }, { name: 'Mar', rev: 0 },
                                { name: 'Apr', rev: 0 }, { name: 'May', rev: 0 }, { name: 'Jun', rev: 0 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v/1000}k`} />
                                <RechartsTooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="rev" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Overview */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[400px]">
                    <div className="mb-6">
                        <h4 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <PieChartIcon size={18} className="text-emerald-600" />
                            Status Allocation
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Invoice lifecycle distribution</p>
                    </div>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData.length > 0 ? pieData : [{ name: 'N/A', value: 1 }]}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                    {pieData.length === 0 && <Cell fill="#f1f5f9" />}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Value */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[28px] font-black text-slate-900 leading-none">{stats.totalInvoices ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Assets</span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <span className="text-[11px] font-bold text-slate-600 truncate">{item.name}</span>
                                <span className="text-[11px] font-black text-slate-900 ml-auto">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Records & Logistics */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Recent Transactions */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h4 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Receipt size={18} className="text-indigo-600" />
                                Liquidity Stream
                            </h4>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Latest income records</p>
                        </div>
                        <button onClick={() => navigate('/income')} className="text-[12px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            View Registry <ArrowRight size={14} strokeWidth={3} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
                                    <th className="px-6 py-4">Identification</th>
                                    <th className="px-6 py-4">Client Source</th>
                                    <th className="px-6 py-4 text-right">Absorption</th>
                                    <th className="px-6 py-4">Protocol</th>
                                    <th className="px-6 py-4">Temporal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {todayIncome.length === 0 ? (
                                    <tr><td colSpan="5" className="p-12 text-center"><EmptyState icon={Activity} title="Static Stream" description="No financial activity detected for this cycle." /></td></tr>
                                ) : todayIncome.slice(0, 5).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigate('/income')}>
                                        <td className="px-6 py-4 font-mono text-[11px] font-black text-slate-400">#{item.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-slate-900">{item.client || 'General Source'}</span>
                                                <span className="text-[11px] text-slate-400 font-medium italic">{item.category || 'Revenue'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[14px] font-black text-emerald-600 italic tracking-tight">+₹{parseFloat(item.amount).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">{item.method}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[12px] font-bold text-slate-500">{item.receivedDate || item.date}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Operations Calendar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100">
                        <h4 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Clock size={18} className="text-amber-500" />
                            Operational Pulse
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Today's scheduled engagements</p>
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                        {todaysEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                                <CheckCircle2 size={40} className="opacity-20 mb-3" />
                                <p className="text-[13px] font-bold uppercase tracking-widest opacity-40 italic leading-none">Trajectory Clear</p>
                            </div>
                        ) : todaysEvents.map((event, idx) => (
                            <div key={idx} className="flex gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer group">
                                <div className="h-10 w-10 shrink-0 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:border-amber-200 transition-colors shadow-sm">
                                    <span className="text-[10px] font-black leading-none">{event.time?.split(':')[0] || '10'}</span>
                                    <span className="text-[9px] font-black uppercase tracking-tighter leading-none mt-0.5">{event.time?.split(':')[1] || '00'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h5 className="text-[13px] font-black text-slate-800 truncate">{event.title}</h5>
                                        <div className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-wider shrink-0">{event.type || 'LITIGATION'}</div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 truncate">{event.description || 'Logistics and coordination engagement.'}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <UserCheck size={10} strokeWidth={3} />
                                            {event.client || 'Internal'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl">
                        <button onClick={() => navigate('/planner')} className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black uppercase tracking-[0.1em] hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-[0.98]">
                            Expand Control Map
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
