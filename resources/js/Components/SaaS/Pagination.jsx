import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared SaaS Pagination bar supporting both:
 *  1) Laravel server-side paginator via `data` prop
 *  2) Client-side pagination via `total`, `currentPage`, `perPage`, `onPageChange`, `onPerPageChange`
 */
export default function Pagination({
    data = null,
    total = null,
    currentPage = 1,
    perPage = 15,
    onPageChange = null,
    onPerPageChange = null,
    perPageOptions = [10, 15, 25, 50, 100],
    className = 'mt-4',
}) {
    const isClientMode = typeof onPageChange === 'function' && total !== null;

    const totalItems = isClientMode ? Number(total || 0) : Number(data?.total || 0);
    const activePerPage = isClientMode ? Number(perPage || 15) : Number(data?.per_page || 15);
    const activePage = isClientMode ? Number(currentPage || 1) : Number(data?.current_page || 1);
    const lastPage = isClientMode
        ? Math.max(1, Math.ceil(totalItems / activePerPage))
        : Number(data?.last_page || 1);

    const from = isClientMode
        ? (totalItems === 0 ? 0 : (activePage - 1) * activePerPage + 1)
        : Number(data?.from || 0);
    const to = isClientMode
        ? Math.min(totalItems, activePage * activePerPage)
        : Number(data?.to || 0);

    const [selectedPerPage, setSelectedPerPage] = useState(String(activePerPage));

    useEffect(() => {
        setSelectedPerPage(String(activePerPage));
    }, [activePerPage]);

    if (totalItems === 0) {
        return null;
    }

    const options = Array.from(new Set([...perPageOptions, activePerPage])).sort((a, b) => a - b);

    const handleApplyPerPage = (e) => {
        e.preventDefault();
        const nextPerPage = Number(selectedPerPage) || 15;
        if (isClientMode) {
            if (typeof onPerPageChange === 'function') {
                onPerPageChange(nextPerPage);
            }
            onPageChange(1);
            return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('per_page', String(nextPerPage));
        url.searchParams.delete('page');
        router.get(url.pathname + url.search, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Build page tokens for client-side mode (with ellipsis if many pages)
    const buildClientPages = () => {
        if (lastPage <= 7) {
            return Array.from({ length: lastPage }, (_, i) => i + 1);
        }
        const pages = [1];
        if (activePage > 3) pages.push('...');
        const start = Math.max(2, activePage - 1);
        const end = Math.min(lastPage - 1, activePage + 1);
        for (let p = start; p <= end; p++) pages.push(p);
        if (activePage < lastPage - 2) pages.push('...');
        pages.push(lastPage);
        return pages;
    };

    const serverLinks = !isClientMode ? (data?.links || []) : [];
    const hasMultiplePages = isClientMode ? lastPage > 1 : serverLinks.length > 3;

    const baseBtnClass =
        'min-w-[32px] h-8 px-2.5 inline-flex items-center justify-center rounded-lg text-xs font-bold border transition-colors';
    const activeBtnClass = 'bg-indigo-600 border-indigo-600 text-white shadow-sm';
    const defaultBtnClass =
        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer';
    const disabledBtnClass =
        'bg-slate-50 dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed pointer-events-none';

    return (
        <div
            className={`${className} bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 sm:px-5 py-3 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3`}
        >
            {/* Left: Showing X–Y of Z */}
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Showing{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{from}</span>
                –
                <span className="font-bold text-slate-800 dark:text-slate-200">{to}</span>
                {' '}of{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span>
            </div>

            {/* Center: Rows per page selector + Apply */}
            <form onSubmit={handleApplyPerPage} className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Rows per page
                </label>
                <select
                    value={selectedPerPage}
                    onChange={(e) => setSelectedPerPage(e.target.value)}
                    className="h-8 px-2.5 pr-7 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                    {options.map((opt) => (
                        <option key={opt} value={String(opt)}>
                            {opt}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="h-8 px-3 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                    Apply
                </button>
            </form>

            {/* Right: Page buttons */}
            {hasMultiplePages && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {isClientMode ? (
                        <>
                            <button
                                type="button"
                                disabled={activePage <= 1}
                                onClick={() => onPageChange(Math.max(1, activePage - 1))}
                                className={`${baseBtnClass} ${activePage <= 1 ? disabledBtnClass : defaultBtnClass}`}
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {buildClientPages().map((token, idx) =>
                                token === '...' ? (
                                    <span key={`e-${idx}`} className={`${baseBtnClass} ${disabledBtnClass}`}>
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={token}
                                        type="button"
                                        onClick={() => onPageChange(token)}
                                        className={`${baseBtnClass} ${token === activePage ? activeBtnClass : defaultBtnClass}`}
                                    >
                                        {token}
                                    </button>
                                )
                            )}
                            <button
                                type="button"
                                disabled={activePage >= lastPage}
                                onClick={() => onPageChange(Math.min(lastPage, activePage + 1))}
                                className={`${baseBtnClass} ${activePage >= lastPage ? disabledBtnClass : defaultBtnClass}`}
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </>
                    ) : (
                        serverLinks.map((link, idx) => {
                            const rawLabel = String(link.label || '');
                            const isPrev = idx === 0 || rawLabel.toLowerCase().includes('previous') || rawLabel.includes('&laquo;');
                            const isNext = idx === serverLinks.length - 1 || rawLabel.toLowerCase().includes('next') || rawLabel.includes('&raquo;');

                            const stateClass = link.active
                                ? activeBtnClass
                                : link.url
                                    ? defaultBtnClass
                                    : disabledBtnClass;

                            const content = isPrev ? (
                                <ChevronLeft size={14} />
                            ) : isNext ? (
                                <ChevronRight size={14} />
                            ) : (
                                <span dangerouslySetInnerHTML={{ __html: rawLabel }} />
                            );

                            if (!link.url) {
                                return (
                                    <span key={idx} className={`${baseBtnClass} ${stateClass}`} aria-disabled="true">
                                        {content}
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    preserveScroll
                                    preserveState
                                    className={`${baseBtnClass} ${stateClass}`}
                                    aria-label={isPrev ? 'Previous page' : isNext ? 'Next page' : `Page ${rawLabel}`}
                                >
                                    {content}
                                </Link>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
