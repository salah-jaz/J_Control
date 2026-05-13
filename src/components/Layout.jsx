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
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} alertCount={productAlerts.length} />

            <div className={clsx(
                "flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out",
                isSidebarOpen ? "lg:ml-60" : "lg:ml-16"
            )}>
                {/* Header / Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex justify-between items-center">
                    {/* Header Left */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title="Toggle Sidebar"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block mx-2"></div>
                        <h2 className="text-sm font-semibold text-slate-800">
                            {getPageTitle(location.pathname)}
                        </h2>
                    </div>

                    {/* Header Right */}
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={clsx(
                                    "p-2 rounded-md transition-all relative group",
                                    showNotifications 
                                        ? "bg-slate-100 text-slate-900" 
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Bell size={18} />
                                {(notifications.length > 0 || productAlerts.length > 0) && (
                                    <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-indigo-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</h3>
                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                            {notifications.length + productAlerts.length}
                                        </span>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto">
                                        {productAlerts.map(item => (
                                            <div key={`prod-${item.id}`} className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                                                <div className="flex gap-3">
                                                    <div className="mt-0.5 text-amber-500">
                                                        <AlertTriangle size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-medium text-slate-900 leading-tight">
                                                            {item.name} is expiring soon
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 mt-1">Expires on {item.end_date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {notifications.length === 0 && productAlerts.length === 0 ? (
                                            <div className="px-4 py-8 text-center">
                                                <p className="text-[13px] text-slate-400">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                                                    <div className="flex gap-3">
                                                        <div className={clsx(
                                                            "mt-0.5",
                                                            notif.read ? "text-slate-300" : "text-indigo-500"
                                                        )}>
                                                            {notif.type === 'Call Reminder' ? <PhoneCall size={14} /> : <Bell size={14} />}
                                                        </div>
                                                        <div>
                                                            <p className={clsx(
                                                                "text-[13px] leading-tight",
                                                                notif.read ? "text-slate-500" : "text-slate-900 font-medium"
                                                            )}>
                                                                {notif.message}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 mt-1">{notif.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-2 bg-slate-50 border-t border-slate-100">
                                        <button className="w-full py-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                                            View all notifications
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        {/* Profile Area */}
                        <div className="flex items-center gap-2 pl-2 group cursor-pointer hover:bg-slate-50 rounded-md p-1.5 transition-colors">
                            <div className="h-7 w-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold text-xs">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-[12px] font-semibold text-slate-700 leading-tight">{user?.name || 'Admin'}</span>
                                <span className="text-[10px] text-slate-500">Super Admin</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
