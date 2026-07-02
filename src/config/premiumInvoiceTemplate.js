/**
 * Premium styled invoice template (A4) for print templates.
 * Module: invoices, Variables: {{invoice.xxx}}
 */
export const PREMIUM_INVOICE_TEMPLATE_ID = 'tpl_seed_invoice_premium_v1';

export const PREMIUM_INVOICE_TEMPLATE_CSS = `
  .premium-invoice {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    color: #0f172a;
    font-family: Inter, "Segoe UI", Arial, sans-serif;
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
  }
  .premium-invoice * { box-sizing: border-box; }
  .premium-invoice .pi-top-band {
    height: 18px;
    background: linear-gradient(90deg, #0f172a 0%, #2563eb 45%, #06b6d4 100%);
  }
  .premium-invoice .pi-watermark {
    position: absolute;
    top: 40px;
    right: -30px;
    font-size: 90px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: rgba(30, 64, 175, 0.05);
    transform: rotate(-14deg);
    pointer-events: none;
    user-select: none;
  }
  .premium-invoice .pi-content {
    padding: 24px 24px 20px;
    min-height: calc(297mm - 18px);
    position: relative;
    z-index: 1;
  }
  .premium-invoice .pi-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .premium-invoice .pi-company {
    display: grid;
    gap: 6px;
  }
  .premium-invoice .pi-company .logo-slot img {
    max-height: 52px;
    max-width: 150px;
    object-fit: contain;
    display: block;
  }
  .premium-invoice .pi-company .name {
    font-size: 20px;
    font-weight: 800;
    line-height: 1.15;
  }
  .premium-invoice .pi-meta-title {
    text-align: right;
  }
  .premium-invoice .pi-meta-title h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #1d4ed8;
  }
  .premium-invoice .pi-meta-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #dbeafe;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .premium-invoice .pi-meta-item .k {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .premium-invoice .pi-meta-item .v {
    font-size: 13px;
    color: #0f172a;
    font-weight: 700;
  }
  .premium-invoice .pi-bill-card {
    margin: 12px 0 14px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .premium-invoice .pi-bill-card .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .premium-invoice .pi-bill-card .name {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .premium-invoice .pi-bill-card .line {
    font-size: 12px;
    color: #475569;
    line-height: 1.45;
    white-space: pre-line;
  }
  .premium-invoice .pi-table-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    border-radius: 10px;
    overflow: hidden;
  }
  .premium-invoice .pi-table-wrap th {
    background: #1e40af !important;
    color: #ffffff !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
    font-weight: 800;
    padding: 10px 12px;
    text-align: left;
    border: 1px solid #1e40af !important;
    opacity: 1 !important;
    visibility: visible !important;
    -webkit-text-fill-color: #ffffff !important;
  }
  .premium-invoice .pi-table-wrap td {
    border: 1px solid #e2e8f0;
    padding: 9px 12px;
    color: #1e293b;
    background: #fff;
  }
  .premium-invoice .pi-table-wrap tr:nth-child(even) td { background: #f8fafc; }
  .premium-invoice .pi-table-wrap .text-right { text-align: right; }
  .premium-invoice .pi-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 16px;
    align-items: start;
  }
  .premium-invoice .pi-box {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    background: #fff;
  }
  .premium-invoice .pi-box .title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .premium-invoice .pi-box .line {
    font-size: 12px;
    color: #334155;
    line-height: 1.5;
    margin-bottom: 4px;
  }
  .premium-invoice .pi-totals .tr {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  .premium-invoice .pi-totals .tr:last-child { border-bottom: none; }
  .premium-invoice .pi-totals .due {
    margin-top: 8px;
    border-radius: 8px;
    background: linear-gradient(90deg, #1d4ed8, #2563eb);
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
  }
  .premium-invoice .pi-sign {
    margin-top: 12px;
    text-align: right;
  }
  .premium-invoice .pi-sign .seal img {
    max-height: 44px;
    max-width: 78px;
    object-fit: contain;
    margin-left: auto;
    display: block;
  }
  .premium-invoice .pi-sign .sig img {
    max-height: 42px;
    max-width: 128px;
    object-fit: contain;
    margin-left: auto;
    display: block;
  }
  .premium-invoice .pi-sign .name { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .premium-invoice .pi-sign .role { font-size: 11px; color: #64748b; }
  .premium-invoice .pi-footer {
    margin-top: 14px;
    border-top: 1px solid #dbeafe;
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 11px;
    color: #64748b;
  }
  .premium-invoice .pi-footer .thanks {
    font-weight: 700;
    color: #1e40af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  @media print {
    @page { size: A4; margin: 0 !important; }
    html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; }
    .premium-invoice {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

export const PREMIUM_INVOICE_TEMPLATE_HTML = `
<div class="premium-invoice">
  <div class="pi-top-band"></div>
  <div class="pi-watermark">INVOICE</div>
  <div class="pi-content">
    <header class="pi-header">
      <div class="pi-company">
        <div class="logo-slot">{{invoice.company_logo}}</div>
        <div class="name">{{invoice.company_name}}</div>
      </div>
      <div class="pi-meta-title">
        <h1>{{invoice.invoice_title}}</h1>
      </div>
    </header>

    <div class="pi-meta-grid">
      <div class="pi-meta-item">
        <div class="k">Invoice No</div>
        <div class="v">{{invoice.invoice_number}}</div>
      </div>
      <div class="pi-meta-item">
        <div class="k">Invoice Date</div>
        <div class="v">{{invoice.date}}</div>
      </div>
      <div class="pi-meta-item">
        <div class="k">Due Date</div>
        <div class="v">{{invoice.due_date}}</div>
      </div>
    </div>

    <section class="pi-bill-card">
      <div class="label">Bill To</div>
      <div class="name">{{invoice.client_name}}</div>
      <div class="line">{{invoice.customer_address}}</div>
      <div class="line">{{invoice.customer_phone}}</div>
      <div class="line">{{invoice.customer_email}}</div>
    </section>

    <section class="pi-table-wrap">
      {{invoice.items_table}}
    </section>

    <section class="pi-row">
      <div class="pi-box">
        <div class="title">Terms & Payment</div>
        <div class="line">{{invoice.terms_and_conditions}}</div>
        <div class="line"><strong>Bank:</strong> {{invoice.bank_name}}</div>
        <div class="line"><strong>IFSC:</strong> {{invoice.ifsc_code}}</div>
        <div class="line"><strong>Account:</strong> {{invoice.bank_account_number}}</div>
      </div>
      <div class="pi-box pi-totals">
        <div class="title">Amount Summary</div>
        <div class="tr"><span>Subtotal</span><span>{{invoice.subtotal}}</span></div>
        <div class="tr"><span>Tax</span><span>{{invoice.tax_amount}}</span></div>
        <div class="tr"><span>Discount</span><span>{{invoice.discount}}</span></div>
        <div class="tr"><span>Paid</span><span>{{invoice.paid_amount}}</span></div>
        <div class="due"><span>Balance Due</span><span>{{invoice.balance_due}}</span></div>
        <div class="pi-sign">
          <div class="seal">{{invoice.company_seal}}</div>
          <div class="sig">{{invoice.authorized_signature}}</div>
          <div class="name">{{invoice.authorized_signature_text}}</div>
          <div class="role">{{invoice.designation}}</div>
        </div>
      </div>
    </section>

    <footer class="pi-footer">
      <div class="thanks">Thank you for your business</div>
      <div>
        <div>{{invoice.company_address}}</div>
        <div>{{invoice.company_phone}}</div>
        <div>{{invoice.company_email}}</div>
      </div>
    </footer>
  </div>
</div>
`;

export const PROFESSIONAL_INVOICE_TEMPLATE_ID = 'tpl_seed_invoice_professional_v1';
export const PROFESSIONAL_INVOICE_TEMPLATE_CSS = `
  .professional-invoice {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    color: #111827;
    font-family: "Segoe UI", Arial, sans-serif;
    border: 1px solid #d1d5db;
    box-sizing: border-box;
  }
  .professional-invoice * { box-sizing: border-box; }
  .professional-invoice .wrap { padding: 22px; }
  .professional-invoice .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111827;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .professional-invoice .name { font-size: 22px; font-weight: 800; margin-top: 6px; }
  .professional-invoice .title { text-align: right; }
  .professional-invoice .title h1 { margin: 0; font-size: 28px; letter-spacing: 0.05em; }
  .professional-invoice .meta { margin-top: 6px; font-size: 12px; color: #374151; }
  .professional-invoice .bill {
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .professional-invoice .bill .l { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; }
  .professional-invoice .bill .n { font-size: 14px; font-weight: 700; margin-top: 4px; }
  .professional-invoice table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
  .professional-invoice th {
    background: #111827 !important;
    color: #fff !important;
    border: 1px solid #111827 !important;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .04em;
    padding: 9px 10px;
    text-align: left;
  }
  .professional-invoice td { border: 1px solid #e5e7eb; padding: 8px 10px; }
  .professional-invoice .text-right { text-align: right; }
  .professional-invoice .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
  .professional-invoice .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .professional-invoice .card .h { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
  .professional-invoice .sum .r { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 7px 0; font-size: 12px; }
  .professional-invoice .sum .due {
    margin-top: 8px;
    background: #111827;
    color: #fff;
    border-radius: 6px;
    padding: 9px 10px;
    display: flex;
    justify-content: space-between;
    font-weight: 700;
  }
  .professional-invoice .foot {
    border-top: 1px solid #d1d5db;
    margin-top: 14px;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #6b7280;
  }
`;
export const PROFESSIONAL_INVOICE_TEMPLATE_HTML = `
<div class="professional-invoice">
  <div class="wrap">
    <header class="head">
      <div>
        <div>{{invoice.company_logo}}</div>
        <div class="name">{{invoice.company_name}}</div>
      </div>
      <div class="title">
        <h1>{{invoice.invoice_title}}</h1>
        <div class="meta">No: {{invoice.invoice_number}} | Date: {{invoice.date}} | Due: {{invoice.due_date}}</div>
      </div>
    </header>
    <section class="bill">
      <div class="l">Bill To</div>
      <div class="n">{{invoice.client_name}}</div>
      <div>{{invoice.customer_address}}</div>
      <div>{{invoice.customer_phone}} | {{invoice.customer_email}}</div>
    </section>
    <section>{{invoice.items_table}}</section>
    <section class="grid">
      <div class="card">
        <div class="h">Terms & Payment</div>
        <div>{{invoice.terms_and_conditions}}</div>
        <div><strong>Bank:</strong> {{invoice.bank_name}}</div>
        <div><strong>IFSC:</strong> {{invoice.ifsc_code}}</div>
        <div><strong>Account:</strong> {{invoice.bank_account_number}}</div>
      </div>
      <div class="card sum">
        <div class="h">Summary</div>
        <div class="r"><span>Subtotal</span><span>{{invoice.subtotal}}</span></div>
        <div class="r"><span>Tax</span><span>{{invoice.tax_amount}}</span></div>
        <div class="r"><span>Discount</span><span>{{invoice.discount}}</span></div>
        <div class="r"><span>Paid</span><span>{{invoice.paid_amount}}</span></div>
        <div class="due"><span>Balance Due</span><span>{{invoice.balance_due}}</span></div>
        <div style="margin-top:8px;text-align:right;">{{invoice.company_seal}} {{invoice.authorized_signature}}</div>
        <div style="text-align:right;font-size:11px;color:#6b7280;">{{invoice.authorized_signature_text}} {{invoice.designation}}</div>
      </div>
    </section>
    <footer class="foot">
      <div><strong>Thank you for your business</strong></div>
      <div>{{invoice.company_address}} | {{invoice.company_phone}} | {{invoice.company_email}}</div>
    </footer>
  </div>
</div>
`;

export const MINIMAL_INVOICE_TEMPLATE_ID = 'tpl_seed_invoice_minimal_v1';
export const MINIMAL_INVOICE_TEMPLATE_CSS = `
  .minimal-invoice { width: 210mm; min-height: 297mm; margin: 0 auto; font-family: Arial, sans-serif; color: #0f172a; background: #fff; }
  .minimal-invoice .w { padding: 24px; }
  .minimal-invoice .top { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:14px; }
  .minimal-invoice .top h1 { margin:0; font-size:30px; font-weight:800; }
  .minimal-invoice .meta { font-size:12px; color:#64748b; line-height:1.5; text-align:right; }
  .minimal-invoice .to { border:1px solid #e5e7eb; border-radius:8px; padding:10px; margin-bottom:12px; font-size:12px; }
  .minimal-invoice table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px; }
  .minimal-invoice th { background:#2563eb !important; color:#fff !important; padding:9px 10px; border:1px solid #2563eb !important; font-size:10px; text-transform:uppercase; }
  .minimal-invoice td { border:1px solid #e5e7eb; padding:8px 10px; }
  .minimal-invoice .text-right { text-align:right; }
  .minimal-invoice .sum { margin-left:auto; width:300px; border:1px solid #e5e7eb; border-radius:8px; padding:10px; font-size:12px; }
  .minimal-invoice .sum .r { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e5e7eb; }
  .minimal-invoice .sum .due { display:flex; justify-content:space-between; margin-top:8px; background:#2563eb; color:#fff; border-radius:6px; padding:8px 10px; font-weight:700; }
`;
export const MINIMAL_INVOICE_TEMPLATE_HTML = `
<div class="minimal-invoice">
  <div class="w">
    <div class="top">
      <div>
        <div>{{invoice.company_logo}}</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px;">{{invoice.company_name}}</div>
      </div>
      <div>
        <h1>{{invoice.invoice_title}}</h1>
        <div class="meta">{{invoice.invoice_number}}<br/>{{invoice.date}}<br/>{{invoice.due_date}}</div>
      </div>
    </div>
    <div class="to">
      <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Bill To</div>
      <div style="font-size:14px;font-weight:700;margin:4px 0;">{{invoice.client_name}}</div>
      <div>{{invoice.customer_address}}</div>
      <div>{{invoice.customer_phone}} | {{invoice.customer_email}}</div>
    </div>
    <div>{{invoice.items_table}}</div>
    <div class="sum">
      <div class="r"><span>Subtotal</span><span>{{invoice.subtotal}}</span></div>
      <div class="r"><span>Tax</span><span>{{invoice.tax_amount}}</span></div>
      <div class="r"><span>Discount</span><span>{{invoice.discount}}</span></div>
      <div class="r"><span>Paid</span><span>{{invoice.paid_amount}}</span></div>
      <div class="due"><span>Balance Due</span><span>{{invoice.balance_due}}</span></div>
    </div>
    <div style="margin-top:10px;font-size:12px;">{{invoice.terms_and_conditions}}</div>
  </div>
</div>
`;

export const PREMIUM_QUOTATION_TEMPLATE_ID = 'tpl_seed_quotation_premium_v1';
export const PREMIUM_QUOTATION_TEMPLATE_CSS = `
  .premium-quotation { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; color: #0f172a; font-family: Inter, Arial, sans-serif; }
  .premium-quotation .w { padding: 24px; }
  .premium-quotation .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; border-bottom:2px solid #0f172a; padding-bottom:10px; }
  .premium-quotation .brand { font-size: 20px; font-weight: 800; }
  .premium-quotation .ttl h1 { margin:0; color:#2563eb; font-size:30px; letter-spacing:.05em; }
  .premium-quotation .meta { font-size:12px; color:#64748b; text-align:right; margin-top:6px; }
  .premium-quotation .to { border:1px solid #e5e7eb; background:#f8fafc; border-radius:10px; padding:10px 12px; margin-bottom:12px; }
  .premium-quotation .to .l { font-size:10px; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:.06em; }
  .premium-quotation .to .n { font-size:14px; font-weight:700; margin-top:4px; }
  .premium-quotation table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px; }
  .premium-quotation th { background:#1e40af !important; color:#fff !important; border:1px solid #1e40af !important; padding:9px 10px; font-size:10px; text-transform:uppercase; letter-spacing:.04em; text-align:left; }
  .premium-quotation td { border:1px solid #e5e7eb; padding:8px 10px; }
  .premium-quotation .text-right { text-align:right; }
  .premium-quotation .sum { width:320px; margin-left:auto; border:1px solid #e5e7eb; border-radius:10px; padding:10px; }
  .premium-quotation .sum .r { display:flex; justify-content:space-between; border-bottom:1px solid #e5e7eb; padding:7px 0; font-size:12px; }
  .premium-quotation .sum .t { margin-top:8px; border-radius:8px; padding:9px 10px; display:flex; justify-content:space-between; background:linear-gradient(90deg,#1d4ed8,#2563eb); color:#fff; font-weight:800; }
  .premium-quotation .foot { margin-top:12px; border-top:1px solid #dbeafe; padding-top:8px; display:flex; justify-content:space-between; font-size:11px; color:#64748b; }
`;
export const PREMIUM_QUOTATION_TEMPLATE_HTML = `
<div class="premium-quotation">
  <div class="w">
    <header class="head">
      <div>
        <div>{{quotation.company_logo}}</div>
        <div class="brand">{{quotation.company_name}}</div>
      </div>
      <div class="ttl">
        <h1>{{quotation.quotation_title}}</h1>
        <div class="meta">No: {{quotation.quotation_number}} | Date: {{quotation.date}} | Valid: {{quotation.valid_until}}</div>
      </div>
    </header>
    <section class="to">
      <div class="l">Prepared For</div>
      <div class="n">{{quotation.client_name}}</div>
      <div>{{quotation.customer_address}}</div>
      <div>{{quotation.customer_phone}} | {{quotation.customer_email}}</div>
    </section>
    <section>{{quotation.items_table}}</section>
    <section class="grid" style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-top: 14px; align-items: start;">
      <div class="card" style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; bg: #f8fafc; font-size: 12px; line-height: 1.5; background: #f8fafc;">
        <div class="h" style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: .06em; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Terms & Bank Details</div>
        <div>{{quotation.terms_and_conditions}}</div>
        <div style="margin-top: 8px;"><strong>Bank Name:</strong> {{quotation.bank_name}}</div>
        <div><strong>Account Name:</strong> {{quotation.bank_account_name}}</div>
        <div><strong>Account Number:</strong> {{quotation.bank_account_number}}</div>
        <div><strong>IFSC Code:</strong> {{quotation.ifsc_code}}</div>
        <div style="margin-top: 8px; font-style: italic; color: #64748b;">{{quotation.company_notes}}</div>
      </div>
      <div class="sum" style="width: 100%; margin-left: 0;">
        <div class="r"><span>Subtotal</span><span>{{quotation.subtotal}}</span></div>
        <div class="r"><span>Discount</span><span>{{quotation.discount}}</span></div>
        <div class="r"><span>Tax</span><span>{{quotation.tax_amount}}</span></div>
        <div class="t"><span>Total</span><span>{{quotation.total}}</span></div>
      </div>
    </section>
    <footer class="foot">
      <div>{{quotation.terms_and_conditions}}</div>
      <div>{{quotation.company_email}} | {{quotation.company_phone}}</div>
    </footer>
  </div>
</div>
`;

export const PREMIUM_AGREEMENT_TEMPLATE_ID = 'tpl_seed_agreement_premium_v1';
export const PREMIUM_AGREEMENT_TEMPLATE_CSS = `
  .premium-agreement { width:210mm; min-height:297mm; margin:0 auto; background:#fff; color:#0f172a; font-family: Inter, Arial, sans-serif; }
  .premium-agreement .w { padding: 22px; }
  .premium-agreement .head { border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 14px; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
  .premium-agreement .brand { font-size: 19px; font-weight: 800; }
  .premium-agreement .meta { text-align:right; font-size:11px; color:#64748b; line-height:1.5; }
  .premium-agreement .title { text-align:center; font-size:28px; font-weight:800; letter-spacing:.04em; color:#1e40af; margin: 10px 0 14px; }
  .premium-agreement .party { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .premium-agreement .party .card { border:1px solid #e5e7eb; border-radius:10px; padding:10px; background:#f8fafc; }
  .premium-agreement .party .card .h { font-size:10px; text-transform:uppercase; color:#64748b; font-weight:700; letter-spacing:.06em; margin-bottom:6px; }
  .premium-agreement .body { border:1px solid #e5e7eb; border-radius:10px; padding:12px; min-height:130px; }
  .premium-agreement .sign { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:16px; }
  .premium-agreement .sign .s { border-top:1px solid #cbd5e1; padding-top:8px; font-size:12px; color:#475569; }
  .premium-agreement .foot { margin-top:12px; border-top:1px solid #dbeafe; padding-top:8px; font-size:11px; color:#64748b; text-align:center; }
`;
export const PREMIUM_AGREEMENT_TEMPLATE_HTML = `
<div class="premium-agreement">
  <div class="w">
    <header class="head">
      <div>
        <div>{{agreement.company_logo}}</div>
        <div class="brand">{{agreement.company_name}}</div>
      </div>
      <div class="meta">
        <div>No: {{agreement.agreement_reference_number}}</div>
        <div>Date: {{agreement.agreement_date}}</div>
      </div>
    </header>
    <div class="title">{{agreement.agreement_title}}</div>
    <section class="party">
      <div class="card">
        <div class="h">Service Provider</div>
        <div>{{agreement.provider_name}}</div>
        <div>{{agreement.provider_address}}</div>
        <div>{{agreement.provider_phone}} | {{agreement.provider_email}}</div>
      </div>
      <div class="card">
        <div class="h">Client</div>
        <div>{{agreement.client_name}}</div>
        <div>{{agreement.client_address}}</div>
        <div>{{agreement.client_phone}} | {{agreement.client_email}}</div>
      </div>
    </section>
    <section class="body">{{agreement.agreement_content}}</section>
    <section class="sign">
      <div class="s">{{agreement.provider_signature}} {{agreement.provider_signature_name}}</div>
      <div class="s">{{agreement.client_signature}} {{agreement.client_signature_name}}</div>
    </section>
    <footer class="foot">{{agreement.company_footer_text}} {{agreement.company_email}} {{agreement.company_phone}}</footer>
  </div>
</div>
`;
