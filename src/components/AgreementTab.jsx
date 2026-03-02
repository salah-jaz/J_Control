import { useState, useEffect } from 'react';
import { FileText, Pencil, Trash2, Eye, Printer, X, Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import AgreementBuilder from './AgreementBuilder';
import AgreementContentDisplay from './AgreementContentDisplay';
import AgreementPreviewModal from './AgreementPreviewModal';
import {
  getSavedAgreements,
  saveAgreement,
  updateAgreement,
  deleteAgreement,
} from '../services/agreementTemplateService';

export default function AgreementTab({ value = [], onChange }) {
  const [list, setList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [agreementTitle, setAgreementTitle] = useState('');
  const [previewAgreement, setPreviewAgreement] = useState(null);
  const [previewAutoPrint, setPreviewAutoPrint] = useState(false);

  const blocks = Array.isArray(value) ? value : [];

  const refreshList = () => setList(getSavedAgreements());

  useEffect(() => {
    refreshList();
  }, []);

  const openEdit = (agreement) => {
    setEditingId(agreement.id);
    setModalTitle(agreement.title);
    setModalContent(Array.isArray(agreement.content) ? JSON.parse(JSON.stringify(agreement.content)) : []);
    setModalOpen(true);
  };

  const handleSaveAgreementInModal = () => {
    const title = modalTitle.trim() || 'Untitled Agreement';
    updateAgreement(editingId, { title, content: modalContent });
    toast.success('Agreement updated');
    refreshList();
    setModalOpen(false);
  };

  const handleSaveAgreementFromDocument = () => {
    const title = agreementTitle.trim();
    if (!title) {
      toast.error('Enter agreement title');
      return;
    }
    if (blocks.length === 0) {
      toast.error('Add some content first (e.g. heading, paragraph)');
      return;
    }
    const content = JSON.parse(JSON.stringify(blocks));
    saveAgreement(title, content);
    toast.success('Agreement saved');
    refreshList();
    setAgreementTitle('');
    onChange([]);
  };

  const openView = (agreement) => {
    setPreviewAgreement(agreement);
    setPreviewAutoPrint(false);
  };

  const openPrint = (agreement) => {
    setPreviewAgreement(agreement);
    setPreviewAutoPrint(true);
  };

  const handleDeleteAgreement = (agreement) => {
    if (!window.confirm(`Delete agreement "${agreement.title}"?`)) return;
    deleteAgreement(agreement.id);
    refreshList();
    toast.success('Agreement deleted');
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Saved agreements list */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Saved Agreements</h3>

        {list.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">There is no saved agreement.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((agreement) => (
              <li
                key={agreement.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{agreement.title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(agreement.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openView(agreement)}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrint(agreement)}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(agreement)}
                    className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                    title="Edit Agreement"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAgreement(agreement)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Agreement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Document content for this Invoice / Quotation */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-bold text-slate-800">Document content for this Invoice / Quotation</h3>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {showPreview ? 'Edit content' : 'Preview document'}
          </button>
        </div>
        {showPreview ? (
          <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-6 min-h-[200px]">
            {blocks.length === 0 ? (
              <p className="text-sm text-slate-500">No content yet. Build your agreement below or save one to the list above.</p>
            ) : (
              <AgreementContentDisplay blocks={blocks} className="agreement-document-print" />
            )}
          </div>
        ) : (
          <>
            <AgreementBuilder value={blocks} onChange={onChange} />
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="label text-xs font-bold text-slate-600 uppercase tracking-wider">Agreement title</label>
                <input
                  type="text"
                  value={agreementTitle}
                  onChange={(e) => setAgreementTitle(e.target.value)}
                  className="input"
                  placeholder="e.g. Standard Service Agreement"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveAgreementFromDocument}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Agreement
              </button>
            </div>
          </>
        )}
      </div>

      <AgreementPreviewModal
        agreement={previewAgreement}
        isOpen={!!previewAgreement}
        onClose={() => {
          setPreviewAgreement(null);
          setPreviewAutoPrint(false);
        }}
        autoPrint={previewAutoPrint}
      />

      {/* Modal: Edit Agreement only */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800">Edit Agreement</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 shrink-0">
              <label className="label">Agreement title</label>
              <input
                type="text"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                className="input"
                placeholder="e.g. Standard Service Agreement"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <label className="label mb-2 block">Content (Heading, Subheading, Paragraph, Bullets, Table)</label>
              <AgreementBuilder value={modalContent} onChange={setModalContent} />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSaveAgreementInModal} className="btn-primary">
                Save Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
