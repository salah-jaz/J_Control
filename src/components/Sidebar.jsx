import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Users,
    LogOut,
    Briefcase,
    Wallet,
    CreditCard,
    Landmark,
    BookOpen,
    FileBarChart2,
    Building2,
    User,
    Settings,
    Package,
    LayoutTemplate,
    CalendarClock,
    Menu,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, setIsOpen, alertCount = 0 }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { label: "Dashboard", path: "/", icon: LayoutDashboard },
        { label: "Client Management", path: "/clients", icon: Building2 },
        { label: "Lead Management", path: "/leads", icon: Briefcase },
        { label: "Products & Services", path: "/products", icon: Package },
        { label: "Income", path: "/income", icon: Wallet },
        { label: "Quotation", path: "/quotations", icon: FileText },
        { label: "Expense", path: "/expense", icon: CreditCard },
        { label: "Invoices", path: "/invoices", icon: FileText },
        { label: "Agreement", path: "/agreements", icon: FileText },
        { label: "Bank Accounts", path: "/banks", icon: Landmark },
        { label: "Transaction", path: "/transaction", icon: BookOpen },
        { label: "Reports", path: "/reports", icon: FileBarChart2 },
        { label: "Planner", path: "/planner", icon: CalendarClock },
        { label: "User", path: "/user", icon: User },
        { label: "Print Templates", path: "/print-templates", icon: LayoutTemplate },
        { label: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <div className={clsx(
            "bg-white h-screen fixed left-0 top-0 flex flex-col z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-gray-100/50 transition-all duration-300 ease-in-out overflow-x-hidden",
            isOpen ? "w-64 translate-x-0" : "w-[78px] lg:translate-x-0 -translate-x-full"
        )}>

            {/* ===== Logo / Header ===== */}
            <div className={clsx(
                "py-7 flex-shrink-0 flex items-center border-b border-slate-50/50 transition-all duration-300",
                isOpen ? "px-6 justify-between" : "px-0 justify-center"
            )}>
                <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
                    <div className="h-10 w-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        <LayoutDashboard className="h-6 w-6 text-white" />
                    </div>
                    <div className={clsx(
                        "transition-all duration-300 origin-left overflow-hidden",
                        isOpen ? "opacity-100 w-auto scale-100" : "opacity-0 w-0 scale-0"
                    )}>
                        <h1 className="text-[20px] font-bold text-slate-900 tracking-tight leading-none mb-1 whitespace-nowrap">
                            J-Control
                        </h1>
                        <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase whitespace-nowrap">ERP System</p>
                    </div>
                </Link>

                {/* Internal Toggle Button (Only in Expanded) */}
                {isOpen && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all duration-300 group/toggle"
                        title="Collapse Sidebar"
                    >
                        <Menu className="h-5 w-5 group-hover/toggle:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>

            {/* ===== Scrollable Menu ===== */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-hide py-6">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                if (window.innerWidth < 1024) setIsOpen(false);
                            }}
                            title={!isOpen ? item.label : undefined}
                            className={clsx(
                                "flex items-center rounded-xl text-[13px] font-medium transition-all duration-300 group relative overflow-hidden",
                                isOpen ? "gap-3.5 px-4 py-3 mx-4" : "mx-2 px-0 py-3 justify-center",
                                isActive
                                    ? "bg-violet-50 text-violet-700 font-bold shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                            )}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className={clsx(
                                    "absolute left-0 bg-violet-600 rounded-r-full transition-all duration-300",
                                    isOpen ? "top-2 bottom-2 w-1" : "top-3 bottom-3 w-1.5"
                                )} />
                            )}
                            
                            <Icon
                                className={clsx(
                                    "h-[18px] w-[18px] transition-all duration-300 flex-shrink-0",
                                    isActive
                                        ? "text-violet-600"
                                        : "text-slate-400 group-hover:text-slate-600"
                                )}
                            />
                            
                            <span className={clsx(
                                "flex-1 whitespace-nowrap tracking-tight transition-all duration-300 origin-left",
                                isOpen ? "opacity-100 w-auto translate-x-0" : "opacity-0 w-0 -translate-x-10 pointer-events-none"
                            )}>
                                {item.label}
                            </span>
                            
                            {/* Alert Badge (Only shown in open state) */}
                            {item.path === '/products' && alertCount > 0 && isOpen && (
                                <span className={clsx(
                                    "text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap",
                                    isActive ? "bg-violet-200 text-violet-800" : "bg-violet-100 text-violet-700"
                                )}>
                                    {alertCount} New
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ===== Logout (Fixed Bottom) ===== */}
            <div className={clsx("p-4 mt-auto transition-all duration-300", isOpen ? "px-4" : "px-0 flex justify-center")}>
                <button
                    onClick={logout}
                    className={clsx(
                        "flex items-center text-left text-sm font-semibold transition-all duration-300 group rounded-xl",
                        isOpen ? "gap-3 px-4 py-3 w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600" : "px-0 py-3 justify-center w-12 text-slate-400 hover:text-rose-600"
                    )}
                    title={!isOpen ? "Sign Out" : undefined}
                >
                    <div className={clsx(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                        isOpen ? "bg-slate-100 group-hover:bg-rose-100" : "bg-transparent group-hover:bg-rose-50"
                    )}>
                        <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    </div>
                    {isOpen && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

