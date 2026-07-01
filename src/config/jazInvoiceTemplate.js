/**
 * Jaz Infotech style A4 invoice print template.
 * Use with module: invoices. Variables: {{invoice.xxx}}
 */
export const JAZ_INVOICE_TEMPLATE_CSS = `
  .jaz-invoice { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.5; width: 210mm; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: #fff; box-sizing: border-box; position: relative; overflow: visible; }
  .jaz-invoice * { box-sizing: border-box; }
  @media print { 
    @page { size: A4; margin: 0 !important; } 
    .jaz-invoice { width: 210mm !important; max-width: 210mm !important; min-height: 297mm !important; height: auto !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: visible !important; }
  }

  .jaz-invoice .jaz-shape-top { position: absolute; top: 0; right: 0; width: 320px; height: 200px; background: #3f36a6; transform: skewY(-6deg); transform-origin: top right; z-index: 0; pointer-events: none; }
  .jaz-invoice .jaz-shape-bottom { position: absolute; bottom: 0; left: 0; width: 320px; height: 180px; background: #3f36a6; transform: skewY(6deg); transform-origin: bottom left; z-index: 0; pointer-events: none; }
  .jaz-invoice .jaz-inner { position: relative; z-index: 1; padding: 24px 28px 28px; min-height: 297mm; }

  .jaz-invoice .jaz-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .jaz-invoice .jaz-header-left { flex: 1; }
  .jaz-invoice .jaz-header-left .jaz-logo { max-height: 56px; max-width: 160px; display: block; margin-bottom: 8px; }
  .jaz-invoice .jaz-header-left .jaz-company-name { font-size: 18px; font-weight: 700; color: #1e293b; }
  .jaz-invoice .jaz-header-right { text-align: right; }
  .jaz-invoice .jaz-title { font-size: 32px; font-weight: 800; color: #3f36a6; letter-spacing: 0.02em; margin: 0; }

  .jaz-invoice .jaz-customer { margin-bottom: 18px; }
  .jaz-invoice .jaz-customer .jaz-to-heading { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #3f36a6; margin: 0 0 6px 0; }
  .jaz-invoice .jaz-customer .jaz-customer-name { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 4px 0; }
  .jaz-invoice .jaz-customer .jaz-customer-address { font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 2px 0; white-space: pre-line; }
  .jaz-invoice .jaz-customer .jaz-customer-phone { font-size: 13px; color: #475569; margin: 0; }

  .jaz-invoice .jaz-info-box { width: 100%; border: 2px solid #3f36a6; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 24px; }
  .jaz-invoice .jaz-info-box .jaz-info-item { }
  .jaz-invoice .jaz-info-box .jaz-info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px; }
  .jaz-invoice .jaz-info-box .jaz-info-value { font-size: 14px; font-weight: 600; color: #1e293b; }

  .jaz-invoice .jaz-table-wrap { margin-bottom: 20px; }
  .jaz-invoice .jaz-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .jaz-invoice .jaz-table-wrap th { background: #3f36a6; color: #fff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 12px 14px; text-align: left; border: 1px solid #3f36a6; }
  .jaz-invoice .jaz-table-wrap th.text-right { text-align: right; }
  .jaz-invoice .jaz-table-wrap td { padding: 10px 14px; border: 1px solid #e2e8f0; background: #f8fafc; }
  .jaz-invoice .jaz-table-wrap tr:nth-child(even) td { background: #f1f5f9; }
  .jaz-invoice .jaz-table-wrap td.text-right { text-align: right; }

  .jaz-invoice .jaz-totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .jaz-invoice .jaz-totals { width: 260px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .jaz-invoice .jaz-totals .jaz-total-row { display: flex; justify-content: space-between; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e2e8f0; background: #fff; }
  .jaz-invoice .jaz-totals .jaz-total-row:last-child { border-bottom: none; }
  .jaz-invoice .jaz-totals .jaz-total-row.jaz-total-due { background: #3f36a6; color: #fff; font-size: 15px; font-weight: 700; }

  .jaz-invoice .jaz-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; align-items: start; }
  .jaz-invoice .jaz-bottom-left .jaz-section-heading { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #3f36a6; margin: 0 0 8px 0; }
  .jaz-invoice .jaz-bottom-left .jaz-terms-list { font-size: 12px; color: #475569; line-height: 1.6; margin: 0 0 16px 0; white-space: pre-line; }
  .jaz-invoice .jaz-bottom-left .jaz-payment-row { font-size: 13px; margin-bottom: 4px; color: #334155; }
  .jaz-invoice .jaz-bottom-right { text-align: right; }
  .jaz-invoice .jaz-bottom-right .jaz-seal { display: block; margin-bottom: 8px; }
  .jaz-invoice .jaz-bottom-right .jaz-seal img { max-height: 52px; max-width: 90px; object-fit: contain; }
  .jaz-invoice .jaz-bottom-right .jaz-sig-image { display: block; margin-bottom: 6px; }
  .jaz-invoice .jaz-bottom-right .jaz-sig-image img { max-height: 48px; max-width: 140px; object-fit: contain; }
  .jaz-invoice .jaz-bottom-right .jaz-sig-name { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 2px 0; }
  .jaz-invoice .jaz-bottom-right .jaz-designation { font-size: 12px; color: #64748b; margin: 0; }

  .jaz-invoice .jaz-footer { border-top: 2px solid #e2e8f0; padding-top: 14px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .jaz-invoice .jaz-footer-left { font-size: 13px; font-weight: 700; color: #3f36a6; text-transform: uppercase; letter-spacing: 0.03em; }
  .jaz-invoice .jaz-footer-right { text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; }
`;

export const JAZ_INVOICE_TEMPLATE_HTML = `
<div class="jaz-invoice">
  <div class="jaz-shape-top" aria-hidden="true"></div>
  <div class="jaz-shape-bottom" aria-hidden="true"></div>
  <div class="jaz-inner">
    <header class="jaz-header">
      <div class="jaz-header-left">
        <div class="jaz-logo">{{invoice.company_logo}}</div>
        <div class="jaz-company-name">{{invoice.company_name}}</div>
      </div>
      <div class="jaz-header-right">
        <h1 class="jaz-title">{{invoice.invoice_title}}</h1>
      </div>
    </header>

    <section class="jaz-customer">
      <p class="jaz-to-heading">TO</p>
      <p class="jaz-customer-name">{{invoice.client_name}}</p>
      <p class="jaz-customer-address">{{invoice.customer_address}}</p>
      <p class="jaz-customer-phone">{{invoice.customer_phone}}</p>
    </section>

    <div class="jaz-info-box">
      <div class="jaz-info-item">
        <div class="jaz-info-label">Invoice Number</div>
        <div class="jaz-info-value">{{invoice.invoice_number}}</div>
      </div>
      <div class="jaz-info-item">
        <div class="jaz-info-label">Invoice Date</div>
        <div class="jaz-info-value">{{invoice.date}}</div>
      </div>
      <div class="jaz-info-item">
        <div class="jaz-info-label">Due Date</div>
        <div class="jaz-info-value">{{invoice.due_date}}</div>
      </div>
    </div>

    <div class="jaz-table-wrap">
      {{invoice.items_table}}
    </div>

    <div class="jaz-totals-wrap">
      <div class="jaz-totals">
        <div class="jaz-total-row">
          <span>Subtotal</span>
          <span>{{invoice.subtotal}}</span>
        </div>
        <div class="jaz-total-row">
          <span>Tax</span>
          <span>{{invoice.tax_amount}}</span>
        </div>
        <div class="jaz-total-row">
          <span>Discount</span>
          <span>{{invoice.discount}}</span>
        </div>
        <div class="jaz-total-row">
          <span>Paid</span>
          <span>{{invoice.paid_amount}}</span>
        </div>
        <div class="jaz-total-row jaz-total-due">
          <span>Balance Due</span>
          <span>{{invoice.balance_due}}</span>
        </div>
      </div>
    </div>

    <div class="jaz-bottom">
      <div class="jaz-bottom-left">
        <p class="jaz-section-heading">Terms and Conditions</p>
        <div class="jaz-terms-list">{{invoice.terms_and_conditions}}</div>
        <p class="jaz-section-heading">Payment Method</p>
        <div class="jaz-payment-row"><strong>Bank Name:</strong> {{invoice.bank_name}}</div>
        <div class="jaz-payment-row"><strong>Account Name:</strong> {{invoice.company_name}}</div>
        <div class="jaz-payment-row"><strong>IFSC:</strong> {{invoice.ifsc_code}}</div>
        <div class="jaz-payment-row"><strong>Account Number:</strong> {{invoice.bank_account_number}}</div>
      </div>
      <div class="jaz-bottom-right">
        <div class="jaz-seal">{{invoice.company_seal}}</div>
        <div class="jaz-sig-image">{{invoice.authorized_signature}}</div>
        <p class="jaz-sig-name">{{invoice.authorized_signature_text}}</p>
        <p class="jaz-designation">{{invoice.designation}}</p>
      </div>
    </div>

    <footer class="jaz-footer">
      <div class="jaz-footer-left">Thank you for your business</div>
      <div class="jaz-footer-right">
        <div>{{invoice.company_address}}</div>
        <div>{{invoice.company_phone}}</div>
        <div>{{invoice.company_email}}</div>
      </div>
    </footer>
  </div>
</div>
`;



