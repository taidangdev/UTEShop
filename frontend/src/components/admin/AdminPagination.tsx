import { Fragment } from 'react';

interface AdminPaginationProps {
    page: number;
    totalPages: number;
    total: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
}

function getVisiblePages(current: number, total: number): number[] {
    return Array.from({ length: total }, (_, i) => i + 1).filter(
        (p) => p === 1 || p === total || Math.abs(p - current) <= 1
    );
}

export default function AdminPagination({
    page,
    totalPages,
    total,
    itemLabel,
    onPageChange
}: AdminPaginationProps) {
    if (totalPages <= 1) return null;

    const visiblePages = getVisiblePages(page, totalPages);

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-container px-6 py-4">
            <p className="text-sm text-on-surface-variant">
                Trang {page}/{totalPages} — {total} {itemLabel}
            </p>
            <div className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/50 text-on-surface-variant transition hover:bg-surface-container-low disabled:opacity-40"
                    aria-label="Trang trước"
                >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                {visiblePages.map((p, idx) => {
                    const prev = visiblePages[idx - 1];
                    const showEllipsis = prev != null && p - prev > 1;
                    return (
                        <Fragment key={p}>
                            {showEllipsis && (
                                <span className="flex h-9 w-9 items-center justify-center text-sm text-on-surface-variant">
                                    …
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => onPageChange(p)}
                                className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                                    p === page
                                        ? 'bg-primary text-on-primary'
                                        : 'border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low'
                                }`}
                                aria-label={`Trang ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        </Fragment>
                    );
                })}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/50 text-on-surface-variant transition hover:bg-surface-container-low disabled:opacity-40"
                    aria-label="Trang sau"
                >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
            </div>
        </div>
    );
}
