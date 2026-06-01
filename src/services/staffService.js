import api from "../api/axios";

const staffService = {
    // 1. Departments CRUD
    getDepartments: () => api.get("/departments").then(res => res.data),
    createDepartment: (data) => api.post("/departments", data).then(res => res.data),
    updateDepartment: (id, data) => api.put(`/departments/${id}`, data).then(res => res.data),
    deleteDepartment: (id) => api.delete(`/departments/${id}`).then(res => res.data),

    // 2. Designations CRUD
    getDesignations: () => api.get("/designations").then(res => res.data),
    createDesignation: (data) => api.post("/designations", data).then(res => res.data),
    updateDesignation: (id, data) => api.put(`/designations/${id}`, data).then(res => res.data),
    deleteDesignation: (id) => api.delete(`/designations/${id}`).then(res => res.data),

    // 3. Employees CRUD
    getEmployees: (params) => api.get("/employees", { params }).then(res => res.data),
    getEmployee: (id) => api.get(`/employees/${id}`).then(res => res.data),
    createEmployee: (data) => api.post("/employees", data).then(res => res.data),
    updateEmployee: (id, data) => api.put(`/employees/${id}`, data).then(res => res.data),
    deleteEmployee: (id) => api.delete(`/employees/${id}`).then(res => res.data),

    // 4. Attendance APIs
    getAttendances: (date) => api.get("/attendances", { params: { date } }).then(res => res.data),
    saveAttendance: (date, records) => api.post("/attendances/save", { date, records }).then(res => res.data),
    getMonthlyAttendance: (month) => api.get("/attendances/monthly", { params: { month } }).then(res => res.data),

    // 5. Leave Management APIs
    getLeaves: (params) => api.get("/leaves", { params }).then(res => res.data),
    createLeave: (data) => api.post("/leaves", data).then(res => res.data),
    updateLeaveStatus: (id, status) => api.post(`/leaves/${id}/status`, { status }).then(res => res.data),
    getLeaveBalances: (year) => api.get("/leaves/balances", { params: { year } }).then(res => res.data),
    deleteLeave: (id) => api.delete(`/leaves/${id}`).then(res => res.data),

    // 6. Payroll Processing APIs
    calculatePayroll: (month) => api.get("/payrolls/calculate", { params: { month } }).then(res => res.data),
    processPayroll: (month, records) => api.post("/payrolls/process", { month, records }).then(res => res.data),
    reopenPayroll: (month) => api.post("/payrolls/reopen", { month }).then(res => res.data),
    getPayrollHistory: (params) => api.get("/payrolls/history", { params }).then(res => res.data),
    deletePayroll: (id) => api.delete(`/payrolls/${id}`).then(res => res.data),

    // 7. Dashboard stats
    getHrmsDashboardStats: (month) => api.get("/hrms-dashboard/stats", { params: { month } }).then(res => res.data),
};

export default staffService;
