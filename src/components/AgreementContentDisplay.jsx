/**
 * Renders agreement/document blocks for preview, print, and PDF.
 * Clean document layout: margins, spacing, alignment.
 */

const documentWrapperClass =
  'agreement-document max-w-[210mm] mx-auto text-slate-800 leading-relaxed';

export default function AgreementContentDisplay({ blocks = [], className = '' }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  let sectionCounter = 0;

  return (
    <div className={`${documentWrapperClass} ${className}`}>
      <div className="agreement-document-body space-y-1 print:space-y-1">
        {blocks.map((block) => {
          let displayNumber = null;
          if (block.type === 'section') {
            sectionCounter++;
            displayNumber = sectionCounter;
          }
          return <BlockRender key={block.id || block.type} block={block} number={displayNumber} />;
        })}
      </div>
    </div>
  );
}

function BlockRender({ block, number }) {
  const { type, content } = block;
  if (!type) return null;

  switch (type) {
    case 'section':
      return (
        <h2 className="agreement-section text-xl font-bold text-slate-900 mt-8 mb-3 first:mt-0 print:mt-6 print:mb-2 break-words">
          {number ? `${number}: ` : ''}{content || ''}
        </h2>
      );
    case 'subsection':
      return (
        <h3 className="agreement-subsection text-lg font-bold text-slate-800 mt-5 mb-2 print:mt-4 print:mb-1.5 break-words flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0"></span>
          {content || ''}
        </h3>
      );
    case 'heading':
      return (
        <h2 className="agreement-heading text-2xl font-bold text-slate-900 mt-8 mb-3 first:mt-0 print:mt-6 print:mb-2 break-words text-center">
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
    case 'signature':
      return (
        <div className="agreement-signature grid grid-cols-2 gap-12 mt-16 print:mt-12">
          <div className="space-y-4">
            <div className="h-16 border-b border-gray-300"></div>
            <p className="text-sm font-bold text-slate-800">{content?.provider || 'Service Provider'},</p>
            <p className="text-xs text-slate-500">Jaz Infotech</p>
          </div>
          <div className="space-y-4">
            <div className="h-16 border-b border-gray-300"></div>
            <p className="text-sm font-bold text-slate-800 text-right">{content?.client || 'Client'}</p>
          </div>
        </div>
      );
    case 'approval':
      return (
        <div className="agreement-approval mt-10 p-6 border-2 border-slate-100 bg-slate-50/50 rounded-2xl print:mt-8 print:p-4">
          <h4 className="font-bold text-slate-800 mb-2 underline">Approval & Next Steps</h4>
          <p className="text-sm text-slate-700 italic">{content || ''}</p>
        </div>
      );
    case 'policy':
      return (
        <div className="agreement-policy mt-8 p-0 border-none bg-transparent print:mt-6">
          <h4 className="font-bold text-slate-900 border-b-2 border-slate-900 inline-block mb-1">Company Policy Note</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{content || ''}</p>
        </div>
      );
    default:
      return null;
  }
}
