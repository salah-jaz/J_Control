import { useState, useEffect, useRef, useMemo } from "react";
import {
    Plus, Eye, X, User, Calendar, Filter, Sparkles, Pencil, Trash2,
    Building2, Target, StickyNote, Check, Loader2, Save, FileText,
    Search, Download, BadgeCheck, Activity, Clock, FileSpreadsheet,
    Percent, Wallet, DollarSign, Calculator, Printer, CheckSquare, AlertCircle,
    ChevronLeft, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useReactToPrint } from "react-to-print";
import staffService from "../services/staffService";
import PageHeader from "../components/ui/PageHeader";
import SlideOver from "../components/ui/SlideOver";
import { getSettings } from "../services/db";

// Constants
const STATUS_OPTIONS = ["active", "inactive"];
const LEAVE_TYPES = ["casual", "sick", "earned", "lop"];

const emptyEmployeeForm = {
    employee_id: "",
    name: "",
    mobile: "",
    email: "",
    department_id: "",
    designation_id: "",
    joining_date: new Date().toISOString().split("T")[0],
    salary_type: "monthly",
    basic_salary: "",
    bank_name: "",
    bank_account_no: "",
    bank_ifsc: "",
    bank_branch: "",
    status: "active",
};

// StatCard Component
const StatCard = ({ title, value, icon: Icon, colorClass, subLabel, trend }) => (
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
        <div className="mt-5 relative z-10 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{subLabel || 'Staff Activity'}</span>
                <span className="text-[12px] font-bold text-slate-700 tracking-tight">{trend || 'Active Directory'}</span>
            </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Icon size={100} />
        </div>
    </div>
);

export default function StaffManagement() {
    const [tab, setTab] = useState("dashboard");

    // UI Loading & Global States
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    
    // Dashboard Stats
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalEmployees: 0,
            presentToday: 0,
            absentToday: 0,
            onLeaveToday: 0,
            unentered: 0,
            monthlyPayrollPaid: 0,
            monthlyPayrollProcessed: 0,
            pendingPayrollCount: 0,
            attendanceRate: 0,
        },
        deptBreakdown: [],
        payrollTrend: []
    });

    const [dashboardMonth, setDashboardMonth] = useState(new Date().toISOString().split("T")[0].substring(0, 7));

    // Employees Tab States
    const [employees, setEmployees] = useState([]);
    const [empSearch, setEmpSearch] = useState("");
    const [empDeptFilter, setEmpDeptFilter] = useState("");
    const [empDesgFilter, setEmpDesgFilter] = useState("");
    const [empStatusFilter, setEmpStatusFilter] = useState("");
    const [empPagination, setEmpPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
    const [openEmployeeForm, setOpenEmployeeForm] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);

    // Attendance Tab States
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendanceMode, setAttendanceMode] = useState("daily"); // daily, monthly
    const [dailyAttendanceRecords, setDailyAttendanceRecords] = useState([]);
    const [attendanceLocked, setAttendanceLocked] = useState(false);
    const [monthlyAttendanceGrid, setMonthlyAttendanceGrid] = useState({ month: new Date().toISOString().split("T")[0].substring(0, 7), daysInMonth: 30, records: [], is_locked: false });
    const [savingAttendance, setSavingAttendance] = useState(false);

    // Leaves Tab States
    const [leaves, setLeaves] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [openApplyLeaveModal, setOpenApplyLeaveModal] = useState(false);
    const [applyLeaveForm, setApplyLeaveForm] = useState({
        employee_id: "",
        leave_type: "casual",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        reason: "",
    });

    // Payroll Tab States
    const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().split("T")[0].substring(0, 7));
    const [payrollCalculations, setPayrollCalculations] = useState([]);
    const [payrollLocked, setPayrollLocked] = useState(false);
    const [processingPayroll, setProcessingPayroll] = useState(false);

    // Payslips Tab States
    const [payrollHistory, setPayrollHistory] = useState([]);
    const [payslipSearch, setPayslipSearch] = useState("");
    const [payslipMonthFilter, setPayslipMonthFilter] = useState("");
    const [selectedPayslip, setSelectedPayslip] = useState(null);
    const [openPayslipModal, setOpenPayslipModal] = useState(false);
    const [companyDetails, setCompanyDetails] = useState({ name: "J-Control ERP", address: "Corporate Headquarters" });

    // Print Reference for Payslip
    const payslipPrintRef = useRef();
    const handlePrintPayslip = useReactToPrint({
        contentRef: payslipPrintRef,
        documentTitle: selectedPayslip ? `Payslip_${selectedPayslip.employee_code}_${selectedPayslip.month}` : 'Payslip',
        pageStyle: `
            @page {
                size: A4;
                margin: 15mm !important;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: white !important;
                    color: black !important;
                    font-size: 12px;
                }
                .no-print {
                    display: none !important;
                }
            }
        `
    });

    // Fetch initial datasets
    useEffect(() => {
        loadDepartments();
        loadDesignations();
        loadCompanySettings();
    }, []);

    // Tab switcher load hook
    useEffect(() => {
        if (tab === "dashboard") loadDashboardStats();
        else if (tab === "employees") loadEmployees();
        else if (tab === "attendance") loadAttendance();
        else if (tab === "leaves") loadLeaves();
        else if (tab === "payroll") calculatePayroll();
        else if (tab === "payslips") loadPayrollHistory();
    }, [tab, empPagination.current_page, empSearch, empDeptFilter, empDesgFilter, empStatusFilter, attendanceDate, attendanceMode, monthlyAttendanceGrid.month, payrollMonth, payslipMonthFilter, payslipSearch, dashboardMonth]);

    // LOAD HANDLERS
    const loadCompanySettings = async () => {
        try {
            const settings = await getSettings();
            if (settings && settings.company) {
                setCompanyDetails({
                    name: settings.company.name || "J-Control ERP",
                    address: settings.company.address || "Corporate Headquarters"
                });
            }
        } catch (e) {
            console.log("Failed to fetch settings from DB, using defaults.");
        }
    };

    const loadDepartments = async () => {
        try {
            const data = await staffService.getDepartments();
            setDepartments(data);
        } catch (e) {
            toast.error("Failed to load departments");
        }
    };

    const loadDesignations = async () => {
        try {
            const data = await staffService.getDesignations();
            setDesignations(data);
        } catch (e) {
            toast.error("Failed to load designations");
        }
    };

    const loadDashboardStats = async () => {
        setLoading(true);
        try {
            const data = await staffService.getHrmsDashboardStats(dashboardMonth);
            setDashboardData(data);
        } catch (e) {
            toast.error("Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const params = {
                page: empPagination.current_page,
                search: empSearch,
            };
            if (empDeptFilter) params.department_id = empDeptFilter;
            if (empDesgFilter) params.designation_id = empDesgFilter;
            if (empStatusFilter) params.status = empStatusFilter;

            const res = await staffService.getEmployees(params);
            setEmployees(res.data || []);
            setEmpPagination({
                current_page: res.current_page,
                last_page: res.last_page,
                total: res.total
            });
        } catch (e) {
            toast.error("Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    const loadAttendance = async () => {
        setLoading(true);
        try {
            if (attendanceMode === "daily") {
                const res = await staffService.getAttendances(attendanceDate);
                setDailyAttendanceRecords(res.records || []);
                setAttendanceLocked(res.is_locked || false);
            } else {
                const res = await staffService.getMonthlyAttendance(monthlyAttendanceGrid.month);
                setMonthlyAttendanceGrid(res);
                setAttendanceLocked(res.is_locked || false);
            }
        } catch (e) {
            toast.error("Failed to load attendance logs");
        } finally {
            setLoading(false);
        }
    };

    const loadLeaves = async () => {
        setLoading(true);
        try {
            const [leavesList, balancesList] = await Promise.all([
                staffService.getLeaves(),
                staffService.getLeaveBalances(new Date().getFullYear())
            ]);
            setLeaves(leavesList);
            setLeaveBalances(balancesList);
        } catch (e) {
            toast.error("Failed to load leaves ledger");
        } finally {
            setLoading(false);
        }
    };

    const calculatePayroll = async () => {
        setLoading(true);
        try {
            const res = await staffService.calculatePayroll(payrollMonth);
            setPayrollCalculations(res.records || []);
            setPayrollLocked(res.is_locked || false);
        } catch (e) {
            toast.error("Failed to load payroll calculations");
        } finally {
            setLoading(false);
        }
    };

    const loadPayrollHistory = async () => {
        setLoading(true);
        try {
            const params = {};
            if (payslipMonthFilter) params.month = payslipMonthFilter;
            const data = await staffService.getPayrollHistory(params);

            // Filter history by search locally if query matches employee name or code
            let filtered = data;
            if (payslipSearch.trim()) {
                const q = payslipSearch.toLowerCase();
                filtered = data.filter(p => 
                    (p.employee && p.employee.name.toLowerCase().includes(q)) || 
                    (p.employee && p.employee.employee_id.toLowerCase().includes(q))
                );
            }
            setPayrollHistory(filtered);
        } catch (e) {
            toast.error("Failed to fetch processed payroll records");
        } finally {
            setLoading(false);
        }
    };

    // DEPARTMENT / DESIGNATION INLINE CRUD
    const handleAddDepartment = async () => {
        const name = window.prompt("Enter new Department Name:");
        if (!name || !name.trim()) return;
        try {
            await staffService.createDepartment({ name: name.trim() });
            toast.success("Department created successfully");
            loadDepartments();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to create department");
        }
    };

    const handleEditDepartment = async (dept) => {
        const name = window.prompt("Edit Department Name:", dept.name);
        if (!name || !name.trim() || name.trim() === dept.name) return;
        try {
            await staffService.updateDepartment(dept.id, { name: name.trim() });
            toast.success("Department updated successfully");
            loadDepartments();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to edit department");
        }
    };

    const handleDeleteDepartment = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department? Employees assigned to it will be set to 'Unassigned'.")) return;
        try {
            await staffService.deleteDepartment(id);
            toast.success("Department deleted successfully");
            loadDepartments();
        } catch (e) {
            toast.error("Failed to delete department");
        }
    };

    const handleAddDesignation = async () => {
        const name = window.prompt("Enter new Designation Name:");
        if (!name || !name.trim()) return;
        try {
            await staffService.createDesignation({ name: name.trim() });
            toast.success("Designation created successfully");
            loadDesignations();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to create designation");
        }
    };

    const handleEditDesignation = async (desg) => {
        const name = window.prompt("Edit Designation Name:", desg.name);
        if (!name || !name.trim() || name.trim() === desg.name) return;
        try {
            await staffService.updateDesignation(desg.id, { name: name.trim() });
            toast.success("Designation updated successfully");
            loadDesignations();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to edit designation");
        }
    };

    const handleDeleteDesignation = async (id) => {
        if (!window.confirm("Are you sure you want to delete this designation? Employees assigned to it will be set to 'Unassigned'.")) return;
        try {
            await staffService.deleteDesignation(id);
            toast.success("Designation deleted successfully");
            loadDesignations();
        } catch (e) {
            toast.error("Failed to delete designation");
        }
    };

    // EMPLOYEE SUBMIT HANDLERS
    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        if (!employeeForm.name || !employeeForm.mobile || !employeeForm.email || !employeeForm.basic_salary) {
            toast.error("Please fill in all mandatory fields.");
            return;
        }

        const data = {
            ...employeeForm,
            basic_salary: parseFloat(employeeForm.basic_salary)
        };

        setLoading(true);
        try {
            if (editingEmployeeId) {
                await staffService.updateEmployee(editingEmployeeId, data);
                toast.success("Employee record updated successfully");
            } else {
                await staffService.createEmployee(data);
                toast.success("Employee registered successfully with standard leave balance");
            }
            setOpenEmployeeForm(false);
            setEmployeeForm(emptyEmployeeForm);
            loadEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save employee record");
        } finally {
            setLoading(false);
        }
    };

    const handleEditEmployee = (emp) => {
        setEditingEmployeeId(emp.id);
        setEmployeeForm({
            employee_id: emp.employee_id,
            name: emp.name,
            mobile: emp.mobile,
            email: emp.email,
            department_id: emp.department_id || "",
            designation_id: emp.designation_id || "",
            joining_date: emp.joining_date,
            salary_type: emp.salary_type,
            basic_salary: emp.basic_salary,
            bank_name: emp.bank_name || "",
            bank_account_no: emp.bank_account_no || "",
            bank_ifsc: emp.bank_ifsc || "",
            bank_branch: emp.bank_branch || "",
            status: emp.status,
        });
        setOpenEmployeeForm(true);
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm("Delete this employee permanently? All linked attendance, leaves, and payroll records will be deleted as well.")) return;
        try {
            await staffService.deleteEmployee(id);
            toast.success("Employee record deleted successfully");
            loadEmployees();
        } catch (e) {
            toast.error("Failed to delete employee");
        }
    };

    // ATTENDANCE SAVE & DATE ARROW NAVIGATION HANDLERS
    const handlePrevDay = () => {
        const d = new Date(attendanceDate);
        d.setDate(d.getDate() - 1);
        setAttendanceDate(d.toISOString().split("T")[0]);
    };

    const handleNextDay = () => {
        const d = new Date(attendanceDate);
        d.setDate(d.getDate() + 1);
        const nextDateStr = d.toISOString().split("T")[0];
        
        const today = new Date().toISOString().split("T")[0];
        if (nextDateStr > today) {
            toast.error("Future attendance entries are not allowed.");
            return;
        }
        setAttendanceDate(nextDateStr);
    };

    const handleStatusToggle = (empId, newStatus) => {
        if (attendanceLocked) {
            toast.error("Attendance is locked because payroll has already been processed for this month.");
            return;
        }
        setDailyAttendanceRecords(prev => prev.map(rec => {
            if (rec.employee_id === empId) {
                const isAbsent = newStatus === 'absent' || newStatus === 'leave';
                return {
                    ...rec,
                    status: newStatus,
                    check_in: isAbsent ? "" : (rec.check_in || "09:00"),
                    check_out: isAbsent ? "" : (rec.check_out || "18:00")
                };
            }
            return rec;
        }));
    };

    const handleTimeChange = (empId, field, val) => {
        if (attendanceLocked) {
            return;
        }
        setDailyAttendanceRecords(prev => prev.map(rec => {
            if (rec.employee_id === empId) {
                return { ...rec, [field]: val };
            }
            return rec;
        }));
    };

    const handleSaveDailyAttendance = async () => {
        if (attendanceLocked) {
            toast.error("Attendance is locked. Processed payroll run exists.");
            return;
        }
        setSavingAttendance(true);
        try {
            const formatted = dailyAttendanceRecords.map(rec => ({
                employee_id: rec.employee_id,
                status: rec.status,
                check_in: rec.status === 'absent' || rec.status === 'leave' ? null : rec.check_in,
                check_out: rec.status === 'absent' || rec.status === 'leave' ? null : rec.check_out,
            }));

            await staffService.saveAttendance(attendanceDate, formatted);
            toast.success(`Attendance logs for ${attendanceDate} saved successfully`);
            loadAttendance();
        } catch (e) {
            toast.error("Failed to save daily attendance logs");
        } finally {
            setSavingAttendance(false);
        }
    };

    // LEAVE APPLY HANDLERS
    const handleApplyLeave = async (e) => {
        e.preventDefault();
        if (!applyLeaveForm.employee_id || !applyLeaveForm.reason) {
            toast.error("Mandatory fields missing.");
            return;
        }

        setLoading(true);
        try {
            await staffService.createLeave(applyLeaveForm);
            toast.success("Leave applied successfully and is pending approval.");
            setOpenApplyLeaveModal(false);
            setApplyLeaveForm({
                employee_id: "",
                leave_type: "casual",
                start_date: new Date().toISOString().split("T")[0],
                end_date: new Date().toISOString().split("T")[0],
                reason: "",
            });
            loadLeaves();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to apply leave");
        } finally {
            setLoading(false);
        }
    };

    const handleProcessLeave = async (id, status) => {
        if (!window.confirm(`Are you sure you want to mark this leave request as ${status}?` + 
            (status === 'approved' ? ' Approved days will automatically be deducted from leave balances and registered in the Attendance logs.' : ''))) return;

        setLoading(true);
        try {
            await staffService.updateLeaveStatus(id, status);
            toast.success(`Leave request ${status} cleanly`);
            loadLeaves();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to process leave request");
        } finally {
            setLoading(false);
        }
    };

    // PAYROLL INLINE CHANGE HANDLERS
    const handlePayrollCalculationChange = (empId, field, value) => {
        if (payrollLocked) return;
        setPayrollCalculations(prev => prev.map(calc => {
            if (calc.employee_id === empId) {
                const numericVal = parseFloat(value) || 0;
                const updated = { ...calc, [field]: numericVal };

                // Automatically compute overtime amount if OT changes
                if (field === 'overtime_hours' || field === 'overtime_rate') {
                    updated.overtime_amount = round(updated.overtime_hours * updated.overtime_rate, 2);
                }

                // Strict salary calculation: Net wage is automatic
                const baseSalary = calc.salary_type === 'monthly' 
                    ? (calc.basic_salary - calc.lop_deduction) 
                    : (calc.present_days * calc.basic_salary);

                const net = baseSalary 
                    + updated.allowances 
                    + updated.bonus 
                    + updated.overtime_amount 
                    - updated.other_deductions;

                updated.net_salary = round(max(0, net), 2);
                return updated;
            }
            return calc;
        }));
    };

    const handlePayrollNotesChange = (empId, value) => {
        if (payrollLocked) return;
        setPayrollCalculations(prev => prev.map(calc => {
            if (calc.employee_id === empId) {
                return { ...calc, notes: value };
            }
            return calc;
        }));
    };

    const handleProcessPayrollSubmit = async () => {
        if (payrollCalculations.length === 0) {
            toast.error("No employees to process");
            return;
        }

        if (!window.confirm(`Commit and process payroll logs for ${payrollMonth}? Processed payout records will create formal payslips.`)) return;

        setProcessingPayroll(true);
        try {
            const records = payrollCalculations.map(c => ({
                ...c,
                status: 'paid', // Mark processed payslips as paid immediately
                payment_method: 'Bank Transfer'
            }));

            await staffService.processPayroll(payrollMonth, records);
            toast.success(`Payroll processed successfully for ${payrollMonth}`);
            calculatePayroll();
        } catch (e) {
            toast.error("Failed to process monthly payroll runs");
        } finally {
            setProcessingPayroll(false);
        }
    };

    const handleReopenPayroll = async () => {
        if (!window.confirm(`Are you sure you want to Reopen payroll for ${payrollMonth}? Processing records will be deleted, unlocking attendance check-ins and recalculation.`)) return;

        setProcessingPayroll(true);
        try {
            await staffService.reopenPayroll(payrollMonth);
            toast.success(`Payroll for ${payrollMonth} reopened successfully`);
            calculatePayroll();
        } catch (e) {
            toast.error("Failed to reopen monthly payroll runs");
        } finally {
            setProcessingPayroll(false);
        }
    };

    // Math Round Helper
    const round = (num, decimals = 2) => {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    const max = (val1, val2) => {
        return val1 > val2 ? val1 : val2;
    };

    // REPORTS GENERATORS
    const downloadEmployeeReport = () => {
        const headers = ["Employee Code", "Full Name", "Mobile", "Email", "Department", "Designation", "Joining Date", "Salary Type", "Basic Salary", "Status"];
        const rows = employees.map(emp => [
            emp.employee_id,
            emp.name,
            emp.mobile,
            emp.email,
            emp.department ? emp.department.name : 'Unassigned',
            emp.designation ? emp.designation.name : 'Unassigned',
            emp.joining_date,
            emp.salary_type,
            emp.basic_salary,
            emp.status
        ]);
        triggerCSVDownload("Employee_Report", headers, rows);
    };

    const downloadAttendanceReport = async () => {
        try {
            const data = await staffService.getMonthlyAttendance(payrollMonth);
            const headers = ["Employee ID", "Employee Name", ...Object.keys(data.records[0]?.attendance || {})];
            const rows = data.records.map(r => [
                r.employee_code,
                r.employee_name,
                ...Object.values(r.attendance).map(val => val || 'unentered')
            ]);
            triggerCSVDownload(`Attendance_Register_${payrollMonth}`, headers, rows);
        } catch (e) {
            toast.error("Failed to generate attendance report download");
        }
    };

    const downloadLeaveReport = () => {
        const headers = ["Employee Code", "Employee Name", "Leave Type", "Start Date", "End Date", "Status", "Reason"];
        const rows = leaves.map(l => [
            l.employee?.employee_id || '—',
            l.employee?.name || '—',
            l.leave_type,
            l.start_date,
            l.end_date,
            l.status,
            l.reason || ''
        ]);
        triggerCSVDownload("Leave_Report", headers, rows);
    };

    const downloadPayrollReport = () => {
        const headers = ["Employee Code", "Employee Name", "Month", "Salary Type", "Basic Salary", "Present Days", "LOP Days", "LOP Deduction", "Overtime Amount", "Bonus", "Allowances", "Other Deductions", "Net Salary", "Status", "Processed Date", "Processed By"];
        const rows = payrollHistory.map(p => [
            p.employee?.employee_id || '—',
            p.employee?.name || '—',
            p.month,
            p.salary_type,
            p.basic_salary,
            p.present_days,
            p.lop_days,
            p.lop_deduction,
            p.overtime_amount,
            p.bonus,
            p.allowances,
            p.other_deductions,
            p.net_salary,
            p.status,
            p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—',
            p.processed_by_name || 'Admin'
        ]);
        triggerCSVDownload(`Payroll_Register_${new Date().toISOString().substring(0, 10)}`, headers, rows);
    };

    const triggerCSVDownload = (filename, headers, rows) => {
        let csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // StatCard Data mapping
    const stats = dashboardData.stats;
    const pieColors = ["#6366f1", "#10b981", "#3b82f6", "#ef4444", "#f59e0b"];

    const formatMonthName = (monthStr) => {
        if (!monthStr) return "";
        const [year, month] = monthStr.split("-");
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
            {/* Page Header */}
            <PageHeader
                title="Staff Management"
                subtitle="Manage corporate staff registry, daily check-ins, leaves quotas, and monthly processed payslips."
                primaryAction={
                    tab === "employees" && (
                        <button 
                            onClick={() => {
                                setEditingEmployeeId(null);
                                setEmployeeForm(emptyEmployeeForm);
                                setOpenEmployeeForm(true);
                            }}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            <Plus size={18} strokeWidth={3} />
                            <span>New Employee</span>
                        </button>
                    )
                }
            />

            {/* TAB CONTAINER */}
            <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 sticky top-4 z-40">
                {[
                    { id: 'dashboard', label: 'HR Dashboard', icon: Activity },
                    { id: 'employees', label: 'Employees', icon: User },
                    { id: 'attendance', label: 'Attendance Check-in', icon: CheckSquare },
                    { id: 'leaves', label: 'Leaves Ledger', icon: StickyNote },
                    { id: 'payroll', label: 'Run Payroll', icon: Calculator },
                    { id: 'payslips', label: 'Payslips & History', icon: FileText },
                    { id: 'dept_desg', label: 'Designations & Depts', icon: Building2 },
                    { id: 'reports', label: 'Reports Centre', icon: FileSpreadsheet },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all",
                            tab === t.id
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        )}
                    >
                        <t.icon size={15} />
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* MAIN VIEWS */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-sm z-[30] flex items-center justify-center min-h-[400px]">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                )}

                {/* 1. DASHBOARD TAB */}
                {tab === "dashboard" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Month Selector Dashboard Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div>
                                <h2 className="text-md font-bold text-slate-800">HR Analytics & Performance Overview</h2>
                                <p className="text-xs font-semibold text-slate-500">Real-time statistics calculated from current system database records.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Month:</label>
                                <input
                                    type="month"
                                    value={dashboardMonth}
                                    onChange={(e) => setDashboardMonth(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Stats Widgets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <StatCard title="Total Employees" value={stats.totalEmployees} icon={User} colorClass="bg-slate-800" subLabel="Employee Directory" trend="Active Registry" />
                            <StatCard title="Present Today" value={stats.presentToday} icon={BadgeCheck} colorClass="bg-emerald-600" subLabel="Check-ins" trend={`${stats.attendanceRate}% Attendance`} />
                            <StatCard title="Absent Today" value={stats.absentToday} icon={X} colorClass="bg-rose-600" subLabel="No-Show" trend="Deduction logs active" />
                            <StatCard title="On Leave Today" value={stats.onLeaveToday} icon={StickyNote} colorClass="bg-indigo-600" subLabel="Paid & LOP Leaves" trend="Absence approved" />
                            <StatCard title={`Total Payroll (${formatMonthName(dashboardMonth)})`} value={`₹${stats.monthlyPayrollProcessed.toLocaleString('en-IN')}`} icon={Wallet} colorClass="bg-amber-600" subLabel="Treasury payout" trend={`₹${stats.monthlyPayrollPaid.toLocaleString('en-IN')} Paid`} />
                        </div>

                        {/* Visual Graphs */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Line Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">6-Month Treasury Payroll Trend</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dashboardData.payrollTrend}>
                                            <defs>
                                                <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                                            <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, "Payroll Amount"]} />
                                            <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#payrollGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Staff Department Breakdown</h3>
                                    <div className="h-[220px] flex items-center justify-center">
                                        {dashboardData.deptBreakdown.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={dashboardData.deptBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {dashboardData.deptBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <span className="text-slate-400 text-xs">No active staff records mapped.</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {dashboardData.deptBreakdown.map((dept, index) => (
                                        <div key={dept.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                                                <span>{dept.name}</span>
                                            </div>
                                            <span className="font-mono text-slate-900">{dept.value} staff</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. EMPLOYEES TAB */}
                {tab === "employees" && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Filters Panel */}
                        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[240px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by Employee Code, Name, Email..."
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                        value={empSearch}
                                        onChange={(e) => setEmpSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <select 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black uppercase text-slate-600 outline-none focus:border-indigo-500"
                                    value={empDeptFilter} 
                                    onChange={(e) => setEmpDeptFilter(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>

                                <select 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black uppercase text-slate-600 outline-none focus:border-indigo-500"
                                    value={empDesgFilter} 
                                    onChange={(e) => setEmpDesgFilter(e.target.value)}
                                >
                                    <option value="">All Designations</option>
                                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>

                                <select 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black uppercase text-slate-600 outline-none focus:border-indigo-500"
                                    value={empStatusFilter} 
                                    onChange={(e) => setEmpStatusFilter(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Grid/Table Layout */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Employee Code</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Full Name</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contact details</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department & Designation</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Salary Details</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {employees.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                                    No employees match these filters or none registered yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            employees.map(emp => (
                                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 font-mono text-[13px] font-black text-slate-900 italic tracking-tight">{emp.employee_id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                                                                {emp.name[0]}
                                                            </div>
                                                            <span className="text-[13px] font-bold text-slate-800">{emp.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col text-[12px]">
                                                            <span className="font-bold text-slate-700">{emp.mobile}</span>
                                                            <span className="text-slate-400 font-medium">{emp.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col text-[12px]">
                                                            <span className="font-bold text-slate-700">{emp.department ? emp.department.name : 'Unassigned'}</span>
                                                            <span className="text-slate-400 font-medium">{emp.designation ? emp.designation.name : 'Unassigned'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col text-[12px]">
                                                            <span className="font-bold text-slate-800">₹{parseFloat(emp.basic_salary).toLocaleString('en-IN')}</span>
                                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{emp.salary_type} wage</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                            emp.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                        )}>
                                                            {emp.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={() => handleEditEmployee(emp)}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteEmployee(emp.id)}
                                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-all"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {empPagination.last_page > 1 && (
                                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500">
                                    <span>Total employees: {empPagination.total}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            disabled={empPagination.current_page === 1}
                                            onClick={() => setEmpPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded disabled:opacity-50"
                                        >
                                            Prev
                                        </button>
                                        <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-700">
                                            Page {empPagination.current_page} of {empPagination.last_page}
                                        </span>
                                        <button 
                                            disabled={empPagination.current_page === empPagination.last_page}
                                            onClick={() => setEmpPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. ATTENDANCE TAB */}
                {tab === "attendance" && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Processed Lock Notification Banner */}
                        {attendanceMode === "daily" && attendanceLocked && (
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-3 text-xs font-bold shadow-sm animate-pulse">
                                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                                <span>Attendance for this month is locked because payroll has already been processed. Records are in Read-Only Audit mode.</span>
                            </div>
                        )}

                        {/* Picker Subbar */}
                        <div className="bg-white px-6 py-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Mode</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setAttendanceMode("daily")}
                                        className={clsx("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", attendanceMode === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                                    >
                                        Daily Entry
                                    </button>
                                    <button 
                                        onClick={() => setAttendanceMode("monthly")}
                                        className={clsx("px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all", attendanceMode === 'monthly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                                    >
                                        Monthly Matrix
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {attendanceMode === "daily" ? (
                                    <>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Attendance Date</label>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={handlePrevDay}
                                                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
                                                title="Previous Day"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <input 
                                                type="date" 
                                                max={new Date().toISOString().split("T")[0]}
                                                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500 max-w-[155px] text-center"
                                                value={attendanceDate}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const today = new Date().toISOString().split("T")[0];
                                                    if (val > today) {
                                                        toast.error("Future attendance entries are not allowed.");
                                                        return;
                                                    }
                                                    setAttendanceDate(val);
                                                }}
                                            />
                                            <button 
                                                onClick={handleNextDay}
                                                disabled={attendanceDate >= new Date().toISOString().split("T")[0]}
                                                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shadow-sm disabled:opacity-30 disabled:pointer-events-none"
                                                title="Next Day"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Month</label>
                                        <input 
                                            type="month" 
                                            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500"
                                            value={monthlyAttendanceGrid.month}
                                            onChange={(e) => setMonthlyAttendanceGrid(prev => ({ ...prev, month: e.target.value }))}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Dynamic layouts */}
                        {attendanceMode === "daily" ? (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Active Employees Daily Logs</span>
                                    <button
                                        disabled={savingAttendance || attendanceLocked}
                                        onClick={handleSaveDailyAttendance}
                                        className="btn-primary flex items-center gap-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {savingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>{attendanceLocked ? "Attendance Locked" : "Save Daily Log"}</span>
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Code</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department & Designation</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Attendance Status</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Check In</th>
                                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Check Out</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[12px] font-bold text-slate-700">
                                            {dailyAttendanceRecords.map(rec => (
                                                <tr key={rec.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-black italic">{rec.employee_code}</td>
                                                    <td className="px-6 py-4 text-[13px]">{rec.employee_name}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-400">{rec.department_name} • {rec.designation_name}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={clsx("flex gap-1.5 flex-wrap", attendanceLocked && "pointer-events-none opacity-60")}>
                                                            {['present', 'work_from_home', 'half_day', 'leave', 'absent'].map(st => (
                                                                <button
                                                                    key={st}
                                                                    disabled={attendanceLocked}
                                                                    onClick={() => handleStatusToggle(rec.employee_id, st)}
                                                                    className={clsx(
                                                                        "px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                                                                        rec.status === st
                                                                            ? (
                                                                                st === 'present' ? "bg-emerald-50 border-emerald-500 text-emerald-700" :
                                                                                st === 'work_from_home' ? "bg-blue-50 border-blue-500 text-blue-700" :
                                                                                st === 'half_day' ? "bg-amber-50 border-amber-500 text-amber-700" :
                                                                                st === 'leave' ? "bg-indigo-50 border-indigo-500 text-indigo-700" :
                                                                                "bg-rose-50 border-rose-500 text-rose-700"
                                                                            )
                                                                            : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                                                    )}
                                                                >
                                                                    {st.replace(/_/g, ' ')}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input 
                                                            type="time" 
                                                            disabled={rec.status === 'absent' || rec.status === 'leave' || attendanceLocked}
                                                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-bold text-slate-800 disabled:opacity-30 focus:border-indigo-500"
                                                            value={rec.check_in || ""}
                                                            onChange={(e) => handleTimeChange(rec.employee_id, 'check_in', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input 
                                                            type="time" 
                                                            disabled={rec.status === 'absent' || rec.status === 'leave' || attendanceLocked}
                                                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-bold text-slate-800 disabled:opacity-30 focus:border-indigo-500"
                                                            value={rec.check_out || ""}
                                                            onChange={(e) => handleTimeChange(rec.employee_id, 'check_out', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Attendance Grid Ledger</span>
                                <div className="overflow-x-auto max-w-full custom-scrollbar">
                                    <table className="min-w-max w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r">Employee</th>
                                                {/* Generate day columns */}
                                                {Array.from({ length: monthlyAttendanceGrid.daysInMonth }).map((_, i) => (
                                                    <th key={i} className="px-1.5 py-2.5 text-center text-[10px] font-black text-slate-500">
                                                        {i + 1}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider border-l">P</th>
                                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider">H</th>
                                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider">L</th>
                                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider">A</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-800">
                                            {monthlyAttendanceGrid.records.map(row => (
                                                <tr key={row.employee_id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-2 border-r sticky left-0 bg-white z-10 font-bold max-w-[150px] truncate shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                        {row.employee_name}
                                                    </td>
                                                    {Object.keys(row.attendance).map(dateStr => {
                                                        const status = row.attendance[dateStr];
                                                        return (
                                                            <td key={dateStr} className="p-0.5 text-center">
                                                                <div 
                                                                    title={`${dateStr}: ${status || 'unentered'}`}
                                                                    className={clsx(
                                                                        "w-5 h-5 mx-auto rounded flex items-center justify-center text-[9px] font-black uppercase text-white shadow-sm",
                                                                        status === 'present' ? "bg-emerald-500" :
                                                                        status === 'work_from_home' ? "bg-blue-500" :
                                                                        status === 'half_day' ? "bg-amber-500" :
                                                                        status === 'leave' ? "bg-indigo-500" :
                                                                        status === 'absent' ? "bg-rose-500" :
                                                                        "bg-slate-100 border border-slate-200"
                                                                    )}
                                                                >
                                                                    {status ? (status === 'work_from_home' ? 'W' : status[0]) : ''}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-2 text-center text-emerald-600 border-l font-mono">{row.summary.present + row.summary.wfh}</td>
                                                    <td className="px-4 py-2 text-center text-amber-600 font-mono">{row.summary.half_day}</td>
                                                    <td className="px-4 py-2 text-center text-indigo-600 font-mono">{row.summary.leave}</td>
                                                    <td className="px-4 py-2 text-center text-rose-600 font-mono">{row.summary.absent}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs font-bold pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-emerald-500 rounded" /> Present (P)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-blue-500 rounded" /> WFH (W)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-amber-500 rounded" /> Half Day (H)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-indigo-500 rounded" /> Approved Leave (L)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-rose-500 rounded" /> Absent (A)</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-slate-100 border rounded" /> Unentered</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. LEAVES TAB */}
                {tab === "leaves" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Section 1: Leave Actions Header & Balances */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Balances */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Leave Quotas Summary ({new Date().getFullYear()})</span>
                                    <button 
                                        onClick={() => setOpenApplyLeaveModal(true)}
                                        className="btn-primary flex items-center gap-1.5 text-xs py-2 shadow shadow-indigo-500/20"
                                    >
                                        <Plus size={14} />
                                        <span>Apply Leave</span>
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[12px] font-bold text-slate-700">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-4 py-2.5 text-slate-500 uppercase tracking-widest text-[10px]">Staff Name</th>
                                                <th className="px-4 py-2.5 text-slate-500 uppercase tracking-widest text-[10px] text-center">Casual (Days)</th>
                                                <th className="px-4 py-2.5 text-slate-500 uppercase tracking-widest text-[10px] text-center">Sick (Days)</th>
                                                <th className="px-4 py-2.5 text-slate-500 uppercase tracking-widest text-[10px] text-center">Earned (Days)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {leaveBalances.map(b => (
                                                <tr key={b.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">{b.employee?.name}</td>
                                                    <td className="px-4 py-3 text-center text-indigo-600 font-mono">{b.casual_leave}</td>
                                                    <td className="px-4 py-3 text-center text-emerald-600 font-mono">{b.sick_leave}</td>
                                                    <td className="px-4 py-3 text-center text-amber-600 font-mono">{b.earned_leave}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
                                <div className="space-y-4 relative z-10">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg"><StickyNote size={24}/></div>
                                    <h3 className="font-extrabold text-lg tracking-tight">Paid Leave Policy</h3>
                                    <p className="text-indigo-100 text-xs font-semibold leading-relaxed">
                                        Active staff are allocated standard quotas annually (12 Casual, 12 Sick, 12 Earned). 
                                        <br/><br/>
                                        Approving leaves automatically recalculates balances and records absences in the attendance ledger.
                                    </p>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                                    <AlertCircle size={150} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Applied Leaves List */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100">
                                <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Leave Applications Queue</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Leave Type</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Reason</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[12px] font-bold text-slate-700">
                                        {leaves.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">No leave applications lodged yet.</td>
                                            </tr>
                                        ) : (
                                            leaves.map(l => (
                                                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-slate-800">{l.employee?.name}</span>
                                                            <span className="text-slate-400 font-medium">{l.employee?.employee_id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 uppercase tracking-wider font-extrabold text-[10px] text-indigo-600">{l.leave_type}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col font-mono text-[11px]">
                                                            <span>{l.start_date} to {l.end_date}</span>
                                                            <span className="text-slate-400 font-sans font-bold">
                                                                {Math.round((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1} days
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-500 italic max-w-xs truncate" title={l.reason}>
                                                        {l.reason || 'No reason specified'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            "px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                            l.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                                                            l.status === "rejected" ? "bg-rose-100 text-rose-700" :
                                                            "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {l.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {l.status === 'pending' ? (
                                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button
                                                                    onClick={() => handleProcessLeave(l.id, 'approved')}
                                                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-sm"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleProcessLeave(l.id, 'rejected')}
                                                                    className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-sm"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. PAYROLL TAB */}
                {tab === "payroll" && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Processed Lock Notification Banner & Admin Reopen */}
                        {payrollLocked && (
                            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between gap-3 text-xs font-bold shadow-sm animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <CheckSquare size={18} className="text-emerald-600 shrink-0" />
                                    <span>Payroll run for {payrollMonth} has been completed and locked. Attendance logs are read-only.</span>
                                </div>
                                <button
                                    onClick={handleReopenPayroll}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all"
                                >
                                    Reopen Payroll
                                </button>
                            </div>
                        )}

                        {/* Selector Head */}
                        <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Target Month</label>
                                <input 
                                    type="month" 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500"
                                    value={payrollMonth}
                                    onChange={(e) => setPayrollMonth(e.target.value)}
                                />
                            </div>

                            {!payrollLocked && (
                                <button
                                    disabled={processingPayroll || payrollCalculations.length === 0}
                                    onClick={handleProcessPayrollSubmit}
                                    className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    {processingPayroll ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                                    <span>Commit & Process Payouts</span>
                                </button>
                            )}
                        </div>

                        {/* Interactive Calculations Grid */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Payroll Processing Ledger — {payrollMonth}</span>
                                <span className="text-[11px] font-bold text-slate-400 italic">Strict Attendance Rules: Wage calculations & Net Wage are locked. Allowances, OT and Bonus remain editable.</span>
                            </div>
                            <div className="overflow-x-auto max-w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse text-[12px] font-bold text-slate-800">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Staff Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Basic</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center">Days Worked</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center">LOP Days</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">LOP Deduct</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">OT Hours</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">OT Rate</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Bonus (₹)</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Allowances</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Other Deduct</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Net Salary</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Payout notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payrollCalculations.length === 0 ? (
                                            <tr>
                                                <td colSpan="12" className="p-12 text-center text-slate-400 font-medium">No active employees mapped in the registry.</td>
                                            </tr>
                                        ) : (
                                            payrollCalculations.map(calc => (
                                                <tr key={calc.employee_id} className={clsx("hover:bg-slate-50/50 transition-colors", calc.is_processed && "bg-emerald-50/20")}>
                                                    <td className="px-4 py-3 min-w-[150px]">
                                                        <div className="flex flex-col">
                                                            <span className="font-extrabold text-[13px] text-slate-800">{calc.employee_name}</span>
                                                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{calc.salary_type} wage • {calc.employee_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 font-mono">₹{calc.basic_salary}</td>
                                                    <td className="px-4 py-3 text-center font-mono bg-indigo-50/5">{calc.present_days}</td>
                                                    <td className="px-4 py-3 text-center text-rose-500 font-mono bg-indigo-50/5">{calc.lop_days}</td>
                                                    <td className="px-4 py-3 text-rose-600 font-mono bg-indigo-50/5">₹{calc.lop_deduction}</td>
                                                    
                                                    {/* Editable OT Hours */}
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-mono disabled:opacity-50 text-slate-800 focus:bg-white"
                                                            value={calc.overtime_hours}
                                                            onChange={(e) => handlePayrollCalculationChange(calc.employee_id, 'overtime_hours', e.target.value)}
                                                        />
                                                    </td>
                                                    {/* Editable OT Rate */}
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-mono disabled:opacity-50 text-slate-800 focus:bg-white"
                                                            value={calc.overtime_rate}
                                                            onChange={(e) => handlePayrollCalculationChange(calc.employee_id, 'overtime_rate', e.target.value)}
                                                        />
                                                    </td>
                                                    {/* Editable Bonus */}
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-mono disabled:opacity-50 text-slate-800 focus:bg-white"
                                                            value={calc.bonus}
                                                            onChange={(e) => handlePayrollCalculationChange(calc.employee_id, 'bonus', e.target.value)}
                                                        />
                                                    </td>
                                                    {/* Editable Allowances */}
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-mono disabled:opacity-50 text-slate-800 focus:bg-white"
                                                            value={calc.allowances}
                                                            onChange={(e) => handlePayrollCalculationChange(calc.employee_id, 'allowances', e.target.value)}
                                                        />
                                                    </td>
                                                    {/* Editable Other Deductions */}
                                                    <td className="px-2 py-2">
                                                        <input
                                                            type="number"
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-xs font-mono disabled:opacity-50 text-slate-800 focus:bg-white"
                                                            value={calc.other_deductions}
                                                            onChange={(e) => handlePayrollCalculationChange(calc.employee_id, 'other_deductions', e.target.value)}
                                                        />
                                                    </td>

                                                    <td className="px-4 py-3 font-mono font-black text-[13px] text-indigo-700 bg-indigo-50/20">₹{calc.net_salary.toLocaleString('en-IN')}</td>
                                                    
                                                    {/* Editable Notes */}
                                                    <td className="px-2 py-2 min-w-[120px]">
                                                        <input
                                                            type="text"
                                                            placeholder="Add remarks..."
                                                            disabled={calc.is_processed || payrollLocked}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 outline-none text-xs font-semibold text-slate-800 disabled:opacity-50 focus:bg-white"
                                                            value={calc.notes || ""}
                                                            onChange={(e) => handlePayrollNotesChange(calc.employee_id, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. PAYSLIPS TAB */}
                {tab === "payslips" && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Search & Select Month */}
                        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[240px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by Employee Code or Name..."
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
                                        value={payslipSearch}
                                        onChange={(e) => setPayslipSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filter Month</label>
                                <input 
                                    type="month" 
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500"
                                    value={payslipMonthFilter}
                                    onChange={(e) => setPayslipMonthFilter(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* History Registry */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payout Month</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Salary Structure</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Net Salary</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Payout status</th>
                                            <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[12px] font-bold text-slate-700">
                                        {payrollHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">No processed payroll records match these filters.</td>
                                            </tr>
                                        ) : (
                                            payrollHistory.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-slate-800">{p.employee?.name}</span>
                                                            <span className="text-slate-400 font-medium">{p.employee?.employee_id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono">{p.month}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col text-[11px]">
                                                            <span>Basic: ₹{parseFloat(p.basic_salary).toLocaleString('en-IN')}</span>
                                                            <span className="text-slate-400">Present days: {p.present_days}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-black text-indigo-600">₹{parseFloat(p.net_salary).toLocaleString('en-IN')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPayslip(p);
                                                                setOpenPayslipModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-xs"
                                                        >
                                                            <Eye size={12} />
                                                            <span>Payslip</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. DEPARTMENTS & DESIGNATIONS TAB */}
                {tab === "dept_desg" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        {/* Departments Management */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Corporate Departments</span>
                                <button 
                                    onClick={handleAddDepartment}
                                    className="btn-primary flex items-center gap-1 py-1.5 text-xs shadow shadow-indigo-500/20"
                                >
                                    <Plus size={14} />
                                    <span>Add</span>
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {departments.map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-3 group">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{d.name}</span>
                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{d.employees_count || 0} Employees</span>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditDepartment(d)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteDepartment(d.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Designations Management */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-3">
                                <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Staff Designations</span>
                                <button 
                                    onClick={handleAddDesignation}
                                    className="btn-primary flex items-center gap-1 py-1.5 text-xs shadow shadow-indigo-500/20"
                                >
                                    <Plus size={14} />
                                    <span>Add</span>
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {designations.map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-3 group">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{d.name}</span>
                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{d.employees_count || 0} Employees</span>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditDesignation(d)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteDesignation(d.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. REPORTS TAB */}
                {tab === "reports" && (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-500">
                        <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Reports Centre Dashboard</span>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Download full Excel-compliant CSV logs of all HRMS module sub-systems in one click.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            {/* Employee Register */}
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Active Employee Register</h4>
                                    <p className="text-slate-400 text-xs">Profile fields, mobile, email, joining dates, salary types.</p>
                                </div>
                                <button 
                                    onClick={downloadEmployeeReport}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* Attendance Log */}
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Monthly Attendance Log</h4>
                                    <p className="text-slate-400 text-xs">Daily logs of present, absent, leaves across the selected target month.</p>
                                </div>
                                <button 
                                    onClick={downloadAttendanceReport}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* Leave Ledger */}
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Leaves Ledger Log</h4>
                                    <p className="text-slate-400 text-xs">History of all casual, sick, earned, and LOP leaves and approval notes.</p>
                                </div>
                                <button 
                                    onClick={downloadLeaveReport}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* Payroll History */}
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">Processed Salary Register</h4>
                                    <p className="text-slate-400 text-xs">Process payouts registry, net wage totals, LOP counts, overtime earnings.</p>
                                </div>
                                <button 
                                    onClick={downloadPayrollReport}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* A4 Payslip Preview Modal */}
            {openPayslipModal && selectedPayslip && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                        {/* Modal Head */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between no-print shrink-0 bg-slate-50">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Employee Formal Payslip</h3>
                                <p className="text-[10px] text-slate-400 font-extrabold tracking-widest mt-0.5 uppercase">A4 Page Compliant Geometry</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handlePrintPayslip}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/10 active:scale-95 transition-all"
                                >
                                    <Printer size={14} />
                                    <span>Print / PDF</span>
                                </button>
                                <button 
                                    onClick={() => { setSelectedPayslip(null); setOpenPayslipModal(false); }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body (Scroll A4 document) */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center shadow-inner print:bg-white">
                            <div 
                                ref={payslipPrintRef} 
                                className="w-[210mm] min-h-[297mm] bg-white p-12 md:p-16 border shadow-xl flex flex-col justify-between text-slate-800 print:shadow-none print:border-none print:p-0 print:w-full"
                                style={{ boxSizing: "border-box" }}
                            >
                                <div className="space-y-8">
                                    {/* Company Mark & Payslip Label */}
                                    <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-6">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{companyDetails.name}</h2>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{companyDetails.address}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg">Payslip Ledger</span>
                                            <p className="text-[11px] font-mono text-slate-500 mt-2 font-bold uppercase">{selectedPayslip.month}</p>
                                        </div>
                                    </div>

                                    {/* Personal Identity Grid */}
                                    <div className="grid grid-cols-2 gap-8 text-[12px] bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div className="space-y-2">
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Employee Name</span> <span className="font-extrabold text-slate-800">{selectedPayslip.employee?.name}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Employee ID</span> <span className="font-mono font-black text-slate-800">{selectedPayslip.employee_code || selectedPayslip.employee?.employee_id}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Department</span> <span className="font-bold text-slate-700">{selectedPayslip.employee?.department ? selectedPayslip.employee.department.name : 'Unassigned'}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Designation</span> <span className="font-bold text-slate-700">{selectedPayslip.employee?.designation ? selectedPayslip.employee.designation.name : 'Unassigned'}</span></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Bank Name</span> <span className="font-bold text-slate-700">{selectedPayslip.employee?.bank_name || '—'}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Account No</span> <span className="font-mono font-bold text-slate-700">{selectedPayslip.employee?.bank_account_no || '—'}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">IFSC Code</span> <span className="font-mono font-bold text-slate-700">{selectedPayslip.employee?.bank_ifsc || '—'}</span></div>
                                            <div className="flex"><span className="w-32 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">Joining Date</span> <span className="font-bold text-slate-700">{selectedPayslip.employee?.joining_date}</span></div>
                                        </div>
                                    </div>

                                    {/* Attendance summary card */}
                                    <div className="grid grid-cols-4 gap-4 text-center text-[12px] p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Days</span><span className="font-bold text-slate-800 mt-0.5">{selectedPayslip.total_days}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Days Worked</span><span className="font-bold text-slate-800 mt-0.5">{selectedPayslip.present_days}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">LOP Leaves</span><span className="font-bold text-rose-600 mt-0.5">{selectedPayslip.lop_days}</span></div>
                                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Absences</span><span className="font-bold text-rose-600 mt-0.5">{selectedPayslip.absent_days}</span></div>
                                    </div>

                                    {/* Earnings vs Deductions Table */}
                                    <div className="grid grid-cols-2 gap-8 text-[12px]">
                                        {/* Earnings */}
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Earnings Details</div>
                                            <div className="p-4 space-y-2 flex-1">
                                                <div className="flex justify-between"><span>Basic Wage</span><span className="font-mono">₹{parseFloat(selectedPayslip.basic_salary).toLocaleString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Allowances</span><span className="font-mono">₹{parseFloat(selectedPayslip.allowances || 0).toLocaleString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Overtime</span><span className="font-mono">₹{parseFloat(selectedPayslip.overtime_amount || 0).toLocaleString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Bonus / Incentive</span><span className="font-mono">₹{parseFloat(selectedPayslip.bonus || 0).toLocaleString('en-IN')}</span></div>
                                            </div>
                                            <div className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-200 flex justify-between font-extrabold">
                                                <span>Total Earnings</span>
                                                <span className="font-mono">
                                                    ₹{parseFloat(
                                                        parseFloat(selectedPayslip.salary_type === 'monthly' ? selectedPayslip.basic_salary : (selectedPayslip.present_days * selectedPayslip.basic_salary)) +
                                                        parseFloat(selectedPayslip.allowances || 0) +
                                                        parseFloat(selectedPayslip.overtime_amount || 0) +
                                                        parseFloat(selectedPayslip.bonus || 0)
                                                    ).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Deductions */}
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">Deductions Details</div>
                                            <div className="p-4 space-y-2 flex-1">
                                                <div className="flex justify-between"><span>Loss of Pay (LOP)</span><span className="font-mono">₹{parseFloat(selectedPayslip.lop_deduction || 0).toLocaleString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Other Deductions</span><span className="font-mono">₹{parseFloat(selectedPayslip.other_deductions || 0).toLocaleString('en-IN')}</span></div>
                                            </div>
                                            <div className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-200 flex justify-between font-extrabold">
                                                <span>Total Deductions</span>
                                                <span className="font-mono text-rose-600">
                                                    ₹{parseFloat(
                                                        parseFloat(selectedPayslip.lop_deduction || 0) +
                                                        parseFloat(selectedPayslip.other_deductions || 0)
                                                    ).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gross Net Value box */}
                                    <div className="bg-indigo-600 text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-lg shadow-indigo-600/10">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Net Wage Payable</span>
                                            <h1 className="text-3xl font-black tracking-tight leading-none">₹{parseFloat(selectedPayslip.net_salary).toLocaleString('en-IN')}</h1>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Payment Status</p>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-lg text-xs font-black uppercase tracking-widest mt-1">
                                                <Check size={12} strokeWidth={3} />
                                                <span>{selectedPayslip.status}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Audit Information Block */}
                                    <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider border-t border-dashed pt-4">
                                        <div>Processed Date: <span className="font-mono text-slate-600">{selectedPayslip.processed_at ? new Date(selectedPayslip.processed_at).toLocaleString() : '—'}</span></div>
                                        <div>Processed By: <span className="text-slate-600">{selectedPayslip.processed_by_name || 'Admin'}</span></div>
                                    </div>
                                </div>

                                {/* Printable signature footer */}
                                <div className="flex justify-between items-end border-t border-slate-100 pt-6 text-[12px] font-bold text-slate-500">
                                    <div className="flex flex-col">
                                        <span className="italic">Standard electronic pay slip.</span>
                                        <span className="text-slate-400 mt-1">System timestamp: {new Date().toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-right space-y-4">
                                        <div className="h-10"></div> {/* Space for signature */}
                                        <div className="flex flex-col border-t-2 border-slate-200 pt-2 w-48">
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Authorized Signatory</span>
                                            <span className="text-[9px] text-slate-400 uppercase mt-0.5">{companyDetails.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SlideOver Form: Add/Edit Employee */}
            <SlideOver
                isOpen={openEmployeeForm}
                onClose={() => {
                    setOpenEmployeeForm(false);
                    setEmployeeForm(emptyEmployeeForm);
                }}
                title={editingEmployeeId ? 'Edit Employee Details' : 'Register New Employee'}
                size="xl"
                footer={
                    <div className="flex justify-end items-center w-full px-2 gap-3">
                        <button 
                            type="button"
                            onClick={() => {
                                setOpenEmployeeForm(false);
                                setEmployeeForm(emptyEmployeeForm);
                            }} 
                            className="px-6 py-2.5 text-[14px] font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="employee-form"
                            className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <Save size={18} />
                            <span>{editingEmployeeId ? 'Save Changes' : 'Register Employee'}</span>
                        </button>
                    </div>
                }
            >
                <form id="employee-form" onSubmit={handleSaveEmployee} className="space-y-8 text-[12px] font-bold text-slate-700">
                    {/* Block 1: Profile details */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 flex items-center gap-1.5"><User size={14}/> Staff Profile</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Employee Name *</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="e.g. John Doe"
                                    value={employeeForm.name}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Employee Code (Optional)</label>
                                <input 
                                    type="text" 
                                    disabled={!!editingEmployeeId}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white disabled:opacity-50" 
                                    placeholder="Leave blank for auto-generation"
                                    value={employeeForm.employee_id}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, employee_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number *</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="98765 XXXXX"
                                    value={employeeForm.mobile}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, mobile: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address *</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="john.doe@jcontrol.com"
                                    value={employeeForm.email}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Block 2: Assignment & Wages */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 flex items-center gap-1.5"><Building2 size={14}/> Assignment & Salary Structure</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Corporate Department</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white appearance-none"
                                    value={employeeForm.department_id}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, department_id: e.target.value })}
                                >
                                    <option value="">Unassigned</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Staff Designation</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white appearance-none"
                                    value={employeeForm.designation_id}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation_id: e.target.value })}
                                >
                                    <option value="">Unassigned</option>
                                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date of Joining</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    value={employeeForm.joining_date}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, joining_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white appearance-none"
                                    value={employeeForm.status}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Salary Payout Type</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white appearance-none"
                                    value={employeeForm.salary_type}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, salary_type: e.target.value })}
                                >
                                    <option value="monthly">Monthly Salary Structure</option>
                                    <option value="daily">Daily Wage Rate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Basic Salary amount *</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="₹ e.g. 50000"
                                    value={employeeForm.basic_salary}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Block 3: Bank Details */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 flex items-center gap-1.5"><Wallet size={14}/> Treasury Bank Details (Optional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bank Name</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="State Bank of India..."
                                    value={employeeForm.bank_name}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bank Account Number</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="54321XXXX..."
                                    value={employeeForm.bank_account_no}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_no: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">IFSC Routing Code</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white font-mono uppercase" 
                                    placeholder="SBINXXXX..."
                                    value={employeeForm.bank_ifsc}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_ifsc: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Branch Location</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm transition-all focus:bg-white" 
                                    placeholder="MG Road, Bangalore..."
                                    value={employeeForm.bank_branch}
                                    onChange={(e) => setEmployeeForm({ ...employeeForm, bank_branch: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </SlideOver>

            {/* Modal: Apply Leave */}
            {openApplyLeaveModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 max-w-lg w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-[14px] font-black uppercase text-slate-900 tracking-wider">Apply Leave Absence</h3>
                                <p className="text-[10px] text-slate-400 font-extrabold tracking-widest mt-1 uppercase">Allocations checklist active</p>
                            </div>
                            <button 
                                onClick={() => setOpenApplyLeaveModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleApplyLeave} className="space-y-5 text-[12px] font-bold text-slate-700">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Employee *</label>
                                <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 appearance-none focus:bg-white"
                                    value={applyLeaveForm.employee_id}
                                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, employee_id: e.target.value })}
                                >
                                    <option value="">Choose employee...</option>
                                    {employees.filter(e => e.status === 'active').map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Leave Type *</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 appearance-none focus:bg-white"
                                        value={applyLeaveForm.leave_type}
                                        onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, leave_type: e.target.value })}
                                    >
                                        {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    {/* Standard balance display preview for selected */}
                                    {applyLeaveForm.employee_id && applyLeaveForm.leave_type !== 'lop' && (
                                        <div className="flex flex-col bg-indigo-50 rounded-xl p-2.5 border border-indigo-100 items-center justify-center h-full mt-2.5">
                                            <span className="text-[9px] text-indigo-400 font-extrabold uppercase">Balance left</span>
                                            <span className="text-[14px] font-black text-indigo-700">
                                                {(() => {
                                                    const bal = leaveBalances.find(b => b.employee_id == applyLeaveForm.employee_id);
                                                    return bal ? bal[`${applyLeaveForm.leave_type}_leave`] : '12.0';
                                                })()} Days
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Start Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white"
                                        value={applyLeaveForm.start_date}
                                        onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">End Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white"
                                        value={applyLeaveForm.end_date}
                                        onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reason for Absence *</label>
                                <textarea 
                                    required
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 outline-none focus:border-indigo-500 resize-none focus:bg-white"
                                    placeholder="Write application justification here..."
                                    value={applyLeaveForm.reason}
                                    onChange={(e) => setApplyLeaveForm({ ...applyLeaveForm, reason: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition-all mt-4"
                            >
                                Submit Request
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
