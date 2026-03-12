import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Modules object for ReactQuill
const modules = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
    ],
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video', 'align'
];

export default function RichTextEditor({ value, onChange }) {
    // Determine the string value from the incoming block array
    const extractContent = (val) => {
        if (Array.isArray(val) && val.length > 0) {
            const wysiwygBlock = val.find(b => b.type === 'wysiwyg');
            if (wysiwygBlock) return wysiwygBlock.content || "";

            // Convert legacy blocks to HTML approximation
            return val.map(b => {
                if (!b) return "";
                const content = b.content || b.value || "";
                switch (b.type) {
                    case 'section':
                    case 'heading': return `<h2>${content}</h2>`;
                    case 'subsection':
                    case 'subheading': return `<h3>${content}</h3>`;
                    case 'paragraph': return `<p>${content}</p>`;
                    case 'bullets': return `<ul>${(Array.isArray(content) ? content : []).map(i => `<li>${i}</li>`).join('')}</ul>`;
                    default: return `<p>${JSON.stringify(content)}</p>`;
                }
            }).join("");
        }
        if (typeof val === 'string') return val;
        return "";
    };

    const handleChange = (content, delta, source, editor) => {
        if (source === 'user') {
            // Pass the single block array format back to the parent
            onChange([{
                id: `wysiwyg_${Date.now()}`,
                type: 'wysiwyg',
                content: content
            }]);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800">Agreement Document Editor</h3>
                <p className="text-sm text-slate-500">Design your agreement visually just like Microsoft Word.</p>
            </div>
            <div className="flex-1 flex flex-col h-[600px] min-h-[600px] relative">
                <ReactQuill
                    theme="snow"
                    value={extractContent(value)}
                    onChange={handleChange}
                    modules={modules}
                    formats={formats}
                    className="h-full flex-1 flex flex-col"
                />
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                <strong>Placeholders:</strong> Use quotation placeholders like <code className="bg-slate-200 px-1 rounded">{`{{quotation.client_name}}`}</code>, <code className="bg-slate-200 px-1 rounded">{`{{items_table}}`}</code>.
            </div>
        </div>
    );
}
