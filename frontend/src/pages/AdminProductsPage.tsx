import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import AdminPagination from '../components/admin/AdminPagination';
import {
    createAdminProduct,
    deleteAdminProduct,
    fetchAdminProductDetail,
    fetchAdminProductFormOptions,
    fetchAdminProducts,
    updateAdminProduct
} from '../services/adminApi';
import { useNotification } from '../context/NotificationContext';
import type {
    AdminProductDetail,
    AdminProductFormOptions,
    AdminProductFormState,
    AdminProductListItem,
    AdminProductPayload
} from '../types/adminProducts';
import { EMPTY_PRODUCT_FORM as emptyForm } from '../types/adminProducts';
import type { ApiErrorPayload } from '../types/api';
import { uploadConsignmentImage } from '../services/consignmentApi';

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
        images: product.images.map((img) => img.url),
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
    if (form.images.length > 0) {
        payload.images = form.images.map((url, idx) => ({
            url: url.trim(),
            isPrimary: idx === 0,
            sortOrder: idx
        }));
    }

    return payload;
}

function validateForm(form: AdminProductFormState): string | null {
    if (!form.categoryId) return 'Vui lòng chọn danh mục';
    if (!form.name.trim()) return 'Tên sản phẩm không được để trống';
    if (!form.price.trim() || Number.isNaN(parseFloat(form.price))) return 'Giá không hợp lệ';
    if (parseFloat(form.price) < 0) return 'Giá phải >= 0';
    if (Number.isNaN(parseInt(form.stockQuantity, 10))) return 'Tồn kho không hợp lệ';
    if (form.images.length > 0) {
        const validExtensions = /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff)$/i;
        for (const imageUrl of form.images) {
            const cleanUrl = imageUrl.trim().split('?')[0].split('#')[0];
            if (!validExtensions.test(cleanUrl)) {
                return `URL hình ảnh "${imageUrl}" phải có định dạng hợp lệ (.jpg, .jpeg, .png, .webp, .gif, .svg, .bmp, .tiff)`;
            }
        }
    }
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
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');

    const { toast, showConfirm } = useNotification();

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

    // Debounce search input to filter automatically as the user types
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearch(searchInput.trim());
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchInput]);

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

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setImageUploading(true);
        setFormError(null);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64String = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                const url = await uploadConsignmentImage(base64String);
                uploadedUrls.push(url);
            }
            handleFormChange('images', [...form.images, ...uploadedUrls]);
            toast.success(`Đã tải lên ${files.length} ảnh thành công`);
        } catch (err: any) {
            setFormError(err.message || 'Không thể tải ảnh lên');
        } finally {
            setImageUploading(false);
        }
    };

    const handleAddImageUrl = () => {
        const url = imageUrlInput.trim();
        if (!url) return;
        const cleanUrl = url.split('?')[0].split('#')[0];
        const validExtensions = /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff)$/i;
        if (!validExtensions.test(cleanUrl)) {
            toast.error('URL hình ảnh phải có định dạng hợp lệ (.jpg, .jpeg, .png, .webp, .gif, .svg, .bmp, .tiff)');
            return;
        }
        handleFormChange('images', [...form.images, url]);
        setImageUrlInput('');
        toast.success('Đã thêm URL ảnh thành công');
    };

    const handleRemoveImage = (indexToRemove: number) => {
        handleFormChange('images', form.images.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSetPrimaryImage = (indexToSet: number) => {
        const targetImage = form.images[indexToSet];
        const remaining = form.images.filter((_, idx) => idx !== indexToSet);
        handleFormChange('images', [targetImage, ...remaining]);
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
            let message = '';
            if (typeof err === 'object' && err) {
                const apiError = err as ApiErrorPayload;
                if (apiError.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
                    message = apiError.errors.map((e) => e.msg).join(', ');
                } else {
                    message = apiError.message || '';
                }
            }
            setFormError(message || 'Không thể lưu sản phẩm');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        const confirmDelete = await showConfirm({
            title: 'Lưu trữ sản phẩm',
            message: `Lưu trữ sản phẩm "${name}"? Sản phẩm sẽ không hiển thị trên cửa hàng.`,
            type: 'warning',
            confirmText: 'Lưu trữ'
        });
        if (!confirmDelete) return;

        setDeletingId(id);
        try {
            await deleteAdminProduct(id);
            toast.success(`Đã lưu trữ sản phẩm "${name}" thành công`);
            await loadProducts(pagination.page);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            toast.error(message || 'Không thể lưu trữ sản phẩm');
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

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
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
                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchInput('');
                                    setSearch('');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    close
                                </span>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                            className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary/90 transition"
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
                            className="h-10 rounded-xl border border-outline-variant/50 px-4 text-sm font-semibold hover:bg-surface-container-low transition"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
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
                                    <th className="whitespace-nowrap px-6 py-4 text-outline">Trạng thái</th>
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
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
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

                    <AdminPagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        itemLabel="sản phẩm"
                        onPageChange={loadProducts}
                    />
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

                                    <div className="sm:col-span-2">
                                        <span className="mb-2 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Hình ảnh sản phẩm (Ảnh đầu tiên sẽ là ảnh chính)
                                        </span>
                                        
                                        {/* Grid danh sách ảnh */}
                                        {form.images.length > 0 && (
                                            <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-dashed border-outline-variant/40 p-4 bg-surface-container-low sm:grid-cols-4">
                                                {form.images.map((url, idx) => (
                                                    <div key={url + idx} className="group relative aspect-square w-full overflow-hidden rounded-xl bg-surface-container border border-outline-variant/30 shadow-sm">
                                                        <img
                                                            src={url}
                                                            alt={`Product preview ${idx + 1}`}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = '';
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                        
                                                        {/* Badge ảnh chính */}
                                                        {idx === 0 ? (
                                                            <span className="absolute left-2 top-2 rounded-lg bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary shadow">
                                                                Ảnh chính
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetPrimaryImage(idx)}
                                                                className="absolute left-2 top-2 hidden rounded-lg bg-surface-container-high/90 px-2 py-0.5 text-[10px] font-bold text-on-surface-variant shadow transition hover:bg-primary hover:text-on-primary group-hover:block"
                                                            >
                                                                Đặt làm ảnh chính
                                                            </button>
                                                        )}

                                                        {/* Nút xóa ảnh */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(idx)}
                                                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition hover:bg-black group-hover:opacity-100 flex items-center justify-center"
                                                            aria-label="Xóa ảnh"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Nhập URL hoặc tải file từ máy */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <div className="flex flex-1 gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Dán URL ảnh tại đây..."
                                                        value={imageUrlInput}
                                                        onChange={(e) => setImageUrlInput(e.target.value)}
                                                        className="h-10 flex-1 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddImageUrl}
                                                        className="h-10 rounded-xl bg-surface-container-high px-4 text-sm font-semibold hover:bg-surface-container-highest transition"
                                                    >
                                                        Thêm URL
                                                    </button>
                                                </div>
                                                
                                                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/5 transition disabled:opacity-50">
                                                    {imageUploading ? (
                                                        <>
                                                            <span className="animate-spin material-symbols-outlined text-[18px]">
                                                                progress_activity
                                                            </span>
                                                            <span>Đang tải...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                upload
                                                                </span>
                                                            <span>Tải ảnh từ máy</span>
                                                        </>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleImageFileChange}
                                                        disabled={imageUploading}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[11px] text-on-surface-variant">
                                                Bạn có thể tải lên nhiều tệp ảnh cùng lúc hoặc dán URL rồi bấm "Thêm URL".
                                            </p>
                                        </div>
                                    </div>

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
