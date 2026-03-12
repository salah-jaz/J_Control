import { useState, useRef } from 'react';
import {
  Plus, GripVertical, Pencil, Trash2, ChevronUp, ChevronDown,
  ListOrdered, List, Type, Pilcrow, Table as TableIcon,
  PenTool, CheckCircle, ShieldAlert
} from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'section', label: 'Numbered Section', icon: ListOrdered },
  { value: 'subsection', label: 'Subsection', icon: List },
  { value: 'heading', label: 'Heading (Plain)', icon: Type },
  { value: 'subheading', label: 'Subheading (Plain)', icon: Type },
  { value: 'paragraph', label: 'Paragraph', icon: Pilcrow },
  { value: 'bullets', label: 'Bullet Points', icon: List },
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'signature', label: 'Signature Area', icon: PenTool },
  { value: 'approval', label: 'Approval Section', icon: CheckCircle },
  { value: 'policy', label: 'Company Policy Note', icon: ShieldAlert },
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
  const [editingId, setEditingId] = useState(null);
  const [originalBlock, setOriginalBlock] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const blocks = Array.isArray(value) ? value : [];

  const updateBlock = (id, updated) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, ...updated } : b));
    onChange(next);
  };

  const deleteBlock = (id) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setOriginalBlock(null);
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
    setOriginalBlock(JSON.parse(JSON.stringify(block)));
  };

  const cancelEdit = (id) => {
    if (originalBlock) {
      onChange(blocks.map(b => b.id === id ? originalBlock : b));
    }
    setEditingId(null);
    setOriginalBlock(null);
  };

  const finishEdit = () => {
    setEditingId(null);
    setOriginalBlock(null);
  };

  // Drag from sidebar
  const handleSidebarDragStart = (e, type) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'sidebar', type }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Reordering existing blocks
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'workspace', index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleWorkspaceDragOver = (e) => {
    e.preventDefault();
    if (blocks.length === 0) setDragOverIndex(0);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.source === 'sidebar') {
        const block = createEmptyBlock(data.type);
        const next = [...blocks];
        next.splice(dropIndex !== undefined ? dropIndex : next.length, 0, block);
        onChange(next);
        setEditingId(block.id);
        setOriginalBlock(block);
      } else if (data.source === 'workspace') {
        const dragIndex = data.index;
        if (dragIndex === dropIndex) return;

        const next = [...blocks];
        const [removed] = next.splice(dragIndex, 1);

        // Adjust drop target due to the removal if necessary
        const targetIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
        next.splice(targetIndex, 0, removed);
        onChange(next);
      }
    } catch (err) {
      console.error("Drop parsing error", err);
    }
  };

  const handleWorkspaceDrop = (e) => {
    e.preventDefault();
    setDragOverIndex(null);

    // Check if drop is aimed at the empty workspace or end
    if (e.target !== e.currentTarget) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.source === 'sidebar') {
        const block = createEmptyBlock(data.type);
        onChange([...blocks, block]);
        setEditingId(block.id);
        setOriginalBlock(block);
      } else if (data.source === 'workspace') {
        const dragIndex = data.index;
        const next = [...blocks];
        const [removed] = next.splice(dragIndex, 1);
        next.push(removed);
        onChange(next);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Sidebar Tools */}
      <div className="w-64 bg-slate-50 border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 select-none">
        <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 tracking-tight">Agreement Builder</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Drag components to build the agreement structure.</p>
        </div>
        <div className="p-3 gap-2.5 flex flex-col">
          {CONTENT_TYPES.map(t => (
            <div
              key={t.value}
              draggable
              onDragStart={(e) => handleSidebarDragStart(e, t.value)}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-brand-500 hover:shadow-sm transition-all shadow-sm active:cursor-grabbing group"
            >
              <div className="text-brand-600 bg-brand-50 p-2 rounded-md group-hover:scale-110 transition-transform">
                <t.icon size={18} />
              </div>
              <span className="text-sm font-semibold text-slate-700">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workspace Area */}
      <div
        className="flex-1 overflow-y-auto bg-slate-100/50 p-6 relative"
        onDrop={handleWorkspaceDrop}
        onDragOver={handleWorkspaceDragOver}
      >
        <div className="max-w-3xl mx-auto space-y-4 min-h-[500px] pb-32">
          {blocks.map((block, index) => (
            <div key={block.id}>
              {/* Drop Indicator (Above block) */}
              {dragOverIndex === index && (
                <div className="h-1 bg-brand-500 rounded-full my-2 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
              )}

              <div
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                className="flex items-stretch gap-2 rounded-xl border border-gray-200 bg-white overflow-hidden group shadow-sm hover:shadow-md transition-all relative"
              >
                <div className="flex flex-col justify-center items-center bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing px-3 border-r border-gray-100 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Drag to reorder">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-[10px] font-bold mt-1 opacity-50">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0 py-4 pr-3 pl-1">
                  {editingId === block.id ? (
                    <BlockEditor
                      block={block}
                      onChange={(next) => updateBlock(block.id, next)}
                      onSave={() => finishEdit()}
                      onCancel={() => cancelEdit(block.id)}
                    />
                  ) : (
                    <BlockPreview block={block} />
                  )}
                </div>
                {editingId !== block.id && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:pr-3 px-2 sm:px-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white to-transparent">
                    <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move up">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Move down">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => startEdit(block)} className="p-2 text-slate-400 hover:text-brand-600" title="Edit text">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => deleteBlock(block.id)} className="p-2 text-slate-400 hover:text-red-500" title="Delete section">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Drop Indicator (Below last block) */}
              {index === blocks.length - 1 && dragOverIndex === index + 1 && (
                <div className="h-1 bg-brand-500 rounded-full my-2 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
              )}
            </div>
          ))}

          {/* Empty State / Bottom Drop Zone */}
          {blocks.length === 0 && (
            <div
              className="h-48 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 font-medium p-6 text-center"
              onDrop={(e) => handleDrop(e, 0)}
              onDragOver={(e) => handleDragOver(e, 0)}
            >
              <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              Drag and drop builder components here
            </div>
          )}
          {blocks.length > 0 && (
            <div
              onDrop={(e) => handleDrop(e, blocks.length)}
              onDragOver={(e) => handleDragOver(e, blocks.length)}
              className="h-24 border-2 border-dashed border-transparent hover:border-brand-200 hover:bg-brand-50/50 rounded-xl flex items-center justify-center text-transparent hover:text-brand-500 transition-all cursor-crosshair"
            >
              <Plus className="w-6 h-6 mr-2" /> Add Section Here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockPreview({ block }) {
  const { type, content } = block;
  const tInfo = CONTENT_TYPES.find(t => t.value === type);
  const typeLabel = tInfo ? tInfo.label : type;

  const preview =
    type === 'heading' || type === 'subheading' || type === 'paragraph' || type === 'section' || type === 'subsection'
      ? (content || '').slice(0, 100) + ((content || '').length > 100 ? '…' : '')
      : type === 'bullets'
        ? `Bullet points (${Array.isArray(content) ? content.length : 0} items)`
        : type === 'table'
          ? `Table (${block.content?.headers?.length || 0} cols × ${block.content?.rows?.length || 0} rows)`
          : type === 'signature'
            ? `Signature Area (${content?.provider} / ${content?.client})`
            : type === 'approval' || type === 'policy'
              ? (content || '').slice(0, 100) + ((content || '').length > 100 ? '…' : '')
              : '';

  return (
    <div className="flex flex-col gap-1.5 ml-1">
      <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{typeLabel}</span>
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{preview || <span className="text-slate-400 italic">Empty {typeLabel.toLowerCase()} block</span>}</p>
    </div>
  );
}

function BlockEditor({ block, onChange, onSave, onCancel }) {
  const { type, content } = block;

  const update = (key, val) => onChange({ ...block, content: key === 'content' ? val : { ...(block.content || {}), [key]: val } });
  const updateContent = (val) => onChange({ ...block, content: val });

  return (
    <div className="space-y-4 ml-1">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <span className="text-xs font-black text-slate-800 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">
          Edit {CONTENT_TYPES.find(t => t.value === type)?.label || type}
        </span>
      </div>

      {type === 'section' && (
        <div className="flex gap-3 items-center">
          <span className="text-slate-400 font-bold shrink-0 text-xl font-mono">#)</span>
          <input
            type="text"
            value={content || ''}
            onChange={(e) => updateContent(e.target.value)}
            className="input font-bold text-lg w-full"
            placeholder="Enter Section Title (Number will be auto-generated later)"
            autoFocus
          />
        </div>
      )}
      {type === 'subsection' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-semibold w-full"
          placeholder="Enter Subsection Title"
          autoFocus
        />
      )}
      {type === 'heading' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-bold text-xl w-full"
          placeholder="Enter plain heading"
          autoFocus
        />
      )}
      {type === 'subheading' && (
        <input
          type="text"
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input font-semibold text-lg w-full"
          placeholder="Enter plain subheading"
          autoFocus
        />
      )}
      {type === 'paragraph' && (
        <textarea
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input min-h-[120px] w-full leading-relaxed"
          placeholder="Enter paragraph text..."
          autoFocus
        />
      )}
      {type === 'bullets' && (
        <div className="space-y-3">
          {(Array.isArray(content) ? content : ['']).map((item, i) => (
            <div key={i} className="flex gap-2">
              <div className="mt-3 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const next = [...(content || [''])];
                  next[i] = e.target.value;
                  updateContent(next);
                }}
                className="input flex-1"
                placeholder={`Bullet point ${i + 1}`}
                autoFocus={i === (content?.length || 1) - 1} // focus last item
              />
              <button
                type="button"
                onClick={() => updateContent((content || []).filter((_, j) => j !== i))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateContent([...(content || []), ''])}
            className="text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Item
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
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label className="label text-xs uppercase text-slate-500 mb-2 block font-bold">Left Label (Provider)</label>
            <input
              type="text"
              value={content?.provider || ''}
              onChange={(e) => update('provider', e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label className="label text-xs uppercase text-slate-500 mb-2 block font-bold">Right Label (Client)</label>
            <input
              type="text"
              value={content?.client || ''}
              onChange={(e) => update('client', e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
      )}
      {type === 'approval' && (
        <textarea
          value={content || ''}
          onChange={(e) => updateContent(e.target.value)}
          className="input min-h-[100px] w-full"
          placeholder="Approval text or next steps..."
          autoFocus
        />
      )}
      {type === 'policy' && (
        <div className="bg-amber-50 rounded-lg p-1 border border-amber-100">
          <textarea
            value={content || ''}
            onChange={(e) => updateContent(e.target.value)}
            className="input min-h-[100px] w-full border-none bg-transparent focus:ring-0 text-amber-900 placeholder-amber-500/50"
            placeholder="Policy Note content..."
            autoFocus
          />
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <button type="button" onClick={onSave} className="btn-primary flex-1 shadow-md shadow-brand-500/20 py-2.5">Finish Editing</button>
        <button type="button" onClick={onCancel} className="btn-secondary w-28">Cancel</button>
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
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {(headers || []).map((h, i) => (
              <th key={i} className="px-3 py-2 text-left relative group">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => setHeader(i, e.target.value)}
                  className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-brand-500 focus:outline-none py-1 font-bold text-slate-700"
                />
              </th>
            ))}
            <th className="w-10">
              <button
                type="button"
                onClick={() => removeCol(headers.length - 1)}
                className="text-slate-400 hover:text-red-500 p-1 w-full flex justify-center"
                title="Remove last column"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(rows || []).map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-50/50">
              {(row || []).map((cell, ci) => (
                <td key={ci} className="px-3 py-2">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-brand-500 focus:outline-none py-1 text-slate-600 transition-colors"
                    placeholder="..."
                  />
                </td>
              ))}
              <td className="w-10 text-center flex items-center justify-center p-2">
                <button type="button" onClick={() => removeRow(ri)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 p-2 bg-slate-50 border-t border-slate-200">
        <button type="button" onClick={addRow} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition-all">
          <Plus className="w-3.5 h-3.5" /> Row
        </button>
        <button type="button" onClick={addCol} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm transition-all">
          <Plus className="w-3.5 h-3.5" /> Column
        </button>
      </div>
    </div>
  );
}
