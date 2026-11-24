import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function SearchableSelect({ options = [], value, onChange, placeholder = "Search...", error = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 320, openUp: false });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const filteredOptions = options.filter(opt =>
        (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.badge || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 290;
        const openUp = spaceBelow < menuHeight && rect.top > menuHeight;
        const desiredWidth = Math.max(rect.width, 320);
        const maxLeft = Math.max(8, window.innerWidth - desiredWidth - 12);
        setMenuPos({
            top: openUp ? rect.top - 6 : rect.bottom + 6,
            left: Math.min(rect.left, maxLeft),
            width: Math.min(desiredWidth, window.innerWidth - 24),
            openUp,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const onScrollOrResize = () => updatePosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event) {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        function handleEsc(e) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen]);

    const dropdownMenu = isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
                ref={menuRef}
                style={{
                    position: 'fixed',
                    top: menuPos.top,
                    left: menuPos.left,
                    width: menuPos.width,
                    transform: menuPos.openUp ? 'translateY(-100%)' : 'none',
                    zIndex: 9999,
                    background: 'var(--surface-white)',
                    border: '1px solid var(--border-color)',
                }}
                className="rounded-xl shadow-2xl overflow-hidden"
            >
                {/* Search Input */}
                <div
                    className="flex items-center px-3 py-2.5 border-b"
                    style={{ background: 'var(--surface-light)', borderColor: 'var(--border-color)' }}
                >
                    <Search size={14} style={{ color: 'var(--text-secondary)' }} className="mr-2 shrink-0" />
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
                <div
                    className="max-h-64 overflow-y-auto p-1.5 space-y-0.5"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.4) transparent' }}
                >
                    {filteredOptions.length === 0 ? (
                        <div className="py-4 px-4 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                            No matching items found.
                        </div>
                    ) : (
                        filteredOptions.map((opt) => {
                            const isSelected = String(value) === String(opt.value);
                            return (
                                <div
                                    key={opt.value}
                                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                                    style={{
                                        background: isSelected ? 'var(--info-bg)' : 'transparent',
                                        color: isSelected ? 'var(--info)' : 'var(--text-primary)',
                                        fontWeight: isSelected ? 700 : 500,
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-light)'; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="truncate flex-1">{opt.label}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {opt.badge && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                opt.badge.toLowerCase() === 'phone' || opt.badge.toLowerCase() === 'serialized'
                                                    ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300'
                                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                            }`}>
                                                {opt.badge}
                                            </span>
                                        )}
                                        {isSelected && <Check size={14} className="text-indigo-500" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <div ref={triggerRef} className="relative w-full">
            <div
                className={`saas-input w-full flex items-center justify-between cursor-pointer ${error ? 'border-rose-500 ring-rose-100' : ''}`}
                onClick={() => {
                    setIsOpen(prev => !prev);
                    setSearchTerm('');
                }}
            >
                <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)' }} className="block truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} className={`transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {dropdownMenu}
        </div>
    );
}
