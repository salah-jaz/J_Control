/**
 * Print Template Visual Builder: fields per module.
 * When module changes, Available Fields list updates; template variables use the prefix below.
 */
/** Modules available for print templates (Orders & Purchases excluded). */
export const MODULES = [
  { value: 'invoices', label: 'Invoices', prefix: 'invoice' },
  { value: 'quotations', label: 'Quotations', prefix: 'quotation' },
  { value: 'agreements', label: 'Agreements', prefix: 'agreement' },
];

/** Section keys for full invoice layout (used by builder and buildFullTemplateHtml). */
export const TEMPLATE_SECTIONS = [
  'header',
  'customerLeft',
  'customerRight',
  'itemsTable',
  'totals',
  'bankDetails',
  'contactInfo',
  'signature',
  'footer',
];

/** Section keys for agreement layout. Single Body section for all agreement form content. */
export const AGREEMENT_TEMPLATE_SECTIONS = [
  'header',
  'partyDetailsProvider',
  'partyDetailsClient',
  'body',
  'signatureProvider',
  'signatureClient',
  'footer',
];

/** Fixed company header variables – wrappers always rendered so styles/layout stay intact when fields are removed in Builder. */
const AGREEMENT_HEADER_FIELDS = [
  { variable: 'company_logo' },
  { variable: 'company_name' },
  { variable: 'company_email' },
  { variable: 'company_phone' },
  { variable: 'company_address' },
];

/** Fixed provider variables – wrappers always rendered so styles/layout stay intact when fields are removed in Builder. */
const AGREEMENT_PROVIDER_FIELDS = [
  { variable: 'provider_name' },
  { variable: 'provider_email' },
  { variable: 'provider_phone' },
  { variable: 'provider_address' },
];

/** Default style configuration for agreement print templates (template.styles). */
export const DEFAULT_AGREEMENT_STYLES = {
  fontFamily: 'Arial, sans-serif',
  heading: {
    fontSize: '24px',
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: '12px',
  },
  subheading: {
    fontSize: '20px',
    color: '#334155',
    fontWeight: '600',
    marginBottom: '8px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
    marginBottom: '10px',
  },
  bullets: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5',
    marginBottom: '10px',
  },
  terms: {
    fontSize: '13px',
    color: '#475569',
  },
  signature: {
    fontSize: '14px',
    color: '#1e293b',
    marginTop: '24px',
  },
  signatureLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  section: {
    marginBottom: '20px',
  },
  table: {
    fontSize: '14px',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    headerBackground: '#2563eb',
    headerColor: '#ffffff',
    cellPadding: '8px',
  },
  body: {
    maxWidth: '210mm',
    marginAlign: 'center',
  },
  companyLogo: {
    width: '120px',
    marginBottom: '10px',
    textAlign: 'left',
  },
  companyName: {
    fontSize: '20px',
    color: '#1e293b',
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: '4px',
  },
  companyEmail: {
    fontSize: '14px',
    color: '#475569',
    textAlign: 'left',
  },
  companyPhone: {
    fontSize: '14px',
    color: '#475569',
    textAlign: 'left',
  },
  companyAddress: {
    fontSize: '14px',
    color: '#475569',
    textAlign: 'left',
    lineHeight: '1.4',
  },
  providerName: {
    fontSize: '18px',
    color: '#1e293b',
    fontWeight: '600',
    alignment: 'left',
    marginBottom: '4px',
  },
  providerEmail: {
    fontSize: '14px',
    color: '#475569',
    alignment: 'left',
  },
  providerPhone: {
    fontSize: '14px',
    color: '#475569',
    alignment: 'left',
  },
  providerAddress: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.4',
    alignment: 'left',
  },
};

/** Print configuration: checkboxes for which fields to include in print/PDF. Each option maps to template variables. */
export const PRINT_CONFIG_OPTIONS = [
  { key: 'company_logo', label: 'Company Logo', variables: ['company_logo'] },
  { key: 'company_name', label: 'Company Name', variables: ['company_name'] },
  { key: 'company_address', label: 'Company Address', variables: ['company_address'] },
  { key: 'company_phone', label: 'Company Phone', variables: ['company_phone'] },
  { key: 'company_email', label: 'Company Email', variables: ['company_email'] },
  { key: 'document_number', label: 'Invoice / Quotation Number', variables: ['invoice_number', 'quotation_number'] },
  { key: 'date', label: 'Date', variables: ['date'] },
  { key: 'valid_until', label: 'Valid Until', variables: ['valid_until'] },
  { key: 'customer_name', label: 'Customer Name', variables: ['client_name'] },
  { key: 'customer_address', label: 'Customer Address', variables: ['customer_address'] },
  { key: 'customer_email', label: 'Customer Email', variables: ['customer_email'] },
  { key: 'customer_phone', label: 'Customer Phone', variables: ['customer_phone'] },
  { key: 'payment_status', label: 'Payment Status', variables: ['payment_status'] },
  { key: 'items_table', label: 'Items Table', variables: ['items_table'] },
  { key: 'subtotal', label: 'Subtotal', variables: ['subtotal'] },
  { key: 'discount', label: 'Discount', variables: ['discount'] },
  { key: 'tax', label: 'Tax', variables: ['tax_amount'] },
  { key: 'total_amount', label: 'Total Amount', variables: ['grand_total', 'total'] },
  { key: 'paid_amount', label: 'Paid Amount', variables: ['paid_amount'] },
  { key: 'balance_due', label: 'Balance Due', variables: ['balance_due'] },
  { key: 'bank_details', label: 'Bank Details', variables: ['bank_name', 'bank_account_number', 'ifsc_code'] },
  { key: 'signature', label: 'Signature', variables: ['authorized_signature'] },
  { key: 'terms_and_conditions', label: 'Terms and Conditions', variables: ['terms_and_conditions'] },
];

/** Get all option keys (for "all selected" default). */
export function getDefaultPrintConfigKeys() {
  return PRINT_CONFIG_OPTIONS.map((o) => o.key);
}

/** Expand selected option keys to set of template variable names. */
export function selectedOptionsToVariables(selectedOptionKeys) {
  const set = new Set();
  PRINT_CONFIG_OPTIONS.forEach((opt) => {
    if (selectedOptionKeys.includes(opt.key)) opt.variables.forEach((v) => set.add(v));
  });
  return set;
}

/** Filter template so only fields whose variable is in allowedVariables are included. */
export function filterTemplateByPrintConfig(template, selectedOptionKeys) {
  if (!template || !selectedOptionKeys || selectedOptionKeys.length === 0) return template;
  const allowed = selectedOptionsToVariables(selectedOptionKeys);
  const filter = (items) => (Array.isArray(items) ? items.filter((item) => item && allowed.has(item.variable)) : []);
  const sectionKeys = [...TEMPLATE_SECTIONS, 'body'];
  const out = {};
  sectionKeys.forEach((key) => {
    out[key] = filter(template[key]);
  });
  return out;
}

const PRINT_CONFIG_STORAGE_PREFIX = 'print_config_';
export function getStoredPrintConfig(moduleKey) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRINT_CONFIG_STORAGE_PREFIX + moduleKey) : null;
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}
export function setStoredPrintConfig(moduleKey, selectedKeys) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRINT_CONFIG_STORAGE_PREFIX + moduleKey, JSON.stringify(selectedKeys));
    }
  } catch (_) {}
}

export const MODULE_FIELDS = {
  invoices: [
    // Header / Company
    { id: 'company_logo', label: 'Company Logo', variable: 'company_logo' },
    { id: 'company_name', label: 'Company Name', variable: 'company_name' },
    { id: 'company_address', label: 'Company Address', variable: 'company_address' },
    { id: 'company_phone', label: 'Company Phone', variable: 'company_phone' },
    { id: 'company_email', label: 'Company Email', variable: 'company_email' },
    { id: 'invoice_id', label: 'Invoice ID', variable: 'invoice_number' },
    { id: 'invoice_date', label: 'Invoice Date', variable: 'date' },
    // Customer (Invoice To)
    { id: 'customer_name', label: 'Customer Name', variable: 'client_name' },
    { id: 'customer_address', label: 'Customer Address', variable: 'customer_address' },
    { id: 'customer_email', label: 'Customer Email', variable: 'customer_email' },
    { id: 'customer_phone', label: 'Customer Phone', variable: 'customer_phone' },
    // Payment & Totals
    { id: 'payment_status', label: 'Payment Status', variable: 'payment_status' },
    { id: 'subtotal', label: 'Subtotal', variable: 'subtotal' },
    { id: 'discount', label: 'Discount', variable: 'discount' },
    { id: 'tax', label: 'Tax', variable: 'tax_amount' },
    { id: 'total_amount', label: 'Total Amount', variable: 'grand_total' },
    { id: 'paid_amount', label: 'Paid Amount', variable: 'paid_amount' },
    { id: 'balance_due', label: 'Balance Due', variable: 'balance_due' },
    // Items
    { id: 'items_table', label: 'Items Table', variable: 'items_table' },
    // Bank
    { id: 'bank_name', label: 'Bank Name', variable: 'bank_name' },
    { id: 'bank_account_number', label: 'Bank Account Number', variable: 'bank_account_number' },
    { id: 'ifsc_code', label: 'IFSC Code', variable: 'ifsc_code' },
    // Signature & Footer
    { id: 'authorized_signature', label: 'Authorized Signature', variable: 'authorized_signature' },
    { id: 'terms_and_conditions', label: 'Terms and Conditions', variable: 'terms_and_conditions' },
  ],
  quotations: [
    { id: 'company_logo', label: 'Company Logo', variable: 'company_logo' },
    { id: 'company_name', label: 'Company Name', variable: 'company_name' },
    { id: 'company_address', label: 'Company Address', variable: 'company_address' },
    { id: 'company_phone', label: 'Company Phone', variable: 'company_phone' },
    { id: 'company_email', label: 'Company Email', variable: 'company_email' },
    { id: 'quotation_id', label: 'Quotation ID', variable: 'quotation_number' },
    { id: 'quotation_date', label: 'Quotation Date', variable: 'date' },
    { id: 'valid_until', label: 'Valid Until', variable: 'valid_until' },
    { id: 'client_name', label: 'Client Name', variable: 'client_name' },
    { id: 'customer_address', label: 'Customer Address', variable: 'customer_address' },
    { id: 'customer_email', label: 'Customer Email', variable: 'customer_email' },
    { id: 'items_table', label: 'Items Table', variable: 'items_table' },
    { id: 'total_amount', label: 'Total Amount', variable: 'total' },
    { id: 'terms_and_conditions', label: 'Terms and Conditions', variable: 'terms_and_conditions' },
  ],
  orders: [
    { id: 'order_id', label: 'Order ID', variable: 'order_number' },
    { id: 'order_date', label: 'Order Date', variable: 'date' },
    { id: 'order_status', label: 'Order Status', variable: 'status' },
    { id: 'client_name', label: 'Client Name', variable: 'client_name' },
    { id: 'client_mobile', label: 'Client Mobile', variable: 'client_mobile' },
    { id: 'total_amount', label: 'Total Amount', variable: 'total' },
  ],
  purchases: [
    { id: 'purchase_id', label: 'Purchase ID', variable: 'purchase_number' },
    { id: 'purchase_date', label: 'Purchase Date', variable: 'date' },
    { id: 'supplier_name', label: 'Supplier Name', variable: 'supplier_name' },
    { id: 'supplier_phone', label: 'Supplier Phone', variable: 'supplier_phone' },
    { id: 'total_amount', label: 'Total Amount', variable: 'total' },
  ],
  agreements: [
    // Header
    { id: 'company_logo', label: 'Company Logo', variable: 'company_logo' },
    { id: 'company_name', label: 'Company Name', variable: 'company_name' },
    { id: 'company_address', label: 'Company Address', variable: 'company_address' },
    { id: 'agreement_title', label: 'Agreement Title', variable: 'agreement_title' },
    { id: 'agreement_reference_number', label: 'Agreement Reference Number', variable: 'agreement_reference_number' },
    { id: 'agreement_date', label: 'Agreement Date', variable: 'agreement_date' },
    // Party Details - Service Provider
    { id: 'provider_name', label: 'Provider Name', variable: 'provider_name' },
    { id: 'provider_address', label: 'Provider Address', variable: 'provider_address' },
    { id: 'provider_email', label: 'Provider Email', variable: 'provider_email' },
    { id: 'provider_phone', label: 'Provider Phone', variable: 'provider_phone' },
    // Party Details - Client
    { id: 'client_name', label: 'Client Name', variable: 'client_name' },
    { id: 'client_address', label: 'Client Address', variable: 'client_address' },
    { id: 'client_email', label: 'Client Email', variable: 'client_email' },
    { id: 'client_phone', label: 'Client Phone', variable: 'client_phone' },
    // Body (single section: full agreement content in form order – use this only)
    { id: 'agreement_content', label: 'Agreement Content', variable: 'agreement_content' },
    // Financial / Terms
    { id: 'total_amount', label: 'Total Amount', variable: 'total_amount' },
    { id: 'payment_terms', label: 'Payment Terms', variable: 'payment_terms' },
    { id: 'start_date', label: 'Start Date', variable: 'start_date' },
    { id: 'end_date', label: 'End Date', variable: 'end_date' },
    { id: 'agreement_terms_and_conditions', label: 'Agreement Terms & Conditions', variable: 'agreement_terms_and_conditions' },
    // Signature - Service Provider
    { id: 'provider_signature', label: 'Provider Signature Image', variable: 'provider_signature' },
    { id: 'provider_signature_name', label: 'Provider Name', variable: 'provider_signature_name' },
    { id: 'provider_signature_date', label: 'Provider Date', variable: 'provider_signature_date' },
    // Signature - Client
    { id: 'client_signature', label: 'Client Signature Image', variable: 'client_signature' },
    { id: 'client_signature_name', label: 'Client Name', variable: 'client_signature_name' },
    { id: 'client_signature_date', label: 'Client Date', variable: 'client_signature_date' },
    // Footer
    { id: 'company_footer_text', label: 'Company Footer Text', variable: 'company_footer_text' },
    { id: 'company_email', label: 'Company Email', variable: 'company_email' },
    { id: 'company_phone', label: 'Company Phone', variable: 'company_phone' },
    { id: 'company_website', label: 'Company Website', variable: 'company_website' },
    // Legacy / optional
    { id: 'company_gst_number', label: 'Company GST Number', variable: 'company_gst_number' },
    { id: 'document_title', label: 'Document Title', variable: 'document_title' },
    { id: 'created_date', label: 'Created Date', variable: 'created_date' },
    { id: 'created_by', label: 'Created By', variable: 'created_by' },
    { id: 'page_number', label: 'Page Number', variable: 'page_number' },
  ],
};

/** Minimal CSS for dynamic print layout – only styles used when HTML is built strictly from Builder fields. */
export const MINIMAL_PRINT_STYLES = `
  .print-doc-dynamic { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 16px; }
  .print-doc-dynamic .print-section { margin-bottom: 1rem; }
  .print-doc-dynamic .print-field { display: block; margin-bottom: 0.5rem; }
  .print-doc-dynamic .print-field:last-child { margin-bottom: 0; }
  @media print { .print-doc-dynamic { max-width: 100%; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

/** Shared CSS for print preview – full invoice layout (legacy; used only with custom template_html). */
export const PRINT_PREVIEW_STYLES = `
  .print-doc { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; max-width: 210mm; margin: 0 auto; padding: 0 16px; }
  .print-header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
  .print-header .header-left { flex: 1; min-width: 180px; }
  .print-header .header-right { text-align: right; }
  .print-header .doc-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
  .print-header .doc-meta { font-size: 13px; color: #64748b; display: block; margin-bottom: 2px; }
  .print-header .company-logo { max-height: 56px; max-width: 160px; margin-bottom: 8px; display: block; }
  .print-customer { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; }
  .print-customer .customer-block { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .print-customer .customer-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 8px 0; font-weight: 600; }
  .print-customer .field-row { margin-bottom: 6px; font-size: 13px; }
  .print-customer .field-label { color: #64748b; margin-right: 6px; }
  .print-items { margin: 24px 0; }
  .print-table { width: 100%; border-collapse: collapse; margin: 0; font-size: 13px; }
  .print-table th, .print-table td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
  .print-table th { background: #f1f5f9; font-weight: 600; color: #334155; font-size: 12px; }
  .print-table tr:nth-child(even) { background: #f8fafc; }
  .print-table .text-right { text-align: right; }
  .print-totals-wrap { display: flex; justify-content: flex-end; margin: 20px 0; }
  .print-totals { width: 280px; }
  .print-totals .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .print-totals .total-row.grand { font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: none; padding-top: 12px; margin-top: 4px; border-top: 2px solid #0f172a; }
  .print-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; align-items: start; }
  .print-bank { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .print-bank h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 8px 0; font-weight: 600; }
  .print-bank .field-row { margin-bottom: 6px; font-size: 13px; }
  .print-contact { font-size: 13px; color: #475569; }
  .print-contact .field-row { margin-bottom: 6px; }
  .print-signature { text-align: right; margin-top: 32px; }
  .print-signature .sig-label { font-size: 12px; color: #64748b; margin-top: 8px; }
  .print-signature .sig-image { max-height: 48px; max-width: 140px; margin-left: auto; display: block; }
  .print-footer { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; }
  .print-footer .footer-row { margin-bottom: 6px; }
  .print-section:empty { display: none !important; }
  .payment-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .payment-badge.paid { background: #dcfce7; color: #166534; }
  .payment-badge.pending { background: #fef3c7; color: #92400e; }
  .payment-badge.partial { background: #e0e7ff; color: #3730a3; }
  .print-doc-agreement .agreement-doc-body { margin: 20px 0; line-height: 1.6; }
  .print-doc-agreement .agreement-doc-body .field-row { margin-bottom: 12px; }
  .print-doc-agreement .agreement-doc-body .items-section { margin: 16px 0; }
  .print-doc-agreement .agreement-party { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; }
  .print-doc-agreement .agreement-party .party-block { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .print-doc-agreement .agreement-party .party-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 8px 0; font-weight: 600; }
  .print-doc-agreement .agreement-intro { margin: 20px 0; line-height: 1.6; }
  .print-doc-agreement .agreement-intro .agreement-heading { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
  .print-doc-agreement .agreement-intro .agreement-subheading { font-size: 14px; font-weight: 600; color: #334155; margin: 12px 0 4px 0; }
  .print-doc-agreement .agreement-content { margin: 20px 0; line-height: 1.6; }
  .print-doc-agreement .agreement-content .items-section { margin: 16px 0; }
  .print-doc-agreement .agreement-financial { margin: 20px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .print-doc-agreement .agreement-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; align-items: start; }
  .print-doc-agreement .agreement-signatures .sig-block { margin-top: 8px; }
  .print-doc-agreement .agreement-signatures .sig-image { max-height: 48px; max-width: 140px; display: block; margin-bottom: 4px; }
  .print-doc-agreement .agreement-signatures .sig-label { font-size: 12px; color: #64748b; }
`;

/** Warner & Spencer style: professional letterhead agreement – red badge, curved shapes, 800px doc. */
export const AGREEMENT_LETTERHEAD_CSS = `
  .letterhead-doc { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; max-width: 800px; margin: 0 auto; background: #fff; position: relative; padding: 0; min-height: 100vh; box-sizing: border-box; }
  .letterhead-doc * { box-sizing: border-box; }
  @media print { .letterhead-doc { max-width: 800px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .letterhead-curves { pointer-events: none; position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 0; overflow: hidden; }
  .letterhead-curve-top-red { position: absolute; top: -80px; right: -120px; width: 420px; height: 420px; border-radius: 50%; background: #b91c1c; z-index: 1; }
  .letterhead-curve-grey-1 { position: absolute; top: 100px; right: -60px; width: 380px; height: 200px; border-radius: 50% 50% 0 0; background: #e5e7eb; z-index: 2; }
  .letterhead-curve-grey-2 { position: absolute; top: 140px; right: -40px; width: 340px; height: 180px; border-radius: 50% 50% 0 0; background: #d1d5db; z-index: 3; }
  .letterhead-curve-grey-3 { position: absolute; top: 175px; right: -20px; width: 300px; height: 160px; border-radius: 50% 50% 0 0; background: #f3f4f6; z-index: 4; }
  .letterhead-curve-bottom-red { position: absolute; bottom: -80px; left: -120px; width: 420px; height: 420px; border-radius: 50%; background: #b91c1c; z-index: 1; }
  .letterhead-curve-grey-b1 { position: absolute; bottom: 100px; left: -60px; width: 380px; height: 200px; border-radius: 0 0 50% 50%; background: #e5e7eb; z-index: 2; }
  .letterhead-curve-grey-b2 { position: absolute; bottom: 140px; left: -40px; width: 340px; height: 180px; border-radius: 0 0 50% 50%; background: #d1d5db; z-index: 3; }
  .letterhead-curve-grey-b3 { position: absolute; bottom: 175px; left: -20px; width: 300px; height: 160px; border-radius: 0 0 50% 50%; background: #f3f4f6; z-index: 4; }
  .letterhead-inner { position: relative; z-index: 10; padding: 24px 40px 48px; }
  .letterhead-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  .letterhead-header:has(.letterhead-badge:only-child) .letterhead-badge { margin-right: auto; }
  .letterhead-header:has(.letterhead-contact:only-child) .letterhead-contact { margin-left: auto; }
  .letterhead-badge { background: #b91c1c; color: #fff; padding: 16px 20px; max-width: 220px; clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%); border-radius: 4px; }
  .letterhead-badge .letterhead-logo { max-height: 40px; max-width: 120px; display: block; margin-bottom: 6px; }
  .letterhead-badge .letterhead-company-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.3; }
  .letterhead-contact { text-align: right; font-size: 13px; color: #6b7280; }
  .letterhead-contact .letterhead-contact-row { margin-bottom: 8px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
  .letterhead-contact .letterhead-contact-row::before { content: ''; width: 12px; height: 12px; background: #b91c1c; border-radius: 50%; flex-shrink: 0; }
  .letterhead-body { margin: 28px 0; }
  .letterhead-recipient { margin-bottom: 24px; }
  .letterhead-recipient .letterhead-recipient-name { font-weight: 700; font-size: 15px; margin: 0 0 4px 0; }
  .letterhead-recipient .letterhead-recipient-address { margin: 0; color: #475569; white-space: pre-line; }
  .letterhead-greeting { font-weight: 700; margin: 0 0 16px 0; }
  .letterhead-body .letterhead-heading { font-size: 18px; font-weight: 700; color: #0f172a; margin: 24px 0 8px 0; }
  .letterhead-body .letterhead-subheading { font-size: 15px; font-weight: 600; color: #334155; margin: 12px 0 6px 0; }
  .letterhead-body .letterhead-paragraph { margin: 0 0 12px 0; }
  .letterhead-body .letterhead-bullets { margin: 12px 0; padding-left: 20px; white-space: pre-line; }
  .letterhead-body .letterhead-table-wrap { margin: 16px 0; overflow-x: auto; }
  .letterhead-body .letterhead-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .letterhead-body .letterhead-table-wrap th, .letterhead-body .letterhead-table-wrap td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
  .letterhead-body .letterhead-table-wrap th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .letterhead-signature { margin-top: 40px; }
  .letterhead-signature .letterhead-sig-label { font-size: 13px; margin: 0 0 8px 0; }
  .letterhead-signature .letterhead-sig-image { max-height: 52px; max-width: 160px; display: block; margin-bottom: 6px; }
  .letterhead-signature .letterhead-sig-name { font-weight: 700; font-size: 15px; margin: 0; }
  .print-section:empty { display: none !important; }
`;

/** Fixed letterhead HTML body for agreements (Warner & Spencer style). Uses {{agreement.xxx}} variables. Sections have .print-section for conditional hide when empty. */
function getAgreementLetterheadHtml(prefix = 'agreement') {
  return `<div class="letterhead-doc">
  <div class="letterhead-curves" aria-hidden="true">
    <div class="letterhead-curve-top-red"></div>
    <div class="letterhead-curve-grey-1"></div>
    <div class="letterhead-curve-grey-2"></div>
    <div class="letterhead-curve-grey-3"></div>
    <div class="letterhead-curve-bottom-red"></div>
    <div class="letterhead-curve-grey-b1"></div>
    <div class="letterhead-curve-grey-b2"></div>
    <div class="letterhead-curve-grey-b3"></div>
  </div>
  <div class="letterhead-inner">
    <header class="letterhead-header">
      <div class="letterhead-badge print-section">
        <div class="letterhead-logo">{{${prefix}.company_logo}}</div>
        <div class="letterhead-company-name">{{${prefix}.company_name}}</div>
      </div>
      <div class="letterhead-contact print-section">
        <div class="letterhead-contact-row">{{${prefix}.company_phone}}</div>
        <div class="letterhead-contact-row">{{${prefix}.company_email}}</div>
        <div class="letterhead-contact-row">{{${prefix}.company_address}}</div>
      </div>
    </header>
    <main class="letterhead-body">
      <div class="letterhead-recipient print-section">
        <p class="letterhead-recipient-name">{{${prefix}.client_name}}</p>
        <p class="letterhead-recipient-address">{{${prefix}.client_address}}</p>
      </div>
      <p class="letterhead-greeting">Greetings!</p>
      <div class="print-section"><h2 class="letterhead-heading">{{${prefix}.agreement_heading}}</h2></div>
      <div class="print-section"><h3 class="letterhead-subheading">{{${prefix}.agreement_subheading}}</h3></div>
      <div class="letterhead-paragraph print-section">{{${prefix}.agreement_paragraph}}</div>
      <div class="letterhead-bullets print-section">{{${prefix}.agreement_bullet_points}}</div>
      <div class="letterhead-table-wrap print-section">{{${prefix}.agreement_table}}</div>
    </main>
    <div class="letterhead-signature print-section">
      <p class="letterhead-sig-label">Sincerely,</p>
      <div class="letterhead-sig-image">{{${prefix}.signature}}</div>
      <p class="letterhead-sig-name">{{${prefix}.signature_name}}</p>
    </div>
  </div>
</div>`;
}

/** Full HTML for items table – columns: Item, Description, Qty, Unit Price, Total. */
const SAMPLE_ITEMS_TABLE_HTML = {
  invoice: `
<table class="print-table">
  <thead>
    <tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Consulting Service</td><td>Professional consulting</td><td>1</td><td class="text-right">₹10,000.00</td><td class="text-right">₹10,000.00</td></tr>
    <tr><td>2</td><td>Support Package</td><td>Annual support</td><td>1</td><td class="text-right">₹2,500.00</td><td class="text-right">₹2,500.00</td></tr>
    <tr><td>3</td><td>Implementation</td><td>Setup and training</td><td>2</td><td class="text-right">₹1,500.00</td><td class="text-right">₹3,000.00</td></tr>
  </tbody>
</table>`,
  quotation: `
<table class="print-table">
  <thead>
    <tr><th>#</th><th>Description</th><th>Qty</th><th class="text-right">Amount</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Item A - Deliverables</td><td>1</td><td class="text-right">₹15,000.00</td></tr>
    <tr><td>2</td><td>Item B - Support</td><td>2</td><td class="text-right">₹5,000.00</td></tr>
  </tbody>
</table>`,
  agreement: `
<table class="print-table">
  <thead>
    <tr><th>Term</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Scope of work as per quotation.</td></tr>
    <tr><td>2</td><td>Payment terms: 50% advance, 50% on completion.</td></tr>
    <tr><td>3</td><td>Warranty: 12 months from completion date.</td></tr>
  </tbody>
</table>`,
  order: `
<table class="print-table">
  <thead>
    <tr><th>#</th><th>Product</th><th>Qty</th><th class="text-right">Total</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Product X</td><td>2</td><td class="text-right">₹5,000.00</td></tr>
    <tr><td>2</td><td>Product Y</td><td>1</td><td class="text-right">₹3,500.00</td></tr>
  </tbody>
</table>`,
  purchase: `
<table class="print-table">
  <thead>
    <tr><th>#</th><th>Item</th><th>Qty</th><th class="text-right">Amount</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>Raw Material A</td><td>10</td><td class="text-right">₹15,000.00</td></tr>
    <tr><td>2</td><td>Supplies B</td><td>5</td><td class="text-right">₹10,000.00</td></tr>
  </tbody>
</table>`,
};

/** Sample data for preview per module (uses prefix as key). */
export function getSampleData(moduleKey) {
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  const tableHtml = SAMPLE_ITEMS_TABLE_HTML[prefix] || SAMPLE_ITEMS_TABLE_HTML.invoice;
  const agreementTableHtml = SAMPLE_ITEMS_TABLE_HTML.agreement || '';
  const samples = {
    invoice: {
      company_logo: '<div class="company-logo" style="height:56px;width:160px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b;font-weight:600">Company Logo</div>',
      company_name: 'J-Control Pvt Ltd',
      company_address: '123 Business Park, Sector 5\nMumbai, Maharashtra 400001',
      company_phone: '+91 22 1234 5678',
      company_email: 'billing@jcontrol.com',
      invoice_number: 'INV-2026-00001',
      date: '19 Feb 2026',
      client_name: 'ABC Pvt Ltd',
      customer_address: '456 Client Avenue, Andheri East\nMumbai 400069',
      customer_email: 'accounts@abcpvt.com',
      customer_phone: '+91 98765 43210',
      payment_status: '<span class="payment-badge partial">Partially Paid</span>',
      items_table: tableHtml,
      subtotal: '₹15,500.00',
      discount: '₹0.00',
      tax_amount: '₹1,800.00',
      grand_total: '₹17,300.00',
      paid_amount: '₹5,000.00',
      balance_due: '₹12,300.00',
      bank_name: 'HDFC Bank',
      bank_account_number: 'XXXX XXXX 1234',
      ifsc_code: 'HDFC0001234',
      authorized_signature: 'Authorized Signatory',
      terms_and_conditions: 'Payment due within 30 days. Please quote invoice number when paying.',
    },
    quotation: {
      company_logo: '<div class="company-logo" style="height:48px;width:120px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b">Logo</div>',
      company_name: 'J-Control Pvt Ltd',
      company_address: '123 Business Park, Mumbai 400001',
      company_phone: '+91 22 1234 5678',
      company_email: 'billing@jcontrol.com',
      quotation_number: 'QUO-2026-001',
      date: '19 Feb 2026',
      valid_until: '19 Mar 2026',
      client_name: 'XYZ Corp',
      customer_address: '456 Client Ave, Mumbai',
      customer_email: 'client@xyz.com',
      items_table: tableHtml,
      total: '₹15,000.00',
      terms_and_conditions: 'Valid for 30 days. Terms apply.',
    },
    order: {
      order_number: 'ORD-2026-001',
      date: '19 Feb 2026',
      status: 'Confirmed',
      client_name: 'John Doe',
      client_mobile: '+91 98765 43210',
      total: '₹8,500.00',
    },
    purchase: {
      purchase_number: 'PUR-2026-001',
      date: '19 Feb 2026',
      supplier_name: 'Supplier Ltd',
      supplier_phone: '+91 91234 56789',
      total: '₹25,000.00',
    },
    agreement: {
      company_logo: '<div class="company-logo" style="height:48px;width:120px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b">Logo</div>',
      company_name: 'J-Control Pvt Ltd',
      company_address: '123 Business Park, Mumbai 400001',
      agreement_title: 'Service Agreement',
      agreement_reference_number: 'AGR-2026-001',
      agreement_date: '19 Feb 2026',
      provider_name: 'J-Control Pvt Ltd',
      provider_address: '123 Business Park, Mumbai 400001',
      provider_email: 'billing@jcontrol.com',
      provider_phone: '+91 22 1234 5678',
      client_name: 'ABC Pvt Ltd',
      client_address: '456 Client Avenue, Mumbai 400069',
      client_email: 'accounts@abcpvt.com',
      client_phone: '+91 98765 43210',
      agreement_content: '<h2 class="agreement-heading">Service Agreement</h2><h3 class="agreement-subheading">1. Scope of Services</h3><p class="agreement-paragraph">This agreement sets out the terms under which the service provider will deliver the agreed scope of work. Both parties agree to comply with the conditions stated herein.</p><h3 class="agreement-subheading">2. Deliverables</h3><p class="agreement-paragraph">The provider shall deliver the services and deliverables as described in the attached quotation.</p><ul class="agreement-bullets"><li>Delivery within 30 days of advance payment</li><li>Installation and training included</li><li>12 months warranty on deliverables</li></ul><table class="print-table w-full border border-gray-300"><thead><tr><th class="border border-gray-300 px-2 py-1.5 text-left">Term</th><th class="border border-gray-300 px-2 py-1.5 text-left">Description</th></tr></thead><tbody><tr><td class="border border-gray-300 px-2 py-1.5">1</td><td class="border border-gray-300 px-2 py-1.5">Scope of work as per quotation.</td></tr><tr><td class="border border-gray-300 px-2 py-1.5">2</td><td class="border border-gray-300 px-2 py-1.5">Payment terms: 50% advance, 50% on completion.</td></tr><tr><td class="border border-gray-300 px-2 py-1.5">3</td><td class="border border-gray-300 px-2 py-1.5">Warranty: 12 months from completion date.</td></tr></tbody></table>',
      body_content: '<h2 class="agreement-heading">Service Agreement</h2><h3 class="agreement-subheading">1. Scope of Services</h3><p class="agreement-paragraph">This agreement sets out the terms under which the service provider will deliver the agreed scope of work. Both parties agree to comply with the conditions stated herein.</p><h3 class="agreement-subheading">2. Deliverables</h3><p class="agreement-paragraph">The provider shall deliver the services and deliverables as described in the attached quotation.</p><ul class="agreement-bullets"><li>Delivery within 30 days of advance payment</li><li>Installation and training included</li><li>12 months warranty on deliverables</li></ul><table class="print-table w-full border border-gray-300"><thead><tr><th class="border border-gray-300 px-2 py-1.5 text-left">Term</th><th class="border border-gray-300 px-2 py-1.5 text-left">Description</th></tr></thead><tbody><tr><td class="border border-gray-300 px-2 py-1.5">1</td><td class="border border-gray-300 px-2 py-1.5">Scope of work as per quotation.</td></tr><tr><td class="border border-gray-300 px-2 py-1.5">2</td><td class="border border-gray-300 px-2 py-1.5">Payment terms: 50% advance, 50% on completion.</td></tr><tr><td class="border border-gray-300 px-2 py-1.5">3</td><td class="border border-gray-300 px-2 py-1.5">Warranty: 12 months from completion date.</td></tr></tbody></table>',
      agreement_heading: 'Service Agreement',
      agreement_subheading: '1. Scope of Services',
      agreement_paragraph: 'This agreement sets out the terms under which the service provider will deliver the agreed scope of work. Both parties agree to comply with the conditions stated herein.',
      section_heading: '2. Deliverables',
      section_paragraph: 'The provider shall deliver the services and deliverables as described in the attached quotation.',
      agreement_bullet_points: '• Delivery within 30 days of advance payment\n• Installation and training included\n• 12 months warranty on deliverables',
      agreement_table: agreementTableHtml,
      total_amount: '₹50,000.00',
      payment_terms: '50% advance, 50% on completion',
      start_date: '01 Mar 2026',
      end_date: '31 May 2026',
      agreement_terms_and_conditions: 'Payment due within 30 days. Disputes to be resolved by mutual discussion. Governing law: India.',
      provider_signature: '<div class="sig-image" style="height:40px;width:120px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b">Signature</div>',
      provider_signature_name: 'John Smith',
      provider_signature_date: '19 Feb 2026',
      signature: '<div class="letterhead-sig-image" style="height:48px;width:140px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b">Signature</div>',
      signature_name: 'Neil Tran',
      client_signature: '<div class="sig-image" style="height:40px;width:120px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b">Signature</div>',
      client_signature_name: 'ABC Pvt Ltd',
      client_signature_date: '19 Feb 2026',
      company_footer_text: 'Thank you for your business.',
      company_email: 'billing@jcontrol.com',
      company_phone: '+91 22 1234 5678',
      company_website: 'www.jcontrol.com',
      company_gst_number: '27AABCJ1234A1Z5',
      document_title: 'Service Agreement',
      created_date: '19 Feb 2026',
      created_by: 'Admin User',
      page_number: '1',
      styles: DEFAULT_AGREEMENT_STYLES,
    },
  };
  return { [prefix]: samples[prefix] || samples.invoice };
}

function renderFieldRows(items, prefix, options = {}) {
  if (!items?.length) return '';
  return items
    .map((item) => {
      const ph = `{{${prefix}.${item.variable}}}`;
      if (item.variable === 'items_table' || item.variable === 'agreement_table') {
        return `<div class="items-section">${ph}</div>`;
      }
      if (item.variable === 'company_logo') {
        return `<div class="company-logo-wrap">${ph}</div>`;
      }
      if (item.variable === 'section_heading') {
        return `<h3 class="agreement-subheading">${ph}</h3>`;
      }
      if (item.variable === 'section_paragraph') {
        return `<p class="agreement-paragraph">${ph}</p>`;
      }
      const label = options.noLabel ? '' : `<span class="field-label">${escapeHtml(item.label)}:</span> `;
      return `<div class="field-row">${label}${ph}</div>`;
    })
    .join('\n');
}

/** Default CSS for print templates when building from Builder structure (dynamic layout only). */
export function getDefaultCss(moduleKey) {
  return MINIMAL_PRINT_STYLES;
}

/**
 * Get the full HTML to use for preview/print. Uses template_html + template_css if set, else generates from structure.
 */
export function getEffectiveTemplateHtml(template, moduleKey) {
  if (!template) return '';
  const customHtml = template.template_html;
  const customCss = template.template_css;
  if (typeof customHtml === 'string' && customHtml.trim() !== '') {
    const css = typeof customCss === 'string' ? customCss : getDefaultCss(moduleKey);
    return `<style>${css}</style>\n${customHtml}`;
  }
  return buildFullTemplateHtml(template, moduleKey);
}

/**
 * Build HTML strictly from Builder: only sections and fields that exist. No fixed structure.
 * - Zero fields → ''
 * - One field → just {{prefix.variable}}
 * - Multiple → <div class="print-doc-dynamic"> with <div class="print-section print-section-{key}"> per section, <div class="print-field"> per variable.
 */
function buildDynamicTemplateBody(template, moduleKey) {
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  const t = template || {};
  const get = (key) => (Array.isArray(t[key]) ? t[key] : []).filter((item) => item && item.variable);
  const sectionKeys = moduleKey === 'agreements' ? AGREEMENT_TEMPLATE_SECTIONS : [...TEMPLATE_SECTIONS, 'body'];
  let sectionsWithItems = sectionKeys
    .map((key) => ({ key, items: get(key) }))
    .filter((s) => s.items.length > 0);
  // Agreements: always include Body section so View/Print show full agreement content (even if template was saved with empty body)
  if (moduleKey === 'agreements' && !sectionsWithItems.some((s) => s.key === 'body')) {
    sectionsWithItems = [...sectionsWithItems, { key: 'body', items: [{ variable: 'agreement_content' }] }];
  }
  // Agreements: always include header and partyDetailsProvider so styled wrappers stay in DOM when user removes fields in Builder
  if (moduleKey === 'agreements') {
    if (!sectionsWithItems.some((s) => s.key === 'header')) {
      sectionsWithItems = [...sectionsWithItems, { key: 'header', items: [] }];
    }
    if (!sectionsWithItems.some((s) => s.key === 'partyDetailsProvider')) {
      sectionsWithItems = [...sectionsWithItems, { key: 'partyDetailsProvider', items: [] }];
    }
    sectionsWithItems = [...sectionsWithItems].sort(
      (a, b) => AGREEMENT_TEMPLATE_SECTIONS.indexOf(a.key) - AGREEMENT_TEMPLATE_SECTIONS.indexOf(b.key)
    );
  }
  const totalFields = sectionsWithItems.reduce(
    (n, s) =>
      n +
      (moduleKey === 'agreements' && s.key === 'header'
        ? AGREEMENT_HEADER_FIELDS.length
        : moduleKey === 'agreements' && s.key === 'partyDetailsProvider'
          ? AGREEMENT_PROVIDER_FIELDS.length
          : s.items.length),
    0
  );

  if (totalFields === 0) return '';
  if (totalFields === 1 && moduleKey !== 'agreements') {
    const onlySection = sectionsWithItems[0];
    const onlyItem = onlySection.items[0];
    return `{{${prefix}.${onlyItem.variable}}}`;
  }
  if (totalFields === 1 && moduleKey === 'agreements') {
    const onlySection = sectionsWithItems[0];
    if (onlySection.key === 'body') {
      return `<div class="print-doc-dynamic agreement-print-root"><div class="print-section print-section-body">{{${prefix}.agreement_content}}</div></div>`;
    }
    const onlyItem = onlySection.items[0];
    return `{{${prefix}.${onlyItem.variable}}}`;
  }

  const wrapField = (variable, ph, sectionKey) => {
    if (moduleKey === 'agreements' && (variable === 'provider_signature' || variable === 'client_signature')) {
      return `<div class="agreement-signature-image">${ph}</div>`;
    }
    const isSignatureName = moduleKey === 'agreements' && (variable === 'provider_signature_name' || variable === 'client_signature_name');
    if (isSignatureName) {
      return `<div class="agreement-signature-name">${ph}</div>`;
    }
    if (moduleKey === 'agreements' && sectionKey === 'header') {
      if (variable === 'company_logo') return `<div class="print-field agreement-company-logo">${ph}</div>`;
      if (variable === 'company_name') return `<div class="print-field agreement-company-name">${ph}</div>`;
      if (variable === 'company_email') return `<div class="print-field agreement-company-email">${ph}</div>`;
      if (variable === 'company_phone') return `<div class="print-field agreement-company-phone">${ph}</div>`;
      if (variable === 'company_address') return `<div class="print-field agreement-company-address">${ph}</div>`;
    }
    if (moduleKey === 'agreements' && sectionKey === 'partyDetailsProvider') {
      if (variable === 'provider_name') return `<div class="print-field agreement-provider-name">${ph}</div>`;
      if (variable === 'provider_email') return `<div class="print-field agreement-provider-email">${ph}</div>`;
      if (variable === 'provider_phone') return `<div class="print-field agreement-provider-phone">${ph}</div>`;
      if (variable === 'provider_address') return `<div class="print-field agreement-provider-address">${ph}</div>`;
    }
    return `<div class="print-field">${ph}</div>`;
  };

  const sectionsHtml = sectionsWithItems
    .map(({ key, items }) => {
      // Agreements header: always render section and all company wrappers (visibility controlled by print data)
      if (moduleKey === 'agreements' && key === 'header') {
        const inner = AGREEMENT_HEADER_FIELDS.map((f) => wrapField(f.variable, `{{${prefix}.${f.variable}}}`, key)).join('');
        return `<div class="print-section print-section-header">${inner}</div>`;
      }
      // Agreements partyDetailsProvider: always render section and all provider wrappers (visibility controlled by print data)
      if (moduleKey === 'agreements' && key === 'partyDetailsProvider') {
        const inner = AGREEMENT_PROVIDER_FIELDS.map((f) => wrapField(f.variable, `{{${prefix}.${f.variable}}}`, key)).join('');
        return `<div class="print-section print-section-partyDetailsProvider">${inner}</div>`;
      }
      // Body section for agreements: single variable, no print-field wrapper (exact structure required)
      if (moduleKey === 'agreements' && key === 'body') {
        return `<div class="print-section print-section-body">{{${prefix}.agreement_content}}</div>`;
      }
      const isSignatureSection = moduleKey === 'agreements' && (key === 'signatureProvider' || key === 'signatureClient');
      const sectionExtraClass = isSignatureSection ? ' agreement-signature-block' : '';
      return `<div class="print-section print-section-${key}${sectionExtraClass}">${items.map((item) => wrapField(item.variable, `{{${prefix}.${item.variable}}}`, key)).join('')}</div>`;
    })
    .join('\n');
  const rootClass = moduleKey === 'agreements' ? 'print-doc-dynamic agreement-print-root' : 'print-doc-dynamic';
  return `<div class="${rootClass}">\n${sectionsHtml}\n</div>`;
}

/**
 * Build full template HTML from Builder structure only. No fixed sections; output matches fields added.
 * @param {Object} options - { includeStyle: false } to return body only (no <style> wrapper).
 */
export function buildFullTemplateHtml(template, moduleKey, options = {}) {
  const includeStyle = options.includeStyle !== false;
  const body = buildDynamicTemplateBody(template, moduleKey);
  if (body === '') return '';
  return includeStyle ? `<style>${MINIMAL_PRINT_STYLES}</style>\n${body}` : body;
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Remove elements with class .print-section that have no visible content (no text, no img/table).
 * Runs in browser (uses document). Falls back to returning html unchanged if document not available.
 */
function removeEmptySections(html) {
  if (typeof document === 'undefined' || !html || typeof html !== 'string') return html;
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    const sections = div.querySelectorAll('.print-section');
    sections.forEach((el) => {
      if (el.classList.contains('print-section-header') || el.classList.contains('print-section-partyDetailsProvider')) {
        return;
      }
      const text = (el.textContent || '').trim();
      const hasMedia = el.querySelector('img, object, svg, table, canvas, iframe');
      if (text === '' && !hasMedia) el.remove();
    });
    return div.innerHTML;
  } catch (_) {
    return html;
  }
}

/** Get nested value by dot path (e.g. "styles.heading.fontSize"). */
function getByPath(obj, path) {
  if (obj == null || typeof path !== 'string') return undefined;
  const parts = path.trim().split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Build agreement CSS block. Placeholders {{agreement.styles.*}} are resolved in resolveTemplateHtmlWithData.
 * When mergedStyles is provided, company header rules are output with literal values and !important so they
 * always apply in Preview and Print and are not overridden by template CSS.
 * @param {Object} [mergedStyles] - Merged agreement styles (from mergeAgreementStyles). When provided, company header block uses literal values + !important.
 */
function getAgreementStylesCssBlock(mergedStyles) {
  const s = mergedStyles || {};
  const logo = s.companyLogo || {};
  const name = s.companyName || {};
  const email = s.companyEmail || {};
  const phone = s.companyPhone || {};
  const address = s.companyAddress || {};
  const companyBlock = `.agreement-print-root .agreement-company-logo { text-align: ${logo.textAlign || 'left'} !important; }
.agreement-print-root .agreement-company-logo img {
  width: ${logo.width || '120px'} !important;
  margin-bottom: ${logo.marginBottom || '10px'} !important;
  display: block;
}
.agreement-print-root .agreement-company-name {
  font-size: ${name.fontSize || '20px'} !important;
  color: ${name.color || '#1e293b'} !important;
  font-weight: ${name.fontWeight || '700'} !important;
  text-align: ${name.textAlign || name.alignment || 'left'} !important;
  margin-bottom: ${name.marginBottom || '4px'} !important;
}
.agreement-print-root .agreement-company-email {
  font-size: ${email.fontSize || '14px'} !important;
  color: ${email.color || '#475569'} !important;
  text-align: ${email.textAlign || email.alignment || 'left'} !important;
}
.agreement-print-root .agreement-company-phone {
  font-size: ${phone.fontSize || '14px'} !important;
  color: ${phone.color || '#475569'} !important;
  text-align: ${phone.textAlign || phone.alignment || 'left'} !important;
}
.agreement-print-root .agreement-company-address {
  font-size: ${address.fontSize || '14px'} !important;
  color: ${address.color || '#475569'} !important;
  text-align: ${address.textAlign || address.alignment || 'left'} !important;
  line-height: ${address.lineHeight || '1.4'} !important;
}
.agreement-print-root .agreement-provider-name {
  font-size: ${(s.providerName || {}).fontSize || '18px'} !important;
  color: ${(s.providerName || {}).color || '#1e293b'} !important;
  font-weight: ${(s.providerName || {}).fontWeight || '600'} !important;
  text-align: ${(s.providerName || {}).alignment || (s.providerName || {}).textAlign || 'left'} !important;
  margin-bottom: ${(s.providerName || {}).marginBottom || '4px'} !important;
}
.agreement-print-root .agreement-provider-email {
  font-size: ${(s.providerEmail || {}).fontSize || '14px'} !important;
  color: ${(s.providerEmail || {}).color || '#475569'} !important;
  text-align: ${(s.providerEmail || {}).alignment || (s.providerEmail || {}).textAlign || 'left'} !important;
}
.agreement-print-root .agreement-provider-phone {
  font-size: ${(s.providerPhone || {}).fontSize || '14px'} !important;
  color: ${(s.providerPhone || {}).color || '#475569'} !important;
  text-align: ${(s.providerPhone || {}).alignment || (s.providerPhone || {}).textAlign || 'left'} !important;
}
.agreement-print-root .agreement-provider-address {
  font-size: ${(s.providerAddress || {}).fontSize || '14px'} !important;
  color: ${(s.providerAddress || {}).color || '#475569'} !important;
  line-height: ${(s.providerAddress || {}).lineHeight || '1.4'} !important;
  text-align: ${(s.providerAddress || {}).alignment || (s.providerAddress || {}).textAlign || 'left'} !important;
}`;

  return `<style class="agreement-template-styles">
.agreement-heading, .print-doc-dynamic .agreement-heading {
  font-size: {{agreement.styles.heading.fontSize}};
  color: {{agreement.styles.heading.color}};
  font-weight: {{agreement.styles.heading.fontWeight}};
  font-family: {{agreement.styles.fontFamily}};
  margin-bottom: {{agreement.styles.heading.marginBottom}};
}
.agreement-subheading, .print-doc-dynamic .agreement-subheading {
  font-size: {{agreement.styles.subheading.fontSize}};
  color: {{agreement.styles.subheading.color}};
  font-weight: {{agreement.styles.subheading.fontWeight}};
  font-family: {{agreement.styles.fontFamily}};
  margin-bottom: {{agreement.styles.subheading.marginBottom}};
}
.agreement-paragraph, .print-doc-dynamic .agreement-paragraph {
  font-size: {{agreement.styles.paragraph.fontSize}};
  color: {{agreement.styles.paragraph.color}};
  line-height: {{agreement.styles.paragraph.lineHeight}};
  font-family: {{agreement.styles.fontFamily}};
  margin-bottom: {{agreement.styles.paragraph.marginBottom}};
}
.agreement-bullets, .print-doc-dynamic .agreement-bullets {
  font-size: {{agreement.styles.bullets.fontSize}};
  color: {{agreement.styles.bullets.color}};
  line-height: {{agreement.styles.bullets.lineHeight}};
  font-family: {{agreement.styles.fontFamily}};
  margin-bottom: {{agreement.styles.bullets.marginBottom}};
}
.agreement-terms, .print-doc-dynamic .agreement-terms {
  font-family: {{agreement.styles.fontFamily}};
}
.agreement-terms-title, .print-doc-dynamic .agreement-terms-title {
  font-size: {{agreement.styles.subheading.fontSize}};
  color: {{agreement.styles.subheading.color}};
  font-weight: {{agreement.styles.subheading.fontWeight}};
  margin-bottom: {{agreement.styles.subheading.marginBottom}};
}
.agreement-terms-text, .print-doc-dynamic .agreement-terms-text {
  font-size: {{agreement.styles.terms.fontSize}};
  color: {{agreement.styles.terms.color}};
  font-family: {{agreement.styles.fontFamily}};
}
.agreement-table td, .print-doc-dynamic .agreement-table td {
  font-size: {{agreement.styles.table.fontSize}};
  color: {{agreement.styles.table.color}};
  border: {{agreement.styles.table.border}};
  padding: {{agreement.styles.table.cellPadding}};
}
.agreement-table th, .print-doc-dynamic .agreement-table th {
  background: {{agreement.styles.table.headerBackground}};
  color: {{agreement.styles.table.headerColor}};
  border: {{agreement.styles.table.border}};
  padding: {{agreement.styles.table.cellPadding}};
}
.agreement-signature-name, .print-doc-dynamic .agreement-signature-name {
  font-size: {{agreement.styles.signature.fontSize}};
  color: {{agreement.styles.signature.color}};
  font-family: {{agreement.styles.fontFamily}};
}
.agreement-signature-label, .print-doc-dynamic .agreement-signature-label {
  font-size: {{agreement.styles.signatureLabel.fontSize}};
  color: {{agreement.styles.signatureLabel.color}};
  font-family: {{agreement.styles.fontFamily}};
}
.print-section { margin-bottom: {{agreement.styles.section.marginBottom}}; }
.print-doc-dynamic { max-width: {{agreement.styles.body.maxWidth}}; margin-left: auto; margin-right: auto; }

${companyBlock}
</style>
`;
}

/** Resolve template HTML with variables for preview (e.g. {{invoice.id}} → value). */
export function resolveTemplateHtml(html, moduleKey) {
  if (!html) return '';
  const data = getSampleData(moduleKey);
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  return resolveTemplateHtmlWithData(html, moduleKey, data[prefix] || {});
}

/** Resolve template HTML with a flat data object (for print with real record data). Hides empty sections. Section order is preserved. Supports nested paths (e.g. {{agreement.styles.heading.fontSize}}). */
export function resolveTemplateHtmlWithData(html, moduleKey, dataFlat) {
  if (!html) return '';
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  const raw = dataFlat || {};
  let flat =
    raw[prefix] != null && typeof raw[prefix] === 'object' && !Array.isArray(raw[prefix])
      ? raw[prefix]
      : raw;

  let out;
  if (moduleKey === 'agreements') {
    flat = { ...flat, styles: mergeAgreementStyles(flat.styles) };
    // Inject agreement styles AFTER template HTML so agreement-template-styles wins over template CSS (and company header uses !important).
    out = html + getAgreementStylesCssBlock(flat.styles);
  } else {
    out = html;
  }

  // Agreement company header and provider fields: wrap replaced value with CSS class divs so template.styles apply
  const AGREEMENT_HEADER_CLASS = {
    company_name: 'agreement-company-name',
    company_email: 'agreement-company-email',
    company_phone: 'agreement-company-phone',
    company_address: 'agreement-company-address',
    company_logo: 'agreement-company-logo',
    provider_name: 'agreement-provider-name',
    provider_email: 'agreement-provider-email',
    provider_phone: 'agreement-provider-phone',
    provider_address: 'agreement-provider-address',
  };

  // Replace all {{prefix.path}} (path may contain dots) with getByPath(flat, path)
  const nestedRegex = new RegExp(`\\{\\{${prefix}\\.([^}]+)\\}\\}`, 'gi');
  out = out.replace(nestedRegex, (_, path) => {
    const val = getByPath(flat, path);
    let value = String(val != null ? val : '');
    if (moduleKey === 'agreements' && AGREEMENT_HEADER_CLASS[path]) {
      const cls = AGREEMENT_HEADER_CLASS[path];
      value = `<div class="${cls}">${value}</div>`;
    }
    return value;
  });
  out = out.replace(/\{\{[^}]+\}\}/g, '');
  return removeEmptySections(out);
}

/** Build items table HTML for print (invoice or quotation). */
export function buildItemsTableHtml(items, type = 'invoice') {
  const rows = (items || []).map((row, idx) => {
    const num = idx + 1;
    const itemName = row.item || row.service_name || row.serviceName || '—';
    const desc = row.description || '—';
    const qty = parseFloat(row.qty || row.quantity) || 1;
    const rate = parseFloat(row.price || row.rate) || parseFloat(row.amount) / qty || 0;
    const amount = parseFloat(row.amount) || qty * rate;
    const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (type === 'quotation') {
      return `<tr><td>${num}</td><td>${escapeHtml(String(itemName))}</td><td>${escapeHtml(String(desc))}</td><td>${qty}</td><td class="text-right">${fmt(rate)}</td><td class="text-right">${fmt(amount)}</td></tr>`;
    }
    return `<tr><td>${num}</td><td>${escapeHtml(String(itemName))}</td><td>${escapeHtml(String(desc))}</td><td>${qty}</td><td class="text-right">${fmt(rate)}</td><td class="text-right">${fmt(amount)}</td></tr>`;
  });
  const thead =
    type === 'quotation'
      ? '<thead><tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>'
      : '<thead><tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>';
  return `<table class="print-table">${thead}<tbody>${rows.join('')}</tbody></table>`;
}

/** Build flat data object for invoice print (matches template variables). */
export function buildInvoicePrintData(invoice, company = {}, client = null, bank = null) {
  const items = invoice?.items || [];
  const subtotal = parseFloat(invoice?.amount) || items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gst = parseFloat(invoice?.gst) || 0;
  const discount = parseFloat(invoice?.discount) || 0;
  const gstAmount = subtotal * (gst / 100);
  const grandTotal = Math.max(0, subtotal + gstAmount - discount);
  let paidAmount = 0;
  if (invoice?.status === 'Paid') {
    paidAmount = grandTotal;
  } else if (subtotal > 0 && items.length > 0) {
    const itemsPaid = items.filter((i) => i.payment_status === 'Paid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const ratio = itemsPaid / subtotal;
    paidAmount = Math.max(0, Math.min(grandTotal, itemsPaid + gstAmount * ratio - discount * ratio));
  }
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const dateStr = invoice?.date ? (typeof invoice.date === 'string' ? invoice.date.split('T')[0] : new Date(invoice.date).toLocaleDateString()) : '—';
  const paymentStatus =
    paidAmount >= grandTotal ? '<span class="payment-badge paid">Paid</span>' : paidAmount > 0 ? '<span class="payment-badge partial">Partially Paid</span>' : '<span class="payment-badge pending">Pending</span>';
  const companyLogo = company?.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" style="max-height:56px;max-width:160px;object-fit:contain" />` : '<div class="company-logo" style="height:56px;width:160px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b">Logo</div>';
  const clientName = client ? (client.company_name || client.client_name || '') : '';
  const clientAddress = client ? [client.address_line_1, client.address_line_2, client.city, client.state, client.country].filter(Boolean).join(', ') : '';
  return {
    company_logo: companyLogo,
    company_name: company?.name || '',
    company_address: company?.address || '',
    company_phone: company?.phone || '',
    company_email: company?.email || '',
    invoice_number: invoice?.id ?? invoice?.invoice_no ?? '—',
    date: dateStr,
    client_name: clientName,
    customer_address: clientAddress,
    customer_email: client?.email_address || client?.email || '',
    customer_phone: client?.mobile_number || client?.phone || '',
    payment_status: paymentStatus,
    items_table: buildItemsTableHtml(items, 'invoice'),
    subtotal: fmt(subtotal),
    discount: fmt(discount),
    tax_amount: fmt(gstAmount),
    grand_total: fmt(grandTotal),
    paid_amount: fmt(paidAmount),
    balance_due: fmt(balanceDue),
    bank_name: bank?.bankName || bank?.bank_name || '',
    bank_account_number: bank?.accountNumber || bank?.account_number || '',
    ifsc_code: bank?.ifsc || bank?.ifsc_code || '',
    authorized_signature: company?.signature ? `<img src="${company.signature}" alt="Signature" class="sig-image" />` : (company?.name || 'Authorized Signatory'),
    terms_and_conditions: company?.terms || '',
  };
}

/**
 * Normalize a single block so type and content work regardless of case or property names.
 * Stored blocks may use: type "HEADING", value "text" instead of type "heading", content "text".
 */
function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null;
  const type = String(block.type ?? '').toLowerCase().trim();
  const content = block.content ?? block.value ?? block.text ?? block.data ?? '';
  return { type, content, original: block };
}

/**
 * Render table block to HTML, normalizing headers/rows from various property names.
 */
function renderAgreementTable(block) {
  const raw = block?.content ?? block?.value ?? block?.data ?? block;
  const headers = raw?.headers ?? raw?.columns ?? [];
  const rows = raw?.rows ?? raw?.data ?? [];
  const headerArr = Array.isArray(headers) ? headers : [];
  const rowsArr = Array.isArray(rows) ? rows : [];
  if (headerArr.length === 0 && rowsArr.length === 0) return '';
  const ths = (headerArr.length ? headerArr : ['']).map((h) => `<th class="border border-gray-300 px-2 py-1.5 text-left">${escapeHtml(String(h))}</th>`).join('');
  const trs = rowsArr.map((row) => {
    const cells = (Array.isArray(row) ? row : []).map((c) => `<td class="border border-gray-300 px-2 py-1.5">${escapeHtml(String(c))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table class="agreement-table print-table w-full"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/**
 * Render a single agreement block to HTML by type.
 * Uses normalizeBlock so blocks work regardless of case (HEADING vs heading) or property (value vs content).
 * When styles is provided, terms block uses inline styles so template.styles always apply in Preview and Print.
 */
function renderOneAgreementBlock(b, styles) {
  const normalized = normalizeBlock(b);
  if (!normalized || !normalized.type) return '';
  const { type, content, original } = normalized;

  switch (type) {
    case 'heading':
      return `<h2 class="agreement-heading">${escapeHtml(String(content || ''))}</h2>`;
    case 'subheading':
      return `<h3 class="agreement-subheading">${escapeHtml(String(content || ''))}</h3>`;
    case 'paragraph':
      return `<p class="agreement-paragraph">${escapeHtml(String(content || '').replace(/\n/g, '<br/>'))}</p>`;
    case 'bullets': {
      const items = Array.isArray(original.items) ? original.items
        : Array.isArray(original.content) ? original.content
        : Array.isArray(original.value) ? original.value
        : [];
      const list = items.filter(Boolean);
      if (list.length === 0) return '';
      return `<ul class="agreement-bullets">${list.map((i) => `<li>${escapeHtml(String(i))}</li>`).join('')}</ul>`;
    }
    case 'table':
      return renderAgreementTable(original);
    case 'terms': {
      const text = typeof content === 'string' ? content : (content?.text ?? content ?? '');
      if (!text) return '';
      return `<div class="agreement-terms">
  <div class="agreement-terms-title">Terms and Conditions</div>
  <div class="agreement-terms-text">${escapeHtml(String(text).replace(/\n/g, '<br/>'))}</div>
</div>`;
    }
    default:
      return '';
  }
}

/**
 * Normalize agreement blocks from various sources (array, JSON string, or mixed).
 * Returns an array of block objects suitable for renderAgreementBodyInOrder.
 */
function normalizeAgreementBlocks(raw) {
  if (Array.isArray(raw)) return raw.filter((b) => b && typeof b === 'object');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((b) => b && typeof b === 'object') : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

/**
 * Render agreement content blocks in the exact order entered in the form (for agreement_content).
 * Pass styles so terms block gets inline styles from template.styles (Preview and Print).
 */
export function renderAgreementBodyInOrder(blocks, styles) {
  const list = normalizeAgreementBlocks(blocks);
  return list.map((b) => renderOneAgreementBlock(b, styles)).filter(Boolean).join('');
}

/**
 * Render agreement content blocks to HTML by type (for template variables).
 * Returns HTML strings for agreement_heading, agreement_paragraph, agreement_table, etc.
 */
function renderAgreementBlocksToHtml(blocks) {
  const blocksList = Array.isArray(blocks) ? blocks : [];
  const byType = { heading: [], subheading: [], paragraph: [], bullets: [], table: [] };
  blocksList.forEach((b) => {
    if (byType[b.type]) byType[b.type].push(b);
  });
  const headingHtml = byType.heading.map((b) => `<h2 class="agreement-heading">${escapeHtml(String(b.content || ''))}</h2>`).join('');
  const subheadingHtml = byType.subheading.map((b) => `<h3 class="agreement-subheading">${escapeHtml(String(b.content || ''))}</h3>`).join('');
  const paragraphHtml = byType.paragraph.map((b) => `<p class="agreement-paragraph">${escapeHtml(String(b.content || '').replace(/\n/g, '<br/>'))}</p>`).join('');
  const bulletsHtml = byType.bullets
    .map((b) => {
      const items = Array.isArray(b.content) ? b.content.filter(Boolean) : [];
      if (items.length === 0) return '';
      return `<ul class="agreement-bullets">${items.map((i) => `<li>${escapeHtml(String(i))}</li>`).join('')}</ul>`;
    })
    .filter(Boolean)
    .join('');
  const tableHtml = byType.table
    .map((b) => {
      const headers = b.content?.headers || [];
      const rows = b.content?.rows || [];
      if (headers.length === 0 && rows.length === 0) return '';
      const ths = (headers.length ? headers : ['']).map((h) => `<th class="border border-gray-300 px-2 py-1.5 text-left">${escapeHtml(String(h))}</th>`).join('');
      const trs = (rows || []).map((row) => {
        const cells = (Array.isArray(row) ? row : []).map((c) => `<td class="border border-gray-300 px-2 py-1.5">${escapeHtml(String(c))}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="agreement-table print-table w-full"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    .filter(Boolean)
    .join('');
  return { headingHtml, subheadingHtml, paragraphHtml, bulletsHtml, tableHtml };
}

const AGREEMENT_STYLE_OBJECT_KEYS = ['heading', 'subheading', 'paragraph', 'bullets', 'terms', 'section', 'table', 'signature', 'signatureLabel', 'body', 'companyLogo', 'companyName', 'companyEmail', 'companyPhone', 'companyAddress', 'providerName', 'providerEmail', 'providerPhone', 'providerAddress'];

/** Deep-merge template styles with defaults (one level for nested objects). */
function mergeAgreementStyles(templateStyles) {
  const def = DEFAULT_AGREEMENT_STYLES;
  if (!templateStyles || typeof templateStyles !== 'object') return { ...def };
  const merged = { ...def };
  (Object.keys(templateStyles) || []).forEach((key) => {
    if (AGREEMENT_STYLE_OBJECT_KEYS.includes(key)) {
      merged[key] = { ...(def[key] || {}), ...(templateStyles[key] || {}) };
    } else {
      merged[key] = templateStyles[key] != null ? templateStyles[key] : def[key];
    }
  });
  return merged;
}

/** Return true if template has a field with the given variable in the section (e.g. header, partyDetailsProvider). */
function templateHasField(template, sectionKey, variable) {
  const section = Array.isArray(template?.[sectionKey]) ? template[sectionKey] : [];
  return section.some((item) => item && item.variable === variable);
}

/** Build flat data object for agreement print (matches template variables).
 * @param {Object} options - { template, templateHasBodySection, templateHtml, styles }.
 *   template: when provided, company_* and provider_* are only filled when that field exists in template.header / template.partyDetailsProvider (removed fields get '' so wrappers stay but content is hidden).
 *   templateHtml: fallback for company_email/phone/address when template not provided.
 *   styles: from template.styles; merged with defaults and included in return for CSS variable resolution.
 */
export function buildAgreementPrintData(agreement, company = {}, client = null, options = {}) {
  const template = options?.template ?? {};
  const templateHtml = options?.templateHtml ?? '';
  const rawBlocks = agreement?.content ?? agreement?.agreement_content ?? [];
  const blocks = normalizeAgreementBlocks(rawBlocks);
  const styles = mergeAgreementStyles(options.styles);
  const bodyBlocksHtml = renderAgreementBodyInOrder(blocks, styles);
  const termsText = agreement?.terms ?? company?.terms ?? '';
  const termsHtml = termsText
    ? `<div class="agreement-terms">
  <div class="agreement-terms-title">Terms and Conditions</div>
  <div class="agreement-terms-text">${escapeHtml(String(termsText).replace(/\n/g, '<br/>'))}</div>
</div>`
    : '';
  const templateHasBodySection = options.templateHasBodySection === true;
  const fullBodyHtml = templateHasBodySection ? bodyBlocksHtml : bodyBlocksHtml + termsHtml;
  const footerTermsText = templateHasBodySection ? termsText : '';
  const { headingHtml, subheadingHtml, paragraphHtml, bulletsHtml, tableHtml } = renderAgreementBlocksToHtml(blocks);
  const dateStr = agreement?.date ? (typeof agreement.date === 'string' ? agreement.date.split('T')[0] : new Date(agreement.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
  const companyLogo = company?.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" style="max-height:48px;max-width:120px;object-fit:contain" />` : '<div class="company-logo" style="height:48px;width:120px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b">Logo</div>';
  const sigHtml = company?.signature ? `<img src="${company.signature}" alt="Signature" class="sig-image" style="max-height:48px" />` : (company?.name || 'Authorized Signatory');
  const clientName = client ? (client.company_name || client.client_name || '') : '';
  const clientAddress = client ? [client.address_line_1, client.address_line_2, client.city, client.state, client.country].filter(Boolean).join(', ') : '';
  const fmt = (n) => (n != null && n !== '') ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';
  const useTemplateVisibility = template != null && typeof template === 'object';
  const inHeader = (v) => templateHasField(template, 'header', v);
  const inProvider = (v) => templateHasField(template, 'partyDetailsProvider', v);
  const companyAddressVal = useTemplateVisibility ? (inHeader('company_address') ? (company?.address || '') : '') : (templateHtml.includes('{{agreement.company_address}}') ? (company?.address || '') : '');
  const companyEmailVal = useTemplateVisibility ? (inHeader('company_email') ? (company?.email || '') : '') : (templateHtml.includes('{{agreement.company_email}}') ? (company?.email || '') : '');
  const companyPhoneVal = useTemplateVisibility ? (inHeader('company_phone') ? (company?.phone || '') : '') : (templateHtml.includes('{{agreement.company_phone}}') ? (company?.phone || '') : '');
  return {
    company_logo: useTemplateVisibility ? (inHeader('company_logo') ? companyLogo : '') : companyLogo,
    company_name: useTemplateVisibility ? (inHeader('company_name') ? (company?.name || '') : '') : (company?.name || ''),
    company_address: companyAddressVal,
    agreement_title: agreement?.title || 'Agreement',
    agreement_reference_number: agreement?.id || agreement?.reference || '',
    agreement_date: dateStr,
    provider_name: useTemplateVisibility ? (inProvider('provider_name') ? (company?.name || '') : '') : (company?.name || ''),
    provider_address: useTemplateVisibility ? (inProvider('provider_address') ? (company?.address || '') : '') : (company?.address || ''),
    provider_email: useTemplateVisibility ? (inProvider('provider_email') ? (company?.email || '') : '') : (company?.email || ''),
    provider_phone: useTemplateVisibility ? (inProvider('provider_phone') ? (company?.phone || '') : '') : (company?.phone || ''),
    client_name: clientName,
    client_address: clientAddress,
    client_email: client?.email_address || client?.email || '',
    client_phone: client?.mobile_number || client?.phone || '',
    agreement_content: fullBodyHtml,
    body_content: fullBodyHtml,
    agreement_heading: headingHtml,
    agreement_subheading: subheadingHtml,
    agreement_paragraph: paragraphHtml,
    section_heading: '',
    section_paragraph: '',
    agreement_bullet_points: bulletsHtml,
    agreement_table: tableHtml,
    total_amount: fmt(agreement?.total_amount ?? agreement?.amount) || '',
    payment_terms: agreement?.payment_terms || company?.payment_terms || '',
    start_date: agreement?.start_date ? (typeof agreement.start_date === 'string' ? agreement.start_date.split('T')[0] : new Date(agreement.start_date).toISOString().split('T')[0]) : '',
    end_date: agreement?.end_date ? (typeof agreement.end_date === 'string' ? agreement.end_date.split('T')[0] : new Date(agreement.end_date).toISOString().split('T')[0]) : '',
    agreement_terms_and_conditions: footerTermsText,
    provider_signature: sigHtml,
    provider_signature_name: company?.name || '',
    provider_signature_date: dateStr,
    signature: sigHtml,
    signature_name: company?.name || '',
    client_signature: '',
    client_signature_name: clientName,
    client_signature_date: dateStr,
    company_footer_text: company?.footer_text || '',
    company_email: companyEmailVal,
    company_phone: companyPhoneVal,
    company_website: company?.website || '',
    company_gst_number: company?.gst_number || company?.gst || '',
    document_title: agreement?.title || 'Agreement',
    created_date: dateStr,
    created_by: '',
    page_number: '1',
    styles,
  };
}

/** Build flat data object for quotation print (matches template variables). */
export function buildQuotationPrintData(quotation, company = {}) {
  const client = quotation?.client;
  const items = quotation?.items || [];
  const subtotal = parseFloat(quotation?.subtotal) || 0;
  const discount = parseFloat(quotation?.discount) || 0;
  const tax = parseFloat(quotation?.tax) || 0;
  const total = parseFloat(quotation?.total) || 0;
  const dateStr = quotation?.date ? (typeof quotation.date === 'string' ? quotation.date.split('T')[0] : quotation.date) : '—';
  const validStr = quotation?.expiry_date || quotation?.valid_until ? (typeof (quotation?.expiry_date || quotation?.valid_until) === 'string' ? (quotation.expiry_date || quotation.valid_until).split('T')[0] : '—') : '—';
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const clientName = client ? (client.company_name || client.client_name || '') : '—';
  const clientAddress = client ? [client.address_line_1, client.address_line_2, client.city, client.state, client.country].filter(Boolean).join(', ') : '';
  const companyLogo = company?.logo ? `<img src="${company.logo}" alt="Logo" class="company-logo" style="max-height:48px;max-width:120px;object-fit:contain" />` : '<div class="company-logo" style="height:48px;width:120px;background:#e2e8f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b">Logo</div>';
  return {
    company_logo: companyLogo,
    company_name: company?.name || '',
    company_address: company?.address || '',
    company_phone: company?.phone || '',
    company_email: company?.email || '',
    quotation_number: quotation?.quotation_no ?? quotation?.id ?? '—',
    date: dateStr,
    valid_until: validStr,
    client_name: clientName,
    customer_address: clientAddress,
    customer_email: client?.email_address || client?.email || '',
    items_table: buildItemsTableHtml(items, 'quotation'),
    total: fmt(total),
    terms_and_conditions: quotation?.notes || company?.terms || '',
  };
}
