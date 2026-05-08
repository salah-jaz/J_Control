import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Bell, PhoneCall, Menu, X, AlertTriangle, Package, CalendarClock } from 'lucide-react';
import clsx from 'clsx';
import api from '../api/axios';
import { getProducts } from '../services/productService';
import { prefetchAppData } from '../query/prefetch';

const isAlertActive = (item) => {
    if (!item.enable_alert || !item.end_date) return false;
    const endDate = new Date(item.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Alert if within 7 days (including overdue)
    return diffDays <= 7;
};

// Helper function to get page title based on path
const getPageTitle = (pathname) => {
    const titleMap = {
        '/': 'Dashboard',
        '/leads': 'Leads',
        '/clients': 'Clients',
        '/products': 'Products & Services',
        '/quotations': 'Quotations',
        '/invoices': 'Invoices',
        '/agreements': 'Agreements',
        '/income': 'Income',
        '/banks': 'Bank Accounts',
        '/expense': 'Expense',
        '/transaction': 'Transactions',
        '/reports': 'Reports',
        '/planner': 'Planner',
        '/settings': 'Settings',
        '/user': 'Users',
        '/print-templates': 'Print Templates',
    };

    if (titleMap[pathname]) return titleMap[pathname];
    const pathSegment = pathname.split('/').pop();
    return pathSegment ? pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1).replace(/-/g, ' ') : 'Page';
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();

    // Sidebar State (Mobile focused but now supports desktop collapse)
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

    // Notifications State (HEAD)
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [productAlerts, setProductAlerts] = useState([]);
    const notificationRef = useRef(null);

    // Close sidebar on route change (Mobile only)
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [location]);

    // Prefetch frequently used data for instant module navigation
    useEffect(() => {
        if (user) prefetchAppData();
    }, [user]);

    // Fetch Notifications (HEAD)
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('/notifications');
                if (response.data) {
                    setNotifications(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        const fetchProductAlerts = async () => {
            try {
                const products = await getProducts();
                const alerts = products.filter(isAlertActive);
                setProductAlerts(alerts);
            } catch (error) {
                console.error("Failed to fetch products for alerts", error);
            }
        };

        fetchNotifications();
        fetchProductAlerts();

        // Optional: Poll every minute
        const interval = setInterval(() => {
            fetchNotifications();
            fetchProductAlerts();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close notifications when clicking outside (HEAD)
    useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#F3F4F6] font-sans">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} alertCount={productAlerts.length} />

            <div className={clsx(
                "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                isSidebarOpen ? "lg:ml-64" : "lg:ml-[78px]"
            )}>
                {/* Header */}
                <header className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 px-6 py-4 flex justify-between items-center transition-all duration-300">
                    {/* Header Left: Breadcrumbs/Title and Mobile Menu */}
                    <div className="flex items-center gap-4">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50/80 rounded-xl transition-all duration-300 border border-transparent hover:border-violet-100/50 shadow-sm hover:shadow-violet-200/20 active:scale-95 group/toggle"
                                title="Expand Sidebar"
                            >
                                <Menu className="h-5 w-5 group-hover/toggle:scale-110 transition-transform" />
                            </button>
                        )}
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                {getPageTitle(location.pathname)}
                            </h2>
                        </div>
                    </div>

                    {/* Header Right: Notifications and Profile */}
                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={clsx(
                                    "relative p-2.5 transition-all duration-300 rounded-xl border group",
                                    showNotifications 
                                        ? "bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm" 
                                        : "bg-white border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 hover:border-slate-200"
                                )}
                            >
                                <Bell className="h-[18px] w-[18px] group-hover:rotate-12 transition-transform" />
                                {(notifications.length > 0 || productAlerts.length > 0) && (
                                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-white ring-1 ring-rose-500/20"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl shadow-indigo-500/10 border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900 text-[15px]">Activity Center</h3>
                                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {notifications.length + productAlerts.length} New
                                        </span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                                        {/* Product Alerts */}
                                        {productAlerts.map(item => (
                                            <div key={`prod-${item.id}`} className="px-5 py-4 hover:bg-indigo-50/30 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group bg-amber-50/20">
                                                <div className="flex gap-4">
                                                    <div className="mt-1 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600 shadow-sm shadow-amber-200/50">
                                                        <AlertTriangle size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-900 font-semibold group-hover:text-amber-700 leading-snug">
                                                            Product Alert: {item.name}
                                                        </p>
                                                        <p className="text-xs text-amber-500 mt-1 font-medium bg-amber-50 px-2 py-0.5 rounded-md inline-block">Expires: {item.end_date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {notifications.length === 0 && productAlerts.length === 0 ? (
                                            <div className="px-5 py-12 text-center text-slate-400">
                                                <div className="bg-slate-50 h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                    <Bell className="h-6 w-6 text-slate-300" />
                                                </div>
                                                <p className="font-semibold text-slate-900 mb-1">Stay tuned!</p>
                                                <p className="text-xs text-slate-400">We'll notify you when something important happens.</p>
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group">
                                                    <div className="flex gap-4">
                                                        <div className={clsx(
                                                            "mt-1 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                                                            notif.read ? "bg-slate-100 text-slate-400" : "bg-indigo-100 text-indigo-600 shadow-indigo-100"
                                                        )}>
                                                            {notif.type === 'Call Reminder' ? <PhoneCall size={16} /> : <Bell size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={clsx(
                                                                "text-sm leading-snug",
                                                                notif.read ? "text-slate-500 font-medium" : "text-slate-900 font-bold group-hover:text-indigo-700"
                                                            )}>
                                                                {notif.message}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 mt-1.5 font-medium flex items-center gap-1">
                                                                <CalendarClock className="h-3 w-3" /> {notif.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-slate-50">
                                        <button className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300 tracking-wide uppercase">
                                            View All Activity
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-10 w-px bg-slate-100 mx-1 hidden sm:block"></div>

                        {/* Profile Area */}
                        <div className="flex items-center gap-3 pl-1 group cursor-pointer p-1.5 rounded-2xl hover:bg-slate-50 transition-all duration-300 border border-transparent hover:border-slate-100">
                            <div className="hidden sm:flex flex-col items-end">
                                <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{user?.name || 'Admin User'}</p>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Super Admin</p>
                            </div>
                            <div className="relative">
                                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-200 border-2 border-white ring-1 ring-indigo-50 transition-transform duration-300 group-hover:scale-110">
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm ring-1 ring-emerald-500/20"></div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
                    <div className="max-w-full h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
