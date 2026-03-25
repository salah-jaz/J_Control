/**
 * Premium Jaz Infotech Print Templates
 * Recreates the professional design shown in reference images.
 */

const SHARED_STYLES = `
  .jaz-doc { font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; width: 210mm; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: #fff; box-sizing: border-box; position: relative; }
  .jaz-doc * { box-sizing: border-box; }
  @media print { 
    @page { size: A4; margin: 0 !important; } 
    html, body { width: 210mm !important; height: auto !important; min-height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; box-sizing: border-box !important; }
    .jaz-doc { 
      width: 210mm !important; 
      max-width: 210mm !important; 
      min-height: 297mm !important; 
      height: auto !important;
      max-height: none !important;
      margin: 0 !important; 
      padding: 0 !important; 
      border: none !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      color-adjust: exact !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      page-break-after: auto !important;
      page-break-inside: auto !important;
    } 
    .jaz-acc-tl, .jaz-acc-tr, .jaz-acc-bl {
       position: fixed !important;
       -webkit-print-color-adjust: exact !important;
    }
    .jaz-inner { padding: 20mm 15mm !important; overflow: visible !important; box-sizing: border-box !important; height: auto !important; }
    h1, h2, h3, h4, h5, h6, .jaz-header { page-break-after: avoid; break-after: avoid; }
    .jaz-table-container, .jaz-summary, .jaz-payment-info, .jaz-signature-block, .jaz-agreement-body, tr, .jaz-total-row {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

  /* Accents */
  .jaz-acc-tl { position: absolute; top: 0; left: 0; width: 300px; height: 40px; background: linear-gradient(135deg, #3f36a6 0%, #1e1b4b 100%); clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%); z-index: 5; }
  .jaz-acc-tr { position: absolute; top: 0; right: 0; width: 300px; height: 40px; background: linear-gradient(-135deg, #3f36a6 0%, #1e1b4b 100%); clip-path: polygon(0 0, 100% 0, 100% 100%, 15% 100%); z-index: 5; }
  .jaz-acc-bl { position: absolute; bottom: 0; left: 0; width: 200px; height: 30px; background: #3f36a6; clip-path: polygon(0 0, 100% 100%, 0 100%); z-index: 5; }
  
  .jaz-inner { position: relative; z-index: 10; padding: 20mm 15mm; }

  .jaz-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .jaz-logo-wrap { display: flex; align-items: center; gap: 12px; }
  .jaz-logo-wrap img { max-height: 50px; }
  .jaz-brand-name { font-size: 20px; font-weight: 800; color: #3f36a6; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .jaz-title-section { text-align: right; }
  .jaz-doc-title { font-size: 48px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase; line-height: 1; }
  .jaz-to-label { font-size: 14px; font-weight: 700; color: #1e293b; margin: 20px 0 8px; text-transform: uppercase; }
  .jaz-client-info { font-size: 13px; color: #475569; width: 280px; }
  .jaz-client-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }

  .jaz-meta-bar { display: flex; justify-content: space-between; border: 1.5px solid #1e293b; border-radius: 4px; padding: 8px 20px; margin-bottom: 30px; }
  .jaz-meta-item { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 600; }
  .jaz-meta-label { color: #1e293b; text-transform: uppercase; }
  .jaz-meta-value { color: #1e293b; }

  /* Table Styles */
  .jaz-table-container { margin-bottom: 30px; }
  .jaz-table-container table { width: 100%; border-collapse: collapse; }
  .jaz-table-container th { background: #3f36a6; color: #fff; text-align: left; padding: 12px 15px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: none; }
  .jaz-table-container td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
  .jaz-table-container tr:nth-child(even) td { background: #f8fafc; }
  
  /* Totals Section */
  .jaz-summary { display: flex; justify-content: space-between; margin-top: 20px; }
  .jaz-summary-left { width: 400px; }
  .jaz-summary-right { width: 240px; }
  
  .jaz-total-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #475569; border-radius: 4px; margin-bottom: 4px; }
  .jaz-total-row.bg-slate { background: #f1f5f9; }
  .jaz-total-row.grand-total { background: #3f36a6; color: #fff; font-size: 15px; font-weight: 700; margin-top: 8px; }

  .jaz-section-h { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 0.02em; }
  .jaz-text-sm { font-size: 11px; color: #64748b; line-height: 1.6; }
  
  .jaz-payment-info { margin-top: 20px; display: grid; grid-template-columns: 100px 1fr; gap: 4px 12px; font-size: 12px; }
  .jaz-payment-label { color: #64748b; font-weight: 500; }
  .jaz-payment-value { color: #1e293b; font-weight: 600; }

  .jaz-footer-branding { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
  .jaz-thanks { font-size: 16px; font-weight: 800; color: #3f36a6; text-transform: uppercase; font-style: italic; }
  
  .jaz-signature-block { text-align: center; width: 200px; }
  .jaz-stamp-img { max-height: 80px; margin: 0 auto 10px; display: block; }
  .jaz-sig-img { max-height: 40px; margin: 0 auto 8px; display: block; }
  .jaz-sig-line { height: 1.5px; background: #1e293b; margin-bottom: 8px; }
  .jaz-sig-name { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; }
  .jaz-sig-title { font-size: 11px; color: #64748b; font-weight: 600; }

  .jaz-company-contact { text-align: right; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; font-size: 11px; color: #3f36a6; font-weight: 600; }
`;

export const PREMIUM_TEMPLATES = {
  invoices: {
    html: `
<div class="jaz-doc">
  <div class="jaz-acc-tl"></div>
  <div class="jaz-acc-tr"></div>
  <div class="jaz-acc-bl"></div>

  <div class="jaz-inner">
    <header class="jaz-header">
      <div class="jaz-logo-wrap">
        {{invoice.company_logo}}
        <span class="jaz-brand-name">{{invoice.company_name}}</span>
      </div>
      <div class="jaz-title-section">
        <h1 class="jaz-doc-title">INVOICE</h1>
        <div class="jaz-to-label">TO</div>
        <div class="jaz-client-info">
          <div class="jaz-client-name">{{invoice.client_name}}</div>
          <div>{{invoice.customer_address}}</div>
        </div>
      </div>
    </header>

    <div class="jaz-meta-bar">
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">INVOICE #</span>
        <span class="jaz-meta-value">{{invoice.invoice_number}}</span>
      </div>
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">DATE :</span>
        <span class="jaz-meta-value">{{invoice.date}}</span>
      </div>
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">DUE DATE:</span>
        <span class="jaz-meta-value">{{invoice.due_date}}</span>
      </div>
    </div>

    <div class="jaz-table-container">
      {{invoice.items_table}}
    </div>

    <div class="jaz-summary">
      <div class="jaz-summary-left">
        <h3 class="jaz-section-h">TERM AND CONDITIONS</h3>
        <div class="jaz-text-sm">{{invoice.terms_and_conditions}}</div>
        
        <h3 class="jaz-section-h" style="margin-top:20px;">PAYMENT METHOD</h3>
        <div class="jaz-payment-info">
          <span class="jaz-payment-label">Bank</span>
          <span class="jaz-payment-value">{{invoice.bank_name}}</span>
          
          <span class="jaz-payment-label">Account Name</span>
          <span class="jaz-payment-value">{{invoice.company_name}}</span>
          
          <span class="jaz-payment-label">IFSC</span>
          <span class="jaz-payment-value">{{invoice.ifsc_code}}</span>
          
          <span class="jaz-payment-label">Account Number</span>
          <span class="jaz-payment-value">{{invoice.bank_account_number}}</span>
        </div>
      </div>
      
      <div class="jaz-summary-right">
        <div class="jaz-total-row bg-slate">
          <span>SUB-TOTAL</span>
          <span>{{invoice.subtotal}}</span>
        </div>
        <div class="jaz-total-row bg-slate">
          <span>TAX (%)</span>
          <span>{{invoice.tax_amount}}</span>
        </div>
        <div class="jaz-total-row grand-total">
          <span>Total Due</span>
          <span>{{invoice.grand_total}}</span>
        </div>

        <div class="jaz-signature-block" style="margin-top:40px; margin-left:auto;">
           <div class="jaz-stamp-img">{{invoice.company_seal}}</div>
           <div class="jaz-sig-img">{{invoice.authorized_signature}}</div>
           <div class="jaz-sig-line"></div>
           <div class="jaz-sig-name">{{invoice.authorized_signature_text}}</div>
           <div class="jaz-sig-title">{{invoice.designation}}</div>
        </div>
      </div>
    </div>

    <div class="jaz-footer-branding">
      <div class="jaz-thanks">THANK YOU FOR YOUR BUSINESS</div>
    </div>
    
    <div class="jaz-company-contact">
      {{invoice.company_address}} | {{invoice.company_phone}} | {{invoice.company_email}}
    </div>
  </div>
</div>
`,
    css: SHARED_STYLES
  },
  quotations: {
    html: `
<div class="jaz-doc">
  <div class="jaz-acc-tl"></div>
  <div class="jaz-acc-tr"></div>
  <div class="jaz-acc-bl"></div>

  <div class="jaz-inner">
    <header class="jaz-header">
      <div class="jaz-logo-wrap">
        {{quotation.company_logo}}
        <span class="jaz-brand-name">{{quotation.company_name}}</span>
      </div>
      <div class="jaz-title-section">
        <h1 class="jaz-doc-title">QUOTATION</h1>
        <div class="jaz-to-label">TO</div>
        <div class="jaz-client-info">
          <div class="jaz-client-name">{{quotation.client_name}}</div>
          <div>{{quotation.customer_address}}</div>
        </div>
      </div>
    </header>

    <div class="jaz-meta-bar">
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">QUOTATION #</span>
        <span class="jaz-meta-value">{{quotation.quotation_number}}</span>
      </div>
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">DATE :</span>
        <span class="jaz-meta-value">{{quotation.date}}</span>
      </div>
      <div class="jaz-meta-item">
        <span class="jaz-meta-label">VALID UNTIL:</span>
        <span class="jaz-meta-value">{{quotation.valid_until}}</span>
      </div>
    </div>

    <div class="jaz-table-container">
      {{quotation.items_table}}
    </div>

    <div class="jaz-summary">
      <div class="jaz-summary-left">
        <h3 class="jaz-section-h">TERM AND CONDITIONS</h3>
        <div class="jaz-text-sm">{{quotation.terms_and_conditions}}</div>
        
        <h3 class="jaz-section-h" style="margin-top:20px;">PAYMENT TERMS</h3>
        <div class="jaz-payment-info">
          <span class="jaz-payment-label">Status</span>
          <span class="jaz-payment-value">{{quotation.payment_status}}</span>
          
          <span class="jaz-payment-label">Notes</span>
          <span class="jaz-payment-value">{{quotation.company_notes}}</span>
        </div>
      </div>
      
      <div class="jaz-summary-right">
        <div class="jaz-total-row bg-slate">
          <span>SUB-TOTAL</span>
          <span>{{quotation.subtotal}}</span>
        </div>
        <div class="jaz-total-row bg-slate">
          <span>TAX</span>
          <span>{{quotation.tax_amount}}</span>
        </div>
        <div class="jaz-total-row grand-total">
          <span>TOTAL</span>
          <span>{{quotation.total}}</span>
        </div>

        <div class="jaz-signature-block" style="margin-top:40px; margin-left:auto;">
           <div class="jaz-stamp-img">{{quotation.company_seal}}</div>
           <div class="jaz-sig-img">{{quotation.authorized_signature}}</div>
           <div class="jaz-sig-line"></div>
           <div class="jaz-sig-name">{{quotation.authorized_signature_text}}</div>
           <div class="jaz-sig-title">Authorized Signatory</div>
        </div>
      </div>
    </div>

    <div class="jaz-footer-branding">
      <div class="jaz-thanks">THANK YOU FOR YOUR INTEREST</div>
    </div>
    
    <div class="jaz-company-contact">
      {{quotation.company_address}} | {{quotation.company_phone}} | {{quotation.company_email}}
    </div>
  </div>
</div>
`,
    css: SHARED_STYLES
  },
  agreements: {
    html: `
<div class="jaz-doc">
  <div class="jaz-acc-tl"></div>
  <div class="jaz-acc-tr"></div>
  <div class="jaz-acc-bl"></div>

  <div class="jaz-inner">
    <header class="jaz-header" style="margin-bottom: 20px;">
      <div class="jaz-logo-wrap">
        {{agreement.company_logo}}
        <span class="jaz-brand-name">{{agreement.company_name}}</span>
      </div>
      <div class="jaz-title-section">
        <h1 class="jaz-doc-title" style="font-size: 32px;">AGREEMENT</h1>
      </div>
    </header>

    <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px;">
       <div style="width: 48%;">
          <div class="jaz-section-h">Service Provider</div>
          <div class="jaz-client-name">{{agreement.provider_name}}</div>
          <div class="jaz-text-sm">{{agreement.provider_address}}</div>
          <div class="jaz-text-sm">{{agreement.provider_email}}</div>
       </div>
       <div style="width: 48%; text-align: right;">
          <div class="jaz-section-h">Client</div>
          <div class="jaz-client-name">{{agreement.client_name}}</div>
          <div class="jaz-text-sm">{{agreement.client_address}}</div>
          <div class="jaz-text-sm">{{agreement.client_email}}</div>
       </div>
    </div>

    <div class="jaz-meta-bar" style="margin-bottom: 30px;">
       <div class="jaz-meta-item">
          <span class="jaz-meta-label">Subject:</span>
          <span class="jaz-meta-value">{{agreement.agreement_title}}</span>
       </div>
       <div class="jaz-meta-item">
          <span class="jaz-meta-label">Ref:</span>
          <span class="jaz-meta-value">{{agreement.agreement_reference_number}}</span>
       </div>
       <div class="jaz-meta-item">
          <span class="jaz-meta-label">Date:</span>
          <span class="jaz-meta-value">{{agreement.agreement_date}}</span>
       </div>
    </div>

    <div class="jaz-agreement-body" style="margin-bottom: 20px;">
       {{agreement.agreement_content}}
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px;">
       <div class="jaz-signature-block" style="width: 100%;">
          <div class="jaz-section-h" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">Provider Approval</div>
          <div class="jaz-sig-img" style="height: 60px;">{{agreement.provider_signature}}</div>
          <div class="jaz-sig-line"></div>
          <div class="jaz-sig-name">{{agreement.provider_signature_name}}</div>
          <div class="jaz-sig-title">Date: {{agreement.provider_signature_date}}</div>
       </div>
       <div class="jaz-signature-block" style="width: 100%;">
          <div class="jaz-section-h" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">Client Approval</div>
          <div class="jaz-sig-img" style="height: 60px;">{{agreement.client_signature}}</div>
          <div class="jaz-sig-line"></div>
          <div class="jaz-sig-name">{{agreement.client_signature_name}}</div>
          <div class="jaz-sig-title">Date: {{agreement.client_signature_date}}</div>
       </div>
    </div>

    <div class="jaz-company-contact">
      {{agreement.company_address}} | {{agreement.company_phone}} | {{agreement.company_email}}
    </div>
  </div>
</div>
`,
    css: SHARED_STYLES
  }
};
