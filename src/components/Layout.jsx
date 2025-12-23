import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Bell, PhoneCall, Menu, X } from 'lucide-react';
import api from '../api/axios';

// Helper function to get page title based on path
const getPageTitle = (pathname) => {
    switch (pathname) {
        case '/':
            return 'Dashboard';
        case '/settings':
            return 'Settings';
        case '/users':
            return 'Users Management';
        // Add more cases as needed
        default:
            // Capitalize the first letter and replace hyphens with spaces for other paths
            const pathSegment = pathname.split('/').pop();
            return pathSegment ? pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1).replace(/-/g, ' ') : 'Page';
    }
};

const Layout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();

    // Sidebar State (Incoming)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Notifications State (HEAD)
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notificationRef = useRef(null);

    // Close sidebar on route change (Incoming)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

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

        fetchNotifications();

        // Optional: Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
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

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-64'}`}>
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100/50 px-4 md:px-8 py-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg lg:hidden transition-colors"
                        >
                            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate max-w-[200px] md:max-w-none">
                            {getPageTitle(location.pathname)}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative p-2 transition-colors rounded-full hover:bg-brand-50 ${showNotifications ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:text-brand-600'}`}
                            >
                                <Bell className="h-5 w-5" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                                        {notifications.length > 0 && (
                                            <button
                                                onClick={() => setNotifications([])}
                                                className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-slate-500">
                                                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                                <p className="text-sm">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer group">
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'}`}>
                                                            {notif.type === 'Call Reminder' ? <PhoneCall size={14} /> : <Bell size={14} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between items-start w-full">
                                                                <p className={`text-sm ${notif.read ? 'text-slate-600' : 'text-slate-800 font-medium group-hover:text-brand-700'}`}>
                                                                    {notif.message}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-px bg-gray-200 hidden xs:block"></div>

                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800">{user?.name || 'Admin User'}</p>
                                <p className="text-xs text-slate-500 font-medium">Administrator</p>
                            </div>
                            <div className="h-9 w-9 md:h-10 md:w-10 bg-gradient-to-br from-brand-100 to-brand-50 rounded-full flex items-center justify-center text-brand-700 font-bold border-2 border-white shadow-md ring-1 ring-gray-100">
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto overflow-x-hidden pb-12 px-4 md:px-0">
                    <div className="max-w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
