import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change for mobile users
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

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
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100/50 px-4 md:px-8 py-4 flex justify-between items-center shadow-sm">
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
                        <button className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
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
