import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosInstance from '../services/axiosConfig';
import ProductSearchBox from '../components/catalog/ProductSearchBox';
import { formatPrice } from '../utils/formatPrice';
import type { ApiEnvelope, PaginationMeta } from '../types/api';
import type { CatalogProduct, CategoryWithCount, Major } from '../types/catalog';
import ProductCard from '../components/catalog/ProductCard';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest Arrival' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' }
];

const HERO_IMAGE = '/PremiumLaptop.png';

const CATEGORY_DISPLAY: Record<string, string> = {
    all: 'All Products',
    merchandise: 'Merchandise',
    'study-tools': 'Study Tools',
    technology: 'Technology',
    'student-life': 'Student Life',
    'second-hand': 'Second-hand'
};

function categoryLabel(product: CatalogProduct) {
    const c = product.category;
    if (!c) return 'General';
    if (c.parentName) return `${c.parentName} & ${c.name}`;
    return c.name;
}

// Reusable ProductCard is now imported from components/catalog/ProductCard

function CategoriesFooter() {
    return (
        <footer className="w-full bg-surface-container-low py-20">
            <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-6 md:grid-cols-4 lg:grid-cols-5 lg:px-8">
                <div className="col-span-2 lg:col-span-1">
                    <div className="mb-6 text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="text-base text-on-surface-variant">
                        Engineering-Grade Quality for the academic frontier.
                    </p>
                </div>
                <div className="space-y-4">
                    <h5 className="text-sm font-bold text-primary">Shopping</h5>
                    <nav className="flex flex-col gap-2">
                        <Link to="/categories?category=study-tools" className="text-xs text-on-surface-variant hover:text-primary">
                            Study Tools
                        </Link>
                        <Link to="/categories?category=technology" className="text-xs text-on-surface-variant hover:text-primary">
                            Technology
                        </Link>
                        <Link to="/categories?category=merchandise" className="text-xs text-on-surface-variant hover:text-primary">
                            Merchandise
                        </Link>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h5 className="text-sm font-bold text-primary">Resources</h5>
                    <nav className="flex flex-col gap-2">
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Student Support
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Shipping
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Contact
                        </a>
                    </nav>
                </div>
                <div className="space-y-4">
                    <h5 className="text-sm font-bold text-primary">Legal</h5>
                    <nav className="flex flex-col gap-2">
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Privacy Policy
                        </a>
                        <a href="#support" className="text-xs text-on-surface-variant hover:text-primary">
                            Terms of Service
                        </a>
                    </nav>
                </div>
                <div className="col-span-2 mt-8 lg:col-span-1 lg:mt-0">
                    <p className="text-xs text-on-surface-variant opacity-80">
                        © 2024 UTEShop. Engineering-Grade Quality.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default function CategoriesPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'all';
    const majorId = searchParams.get('majorId') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    const [categories, setCategories] = useState<CategoryWithCount[]>([]);
    const [majors, setMajors] = useState<Major[]>([]);
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState(q);

    useEffect(() => {
        setSearchInput(q);
    }, [q]);

    const updateParams = useCallback(
        (updates: Record<string, string | number | null | undefined>) => {
            const next = new URLSearchParams(searchParams);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === '' || value === null || value === undefined || value === 'all') {
                    next.delete(key);
                } else {
                    next.set(key, String(value));
                }
            });
            if (!('page' in updates)) {
                next.delete('page');
            }
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [catRes, majorRes, prodRes] = await Promise.all([
                    axiosInstance.get<ApiEnvelope<{ categories: CategoryWithCount[] }>>(
                        '/catalog/categories'
                    ),
                    axiosInstance.get<ApiEnvelope<{ majors: Major[] }>>('/catalog/majors'),
                    axiosInstance.get<
                        ApiEnvelope<{ products: CatalogProduct[]; pagination: PaginationMeta }>
                    >('/catalog/products', {
                        params: {
                            q: q || undefined,
                            category: category === 'all' ? undefined : category,
                            majorId: majorId || undefined,
                            sort,
                            page,
                            limit: 12
                        }
                    })
                ]);

                if (cancelled) return;

                setCategories(catRes.data?.categories ?? []);
                setMajors(majorRes.data?.majors ?? []);
                setProducts(prodRes.data?.products ?? []);
                setPagination(
                    prodRes.data?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 }
                );
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        typeof err === 'string'
                            ? err
                            : (err as { message?: string })?.message || 'Failed to load catalog';
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [q, category, majorId, sort, page]);

    const total = pagination.total ?? 0;
    const showingFrom = total === 0 ? 0 : (page - 1) * pagination.limit + 1;
    const showingTo = Math.min(page * pagination.limit, total);

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            {/* Hero */}
            <section className="mx-auto max-w-[1280px] px-6 pb-12 pt-10 lg:px-8">
                <div className="group relative h-[400px] overflow-hidden rounded-[24px]">
                    <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center bg-gradient-to-r from-on-surface/60 to-transparent p-8 md:p-12">
                        <div className="max-w-xl">
                            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                                Precision Tools for Modern Minds
                            </h1>
                            <p className="mb-8 text-lg text-white/90">
                                Curated technology and merchandise engineered for the next generation of
                                innovators.
                            </p>
                            <button
                                type="button"
                                onClick={() => updateParams({ category: 'all', q: '', majorId: '', page: 1 })}
                                className="h-14 rounded-[24px] bg-primary px-8 text-sm font-medium text-on-primary transition active:scale-95 hover:shadow-lg"
                            >
                                Explore Full Collection
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-6 pb-6 lg:px-8">
                <div className="flex gap-3">
                    <ProductSearchBox
                        value={searchInput}
                        onChange={setSearchInput}
                        onSearch={(term) => updateParams({ q: term, page: 1 })}
                        category={category}
                        majorId={majorId}
                    />
                    {(q || category !== 'all' || majorId) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchInput('');
                                updateParams({ q: '', category: 'all', majorId: '', page: 1 });
                            }}
                            className="h-12 shrink-0 rounded-full border border-outline-variant px-4 text-sm text-on-surface-variant hover:bg-surface-container"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </section>

            <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 pb-20 lg:grid-cols-12 lg:px-8">
                {/* Sidebar */}
                <aside className="space-y-10 md:col-span-3">
                    <div>
                        <h3 className="mb-6 text-2xl font-semibold text-on-surface">Categories</h3>
                        <div className="flex flex-col gap-3">
                            {categories.map((cat) => {
                                const active =
                                    (cat.slug === 'all' && (category === 'all' || !category)) ||
                                    cat.slug === category;
                                return (
                                    <button
                                        key={cat.slug}
                                        type="button"
                                        onClick={() =>
                                            updateParams({
                                                category: cat.slug === 'all' ? 'all' : cat.slug,
                                                page: 1
                                            })
                                        }
                                        className={`flex items-center justify-between rounded-xl p-3 transition-colors ${
                                            active
                                                ? 'bg-surface-container-highest font-semibold text-primary'
                                                : 'text-on-surface-variant hover:bg-surface-container'
                                        }`}
                                    >
                                        <span className="text-sm font-medium">
                                            {CATEGORY_DISPLAY[cat.slug] || cat.name}
                                        </span>
                                        <span className="text-xs opacity-60">{cat.productCount}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-6 text-2xl font-semibold text-on-surface">Filter by Major</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => updateParams({ majorId: '', page: 1 })}
                                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                                    !majorId
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                                }`}
                            >
                                All majors
                            </button>
                            {majors.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() =>
                                        updateParams({
                                            majorId: String(m.id) === majorId ? '' : m.id,
                                            page: 1
                                        })
                                    }
                                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                                        String(m.id) === majorId
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                                    }`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[24px] bg-surface-container-low p-6">
                        <h4 className="mb-2 text-sm font-bold text-on-surface">Student Verification</h4>
                        <p className="mb-4 text-xs text-on-surface-variant">
                            Connect your .edu email to unlock exclusive engineering discounts up to 30%
                            off.
                        </p>
                        <Link
                            to="/register"
                            className="flex h-12 w-full items-center justify-center rounded-full bg-on-surface text-sm font-semibold text-surface"
                        >
                            Verify Status
                        </Link>
                    </div>
                </aside>

                {/* Grid */}
                <div className="md:col-span-9">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-base text-on-surface-variant">
                            {loading
                                ? 'Loading…'
                                : total === 0
                                  ? 'No results'
                                  : `Showing ${showingFrom}–${showingTo} of ${total} results`}
                            {q ? (
                                <span>
                                    {' '}
                                    for &quot;<strong className="text-on-surface">{q}</strong>&quot;
                                </span>
                            ) : null}
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-on-surface-variant">Sort by:</span>
                            <select
                                value={sort}
                                onChange={(e) => updateParams({ sort: e.target.value, page: 1 })}
                                className="cursor-pointer border-none bg-transparent text-sm font-bold text-on-surface focus:ring-0"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="rounded-[24px] bg-surface-container-low py-20 text-center">
                            <span className="material-symbols-outlined mb-4 text-5xl text-outline">
                                inventory_2
                            </span>
                            <p className="text-on-surface-variant">No products match your filters.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    updateParams({ q: '', category: 'all', majorId: '', page: 1 });
                                }}
                                className="mt-4 text-sm font-semibold text-primary hover:underline"
                            >
                                Reset filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="mt-20 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => updateParams({ page: page - 1 })}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest text-primary disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                .filter(
                                    (p) =>
                                        p === 1 ||
                                        p === pagination.totalPages ||
                                        Math.abs(p - page) <= 1
                                )
                                .map((p, idx, arr) => {
                                    const prev = arr[idx - 1];
                                    const showEllipsis = prev != null && p - prev > 1;
                                    return (
                                        <Fragment key={p}>
                                            {showEllipsis && (
                                                <span className="flex h-12 w-12 items-center justify-center">
                                                    …
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => updateParams({ page: p })}
                                                className={`flex h-12 w-12 items-center justify-center rounded-full font-bold transition-colors ${
                                                    p === page
                                                        ? 'bg-primary text-on-primary'
                                                        : 'hover:bg-surface-container-highest'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </Fragment>
                                    );
                                })}
                            <button
                                type="button"
                                disabled={page >= pagination.totalPages}
                                onClick={() => updateParams({ page: page + 1 })}
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest text-primary disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <CategoriesFooter />

            <div className="fixed bottom-8 right-8 z-40 md:hidden">
                <button
                    type="button"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition active:scale-90"
                    aria-label="Cart"
                >
                    <span className="material-symbols-outlined">shopping_bag</span>
                </button>
            </div>
        </div>
    );
}
