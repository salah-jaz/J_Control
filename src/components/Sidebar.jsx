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
        { label: "Client Management", path: "/clients", icon: Building2 },
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
        <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-sm z-10">

            {/* ===== Logo / Header ===== */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-center">
                <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6" />
                    Jaz InfoTech
                </h1>
            </div>

            {/* ===== Scrollable Menu ===== */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2 mt-2 scrollbar-hide">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 group"
                            )}
                        >
                            <Icon
                                className={clsx(
                                    "h-5 w-5 transition-colors",
                                    isActive
                                        ? "text-indigo-600"
                                        : "text-gray-400 group-hover:text-gray-600"
                                )}
                            />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* ===== Logout (Fixed Bottom) ===== */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

