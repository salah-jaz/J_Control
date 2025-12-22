import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Users,
    LogOut,
    Briefcase,
    Wallet,
    Landmark,
    BookOpen,
    FileBarChart2,
    Building2,
    User,
    Settings,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { label: "Dashboard", path: "/", icon: LayoutDashboard },
        { label: "Follow-up Calendar", path: "/calendar", icon: BookOpen },
        { label: "Client Management", path: "/clients", icon: Building2 },
        { label: "Customers", path: "/customers", icon: Users },
        { label: "Lead Management", path: "/leads", icon: Briefcase },
        { label: "Income", path: "/income", icon: Wallet },
        { label: "Expense", path: "/expense", icon: Wallet },
        { label: "Invoices", path: "/invoices", icon: FileText },
        { label: "Bank Accounts", path: "/banks", icon: Landmark },
        { label: "Transaction", path: "/transaction", icon: BookOpen },
        { label: "Reports", path: "/reports", icon: FileBarChart2 },
        { label: "User", path: "/user", icon: User },
        { label: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <div className="w-64 bg-white h-screen fixed left-0 top-0 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-gray-100/50">

            {/* ===== Logo / Header ===== */}
            <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-brand-600 to-brand-400 text-white p-2.5 rounded-xl shadow-lg shadow-brand-500/30">
                        <LayoutDashboard className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                        J-Control
                    </h1>
                </div>
            </div>

            {/* ===== Scrollable Menu ===== */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-hide py-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-brand-50 text-brand-700 shadow-sm"
                                    : "text-slate-500 hover:bg-gray-50 hover:text-slate-900"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-brand-500 rounded-r-full"></div>
                            )}
                            <Icon
                                className={clsx(
                                    "h-5 w-5 transition-colors duration-200",
                                    isActive
                                        ? "text-brand-600"
                                        : "text-slate-400 group-hover:text-slate-600"
                                )}
                            />
                            <span className="relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ===== Logout (Fixed Bottom) ===== */}
            <div className="p-4 border-t border-gray-50 mb-2">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3.5 w-full text-left text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 group"
                >
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

