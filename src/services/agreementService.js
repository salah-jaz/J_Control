import api, { getApiOrigin } from '../api/axios';

const resolveAttachmentUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const origin = getApiOrigin();
    return `${origin}/storage/${path.replace(/^\/+/, '')}`;
};

const appendFormFields = (formData, data) => {
    formData.append('title', data.title ?? '');
    formData.append('client_id', String(data.client_id ?? ''));
    formData.append('date', data.date ?? '');
    formData.append('status', data.status ?? 'Draft');
    formData.append('tagline', data.tagline ?? '');
    formData.append('override_company_name', data.override_company_name ?? '');
    formData.append('notes', data.notes ?? '');

    if (data.agreement_no) {
        formData.append('agreement_no', data.agreement_no);
    }
    if (data.company_logo) {
        formData.append('company_logo', data.company_logo);
    }
    if (data.quotation_id) {
        formData.append('quotation_id', String(data.quotation_id));
    }

    formData.append('content', JSON.stringify(Array.isArray(data.content) ? data.content : []));
};

const agreementService = {
    getAll: (params) => api.get('/agreements', { params }),
    get: (id) => api.get(`/agreements/${id}`),
    getNextNumber: () => api.get('/agreements/next-number'),

    create: (data) => {
        const formData = new FormData();
        appendFormFields(formData, data);
        if (data.attachmentFile instanceof File) {
            formData.append('attachment', data.attachmentFile);
        }
        return api.post('/agreements', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    update: (id, data) => {
        const formData = new FormData();
        appendFormFields(formData, data);
        if (data.attachmentFile instanceof File) {
            formData.append('attachment', data.attachmentFile);
        }
        if (data.remove_attachment) {
            formData.append('remove_attachment', '1');
        }
        formData.append('_method', 'PUT');
        return api.post(`/agreements/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    delete: (id) => api.delete(`/agreements/${id}`),

    resolveAttachmentUrl,
};

export default agreementService;
