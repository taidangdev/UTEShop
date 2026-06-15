import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import {
    createAdminProduct,
    deleteAdminProduct,
    fetchAdminProductDetail,
    fetchAdminProductFormOptions,
    fetchAdminProducts,
    updateAdminProduct
} from '../services/adminApi';
import type {
    AdminProductDetail,
    AdminProductFormOptions,
    AdminProductFormState,
    AdminProductListItem,
    AdminProductPayload
} from '../types/adminProducts';
import { EMPTY_PRODUCT_FORM as emptyForm } from '../types/adminProducts';

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-surface-container-high text-on-surface-variant',
    active: 'bg-primary/10 text-primary',
    out_of_stock: 'bg-error-container text-on-error-container',
    archived: 'bg-surface-container-high text-outline'
};

const CONDITION_LABELS: Record<string, string> = {
    new: 'Mới',
    like_new: 'Như mới',
    used: 'Đã dùng',
    refurbished: 'Tân trang'
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
    standard: 'Chuẩn',
    consignment: 'Ký gửi'
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function detailToForm(product: AdminProductDetail): AdminProductFormState {
    return {
        categoryId: String(product.category?.id || ''),
        name: product.name,
        slug: product.slug,
        sku: product.sku || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        price: String(product.price),
        compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
        costPrice: product.costPrice != null ? String(product.costPrice) : '',
        stockQuantity: String(product.stockQuantity),
        lowStockThreshold: String(product.lowStockThreshold),
        condition: product.condition,
        productType: product.productType,
        status: product.status,
        isFeatured: product.isFeatured,
        imageUrl: product.images[0]?.url || product.imageUrl || '',
        tags: (product.tags || []).join(', '),
        majorIds: product.majors.map((major) => major.id)
    };
}

function formToPayload(form: AdminProductFormState): AdminProductPayload {
    const tags = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

    const payload: AdminProductPayload = {
        categoryId: parseInt(form.categoryId, 10),
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        price: parseFloat(form.price) || 0,
        compareAtPrice: form.compareAtPrice.trim() ? parseFloat(form.compareAtPrice) : null,
        costPrice: form.costPrice.trim() ? parseFloat(form.costPrice) : null,
        stockQuantity: parseInt(form.stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold, 10) || 5,
        condition: form.condition,
        productType: form.productType,
        status: form.status,
        isFeatured: form.isFeatured,
        tags,
        majorIds: form.majorIds
    };

    if (form.slug.trim()) payload.slug = form.slug.trim();
    if (form.imageUrl.trim()) {
        payload.images = [{ url: form.imageUrl.trim(), isPrimary: true }];
    }

    return payload;
}

function validateForm(form: AdminProductFormState): string | null {
    if (!form.categoryId) return 'Vui lòng chọn danh mục';
    if (!form.name.trim()) return 'Tên sản phẩm không được để trống';
    if (!form.price.trim() || Number.isNaN(parseFloat(form.price))) return 'Giá không hợp lệ';
    if (parseFloat(form.price) < 0) return 'Giá phải >= 0';
    if (Number.isNaN(parseInt(form.stockQuantity, 10))) return 'Tồn kho không hợp lệ';
    return null;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<AdminProductListItem[]>([]);
    const [statusCounts, setStatusCounts] = useState<
        { status: string; label: string; count: number }[]
    >([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const [formOptions, setFormOptions] = useState<AdminProductFormOptions | null>(null);
    const [formOptionsLoading, setFormOptionsLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<AdminProductFormState>(emptyForm);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadFormOptions = useCallback(async () => {
        setFormOptionsLoading(true);
        try {
            const data = await fetchAdminProductFormOptions();
            setFormOptions(data);
        } catch {
            setFormOptions(null);
        } finally {
            setFormOptionsLoading(false);
        }
    }, []);

    const loadProducts = useCallback(
        async (page = pagination.page) => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAdminProducts({
                    page,
                    limit: pagination.limit,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    search: search || undefined,
                    categoryId: categoryFilter ? parseInt(categoryFilter, 10) : undefined
                });
                setProducts(data.products);
                setStatusCounts(data.statusCounts);
                setPagination(data.pagination);
            } catch (err: unknown) {
                const message =
                    typeof err === 'object' && err && 'message' in err
                        ? String((err as { message?: string }).message || '')
                        : '';
                setError(message || 'Không thể tải danh sách sản phẩm');
            } finally {
                setLoading(false);
            }
        },
        [categoryFilter, pagination.limit, pagination.page, search, statusFilter]
    );

    useEffect(() => {
        loadFormOptions();
    }, [loadFormOptions]);

    useEffect(() => {
        loadProducts(1);
    }, [statusFilter, search, categoryFilter]);

    const openCreateModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setModalOpen(true);
    };

    const openEditModal = async (id: number) => {
        setModalOpen(true);
        setEditingId(id);
        setFormLoading(true);
        setFormError(null);
        try {
            const data = await fetchAdminProductDetail(id);
            setForm(detailToForm(data.product));
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            setFormError(message || 'Không thể tải thông tin sản phẩm');
        } finally {
            setFormLoading(false);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setFormLoading(false);
    };

    const handleFormChange = <K extends keyof AdminProductFormState>(
        key: K,
        value: AdminProductFormState[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const toggleMajor = (majorId: number) => {
        setForm((prev) => ({
            ...prev,
            majorIds: prev.majorIds.includes(majorId)
                ? prev.majorIds.filter((id) => id !== majorId)
                : [...prev.majorIds, majorId]
        }));
    };

    const handleSave = async () => {
        const validationError = validateForm(form);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setSaving(true);
        setFormError(null);
        try {
            const payload = formToPayload(form);
            if (editingId) {
                await updateAdminProduct(editingId, payload);
            } else {
                await createAdminProduct(payload);
            }
            closeModal();
            await loadProducts(pagination.page);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            setFormError(message || 'Không thể lưu sản phẩm');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`Lưu trữ sản phẩm "${name}"? Sản phẩm sẽ không hiển thị trên cửa hàng.`)) {
            return;
        }
        setDeletingId(id);
        try {
            await deleteAdminProduct(id);
            await loadProducts(pagination.page);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            alert(message || 'Không thể lưu trữ sản phẩm');
        } finally {
            setDeletingId(null);
        }
    };

    const totalAll = statusCounts.reduce((sum, item) => sum + item.count, 0);
    const leafCategories =
        formOptions?.categories.filter((category) => category.parentId != null) ||
        formOptions?.categories ||
        [];

    return (
        <AdminLayout
            title="Quản lý sản phẩm"
            subtitle="Thêm, chỉnh sửa và quản lý danh mục sản phẩm trên cửa hàng."
            headerExtra={
                <div className="relative w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm tên, SKU, slug..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setSearch(searchInput.trim());
                        }}
                        className="h-10 w-full rounded-full border-none bg-surface-container-low pl-10 pr-4 text-sm outline-none ring-1 ring-transparent focus:ring-primary/40"
                    />
                </div>
            }
        >
            <section className="rounded-[24px] bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                statusFilter === 'all'
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                            Tất cả ({totalAll})
                        </button>
                        {statusCounts.map((item) => (
                            <button
                                key={item.status}
                                type="button"
                                onClick={() => setStatusFilter(item.status)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    statusFilter === item.status
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                            >
                                {item.label} ({item.count})
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={formOptionsLoading}
                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Thêm sản phẩm
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                    >
                        <option value="">Tất cả danh mục</option>
                        {leafCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => setSearch(searchInput.trim())}
                        className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
                    >
                        Tìm kiếm
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            setSearch('');
                            setCategoryFilter('');
                            setStatusFilter('all');
                        }}
                        className="h-10 rounded-xl border border-outline-variant/50 px-4 text-sm font-semibold"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            </section>

            {loading && (
                <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>
            )}

            {!loading && error && (
                <div className="rounded-[24px] bg-error-container p-6 text-on-error-container">{error}</div>
            )}

            {!loading && !error && (
                <section className="rounded-[32px] bg-surface-container-lowest shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="bg-surface-container-low/60">
                                    <th className="px-6 py-4 text-outline">Sản phẩm</th>
                                    <th className="px-6 py-4 text-outline">SKU</th>
                                    <th className="px-6 py-4 text-outline">Danh mục</th>
                                    <th className="px-6 py-4 text-outline">Giá</th>
                                    <th className="px-6 py-4 text-outline">Tồn kho</th>
                                    <th className="px-6 py-4 text-outline">Trạng thái</th>
                                    <th className="px-6 py-4 text-outline">Cập nhật</th>
                                    <th className="px-6 py-4 text-outline">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="transition-colors hover:bg-surface-container-low"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-outline">
                                                            <span className="material-symbols-outlined">
                                                                image
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{product.name}</p>
                                                    <p className="text-xs text-on-surface-variant">
                                                        /{product.slug}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">
                                            {product.sku || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p>{product.category?.name || '—'}</p>
                                            {product.category?.parentName && (
                                                <p className="text-xs text-on-surface-variant">
                                                    {product.category.parentName}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-semibold">
                                            {formatCurrency(product.price)}
                                        </td>
                                        <td className="px-6 py-4">{product.stockQuantity}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    STATUS_STYLES[product.status] ||
                                                    STATUS_STYLES.draft
                                                }`}
                                            >
                                                {product.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">
                                            {formatDate(product.updatedAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(product.id)}
                                                    className="rounded-full bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
                                                >
                                                    Sửa
                                                </button>
                                                {product.status !== 'archived' && (
                                                    <button
                                                        type="button"
                                                        disabled={deletingId === product.id}
                                                        onClick={() =>
                                                            handleDelete(product.id, product.name)
                                                        }
                                                        className="rounded-full bg-error-container px-3 py-2 text-xs font-semibold text-on-error-container transition hover:opacity-80 disabled:opacity-50"
                                                    >
                                                        Lưu trữ
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {products.length === 0 && (
                            <div className="p-10 text-center text-on-surface-variant">
                                Không tìm thấy sản phẩm phù hợp.
                            </div>
                        )}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-surface-container px-6 py-4">
                            <p className="text-sm text-on-surface-variant">
                                Trang {pagination.page}/{pagination.totalPages} — {pagination.total}{' '}
                                sản phẩm
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1}
                                    onClick={() => loadProducts(pagination.page - 1)}
                                    className="rounded-xl border border-outline-variant/50 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                                >
                                    Trước
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => loadProducts(pagination.page + 1)}
                                    className="rounded-xl border border-outline-variant/50 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-surface-container-lowest shadow-xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-container bg-surface-container-lowest px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold">
                                    {editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                                </h3>
                                <p className="text-sm text-on-surface-variant">
                                    Điền thông tin sản phẩm để hiển thị trên cửa hàng
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-full p-2 hover:bg-surface-container-low"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {formLoading && (
                            <div className="flex justify-center py-20">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        )}

                        {!formLoading && (
                            <div className="space-y-6 p-6">
                                {formError && (
                                    <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                                        {formError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Tên sản phẩm *
                                        </span>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => handleFormChange('name', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Danh mục *
                                        </span>
                                        <select
                                            value={form.categoryId}
                                            onChange={(e) =>
                                                handleFormChange('categoryId', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {leafCategories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            SKU
                                        </span>
                                        <input
                                            type="text"
                                            value={form.sku}
                                            onChange={(e) => handleFormChange('sku', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Slug (tự tạo nếu để trống)
                                        </span>
                                        <input
                                            type="text"
                                            value={form.slug}
                                            onChange={(e) => handleFormChange('slug', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Giá bán (USD) *
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.price}
                                            onChange={(e) => handleFormChange('price', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Giá gốc (so sánh)
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.compareAtPrice}
                                            onChange={(e) =>
                                                handleFormChange('compareAtPrice', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Giá vốn
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.costPrice}
                                            onChange={(e) =>
                                                handleFormChange('costPrice', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Tồn kho *
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.stockQuantity}
                                            onChange={(e) =>
                                                handleFormChange('stockQuantity', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Ngưỡng tồn kho thấp
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.lowStockThreshold}
                                            onChange={(e) =>
                                                handleFormChange('lowStockThreshold', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Tình trạng
                                        </span>
                                        <select
                                            value={form.condition}
                                            onChange={(e) =>
                                                handleFormChange('condition', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        >
                                            {(formOptions?.conditions || ['new']).map((value) => (
                                                <option key={value} value={value}>
                                                    {CONDITION_LABELS[value] || value}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Loại sản phẩm
                                        </span>
                                        <select
                                            value={form.productType}
                                            onChange={(e) =>
                                                handleFormChange('productType', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        >
                                            {(formOptions?.productTypes || ['standard']).map((value) => (
                                                <option key={value} value={value}>
                                                    {PRODUCT_TYPE_LABELS[value] || value}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Trạng thái
                                        </span>
                                        <select
                                            value={form.status}
                                            onChange={(e) => handleFormChange('status', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        >
                                            {(formOptions?.statuses || []).map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="flex items-center gap-3 sm:col-span-2">
                                        <input
                                            type="checkbox"
                                            checked={form.isFeatured}
                                            onChange={(e) =>
                                                handleFormChange('isFeatured', e.target.checked)
                                            }
                                            className="h-4 w-4 rounded border-outline-variant"
                                        />
                                        <span className="text-sm font-medium">Sản phẩm nổi bật</span>
                                    </label>

                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            URL ảnh
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="/image.png hoặc https://..."
                                            value={form.imageUrl}
                                            onChange={(e) =>
                                                handleFormChange('imageUrl', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Mô tả ngắn
                                        </span>
                                        <input
                                            type="text"
                                            value={form.shortDescription}
                                            onChange={(e) =>
                                                handleFormChange('shortDescription', e.target.value)
                                            }
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Mô tả chi tiết
                                        </span>
                                        <textarea
                                            rows={4}
                                            value={form.description}
                                            onChange={(e) =>
                                                handleFormChange('description', e.target.value)
                                            }
                                            className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm"
                                        />
                                    </label>

                                    <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Tags (phân cách bằng dấu phẩy)
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="hoodie, merchandise, ute"
                                            value={form.tags}
                                            onChange={(e) => handleFormChange('tags', e.target.value)}
                                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                        />
                                    </label>

                                    {formOptions && formOptions.majors.length > 0 && (
                                        <div className="sm:col-span-2">
                                            <span className="mb-2 block text-xs font-semibold uppercase text-on-surface-variant">
                                                Ngành học liên quan
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {formOptions.majors.map((major) => {
                                                    const selected = form.majorIds.includes(major.id);
                                                    return (
                                                        <button
                                                            key={major.id}
                                                            type="button"
                                                            onClick={() => toggleMajor(major.id)}
                                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                                selected
                                                                    ? 'bg-primary text-on-primary'
                                                                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                                                            }`}
                                                        >
                                                            {major.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 border-t border-surface-container pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="rounded-xl border border-outline-variant/50 px-4 py-2 text-sm font-semibold"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={handleSave}
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                                    >
                                        {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
