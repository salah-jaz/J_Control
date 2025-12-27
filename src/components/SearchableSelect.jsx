import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check, X } from "lucide-react";
import clsx from "clsx";

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = "Select...",
    creatable = false,
    className = "",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Initialize query based on value
    useEffect(() => {
        const selected = options.find(o => o.value === value);
        if (selected) {
            setQuery(selected.label);
        } else if (creatable && value) {
            setQuery(value);
        } else if (!value) {
            setQuery("");
        }
    }, [value, options, creatable]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                const portal = document.getElementById("searchable-select-portal");
                if (portal && !portal.contains(e.target)) {
                    setIsOpen(false);
                    // Revert query if needed on close
                    const selected = options.find(o => o.value === value);
                    if (selected) {
                        setQuery(selected.label);
                    } else if (creatable && value) {
                        setQuery(value);
                    } else {
                        setQuery("");
                    }
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, value, options, creatable]);

    // Calculate position with collision detection
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const maxHeight = 300;

            // Default to opening down
            let top = rect.bottom + 8;
            let bottom = 'auto';
            let transformOrigin = 'top center';

            // If not enough space below and more space above, open up
            if (spaceBelow < maxHeight && spaceAbove > spaceBelow) {
                top = 'auto'; // Reset top
                bottom = window.innerHeight - rect.top + 8; // Position from bottom
                transformOrigin = 'bottom center';
            }

            setCoords({
                top,
                bottom,
                left: rect.left,
                width: rect.width,
                transformOrigin
            });
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        (option.subLabel && option.subLabel.toLowerCase().includes(query.toLowerCase()))
    );

    const handleSelect = (option) => {
        onChange(option.value);
        setQuery(option.label);
        setIsOpen(false);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        if (creatable) {
            onChange(val);
        }
    };

    const handleInputClick = () => {
        if (!disabled) setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className={clsx("relative", className)}>
            <div className="relative group">
                <input
                    type="text"
                    className={clsx(
                        "input w-full pr-10 cursor-pointer caret-brand-600",
                        disabled && "bg-gray-100 cursor-not-allowed text-gray-400"
                    )}
                    value={query}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onFocus={handleInputClick}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={!creatable} // If not creatable, treat as select (type to search usually requires complex focus handling, simpler to just allow type if we want search) - actually let's allow typing for filtering in both cases
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-brand-500 transition-colors">
                    <ChevronDown size={16} />
                </div>
            </div>

            {isOpen && createPortal(
                <div
                    id="searchable-select-portal"
                    className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: coords.top,
                        bottom: coords.bottom,
                        left: coords.left,
                        width: coords.width,
                        maxHeight: '300px',
                        transformOrigin: coords.transformOrigin
                    }}
                >
                    <div className="overflow-y-auto max-h-[300px] scrollbar-hide py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors group",
                                        option.value === value ? "bg-brand-50 text-brand-700" : "text-slate-700"
                                    )}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{option.label}</p>
                                        {option.subLabel && (
                                            <p className="text-xs text-slate-400 mt-0.5 group-hover:text-slate-500">{option.subLabel}</p>
                                        )}
                                    </div>
                                    {option.value === value && <Check size={16} className="text-brand-600" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                                {creatable ? "Type to create new..." : "No options found"}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
