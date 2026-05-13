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

    const sections = [
        {
            title: "Overview",
            items: [
                { label: "Dashboard", path: "/", icon: LayoutDashboard },
                { label: "Planner", path: "/planner", icon: CalendarClock },
                { label: "Reports", path: "/reports", icon: FileBarChart2 },
            ]
        },
        {
            title: "Sales & CRM",
            items: [
                { label: "Leads", path: "/leads", icon: Briefcase },
                { label: "Clients", path: "/clients", icon: Building2 },
                { label: "Quotations", path: "/quotations", icon: FileText },
                { label: "Invoices", path: "/invoices", icon: FileText },
                { label: "Agreements", path: "/agreements", icon: FileText },
            ]
        },
        {
            title: "Finance",
            items: [
                { label: "Income", path: "/income", icon: Wallet },
                { label: "Expense", path: "/expense", icon: CreditCard },
                { label: "Bank Accounts", path: "/banks", icon: Landmark },
                { label: "Transactions", path: "/transaction", icon: BookOpen },
            ]
        },
        {
            title: "Inventory",
            items: [
                { label: "Products & Services", path: "/products", icon: Package },
            ]
        },
        {
            title: "Administration",
            items: [
                { label: "Users", path: "/user", icon: User },
                { label: "Print Templates", path: "/print-templates", icon: LayoutTemplate },
                { label: "Settings", path: "/settings", icon: Settings },
            ]
        }
    ];

    return (
        <aside className={clsx(
            "bg-white h-screen fixed left-0 top-0 flex flex-col z-50 border-r border-slate-200 transition-all duration-200 ease-in-out",
            isOpen ? "w-60" : "w-16"
        )}>

            {/* Logo Section */}
            <div className={clsx(
                "h-16 flex items-center px-4 border-b border-slate-100",
                isOpen ? "justify-between" : "justify-center"
            )}>
                <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white">
                        <LayoutDashboard size={18} />
                    </div>
                    {isOpen && (
                        <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-slate-900 leading-tight">J-Control</span>
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Enterprise ERP</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className={clsx("mb-4", !isOpen && "flex flex-col items-center")}>
                        {isOpen && (
                            <h3 className="px-6 mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {section.title}
                            </h3>
                        )}
                        <div className="space-y-0.5 px-3">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        title={!isOpen ? item.label : undefined}
                                        className={clsx(
                                            "sidebar-item relative group",
                                            isActive && "active",
                                            !isOpen && "justify-center px-2 py-2"
                                        )}
                                    >
                                        <Icon className={clsx(
                                            "w-4 h-4 flex-shrink-0",
                                            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                                        )} />
                                        {isOpen && (
                                            <span className="truncate">{item.label}</span>
                                        )}
                                        {item.path === '/products' && alertCount > 0 && (
                                            <span className={clsx(
                                                "absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500",
                                                !isOpen && "right-1 top-1"
                                            )} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                        {sIdx < sections.length - 1 && isOpen && <div className="mx-6 my-4 border-t border-slate-50" />}
                    </div>
                ))}
            </nav>

            {/* Footer Section */}
            <div className="p-3 border-t border-slate-100">
                <button
                    onClick={logout}
                    className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-all",
                        !isOpen && "justify-center"
                    )}
                >
                    <LogOut size={16} />
                    {isOpen && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

