/**
 * Renders agreement/document blocks for preview and print.
 * Use the same class names for consistent styling in print/PDF.
 */
export default function AgreementContentDisplay({ blocks = [], className = '' }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className={`agreement-document space-y-4 ${className}`}>
      {blocks.map((block) => (
        <BlockRender key={block.id || block.type} block={block} />
      ))}
    </div>
  );
}

function BlockRender({ block }) {
  const { type, content } = block;
  if (!type) return null;

  switch (type) {
    case 'heading':
      return (
        <h2 className="agreement-heading text-xl font-bold text-slate-900 mt-6 mb-2 first:mt-0">
          {content || ''}
        </h2>
      );
    case 'subheading':
      return (
        <h3 className="agreement-subheading text-base font-semibold text-slate-800 mt-4 mb-1.5">
          {content || ''}
        </h3>
      );
    case 'paragraph':
      return (
        <p className="agreement-paragraph text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {content || ''}
        </p>
      );
    case 'bullets': {
      const items = Array.isArray(content) ? content.filter(Boolean) : [];
      if (items.length === 0) return null;
      return (
        <ul className="agreement-bullets list-disc list-inside text-sm text-slate-700 space-y-1 ml-2">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    case 'table': {
      const headers = content?.headers || [];
      const rows = content?.rows || [];
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <div className="agreement-table overflow-x-auto my-4">
          <table className="w-full text-sm border border-gray-200 border-collapse">
            <thead>
              <tr>
                {(headers.length ? headers : ['']).map((h, i) => (
                  <th key={i} className="border border-gray-200 bg-gray-100 px-3 py-2 text-left font-semibold text-slate-800">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows.length ? rows : []).map((row, ri) => (
                <tr key={ri}>
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td key={ci} className="border border-gray-200 px-3 py-2 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}
