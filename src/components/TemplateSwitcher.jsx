import { useState, useRef, useEffect } from 'react';
import { LayoutTemplate, Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const TemplateSwitcher = ({ activeTemplate, onTemplateChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const templates = [
        { id: 1, name: 'Modern Corporate', description: 'Clean and professional' },
        { id: 2, name: 'Creative Wave', description: 'Stylish and dynamic' },
        { id: 3, name: 'Elegant Red', description: 'Simple and sophisticated' }
    ];

    return (
        <div className="relative print:hidden" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 active:scale-95"
            >
                <LayoutTemplate className="w-4 h-4 text-brand-600" />
                <span>Change Template</span>
                <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-auto left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Design</p>
                    </div>
                    <div className="p-2 space-y-1">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    onTemplateChange(template.id);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors group",
                                    activeTemplate === template.id
                                        ? "bg-brand-50/80 text-brand-700 ring-1 ring-brand-500/20"
                                        : "hover:bg-gray-50 text-slate-700"
                                )}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    activeTemplate === template.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-brand-500 group-hover:shadow-sm"
                                )}>
                                    {activeTemplate === template.id ? <Check className="w-4 h-4" /> : <p className="font-bold text-xs">{template.id}</p>}
                                </div>
                                <div className="flex-1">
                                    <p className={clsx("text-sm font-bold leading-none mb-1", activeTemplate === template.id ? "text-brand-900" : "text-slate-700")}>{template.name}</p>
                                    <p className="text-[10px] opacity-70 font-medium">{template.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateSwitcher;
