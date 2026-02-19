/**
 * Print Template Visual Builder: fields per module.
 * When module changes, Available Fields list updates; template variables use the prefix below.
 */
/** Modules available for print templates (Orders & Purchases excluded). */
export const MODULES = [
  { value: 'invoices', label: 'Invoices', prefix: 'invoice' },
  { value: 'quotations', label: 'Quotations', prefix: 'quotation' },
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
};

/** Shared CSS for print preview – full invoice layout. */
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
  .payment-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .payment-badge.paid { background: #dcfce7; color: #166534; }
  .payment-badge.pending { background: #fef3c7; color: #92400e; }
  .payment-badge.partial { background: #e0e7ff; color: #3730a3; }
`;

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
  };
  return { [prefix]: samples[prefix] || samples.invoice };
}

function renderFieldRows(items, prefix, options = {}) {
  if (!items?.length) return '';
  return items
    .map((item) => {
      const ph = `{{${prefix}.${item.variable}}}`;
      if (item.variable === 'items_table') {
        return `<div class="items-section">${ph}</div>`;
      }
      if (item.variable === 'company_logo') {
        return `<div class="company-logo-wrap">${ph}</div>`;
      }
      const label = options.noLabel ? '' : `<span class="field-label">${escapeHtml(item.label)}:</span> `;
      return `<div class="field-row">${label}${ph}</div>`;
    })
    .join('\n');
}

/**
 * Build full template HTML with all sections (header, customer, items, totals, bank, signature, footer).
 * Supports legacy template shape (header, body, footer) for backward compatibility.
 */
export function buildFullTemplateHtml(template, moduleKey) {
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  const t = template || {};
  const get = (key) => t[key] || [];

  const headerItems = get('header');
  const customerLeft = get('customerLeft');
  const customerRight = get('customerRight');
  const itemsTable = get('itemsTable');
  const totals = get('totals');
  const bankDetails = get('bankDetails');
  const contactInfo = get('contactInfo');
  const signature = get('signature');
  const footerItems = get('footer');

  const legacyBody = get('body');
  const useLegacyBody = legacyBody.length > 0 && itemsTable.length === 0 && !customerLeft.length && !customerRight.length;

  const headerLeftVars = ['company_logo', 'company_name', 'company_address', 'company_phone', 'company_email'];
  const headerLeftItems = headerItems.filter((i) => headerLeftVars.includes(i.variable));
  const headerRightItems = headerItems.filter((i) => !headerLeftVars.includes(i.variable));
  const headerMarkup =
    headerItems.length > 0
      ? `<header class="print-header">
  <div class="header-left">${headerLeftItems.map((item) => (item.variable === 'company_logo' ? `{{${prefix}.company_logo}}` : `<span class="doc-meta">${escapeHtml(item.label)}: {{${prefix}.${item.variable}}}</span>`)).join('<br/>')}</div>
  <div class="header-right">${headerRightItems.map((item) => `<span class="doc-meta">${escapeHtml(item.label)}: {{${prefix}.${item.variable}}}</span>`).join('<br/>')}</div>
</header>`
      : '';

  const customerMarkup =
    customerLeft.length > 0 || customerRight.length > 0
      ? `<div class="print-customer">
  <div class="customer-block"><h4>Invoice To</h4>${renderFieldRows(customerLeft, prefix)}</div>
  <div class="customer-block"><h4>Invoice From</h4>${renderFieldRows(customerRight, prefix)}</div>
</div>`
      : '';

  const itemsMarkup =
    itemsTable.length > 0
      ? `<div class="print-items">${renderFieldRows(itemsTable, prefix)}</div>`
      : useLegacyBody
        ? `<main class="print-body">${renderFieldRows(legacyBody, prefix)}</main>`
        : '';

  const totalsMarkup =
    totals.length > 0
      ? `<div class="print-totals-wrap"><div class="print-totals">${totals.map((item) => `<div class="total-row${item.variable === 'grand_total' || item.variable === 'total' ? ' grand' : ''}"><span>${escapeHtml(item.label)}</span><span>{{${prefix}.${item.variable}}}</span></div>`).join('')}</div></div>`
      : '';

  const bankMarkup =
    bankDetails.length > 0
      ? `<div class="print-bank"><h4>Bank Details</h4>${renderFieldRows(bankDetails, prefix)}</div>`
      : '';

  const contactMarkup = contactInfo.length > 0 ? `<div class="print-contact">${renderFieldRows(contactInfo, prefix)}</div>` : '';

  const signatureMarkup =
    signature.length > 0
      ? `<div class="print-signature">${renderFieldRows(signature, prefix, { noLabel: true })}<span class="sig-label">${signature.some((i) => i.variable === 'authorized_signature') ? 'Authorized Signatory' : ''}</span></div>`
      : '';

  const bottomMarkup =
    bankMarkup || contactMarkup || signatureMarkup
      ? `<div class="print-bottom">${bankMarkup}<div>${contactMarkup}${signatureMarkup}</div></div>`
      : '';

  const footerMarkup =
    footerItems.length > 0
      ? `<footer class="print-footer">${footerItems.map((item) => `<div class="footer-row"><strong>${escapeHtml(item.label)}:</strong> {{${prefix}.${item.variable}}}</div>`).join('')}</footer>`
      : '';

  return `<style>${PRINT_PREVIEW_STYLES}</style>
<div class="print-doc">
  ${headerMarkup}
  ${customerMarkup}
  ${itemsMarkup}
  ${totalsMarkup}
  ${bottomMarkup}
  ${footerMarkup}
</div>`;
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resolve template HTML with variables for preview (e.g. {{invoice.id}} → value). */
export function resolveTemplateHtml(html, moduleKey) {
  if (!html) return '';
  const data = getSampleData(moduleKey);
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  return resolveTemplateHtmlWithData(html, moduleKey, data[prefix] || {});
}

/** Resolve template HTML with a flat data object (for print with real record data). */
export function resolveTemplateHtmlWithData(html, moduleKey, dataFlat) {
  if (!html) return '';
  const prefix = MODULES.find((m) => m.value === moduleKey)?.prefix || 'invoice';
  const flat = dataFlat || {};
  let out = html;
  Object.entries(flat).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${prefix}\\.${key}\\}\\}`, 'gi');
    out = out.replace(regex, String(value ?? ''));
  });
  out = out.replace(/\{\{[^}]+\}\}/g, '');
  return out;
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
