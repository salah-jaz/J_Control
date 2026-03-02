/**
 * Renders agreement/document blocks for preview, print, and PDF.
 * Clean document layout: margins, spacing, alignment.
 */

const documentWrapperClass =
  'agreement-document max-w-[210mm] mx-auto text-slate-800 leading-relaxed';

export default function AgreementContentDisplay({ blocks = [], className = '' }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className={`${documentWrapperClass} ${className}`}>
      <div className="agreement-document-body space-y-1 print:space-y-1">
        {blocks.map((block) => (
          <BlockRender key={block.id || block.type} block={block} />
        ))}
      </div>
    </div>
  );
}

function BlockRender({ block }) {
  const { type, content } = block;
  if (!type) return null;

  switch (type) {
    case 'heading':
      return (
        <h2 className="agreement-heading text-2xl font-bold text-slate-900 mt-8 mb-3 first:mt-0 print:mt-6 print:mb-2 break-words">
          {content || ''}
        </h2>
      );
    case 'subheading':
      return (
        <h3 className="agreement-subheading text-lg font-semibold text-slate-800 mt-5 mb-2 print:mt-4 print:mb-1.5 break-words">
          {content || ''}
        </h3>
      );
    case 'paragraph':
      return (
        <p className="agreement-paragraph text-[15px] text-slate-700 leading-[1.6] whitespace-pre-wrap mt-3 mb-2 print:mt-2 print:mb-1.5 break-words">
          {content || ''}
        </p>
      );
    case 'bullets': {
      const items = Array.isArray(content) ? content.filter(Boolean) : [];
      if (items.length === 0) return null;
      return (
        <ul className="agreement-bullets list-disc pl-6 pr-2 text-[15px] text-slate-700 leading-[1.6] space-y-1.5 my-3 print:my-2">
          {items.map((item, i) => (
            <li key={i} className="break-words">{item}</li>
          ))}
        </ul>
      );
    }
    case 'table': {
      const headers = content?.headers || [];
      const rows = content?.rows || [];
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <div className="agreement-table overflow-x-auto my-5 print:my-4">
          <table className="w-full text-sm border border-gray-300 border-collapse">
            <thead>
              <tr>
                {(headers.length ? headers : ['']).map((h, i) => (
                  <th
                    key={i}
                    className="border border-gray-300 bg-slate-100 px-4 py-2.5 text-left font-semibold text-slate-800"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows.length ? rows : []).map((row, ri) => (
                <tr key={ri}>
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-gray-300 px-4 py-2 text-slate-700"
                    >
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
