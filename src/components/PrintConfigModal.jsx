import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import {
  PRINT_CONFIG_OPTIONS,
  getDefaultPrintConfigKeys,
  getStoredPrintConfig,
  setStoredPrintConfig,
} from '../config/printTemplateModules';

export default function PrintConfigModal({
  isOpen,
  onClose,
  moduleKey,
  moduleLabel,
  getPreviewHtml,
  onPrint,
}) {
  const defaultKeys = getDefaultPrintConfigKeys();
  const stored = getStoredPrintConfig(moduleKey);
  const [selectedKeys, setSelectedKeys] = useState(() => stored || defaultKeys);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPrintConfig(moduleKey);
      setSelectedKeys(Array.isArray(stored) && stored.length > 0 ? stored : defaultKeys);
    }
  }, [isOpen, moduleKey]);

  const toggle = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handlePrint = () => {
    setStoredPrintConfig(moduleKey, selectedKeys);
    onPrint(selectedKeys);
    onClose();
  };

  const selectAll = () => setSelectedKeys([...defaultKeys]);
  const selectNone = () => setSelectedKeys([]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Print Configuration</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="px-4 pb-2 text-sm text-slate-500 flex-shrink-0">
          Choose which fields to include in Print and PDF for {moduleLabel}. Uncheck to hide.
        </p>

        <div className="flex gap-2 px-4 pb-2 flex-shrink-0">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Select all
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs font-semibold text-slate-500 hover:underline"
          >
            Select none
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {PRINT_CONFIG_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(opt.key)}
                  onChange={() => toggle(opt.key)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>

          {getPreviewHtml && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Live Preview
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden max-h-[280px] overflow-y-auto">
                <div
                  className="p-4 bg-white text-slate-800 text-sm"
                  dangerouslySetInnerHTML={{ __html: getPreviewHtml(selectedKeys) || '' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
