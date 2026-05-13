import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { LayoutTemplate, Plus, Pencil, Trash2, X, FileText, Check, Settings2, FileCode2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { MODULES, MODULE_FIELDS, getDefaultCss, buildFullTemplateHtml, getSampleData, resolveTemplateHtmlWithData } from '../config/printTemplateModules';
import {
    getTemplates,
    deleteTemplate,
    saveTemplate,
} from '../utils/printTemplateStorage';

export default function ModernPrintTemplatesList() {
    const [templates, setTemplates] = useState(() => getTemplates());
    const [activeTab, setActiveTab] = useState('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        module: MODULES[0]?.value || 'invoices',
        description: '',
        isDefault: false,
        template_html: '',
        template_css: ''
    });

    const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
    const [exampleTab, setExampleTab] = useState('html');
    const [exampleDocType, setExampleDocType] = useState('invoices');

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    const handleOpenPreview = (t) => {
        let htmlVal = t.template_html || '';
        let cssVal = t.template_css || '';

        if (!htmlVal.trim()) {
            htmlVal = buildFullTemplateHtml(t, t.module, { includeStyle: false });
            cssVal = cssVal.trim() ? cssVal : getDefaultCss(t.module);
        }

        const fullHtml = `<style>${cssVal}</style>${htmlVal}`;
        const sampleData = getSampleData(t.module);
        const rendered = resolveTemplateHtmlWithData(fullHtml, t.module, sampleData);
        setPreviewContent(rendered);
        setIsPreviewModalOpen(true);
    };

    const EXAMPLE_TEMPLATES = {
        invoices: {
            html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>{{invoice.invoice_title}}</title>
</head>
<body>
<div class="invoice">
<!-- Top Design -->
<div class="top-shape"></div>
<header class="header">
<div class="logo">
<h2>{{invoice.company_name}}</h2>
</div>
<div class="title">
<h1>{{invoice.invoice_title}}</h1>
</div>
</header>
<section class="client">
<h3>TO</h3>
<p><strong>{{invoice.client_name}}</strong></p>
<p>{{invoice.customer_address}}</p>
</section>
<!-- Invoice Info Bar -->
<div class="invoice-info">
<span><strong>INVOICE #</strong> {{invoice.invoice_number}}</span>
<span><strong>DATE :</strong> {{invoice.date}}</span>
<span><strong>DUE DATE:</strong> {{invoice.due_date}}</span>
</div>
<!-- Table -->
<div style="margin-bottom: 20px;">
{{invoice.items_table}}
</div>
<!-- Totals -->
<div class="totals">
<div class="box">
<p>SUB-TOTAL <span>{{invoice.subtotal}}</span></p>
<p>TAX <span>{{invoice.tax_amount}}</span></p>
<p class="total">Total Due <span>{{invoice.grand_total}}</span></p>
</div>
</div>
<!-- Terms -->
<section class="terms">
<h4>TERM AND CONDITIONS</h4>
<p>{{invoice.terms_and_conditions}}</p>
</section>
<!-- Payment -->
<section class="payment">
<h4>PAYMENT METHOD</h4>
<p><strong>Bank:</strong> {{invoice.bank_name}}</p>
<p><strong>IFSC:</strong> {{invoice.ifsc_code}}</p>
<p><strong>Account Number:</strong> {{invoice.bank_account_number}}</p>
</section>
<!-- Signature -->
<div class="signature">
<div class="sign">
<p>{{invoice.authorized_signature}}</p>
<p>{{invoice.authorized_signature_text}}</p>
<p>{{invoice.designation}}</p>
</div>
</div>
<footer>
<p>THANK YOU FOR YOUR BUSINESS</p>
<p>{{invoice.company_address}}</p>
<p>{{invoice.company_email}}</p>
</footer>
</div>
</body>
</html>`,
            css: `body{
font-family:Arial;
background:#f2f2f2;
padding:30px;
}
.invoice{
background:white;
max-width:850px;
margin:auto;
padding:30px;
position:relative;
}
/* Top Shape */
.top-shape{
height:40px;
background:#2d1b8f;
clip-path:polygon(0 0,100% 0,90% 100%,0% 100%);
margin-bottom:20px;
}
/* Header */
.header{
display:flex;
justify-content:space-between;
align-items:center;
}
.logo h2{
color:#2d1b8f;
margin:0;
}
.title h1{
font-size:36px;
margin:0;
}
/* Client */
.client{
margin-top:20px;
}
.client h3{
margin-bottom:5px;
}
/* Info bar */
.invoice-info{
border:2px solid #333;
display:flex;
justify-content:space-between;
padding:8px;
margin:20px 0;
font-size:14px;
}
/* Table */
.items{
width:100%;
border-collapse:collapse;
margin-bottom:20px;
}
.items th{
background:#2d1b8f;
color:white;
padding:10px;
text-align:left;
}
.items td{
padding:10px;
border-bottom:1px solid #ddd;
}
.included{
background:#f2c4df;
font-weight:bold;
}
.items ul{
margin:0;
padding-left:20px;
}
/* Totals */
.totals{
display:flex;
justify-content:flex-end;
}
.box{
width:220px;
}
.box p{
display:flex;
justify-content:space-between;
padding:8px;
background:#eee;
margin:4px 0;
}
.box .total{
background:#2d1b8f;
color:white;
font-weight:bold;
}
/* Terms */
.terms{
margin-top:20px;
}
.terms ul{
padding-left:20px;
}
/* Payment */
.payment{
margin-top:20px;
}
/* Signature */
.signature{
margin-top:30px;
display:flex;
justify-content:flex-end;
}
.sign{
text-align:center;
}
/* Footer */
footer{
margin-top:30px;
font-size:14px;
}
@media print {
  @page { size: A4; margin: 0 !important; }
  body { background: transparent !important; padding: 0 !important; margin: 0 !important; height: 100% !important; }
  .invoice { 
    max-width: none !important; 
    margin: 0 !important; 
    padding: 0 !important; 
    box-shadow: none !important; 
    border: none !important;
    min-height: 297mm !important;
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
    overflow: visible !important; 
  }
  .top-shape { position: fixed !important; top: 0 !important; left: 0 !important; z-index: 100 !important; }
  .items, tr, .totals, .terms, .payment, .signature, footer, .client { page-break-inside: avoid; break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
}`
        },
        quotations: {
            html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{quotation.quotation_title}} - {{quotation.quotation_number}}</title>
</head>
<body>
    <div class="quotation-wrap">
        <header class="quotation-header">
            <div>
                <h1>{{quotation.quotation_title}}</h1>
                <p><strong>Quote No:</strong> {{quotation.quotation_number}}</p>
                <p><strong>Date:</strong> {{quotation.date}}</p>
            </div>
            <div class="company-details">
                <p class="company-name">{{quotation.company_name}}</p>
                <p>{{quotation.company_phone}} | {{quotation.company_email}}</p>
            </div>
        </header>
        <div class="client-details">
            <h3>Quotation For:</h3>
            <p><strong>{{quotation.client_name}}</strong></p>
            <p>{{quotation.customer_address}}</p>
        </div>
        
        <div class="items-wrap">
            {{quotation.items_table}}
        </div>
        
        <div class="totals-section">
            <p>Subtotal: {{quotation.subtotal}}</p>
            <p>Tax: {{quotation.tax_amount}}</p>
            <p class="grand-total">Total: {{quotation.total}}</p>
        </div>
    </div>
</body>
</html>`,
            css: `body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
.quotation-wrap { max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; }
.quotation-header { display: flex; justify-content: space-between; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 20px; }
.quotation-header h1 { margin: 0 0 10px 0; font-size: 28px; color: #1e293b; }
.company-details { text-align: right; }
.company-name { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
.client-details { margin-bottom: 30px; }
.client-details h3 { color: #f59e0b; margin-bottom: 5px; }
.items-wrap { margin-bottom: 30px; }
.totals-section { text-align: right; width: 300px; margin-left: auto; border-top: 1px solid #cbd5e1; padding-top: 15px; }
.grand-total { font-weight: bold; font-size: 18px; color: #f59e0b; }
@media print {
  @page { size: A4; margin: 0 !important; }
  body { background: transparent !important; padding: 0 !important; margin: 0 !important; height: 100% !important; }
  .quotation-wrap { 
    max-width: none !important; 
    margin: 0 !important; 
    padding: 0 !important; 
    border: none !important; 
    box-shadow: none !important; 
    min-height: 297mm !important;
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
    overflow: visible !important; 
  }
  .items-wrap, tr, .totals-section, .client-details { page-break-inside: avoid; break-inside: avoid; }
  h1, h2, h3, h4, .quotation-header { page-break-after: avoid; break-after: avoid; }
}`
        },
        agreements: {
            html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{agreement.agreement_title}}</title>
</head>
<body>
    <div class="agreement-wrap">
        <header class="agreement-header">
            <h1>{{agreement.agreement_title}}</h1>
        </header>

        <div class="party-details">
            <div class="party-block">
                <h3>Provider</h3>
                <p><strong>{{agreement.provider_name}}</strong></p>
                <p>{{agreement.provider_address}}</p>
            </div>
            <div class="party-block">
                <h3>Client</h3>
                <p><strong>{{agreement.client_name}}</strong></p>
                <p>{{agreement.client_address}}</p>
            </div>
        </div>

        <div class="agreement-body">
            <div class="dynamic-content">
                {{agreement.agreement_content}}
            </div>
        </div>

        <div class="signature-section">
            <div class="sig-box">
                <p class="sig-title">Provider Signature:</p>
                <div class="sig-line"></div>
                <p>{{agreement.provider_signature_name}}</p>
            </div>
            <div class="sig-box">
                <p class="sig-title">Client Signature:</p>
                <div class="sig-line"></div>
                <p>{{agreement.client_signature_name}}</p>
            </div>
        </div>
    </div>
</body>
</html>`,
            css: `body { font-family: Georgia, serif; line-height: 1.6; color: #1e293b; padding: 40px; }
.agreement-wrap { max-width: 850px; margin: 0 auto; background: #fff; }
.agreement-header { text-align: center; border-bottom: 2px solid #1e293b; margin-bottom: 20px; padding-bottom: 15px; }
.agreement-header h1 { letter-spacing: 2px; margin: 0; }
.party-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
.party-block h3 { margin-top: 0; color: #64748b; text-transform: uppercase; font-size: 11px; margin-bottom: 5px; }
.party-block p { margin: 2px 0; }
.dynamic-content { margin: 15px 0; }
.signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
.sig-box { padding-top: 10px; }
.sig-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 8px; }
.sig-title { font-weight: bold; color: #64748b; font-size: 13px; margin: 0; }
@media print {
  @page { size: A4; margin: 0 !important; }
  body { background: transparent !important; padding: 0 !important; margin: 0 !important; height: 100% !important; }
  .agreement-wrap { 
    max-width: none !important; 
    margin: 0 !important; 
    padding: 0 !important; 
    border: none !important; 
    box-shadow: none !important; 
    min-height: 297mm !important;
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
    overflow: visible !important; 
  }
  .party-details, .signature-section, .sig-box, .party-block, tr { page-break-inside: avoid; break-inside: avoid; }
  h1, h2, h3, h4, .agreement-header { page-break-after: avoid; break-after: avoid; }
}`
        }
    };

    const exampleHtmlCode = EXAMPLE_TEMPLATES[exampleDocType].html;
    const exampleCssCode = EXAMPLE_TEMPLATES[exampleDocType].css;

    const refresh = () => setTemplates(getTemplates());

    const handleDelete = (id, name) => {
        if (!window.confirm(`Delete template "${name}"?`)) return;
        deleteTemplate(id);
        refresh();
        toast.success('Template deleted');
    };

    const handleOpenNew = (customHtml = null, customCss = null, defaultModule = null) => {
        setFormData({
            name: '',
            module: defaultModule || MODULES[0]?.value || 'invoices',
            description: '',
            isDefault: false,
            template_html: customHtml || '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Print Template</title>\n</head>\n<body>\n  <div class="print-doc">\n    \n  </div>\n</body>\n</html>',
            template_css: customCss || 'body { font-family: sans-serif; margin: 20px; }\n.print-doc { border: 1px solid #ddd; padding: 20px; }\nh1 { font-size: 1.5rem; margin-bottom: 1rem; }'
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleCopyExample = () => {
        const textToCopy = exampleTab === 'html' ? exampleHtmlCode : exampleCssCode;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy);
            toast.success('Code copied to clipboard!');
        } else {
            toast.error('Clipboard access not available');
        }
    };

    const handleUseBaseForNew = () => {
        setIsExampleModalOpen(false);
        handleOpenNew(exampleHtmlCode, exampleCssCode, exampleDocType);
    };

    const handleOpenEdit = (t) => {
        let htmlVal = t.template_html || '';
        let cssVal = t.template_css || '';

        // If template doesn't have custom HTML/CSS yet, generate it
        if (!htmlVal.trim()) {
            htmlVal = buildFullTemplateHtml(t, t.module, { includeStyle: false });
            cssVal = cssVal.trim() ? cssVal : getDefaultCss(t.module);
        }

        setFormData({
            name: t.name || '',
            module: t.module || 'invoices',
            description: t.description || '',
            isDefault: t.isDefault || false,
            template_html: htmlVal,
            template_css: cssVal
        });
        setEditingId(t.id);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            toast.error('Template Name is required');
            return;
        }

        saveTemplate({
            id: editingId || undefined,
            name: formData.name,
            module: formData.module,
            description: formData.description,
            isDefault: formData.isDefault,
            template_html: formData.template_html,
            template_css: formData.template_css
        });

        refresh();
        toast.success(editingId ? 'Template updated successfully' : 'Template created successfully');
        setIsModalOpen(false);
    };

    const moduleLabel = (key) => MODULES.find((m) => m.value === key)?.label || key;

    const getFilteredItems = () => {
        if (activeTab === 'All') return templates;
        return templates.filter(t => t.module === activeTab);
    };

    const itemsToShow = getFilteredItems();

    // Placeholders for active module
    const currentModule = MODULES.find(m => m.value === formData.module);
    const prefix = currentModule?.prefix || 'invoice';
    const fields = MODULE_FIELDS[formData.module] || [];
    const placeholdersText = fields.map(f => `{{${prefix}.${f.variable}}}`).join(' ');

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto animate-fade-in bg-slate-50 min-h-screen">
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-[#0ea5e9] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/20 text-white">
                                <FileCode2 className="w-5 h-5" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Print Templates</h1>
                        </div>
                        <p className="text-slate-500 text-sm max-w-2xl pl-1">
                            Build, manage, and assign custom HTML & CSS printing layouts for your business documents.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-slate-200 bg-white gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                        <FileText className="w-5 h-5 text-indigo-500 mr-2" />
                        <span className="font-semibold text-slate-700 mr-4">Print Templates</span>

                        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50 shadow-inner">
                            {['All', ...MODULES.map(m => m.value)].map((t, idx) => (
                                <React.Fragment key={t}>
                                    {idx > 0 && <div className="w-px bg-slate-200 my-1.5"></div>}
                                    <button
                                        onClick={() => setActiveTab(t)}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            activeTab === t
                                                ? "bg-white text-indigo-600 shadow-md border border-slate-100"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {t === 'All' ? 'All Modules' : MODULES.find(m => m.value === t)?.label || t}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsExampleModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-sm font-semibold transition-all"
                        >
                            <LayoutTemplate className="w-4 h-4 text-slate-400" /> View example code
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenNew}
                            className="inline-flex items-center justify-center gap-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm shadow-[#0ea5e9]/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4" /> Add Template
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-600 text-sm bg-slate-50 font-semibold">
                                <th className="py-4 px-6">Name</th>
                                <th className="py-4 px-6 text-center">Type</th>
                                <th className="py-4 px-6 text-center">Default</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {itemsToShow.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                <FileText className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="font-semibold text-lg text-slate-700">No templates found</p>
                                            <p className="text-sm mt-1 max-w-sm">You haven't created any print templates for this category yet. Click 'Add Template' to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : itemsToShow.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="font-semibold text-slate-700">{t.name}</div>
                                        {t.description && <div className="text-xs text-slate-400 mt-1 truncate max-w-sm">{t.description}</div>}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold
                                            ${t.module === 'invoices' ? 'text-blue-600 bg-blue-50' : ''}
                                            ${t.module === 'quotations' ? 'text-teal-600 bg-teal-50' : ''}
                                            ${t.module === 'agreements' ? 'text-purple-600 bg-purple-50' : ''}
                                            ${!['invoices', 'quotations', 'agreements'].includes(t.module) ? 'text-green-600 bg-green-50' : ''}
                                        `}>
                                            {moduleLabel(t.module)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {t.isDefault ? (
                                            <span className="inline-flex text-slate-500">-</span>
                                        ) : (
                                            <span className="inline-flex text-slate-300">-</span>
                                        )}
                                        {/* Based on reference image, default column just shows a simple line if true/false, maybe a badge if true */}
                                        {t.isDefault && (
                                            <span className="ml-2 inline-flex text-emerald-500 bg-emerald-50 rounded px-1"><Check className="w-4 h-4" /></span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenPreview(t)}
                                                className="p-1.5 rounded-md text-slate-400 bg-slate-100 hover:bg-blue-100 hover:text-blue-500 transition-colors"
                                                title="Preview Template"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(t)}
                                                className="p-1.5 rounded-md text-slate-400 bg-slate-100 hover:bg-orange-100 hover:text-orange-500 transition-colors"
                                                title="Edit Template"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(t.id, t.name)}
                                                className="p-1.5 rounded-md text-slate-400 bg-slate-100 hover:bg-red-100 hover:text-red-500 transition-colors"
                                                title="Delete Template"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Template Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingId ? 'Edit Print Template' : 'New Print Template'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Invoice A4"
                                        className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                                    <select
                                        className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] transition-all bg-white"
                                        value={formData.module}
                                        onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                                    >
                                        {MODULES.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Short description"
                                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] transition-all"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    className="w-4 h-4 rounded border-slate-300 text-[#0ea5e9] focus:ring-[#0ea5e9]"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                />
                                <label htmlFor="isDefault" className="text-sm font-medium text-slate-700 cursor-pointer">
                                    Use as default for this type
                                </label>
                            </div>

                            {/* Placeholders box */}
                            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Placeholders (use in HTML)</span>
                                </div>
                                <div className="p-4 bg-white text-[13px] font-mono leading-relaxed text-slate-500 break-words max-h-32 overflow-y-auto w-full">
                                    {placeholdersText}
                                </div>
                            </div>

                            {/* HTML Editor */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <span className="text-slate-400">&lt;&gt;</span> HTML
                                </label>
                                <textarea
                                    spellCheck={false}
                                    className="w-full font-mono text-sm p-4 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] bg-[#f8fafc] text-slate-800 min-h-[300px] resize-y"
                                    value={formData.template_html}
                                    onChange={(e) => setFormData({ ...formData, template_html: e.target.value })}
                                />
                            </div>

                            {/* CSS Editor */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    CSS (optional)
                                </label>
                                <textarea
                                    spellCheck={false}
                                    className="w-full font-mono text-sm p-4 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] bg-[#f8fafc] text-slate-800 min-h-[150px] resize-y"
                                    value={formData.template_css}
                                    onChange={(e) => setFormData({ ...formData, template_css: e.target.value })}
                                />
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0ea5e9] hover:bg-[#0284c7] shadow-sm hover:shadow transition-all flex justify-center min-w-[100px]"
                            >
                                {editingId ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Example Code Modal */}
            {isExampleModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-scale-in">
                        {/* Example Modal Header */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#0ea5e9]" />
                                <h2 className="text-xl font-bold text-slate-800">
                                    Example Template Code
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsExampleModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Example Modal Tool Bar */}
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between flex-shrink-0 bg-slate-50/50 gap-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setExampleTab('html')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${exampleTab === 'html' ? 'bg-[#0ea5e9] text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                    >
                                        HTML
                                    </button>
                                    <button
                                        onClick={() => setExampleTab('css')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${exampleTab === 'css' ? 'bg-[#0ea5e9] text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                    >
                                        CSS
                                    </button>
                                </div>
                                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg pr-2 bg-white shadow-sm">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-3 py-1.5 border-r border-slate-100 bg-slate-50 rounded-l-lg">Type:</span>
                                    <select
                                        className="text-sm border-none bg-transparent py-1.5 pr-6 pl-2 focus:ring-0 outline-none font-bold text-slate-800 cursor-pointer min-w-[120px]"
                                        value={exampleDocType}
                                        onChange={(e) => setExampleDocType(e.target.value)}
                                    >
                                        <option value="invoices">Invoice</option>
                                        <option value="quotations">Quotation</option>
                                        <option value="agreements">Agreement</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCopyExample}
                                    className="px-4 py-1.5 rounded-md text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" /> Copy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUseBaseForNew}
                                    className="px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-[#0ea5e9] hover:bg-[#0284c7] transition-colors shadow-sm"
                                >
                                    Use as base for new template
                                </button>
                            </div>
                        </div>

                        {/* Example Modal Body */}
                        <div className="flex-1 overflow-hidden p-6 bg-[#f8fafc]">
                            <textarea
                                spellCheck={false}
                                className="w-full h-full font-mono text-[15px] leading-relaxed p-5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-[#0ea5e9] bg-white text-[#0ea5e9] resize-none"
                                value={exampleTab === 'html' ? exampleHtmlCode : exampleCssCode}
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Modal */}
            {isPreviewModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-scale-in">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-indigo-500" />
                                Template Preview
                            </h2>
                            <button
                                onClick={() => setIsPreviewModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-6 bg-slate-100/50">
                            <div className="bg-white rounded-xl shadow-inner h-full overflow-hidden border border-slate-200">
                                <iframe
                                    title="Template Preview"
                                    srcDoc={previewContent}
                                    className="w-full h-full border-0"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={() => setIsPreviewModalOpen(false)}
                                className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
