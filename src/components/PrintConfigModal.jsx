import { useState, useEffect } from 'react';
import { X, Printer, Search } from 'lucide-react';
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
  printConfig,
  templates = [],
  selectedTemplate = null,
  onSelectTemplate = () => { },
  onChange = () => { },
}) {
  const defaultKeys = getDefaultPrintConfigKeys();
  const activeKeys = printConfig || defaultKeys;
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (key) => {
    const newKeys = activeKeys.includes(key)
      ? activeKeys.filter((k) => k !== key)
      : [...activeKeys, key];
    onChange(newKeys);
    setStoredPrintConfig(moduleKey, newKeys);
  };

  const handlePrint = () => {
    setStoredPrintConfig(moduleKey, activeKeys);
    onPrint(activeKeys);
    onClose();
  };

  const selectAll = () => {
    const newKeys = [...defaultKeys];
    onChange(newKeys);
    setStoredPrintConfig(moduleKey, newKeys);
  };
  const selectNone = () => {
    const newKeys = [];
    onChange(newKeys);
    setStoredPrintConfig(moduleKey, newKeys);
  };

  const filteredOptions = PRINT_CONFIG_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] md:h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Print Configuration</h3>
            <p className="text-sm text-slate-500 hidden sm:block">Configure layout and fields for {moduleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-white">
          
          {/* Left Panel - Configuration */}
          <div className="w-full md:w-[35%] lg:w-[30%] flex flex-col h-full border-b md:border-b-0 md:border-r border-slate-200">
            {templates && templates.length > 0 && (
              <div className="p-4 flex-shrink-0 border-b border-slate-100 bg-slate-50/50">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Template
                </label>
                <select
                  className="w-full text-sm rounded-lg border-slate-300 focus:ring-brand-500 focus:border-brand-500 px-3 py-2 border outline-none cursor-pointer bg-white shadow-sm"
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value);
                    if (t) onSelectTemplate(t);
                  }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="p-4 flex-shrink-0">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Display Fields
              </label>
              
              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 items-center justify-between mb-1">
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                  >
                    Select none
                  </button>
                </div>
                <span className="text-xs font-medium text-slate-400">{filteredOptions.length} fields</span>
              </div>
            </div>

            {/* Checkboxes List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
              <div className="flex flex-col space-y-0.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-100 cursor-pointer group transition-colors select-none"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={activeKeys.includes(opt.key)}
                          onChange={() => toggle(opt.key)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-shadow cursor-pointer"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                        {opt.label}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-slate-500 flex flex-col items-center">
                    <Search className="w-8 h-8 text-slate-200 mb-2" />
                    No fields match "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-full md:w-[65%] lg:w-[70%] bg-slate-100 flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-slate-100 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-slate-100 to-transparent z-10 pointer-events-none" />
            
            {getPreviewHtml ? (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
                <div className="mx-auto w-full max-w-[900px] min-h-full">
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print-preview-container p-6 text-slate-900">
                    <div
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml(activeKeys) || '' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Printer className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm font-medium">Live preview not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-white z-10">
          <button type="button" onClick={onClose} className="btn-secondary px-6">
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary px-6 flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Document
          </button>
        </div>
      </div>
    </div>
  );
}
