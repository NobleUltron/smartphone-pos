import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function SearchableSelect({ options, value, onChange, placeholder = "Search...", error = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Find the currently selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search term
    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            {/* Main Select Button */}
            <div 
                className={`saas-input w-full flex items-center justify-between cursor-pointer ${error ? 'border-rose-500 ring-rose-100' : ''}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearchTerm('');
                }}
            >
                <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)' }} className="block truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 rounded-xl shadow-xl overflow-hidden"
                    style={{
                        background: 'var(--surface-white)',
                        border: '1px solid var(--border-color)',
                    }}
                >
                    {/* Search Input */}
                    <div
                        className="flex items-center px-3 py-2 border-b"
                        style={{ background: 'var(--surface-light)', borderColor: 'var(--border-color)' }}
                    >
                        <Search size={14} style={{ color: 'var(--text-secondary)' }} className="mr-2" />
                        <input
                            type="text"
                            className="w-full bg-transparent border-none text-sm focus:ring-0 p-0 placeholder-slate-400"
                            style={{ color: 'var(--text-primary)' }}
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-3 px-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                                No products found.
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className="flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors"
                                    style={{
                                        background: value === opt.value ? 'var(--info-bg)' : 'transparent',
                                        color: value === opt.value ? 'var(--info)' : 'var(--text-primary)',
                                        fontWeight: value === opt.value ? 600 : 400,
                                    }}
                                    onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'var(--surface-light)'; }}
                                    onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={14} className="text-indigo-500 flex-shrink-0 ml-2" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
