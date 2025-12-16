// Initial Mock Data
const initialCustomers = [
    { id: '1', name: 'TechSolutions Inc', email: 'contact@techsolutions.com', phone: '+1 (555) 123-4567', status: 'Active' },
    { id: '2', name: 'Global Corp', email: 'info@globalcorp.com', phone: '+1 (555) 987-6543', status: 'Active' },
    { id: '3', name: 'StartUp verify', email: 'hello@startupverify.io', phone: '+1 (555) 456-7890', status: 'Inactive' },
];

const initialInvoices = [
    { id: 'INV-001', customerId: '1', customerName: 'TechSolutions Inc', date: '2024-03-10', amount: 1500.00, status: 'Paid' },
    { id: 'INV-002', customerId: '2', customerName: 'Global Corp', date: '2024-03-12', amount: 3200.50, status: 'Pending' },
    { id: 'INV-003', customerId: '1', customerName: 'TechSolutions Inc', date: '2024-03-15', amount: 850.00, status: 'Pending' },
    { id: 'INV-004', customerId: '3', customerName: 'StartUp verify', date: '2024-03-01', amount: 1200.00, status: 'Overdue' },
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
        return response.data.map(lead => ({
            ...lead,
            firstName: lead.first_name,
            lastName: lead.last_name,
            jobTitle: lead.job_title,
            assignedTo: lead.assigned_to,
            createdAt: lead.created_at
        }));
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
}

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
        const [customers, invoices] = await Promise.all([
            getCustomers(),
            getInvoices()
        ]);

        const totalRevenue = invoices
            .filter(i => i.status === 'Paid')
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);

        const pendingAmount = invoices
            .filter(i => i.status === 'Pending')
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);

        return {
            totalCustomers: customers.length,
            activeCustomers: customers.filter(c => c.status === 'Active').length,
            totalInvoices: invoices.length,
            totalRevenue,
            pendingAmount,
            recentInvoices: invoices.slice(0, 5) // Assuming API returns sorted, or sort here
        };
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        return {
            totalCustomers: 0,
            activeCustomers: 0,
            totalInvoices: 0,
            totalRevenue: 0,
            pendingAmount: 0,
            recentInvoices: []
        };
    }
};

