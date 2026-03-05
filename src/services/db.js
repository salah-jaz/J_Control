// Initial Mock Data
const initialCustomers = [
    { id: '1', name: 'TechSolutions Inc', email: 'contact@techsolutions.com', phone: '+1 (555) 123-4567', status: 'Active' },
    { id: '2', name: 'Global Corp', email: 'info@globalcorp.com', phone: '+1 (555) 987-6543', status: 'Active' },
    { id: '3', name: 'StartUp verify', email: 'hello@startupverify.io', phone: '+1 (555) 456-7890', status: 'Inactive' },
];

const initialInvoices = [
    { id: 'INV-001', clientId: '1', clientName: 'TechSolutions Inc', date: '2024-03-10', amount: 1500.00, status: 'Paid' },
    { id: 'INV-002', clientId: '2', clientName: 'Global Corp', date: '2024-03-12', amount: 3200.50, status: 'Pending' },
    { id: 'INV-003', clientId: '1', clientName: 'TechSolutions Inc', date: '2024-03-15', amount: 850.00, status: 'Pending' },
    { id: 'INV-004', clientId: '3', clientName: 'StartUp verify', date: '2024-03-01', amount: 1200.00, status: 'Overdue' },
];

const initialLeads = [
    { id: 'LEAD-2025-001', firstName: 'test', lastName: 'test', email: 'testg@gmidd.com', phone: '', company: '', jobTitle: '', status: 'New', source: 'Website', priority: 'Medium', score: 0, value: 0, assignedTo: 'Unassigned', qualified: false, notes: '' },
    { id: 'LEAD-2025-001', firstName: 'test', lastName: 'test', email: 'testg@gmidd.com', phone: '', company: '', jobTitle: '', status: 'New', source: 'Website', priority: 'Medium', score: 0, value: 0, assignedTo: 'Unassigned', qualified: false, notes: '' },
    { id: 'LEAD-2025-002', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '123-456-7890', company: 'Example Inc', jobTitle: 'CTO', status: 'Contacted', source: 'LinkedIn', priority: 'High', score: 85, value: 5000, assignedTo: 'Admin User', qualified: true, notes: 'Interested in enterprise plan' },
];

const initialAssignees = ['Admin User', 'John Doe'];


export const getCustomers = async () => {
    try {
        const response = await api.get('/customers');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return [];
    }
};

export const saveCustomer = async (customer) => {
    try {
        if (customer.id && !customer.id.toString().match(/^[0-9]+$/)) {
            // Logic for handling existing but 'locally created' IDs might be tricky if mixed. 
            // But assuming backend IDs are numeric and local are strings or different format 
            // IF we assume pure backend now:
            // WE rely on presence of ID to mean update. 
        }

        if (customer.id) {
            const response = await api.put(`/customers/${customer.id}`, customer);
            return response.data;
        } else {
            const response = await api.post('/customers', customer);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save customer:", error);
        throw error;
    }
};

export const deleteCustomer = async (id) => {
    try {
        await api.delete(`/customers/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete customer:", error);
        return false;
    }
}

export const getInvoices = async () => {
    try {
        const response = await api.get('/invoices');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch invoices:", error);
        return [];
    }
};

export const saveInvoice = async (invoice) => {
    try {
        if (invoice instanceof FormData) {
            const id = invoice.get('id');
            // If ID exists and assumes it is backend ID (not generic INV- logic for FD)
            if (id) {
                invoice.append('_method', 'PUT');
                const response = await api.post(`/invoices/${id}`, invoice, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return response.data;
            } else {
                const response = await api.post('/invoices', invoice, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return response.data;
            }
        }

        if (invoice.id && !invoice.id.toString().startsWith('INV-')) {
            const response = await api.put(`/invoices/${invoice.id}`, invoice);
            return response.data;
        } else {
            const response = await api.post('/invoices', invoice);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save invoice:", error);
        throw error;
    }
};

export const deleteInvoice = async (id) => {
    try {
        await api.delete(`/invoices/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete invoice:", error);
        return false;
    }
}


import api from '../api/axios';

// ... existing code ...

export const getLeads = async () => {
    try {
        const response = await api.get('/leads');
        return response.data.map(lead => {
            const latestNote = lead.lead_notes?.[0] || lead.leadNotes?.[0];
            return {
                ...lead,
                firstName: lead.first_name,
                lastName: lead.last_name,
                jobTitle: lead.job_title,
                assignedTo: lead.assigned_to,
                createdAt: lead.created_at,
                followUps: lead.follow_ups || lead.followUps || [],
                callLogs: lead.call_logs || lead.callLogs || [],
                notesCount: lead.lead_notes_count ?? lead.notesCount ?? 0,
                lastNote: latestNote ? { note: latestNote.note, noteType: latestNote.note_type, createdAt: latestNote.created_at } : null,
            };
        });
    } catch (error) {
        console.error("Failed to fetch leads:", error);
        return [];
    }
};

export const saveLead = async (lead) => {
    try {
        const payload = {
            ...lead,
            first_name: lead.firstName,
            last_name: lead.lastName,
            job_title: lead.jobTitle,
            assigned_to: lead.assignedTo,
        };

        if (lead.id && !lead.id.toString().startsWith('LEAD-')) {
            // Update existing
            const response = await api.put(`/leads/${lead.id}`, payload);
            const data = response.data;
            return {
                ...data,
                firstName: data.first_name,
                lastName: data.last_name,
                jobTitle: data.job_title,
                assignedTo: data.assigned_to,
                createdAt: data.created_at
            };
        } else {
            // Create new
            const response = await api.post('/leads', payload);
            const data = response.data;
            return {
                ...data,
                firstName: data.first_name,
                lastName: data.last_name,
                jobTitle: data.job_title,
                assignedTo: data.assigned_to,
                createdAt: data.created_at
            };
        }
    } catch (error) {
        console.error("Failed to save lead:", error);
        throw error;
    }
};

export const deleteLead = async (id) => {
    try {
        await api.delete(`/leads/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete lead:", error);
        return false;
    }
};

const mapNote = (n) => ({
    ...n,
    id: n.id,
    leadId: n.lead_id,
    note: n.note,
    noteType: n.note_type,
    followUpDate: n.follow_up_date,
    reminder: n.reminder,
    createdBy: n.created_by,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
});

export const getLeadNotes = async (leadId) => {
    try {
        const response = await api.get(`/leads/${leadId}/notes`);
        const data = Array.isArray(response.data) ? response.data : [];
        return data.map(mapNote);
    } catch (error) {
        console.error("Failed to fetch lead notes:", error);
        return [];
    }
};

export const createLeadNote = async (leadId, payload) => {
    try {
        const response = await api.post(`/leads/${leadId}/notes`, {
            note: payload.note,
            note_type: payload.noteType || 'General Note',
            follow_up_date: payload.followUpDate || null,
            reminder: payload.reminder ?? false,
        });
        return mapNote(response.data);
    } catch (error) {
        console.error("Failed to create lead note:", error);
        throw error;
    }
};

export const updateLeadNote = async (noteId, payload) => {
    try {
        const response = await api.put(`/notes/${noteId}`, {
            note: payload.note,
            note_type: payload.noteType,
            follow_up_date: payload.followUpDate || null,
            reminder: payload.reminder,
        });
        return mapNote(response.data);
    } catch (error) {
        console.error("Failed to update lead note:", error);
        throw error;
    }
};

export const deleteLeadNote = async (noteId) => {
    try {
        await api.delete(`/notes/${noteId}`);
        return true;
    } catch (error) {
        console.error("Failed to delete lead note:", error);
        return false;
    }
};

export const getAssignees = () => {
    const stored = localStorage.getItem('assignees');
    if (!stored) {
        localStorage.setItem('assignees', JSON.stringify(initialAssignees));
        return initialAssignees;
    }
    return JSON.parse(stored);
};

export const saveAssignee = (name) => {
    const assignees = getAssignees();
    if (!assignees.includes(name)) {
        assignees.push(name);
        localStorage.setItem('assignees', JSON.stringify(assignees));
    }
    return assignees;
};


export const getDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard-stats');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        return {
            totalClients: 0,
            activeClients: 0,
            totalInvoices: 0,
            totalRevenue: 0,
            pendingAmount: 0,
            recentInvoices: []
        };
    }
};

export const getPlannerStats = async () => {
    try {
        const response = await api.get('/planner/stats');
        return response.data || {
            total_events: 0,
            today_events: 0,
            completed_events: 0,
            upcoming_events: 0,
            cancelled_events: 0,
        };
    } catch (error) {
        console.error("Failed to fetch planner stats:", error);
        return {
            total_events: 0,
            today_events: 0,
            completed_events: 0,
            upcoming_events: 0,
            cancelled_events: 0,
        };
    }
};


export const getFollowUps = async (params) => {
    try {
        const response = await api.get('/follow-ups', { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch follow-ups:", error);
        return [];
    }
};

export const saveFollowUp = async (followUp) => {
    try {
        if (followUp.id) {
            const response = await api.put(`/follow-ups/${followUp.id}`, followUp);
            return response.data;
        } else {
            const response = await api.post('/follow-ups', followUp);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save follow-up:", error);
        throw error;
    }
};

export const saveCallLog = async (callLog) => {
    try {
        const response = await api.post('/call-logs', callLog);
        return response.data;
    } catch (error) {
        console.error("Failed to save call log:", error);
        throw error;
    }
};

export const deleteFollowUp = async (id) => {
    try {
        await api.delete(`/follow-ups/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete follow-up:", error);
        return false;
    }
};

export const getPlannerEvents = async (params = {}) => {
    try {
        const response = await api.get('/planner-events', { params });
        const body = response.data;
        if (Array.isArray(body)) {
            return body;
        }
        if (body && Array.isArray(body.data)) {
            return body.data;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch planner events:", error);
        return [];
    }
};

export const getTodayPlannerEvents = async () => {
    try {
        const response = await api.get('/planner-events/today');
        const body = response.data;
        if (Array.isArray(body)) {
            return body;
        }
        if (body && Array.isArray(body.data)) {
            return body.data;
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch today's planner events:", error);
        return [];
    }
};

export const savePlannerEvent = async (event) => {
    try {
        // Support FormData for file uploads
        if (event instanceof FormData) {
            const id = event.get('id');
            if (id) {
                event.append('_method', 'PUT');
                const response = await api.post(`/planner-events/${id}`, event, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const body = response.data;
                return body && body.data ? body.data : body;
            } else {
                const response = await api.post('/planner-events', event, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const body = response.data;
                return body && body.data ? body.data : body;
            }
        }

        if (event.id) {
            const response = await api.put(`/planner-events/${event.id}`, event);
            const body = response.data;
            return body && body.data ? body.data : body;
        } else {
            const response = await api.post('/planner-events', event);
            const body = response.data;
            return body && body.data ? body.data : body;
        }
    } catch (error) {
        console.error("Failed to save planner event:", error);
        throw error;
    }
};

export const deletePlannerEvent = async (id) => {
    try {
        await api.delete(`/planner-events/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete planner event:", error);
        return false;
    }
};

export const completePlannerEvent = async (eventId, payload = {}) => {
    try {
        const response = await api.post(`/planner-events/complete/${eventId}`, payload);
        const body = response.data;
        return body && body.data ? body.data : body;
    } catch (error) {
        console.error("Failed to complete planner event:", error);
        throw error;
    }
};

export const reschedulePlannerEvent = async (eventId, payload) => {
    try {
        const response = await api.post(`/planner-events/reschedule/${eventId}`, payload);
        const body = response.data;
        return body && body.data ? body.data : body;
    } catch (error) {
        console.error("Failed to reschedule planner event:", error);
        throw error;
    }
};

export const createNextPlannerMeeting = async (sourceEventId, payload) => {
    try {
        const response = await api.post(`/planner-events/next-meeting/${sourceEventId}`, payload);
        const body = response.data;
        return body && body.data ? body.data : body;
    } catch (error) {
        console.error("Failed to create next planner meeting:", error);
        throw error;
    }
};

export const cancelPlannerEvent = async (eventId, payload = {}) => {
    try {
        const response = await api.post(`/planner-events/cancel/${eventId}`, payload);
        const body = response.data;
        return body && body.data ? body.data : body;
    } catch (error) {
        console.error("Failed to cancel planner event:", error);
        throw error;
    }
};

export const getPlannerNotes = async (params = {}) => {
    try {
        const response = await api.get('/planner-notes', { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch planner notes:", error);
        return [];
    }
};

export const savePlannerNote = async (note) => {
    try {
        if (note.id) {
            const response = await api.put(`/planner-notes/${note.id}`, note);
            return response.data;
        } else {
            const response = await api.post('/planner-notes', note);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save planner note:", error);
        throw error;
    }
};

export const deletePlannerNote = async (id) => {
    try {
        await api.delete(`/planner-notes/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete planner note:", error);
        return false;
    }
};

/**
 * @param {Object} [filters] - Optional: { search, status, gstType, location, dateRange, dateFrom, dateTo }
 */
export const getClients = async (filters = {}) => {
    try {
        const params = {};
        if (filters.search != null && String(filters.search).trim() !== '') params.search = filters.search.trim();
        if (filters.status != null && filters.status !== '') params.status = filters.status;
        if (filters.gstType != null && filters.gstType !== '') params.gstType = filters.gstType;
        if (filters.location != null && filters.location !== '') params.location = filters.location;
        if (filters.dateRange != null && filters.dateRange !== '') params.dateRange = filters.dateRange;
        if (filters.dateFrom != null && filters.dateFrom !== '') params.dateFrom = filters.dateFrom;
        if (filters.dateTo != null && filters.dateTo !== '') params.dateTo = filters.dateTo;
        const response = await api.get('/clients', { params });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return [];
    }
};

export const getClientLocations = async () => {
    try {
        const response = await api.get('/clients', { params: { locations_only: 1 } });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("Failed to fetch client locations:", error);
        return [];
    }
};

export const saveClient = async (client) => {
    try {
        if (client.id) {
            const response = await api.put(`/clients/${client.id}`, client);
            return response.data;
        } else {
            const response = await api.post('/clients', client);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save client:", error);
        throw error;
    }
};

export const deleteClient = async (id) => {
    try {
        await api.delete(`/clients/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete client:", error);
        return false;
    }
};

export const getReportsSummary = async (filters) => {
    try {
        const response = await api.get('/reports/summary', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch reports summary:", error);
        return { totalIncome: 0, totalExpense: 0, netProfit: 0, closingBalance: 0 };
    }
};

export const getReportDetails = async (type, filters) => {
    try {
        const response = await api.get('/reports/details', { params: { type, ...filters } });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch report details:", error);
        return [];
    }
};

export const getReportFilters = async () => {
    try {
        const response = await api.get('/reports/filters');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch report filters:", error);
        return { companies: [], accounts: [], categories: [] };
    }
};

export const getUsers = async () => {
    try {
        const response = await api.get('/users');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
};

export const saveUser = async (user) => {
    try {
        if (user.id) {
            const response = await api.put(`/users/${user.id}`, user);
            return response.data;
        } else {
            const response = await api.post('/users', user);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to save user:", error);
        throw error;
    }
};

export const deleteUser = async (id) => {
    try {
        await api.delete(`/users/${id}`);
        return true;
    } catch (error) {
        console.error("Failed to delete user:", error);
        return false;
    }
};

export const getSettings = async () => {
    try {
        const response = await api.get('/settings');
        return response.data;
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
};
