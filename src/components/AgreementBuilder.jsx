import { useState } from 'react';
import { Plus, GripVertical, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'section', label: 'Numbered Section' },
  { value: 'subsection', label: 'Subsection' },
  { value: 'heading', label: 'Heading (Plain)' },
  { value: 'subheading', label: 'Subheading (Plain)' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'table', label: 'Table' },
  { value: 'signature', label: 'Signature Area' },
  { value: 'approval', label: 'Approval Section' },
  { value: 'policy', label: 'Company Policy Note' },
];

function generateId() {
  return `agr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyBlock(type) {
  const id = generateId();
  switch (type) {
    case 'section':
    case 'subsection':
    case 'heading':
    case 'subheading':
    case 'paragraph':
      return { id, type, content: '' };
    case 'bullets':
      return { id, type, content: [''] };
    case 'table': {
      const defaultRows = [['', '']];
      return { id, type, content: { headers: ['Column 1', 'Column 2'], rows: defaultRows } };
    }
    case 'signature':
      return { id, type, content: { provider: 'Service Provider', client: 'Client' } };
    case 'approval':
      return { id, type, content: 'Please review the above scope and confirm approval.' };
    case 'policy':
      return { id, type, content: 'As per company standards, development will begin only after written approval...' };
    default:
      return { id, type: 'paragraph', content: '' };
  }
}

export default function AgreementBuilder({ value = [], onChange }) {
  const [contentType, setContentType] = useState('paragraph');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const blocks = Array.isArray(value) ? value : [];

  const addBlock = () => {
    const block = createEmptyBlock(contentType);
    onChange([...blocks, block]);
    setEditingId(block.id);
    setEditDraft(block);
  };

  const updateBlock = (id, updated) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, ...updated } : b));
    onChange(next);
    setEditDraft(null);
    setEditingId(null);
  };

  const deleteBlock = (id) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const moveBlock = (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  const startEdit = (block) => {
    setEditingId(block.id);
    setEditDraft(JSON.parse(JSON.stringify(block)));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;
    const next = [...blocks];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    onChange(next);
  };
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
        <div className="min-w-[180px]">
          <label className="label text-xs font-bold text-slate-600 uppercase tracking-wider">Content Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="input"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addBlock}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Content
        </button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragOver={handleDragOver}
            className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white overflow-hidden group"
          >
            <div className="flex flex-col justify-center bg-gray-100 text-gray-400 cursor-grab active:cursor-grabbing p-2" title="Drag to reorder">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 py-3 pr-2">
              {editingId === block.id && editDraft ? (
                <BlockEditor
                  block={editDraft}
                  onChange={(next) => setEditDraft(next)}
                  onSave={() => updateBlock(block.id, editDraft)}
                  onCancel={() => { setEditingId(null); setEditDraft(null); }}
                />
              ) : (
                <BlockPreview block={block} onEdit={() => startEdit(block)} onDelete={() => deleteBlock(block.id)} />
              )}
            </div>
            {editingId !== block.id && (
              <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move up">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move down">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => startEdit(block)} className="p-2 text-slate-400 hover:text-brand-600" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => deleteBlock(block.id)} className="p-2 text-slate-400 hover:text-red-600" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-slate-500 italic py-4">Select a content type and click &quot;Add Content&quot; to build your agreement.</p>
      )}
    </div>
  );
}

function BlockPreview({ block, onEdit, onDelete }) {
  const { type, content } = block;
  const preview =
    type === 'heading' || type === 'subheading' || type === 'paragraph'
      ? (content || '').slice(0, 60) + ((content || '').length > 60 ? '…' : '')
      : type === 'bullets'
        ? `Bullet list (${Array.isArray(content) ? content.length : 0} items)`
        : type === 'table'
          ? `Table (${block.content?.headers?.length || 0} cols × ${block.content?.rows?.length || 0} rows)`
          : '';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{type}</span>
      <p className="flex-1 truncate text-sm text-slate-700">{preview || '(empty)'}</p>
    </div>
  );
}

function BlockEditor({ block, onChange, onSave, onCancel }) {
  const { type, content } = block;

  const update = (key, val) => onChange({ ...block, content: key === 'content' ? val : { ...(block.content || {}), [key]: val } });
  const updateContent = (val) => onChange({ ...block, content: val });

  return (
    <div className="space-y-3">
      {type === 'section' && (
        <div className="flex gap-2 items-center">
          <span className="text-slate-400 font-bold shrink-0">#)</span>
          <input
            type="text"
            value={content || ''}
            onChange={(e) => updateContent(e.target.value)}
            className="input font-bold text-lg"
            placeholder="Enter Section Title (Number will be auto-generated)"
          />
        </div>
      )}
      {type === 'subsection' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-semibold"
          placeholder="Enter Subsection Title"
        />
      )}
      {type === 'heading' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-bold text-lg"
          placeholder="Enter heading"
        />
      )}
      {type === 'subheading' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-semibold"
          placeholder="Enter subheading"
        />
      )}
      {type === 'paragraph' && (
        <textarea
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Enter paragraph text"
        />
      )}
      {type === 'bullets' && (
        <div className="space-y-2">
          {(Array.isArray(content) ? content : ['']).map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const next = [...(content || [''])];
                  next[i] = e.target.value;
                  updateContent(next);
                }}
                className="input flex-1"
                placeholder={`Bullet ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => updateContent((content || []).filter((_, j) => j !== i))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateContent([...(content || []), ''])}
            className="text-sm text-brand-600 font-semibold flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add bullet
          </button>
        </div>
      )}
      {type === 'table' && (
        <TableEditor
          headers={block.content?.headers || []}
          rows={block.content?.rows || []}
          onChange={(headers, rows) => updateContent({ headers, rows })}
        />
      )}
      {type === 'signature' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label text-xs">Left Label (Service Provider)</label>
            <input
              type="text"
              value={content?.provider || ''}
              onChange={(e) => update('provider', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Right Label (Client)</label>
            <input
              type="text"
              value={content?.client || ''}
              onChange={(e) => update('client', e.target.value)}
              className="input"
            />
          </div>
        </div>
      )}
      {type === 'approval' && (
        <textarea
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Approval text or next steps..."
        />
      )}
      {type === 'policy' && (
        <textarea
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Policy Note content..."
        />
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onSave} className="btn-primary text-sm py-1.5 px-3">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-1.5 px-3">Cancel</button>
      </div>
    </div>
  );
}

function TableEditor({ headers, rows, onChange }) {
  const setHeader = (i, val) => {
    const next = [...headers];
    next[i] = val;
    onChange(next, rows);
  };
  const setCell = (ri, ci, val) => {
    const next = rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? val : c)) : r));
    onChange(headers, next);
  };
  const addRow = () => onChange(headers, [...rows, headers.map(() => '')]);
  const removeRow = (ri) => onChange(headers, rows.filter((_, i) => i !== ri));
  const addCol = () => {
    onChange([...headers, `Column ${headers.length + 1}`], rows.map((r) => [...r, '']));
  };
  const removeCol = (ci) => {
    if (headers.length <= 1) return;
    onChange(
      headers.filter((_, i) => i !== ci),
      rows.map((r) => r.filter((_, j) => j !== ci))
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead>
          <tr>
            {(headers || []).map((h, i) => (
              <th key={i} className="border-b border-gray-200 bg-gray-50 px-2 py-2 text-left">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => setHeader(i, e.target.value)}
                  className="input py-1.5 text-xs font-bold w-full"
                />
              </th>
            ))}
            <th className="border-b border-gray-200 bg-gray-50 w-10">
              <button type="button" onClick={() => removeCol(headers.length - 1)} className="text-red-500 p-1" title="Remove column">×</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row, ri) => (
            <tr key={ri}>
              {(row || []).map((cell, ci) => (
                <td key={ci} className="border-b border-gray-100 px-2 py-1.5">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    className="input py-1 w-full text-sm"
                  />
                </td>
              ))}
              <td className="border-b border-gray-100 w-10">
                <button type="button" onClick={() => removeRow(ri)} className="text-red-500 p-1">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={addRow} className="text-sm text-brand-600 font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add row
        </button>
        <button type="button" onClick={addCol} className="text-sm text-brand-600 font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add column
        </button>
      </div>
    </div>
  );
}
