import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Package, X } from 'lucide-react';
import clsx from 'clsx';

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an item...',
  error = false,
  className = '',
  itemRender,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync searchTerm with value when closed or value changes externally
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value);
    }
  }, [value, isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm || searchTerm === value) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => 
      opt.name.toLowerCase().includes(term) || 
      (opt.description && opt.description.toLowerCase().includes(term))
    );
  }, [options, searchTerm, value]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpwards = spaceBelow < 320 && spaceAbove > spaceBelow;
      
      setOpenUpwards(shouldOpenUpwards);
      setCoords({
        top: shouldOpenUpwards ? rect.top + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll on all elements to catch nested scroll container movements
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        const portalDropdown = document.getElementById('searchable-select-portal');
        if (portalDropdown && portalDropdown.contains(event.target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.name);
    setSearchTerm(option.name);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
    if (e.target.value === '') {
        onChange('');
    }
  };

  const dropdownMenu = (
    <div 
        id="searchable-select-portal"
        className={clsx(
            "fixed z-[9999] bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
            openUpwards ? "origin-bottom animate-in fade-in slide-in-from-bottom-2" : "origin-top animate-in fade-in slide-in-from-top-2"
        )}
        style={{
            top: openUpwards 
                ? (coords.top - window.scrollY - 8) - Math.min(300, (filteredOptions.length * 60) + 16)
                : coords.top - window.scrollY + 8,
            left: coords.left,
            width: Math.max(320, coords.width), // Ensure a minimum width for readability
            maxHeight: '300px'
        }}
    >
        <div className="overflow-x-hidden overflow-y-auto scrollbar-hide p-2">
            {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => (
                    <button
                        key={option.id || idx}
                        onClick={() => handleSelect(option)}
                        className={clsx(
                            "w-full flex flex-col gap-1.5 p-3 rounded-xl transition-all duration-200 text-left group/item",
                            value === option.name 
                                ? "bg-violet-50 border border-violet-100" 
                                : "hover:bg-slate-50 border border-transparent"
                        )}
                    >
                        <div className="flex items-start justify-between gap-4 w-full">
                            <span className={clsx(
                                "text-[14px] font-bold tracking-tight line-clamp-1 flex-1",
                                value === option.name ? "text-violet-700" : "text-slate-800 group-hover/item:text-violet-600"
                            )}>
                                {option.name}
                            </span>
                            {option.price && (
                                <span className="text-[13px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg group-hover/item:bg-violet-100 group-hover/item:text-violet-700 transition-colors shrink-0">
                                    ₹{parseFloat(option.price).toLocaleString('en-IN')}
                                </span>
                            )}
                        </div>
                        {option.description && (
                            <span className="text-[11px] font-medium text-slate-400 line-clamp-2 leading-relaxed">
                                {option.description}
                            </span>
                        )}
                    </button>
                ))
            ) : (
                <div className="p-8 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3">
                        <Package size={20} />
                    </div>
                    <p className="text-[13px] font-bold text-slate-500">No items found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try a different search term</p>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className={clsx("relative", className)} ref={containerRef}>
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={clsx(
            "w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 text-[14px] font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300 transition-all py-1 pr-8",
            error && "border-red-500",
            isOpen && "border-violet-500"
          )}
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && searchTerm !== '' && (
                <button 
                    type="button"
                    onClick={() => { setSearchTerm(''); onChange(''); inputRef.current?.focus(); }}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                    <X size={12} />
                </button>
            )}
            <ChevronDown 
                size={16} 
                className={clsx(
                    "text-slate-400 transition-transform duration-300",
                    isOpen && "rotate-180 text-violet-500"
                )} 
            />
        </div>
      </div>

      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default SearchableSelect;
