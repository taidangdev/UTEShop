import React, { useEffect, useState, useMemo } from 'react';
import axiosInstance from '../../services/axiosConfig';
import type { ApiEnvelope } from '../../types/api';
import {
    fetchAdminPromotions,
    createAdminPromotion,
    updateAdminPromotion,
    deleteAdminPromotion,
    bulkActiveAdminPromotions,
    bulkDeleteAdminPromotions,
    fetchAdminCategories,
    type AdminPromotion,
    type AdminCategory
} from '../../services/adminApi';
import { useNotification } from '../../context/NotificationContext';

interface ProductCandidate {
    id: number;
    name: string;
    slug: string;
}

export default function PromotionsTab() {
    const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive, expired, scheduled
    const [typeFilter, setTypeFilter] = useState('all'); // all, percentage, fixed_amount, free_shipping

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { toast: globalToast, showConfirm } = useNotification();

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<AdminPromotion | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Product search inside Modal
    const [prodQuery, setProdQuery] = useState('');
    const [prodCandidates, setProdCandidates] = useState<ProductCandidate[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        scope: 'shop' as 'shop' | 'category' | 'product',
        description: '',
        type: 'percentage' as 'percentage' | 'fixed_amount' | 'free_shipping',
        value: 0,
        minOrderAmount: '' as string | number,
        maxDiscountAmount: '' as string | number,
        maxUsesPerUser: '' as string | number,
        startsAt: '',
        endsAt: '',
        usageLimit: '' as string | number,
        isActive: true,
        categoryIds: [] as number[],
        productIds: [] as number[]
    });

    // Selected products representation for Chip tags display
    const [selectedProducts, setSelectedProducts] = useState<Array<{ id: number; name: string }>>([]);

    const showToast = (message: string, type: 'success' | 'error') => {
        if (type === 'success') {
            globalToast.success(message);
        } else {
            globalToast.error(message);
        }
    };

    const loadPromotions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchAdminPromotions(page, limit);
            if (res) {
                setPromotions(res.promotions || []);
                setTotalCount(res.pagination?.total || 0);
                setTotalPages(res.pagination?.totalPages || 1);
            }
        } catch (err: any) {
            setError(err.message || 'Không thể tải danh sách khuyến mãi');
        } finally {
            setLoading(false);
        }
    };

    const loadCategoriesList = async () => {
        try {
            const data = await fetchAdminCategories();
            setCategories(data.categories || []);
        } catch (err) {
            console.error('Lỗi tải danh mục cho picker:', err);
        }
    };

    useEffect(() => {
        loadPromotions();
    }, [page, limit]);

    useEffect(() => {
        loadCategoriesList();
    }, []);

    // Debounce product autocomplete search
    useEffect(() => {
        if (!prodQuery.trim() || formData.scope !== 'product') {
            setProdCandidates([]);
            return;
        }
        const handler = setTimeout(async () => {
            setSearchingProducts(true);
            try {
                const res = await axiosInstance.get<ApiEnvelope<{ products: ProductCandidate[] }>>('/catalog/products', {
                    params: { q: prodQuery, limit: 10 }
                });
                setProdCandidates(res.data?.products || []);
            } catch (err) {
                console.error('Lỗi tìm sản phẩm:', err);
            } finally {
                setSearchingProducts(false);
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [prodQuery, formData.scope]);

    // Format helpers
    const formatCurrency = (val: number | null) => {
        if (val == null) return '—';
        return `${new Intl.NumberFormat('vi-VN').format(val)} VNĐ`;
    };

    const formatDateInput = (dateStr: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // Returns YYYY-MM-DDTHH:MM
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatDateDisplay = (dateStr: string | null) => {
        if (!dateStr) return 'Vô hạn';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Promotion status classifier
    const getPromoStatus = (promo: AdminPromotion) => {
        if (!promo.isActive) return { label: 'Tạm ẩn', class: 'bg-outline-variant/25 text-outline' };
        const now = new Date();
        if (promo.startsAt && now < new Date(promo.startsAt)) {
            return { label: 'Lên lịch', class: 'bg-info-container text-info' };
        }
        if (promo.endsAt && now > new Date(promo.endsAt)) {
            return { label: 'Hết hạn', class: 'bg-error-container text-error' };
        }
        if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
            return { label: 'Hết lượt', class: 'bg-warning-container text-warning' };
        }
        return { label: 'Hoạt động', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' };
    };

    // Client-side filtering
    const filteredPromotions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return promotions.filter((promo) => {
            const matchesQuery =
                !query ||
                promo.code.toLowerCase().includes(query) ||
                promo.name.toLowerCase().includes(query) ||
                (promo.description && promo.description.toLowerCase().includes(query));

            const status = getPromoStatus(promo);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && status.label === 'Hoạt động') ||
                (statusFilter === 'inactive' && status.label === 'Tạm ẩn') ||
                (statusFilter === 'expired' && status.label === 'Hết hạn') ||
                (statusFilter === 'scheduled' && status.label === 'Lên lịch');

            const matchesType = typeFilter === 'all' || promo.type === typeFilter;

            return matchesQuery && matchesStatus && matchesType;
        });
    }, [promotions, searchQuery, statusFilter, typeFilter]);

    const handleSelectToggle = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.length === filteredPromotions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPromotions.map((p) => p.id));
        }
    };

    const handleToggleActive = async (promo: AdminPromotion) => {
        try {
            const nextValue = !promo.isActive;
            await updateAdminPromotion(promo.id, {
                name: promo.name,
                scope: promo.scope,
                type: promo.type,
                value: promo.value,
                isActive: nextValue
            });
            setPromotions((prev) =>
                prev.map((p) => (p.id === promo.id ? { ...p, isActive: nextValue } : p))
            );
            showToast(`Đã ${nextValue ? 'kích hoạt' : 'tạm ẩn'} mã "${promo.code}" thành công`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        showToast(`Đã sao chép mã "${code}" vào bộ nhớ tạm`, 'success');
    };

    const handleDelete = async (promo: AdminPromotion) => {
        if (promo.usedCount > 0) {
            showToast('Không thể xóa khuyến mãi đã có lượt sử dụng để bảo toàn dữ liệu', 'error');
            return;
        }
        const confirmDelete = await showConfirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa khuyến mãi "${promo.code}"?`,
            type: 'danger',
            confirmText: 'Xóa khuyến mãi'
        });
        if (!confirmDelete) return;

        try {
            await deleteAdminPromotion(promo.id);
            setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
            setSelectedIds((prev) => prev.filter((id) => id !== promo.id));
            showToast(`Đã xóa khuyến mãi "${promo.code}"`, 'success');
            // Reload page if needed to adjust pagination
            if (promotions.length === 1 && page > 1) {
                setPage(page - 1);
            } else {
                loadPromotions();
            }
        } catch (err: any) {
            showToast(err.message || 'Lỗi khi xóa', 'error');
        }
    };

    const handleBulkActive = async (isActive: boolean) => {
        if (selectedIds.length === 0) return;
        try {
            await bulkActiveAdminPromotions(selectedIds, isActive);
            setPromotions((prev) =>
                prev.map((p) => (selectedIds.includes(p.id) ? { ...p, isActive } : p))
            );
            showToast(`Đã ${isActive ? 'kích hoạt' : 'tạm ẩn'} hàng loạt ${selectedIds.length} khuyến mãi`, 'success');
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message || 'Lỗi cập nhật hàng loạt', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const confirmDelete = await showConfirm({
            title: 'Xóa hàng loạt',
            message: `Bạn có chắc chắn muốn xóa các khuyến mãi đã chọn?`,
            type: 'danger',
            confirmText: 'Xóa tất cả'
        });
        if (!confirmDelete) return;

        try {
            const data = await bulkDeleteAdminPromotions(selectedIds);
            const deletedCount = data.deletedCount || 0;
            const failedCodes = data.failedCodes || [];

            if (deletedCount > 0) {
                loadPromotions();
            }

            if (failedCodes.length > 0) {
                showToast(
                    `Đã xóa ${deletedCount} khuyến mãi. Bỏ qua ${failedCodes.length} khuyến mãi đã dùng: ${failedCodes.join(', ')}`,
                    'error'
                );
            } else {
                showToast(`Đã xóa thành công ${deletedCount} khuyến mãi`, 'success');
            }
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message || 'Lỗi xóa hàng loạt', 'error');
        }
    };

    const handleOpenCreateModal = () => {
        setEditingPromotion(null);
        setProdQuery('');
        setProdCandidates([]);
        setSelectedProducts([]);
        // Auto-generate random code string
        const randomCode = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setFormData({
            code: randomCode,
            name: '',
            scope: 'shop',
            description: '',
            type: 'percentage',
            value: 0,
            minOrderAmount: '',
            maxDiscountAmount: '',
            maxUsesPerUser: '',
            startsAt: '',
            endsAt: '',
            usageLimit: '',
            isActive: true,
            categoryIds: [],
            productIds: []
        });
        setModalError(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (promo: AdminPromotion) => {
        setEditingPromotion(promo);
        setProdQuery('');
        setProdCandidates([]);
        setSelectedProducts(promo.products || []);
        setFormData({
            code: promo.code,
            name: promo.name,
            scope: promo.scope,
            description: promo.description || '',
            type: promo.type,
            value: promo.value,
            minOrderAmount: promo.minOrderAmount != null ? promo.minOrderAmount : '',
            maxDiscountAmount: promo.maxDiscountAmount != null ? promo.maxDiscountAmount : '',
            maxUsesPerUser: promo.maxUsesPerUser != null ? promo.maxUsesPerUser : '',
            startsAt: formatDateInput(promo.startsAt),
            endsAt: formatDateInput(promo.endsAt),
            usageLimit: promo.usageLimit != null ? promo.usageLimit : '',
            isActive: promo.isActive,
            categoryIds: (promo.categories || []).map((c) => c.id),
            productIds: (promo.products || []).map((p) => p.id)
        });
        setModalError(null);
        setShowModal(true);
    };

    const handleCategoryCheckboxChange = (catId: number) => {
        setFormData((prev) => {
            const ids = prev.categoryIds.includes(catId)
                ? prev.categoryIds.filter((id) => id !== catId)
                : [...prev.categoryIds, catId];
            return { ...prev, categoryIds: ids };
        });
    };

    const handleAddProduct = (prod: ProductCandidate) => {
        if (formData.productIds.includes(prod.id)) return;
        setSelectedProducts((prev) => [...prev, { id: prod.id, name: prod.name }]);
        setFormData((prev) => ({
            ...prev,
            productIds: [...prev.productIds, prod.id]
        }));
        setProdQuery('');
        setProdCandidates([]);
    };

    const handleRemoveProduct = (prodId: number) => {
        setSelectedProducts((prev) => prev.filter((p) => p.id !== prodId));
        setFormData((prev) => ({
            ...prev,
            productIds: prev.productIds.filter((id) => id !== prodId)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);

        if (!formData.name.trim()) {
            setModalError('Tên chương trình khuyến mãi là bắt buộc');
            return;
        }

        const isEndsAtModified = !editingPromotion || formatDateInput(editingPromotion.endsAt) !== formData.endsAt;
        if (formData.endsAt && isEndsAtModified) {
            const end = new Date(formData.endsAt);
            if (end <= new Date()) {
                setModalError('Thời gian kết thúc phải diễn ra trong tương lai');
                return;
            }
        }

        if (formData.startsAt && formData.endsAt) {
            const start = new Date(formData.startsAt);
            const end = new Date(formData.endsAt);
            if (end <= start) {
                setModalError('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu');
                return;
            }
        }

        if (formData.type !== 'free_shipping' && Number(formData.value) <= 0) {
            setModalError('Giá trị khuyến mãi phải lớn hơn 0');
            return;
        }

        if (formData.type === 'percentage') {
            if (Number(formData.value) > 100) {
                setModalError('Phần trăm giảm giá không được vượt quá 100%');
                return;
            }
        }

        if (formData.scope === 'category' && formData.categoryIds.length === 0) {
            setModalError('Vui lòng chọn ít nhất một danh mục áp dụng');
            return;
        }

        if (formData.scope === 'product' && formData.productIds.length === 0) {
            setModalError('Vui lòng chọn ít nhất một sản phẩm áp dụng');
            return;
        }

        setSubmitting(true);

        const payload = {
            code: formData.code.trim().toUpperCase() || undefined,
            name: formData.name.trim(),
            scope: formData.scope,
            description: formData.description.trim() || null,
            type: formData.type,
            value: Number(formData.value),
            minOrderAmount: formData.minOrderAmount !== '' ? Number(formData.minOrderAmount) : null,
            maxDiscountAmount:
                formData.type === 'percentage' && formData.maxDiscountAmount !== ''
                    ? Number(formData.maxDiscountAmount)
                    : null,
            maxUsesPerUser: formData.maxUsesPerUser !== '' ? Number(formData.maxUsesPerUser) : null,
            startsAt: formData.startsAt || null,
            endsAt: formData.endsAt || null,
            usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : null,
            isActive: formData.isActive,
            categoryIds: formData.scope === 'category' ? formData.categoryIds : [],
            productIds: formData.scope === 'product' ? formData.productIds : []
        };

        try {
            if (editingPromotion) {
                await updateAdminPromotion(editingPromotion.id, payload);
                showToast(`Đã cập nhật khuyến mãi "${formData.code}" thành công`, 'success');
            } else {
                await createAdminPromotion(payload);
                showToast(`Đã tạo khuyến mãi "${formData.code}" thành công`, 'success');
            }
            setShowModal(false);
            loadPromotions();
        } catch (err: any) {
            setModalError(err.message || 'Lỗi máy chủ khi lưu khuyến mãi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/15">
                <div>
                    <h2 className="text-2xl font-bold">Quản lý Khuyến mãi</h2>
                    <p className="text-sm text-on-surface-variant">
                        Cấu hình các chương trình ưu đãi, mã giảm giá sản phẩm, danh mục hoặc toàn bộ giỏ hàng.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-primary/30 hover:scale-[1.01]"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Tạo khuyến mãi
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm border border-outline-variant/15">
                {/* Search query */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm theo mã, tên hoặc mô tả..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="scheduled">Đã lên lịch</option>
                        <option value="expired">Đã hết hạn</option>
                        <option value="inactive">Đang tạm ẩn</option>
                    </select>
                </div>

                {/* Type Filter */}
                <div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                        <option value="all">Tất cả hình thức giảm</option>
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                        <option value="free_shipping">Miễn phí vận chuyển</option>
                    </select>
                </div>

                {/* Reset button */}
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setTypeFilter('all');
                        }}
                        className="h-10 w-full sm:w-auto rounded-xl border border-outline-variant/50 px-4 text-sm font-semibold hover:bg-surface-container-high transition"
                    >
                        Làm sạch bộ lọc
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl bg-error-container p-6 text-on-error-container">
                    <div className="flex items-center gap-2 font-bold mb-2">
                        <span className="material-symbols-outlined">error</span>
                        Lỗi tải dữ liệu
                    </div>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="rounded-3xl bg-surface-container-lowest shadow-sm border border-outline-variant/15 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="bg-surface-container-low/60 border-b border-outline-variant/20">
                                    <th className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredPromotions.length > 0 &&
                                                selectedIds.length === filteredPromotions.length
                                            }
                                            onChange={handleSelectAllToggle}
                                            className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                        />
                                    </th>
                                    <th className="px-6 py-4 font-bold text-outline">Khuyến mãi</th>
                                    <th className="px-6 py-4 font-bold text-outline">Loại & Giá trị</th>
                                    <th className="px-6 py-4 font-bold text-outline">Phạm vi</th>
                                    <th className="px-6 py-4 font-bold text-outline">Thời gian hiệu lực</th>
                                    <th className="px-6 py-4 font-bold text-outline">Lượt dùng</th>
                                    <th className="px-6 py-4 font-bold text-outline">Trạng thái</th>
                                    <th className="px-6 py-4 font-bold text-outline text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/15">
                                {filteredPromotions.map((promo) => {
                                    const status = getPromoStatus(promo);
                                    const isSelected = selectedIds.includes(promo.id);
                                    const isRedeemed = promo.usedCount > 0;

                                    return (
                                        <tr
                                            key={promo.id}
                                            className={`transition-colors hover:bg-surface-container-low/30 ${
                                                promo.isActive ? '' : 'opacity-70'
                                            }`}
                                        >
                                            <td className="px-6 py-5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectToggle(promo.id)}
                                                    className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            onClick={() => handleCopyCode(promo.code)}
                                                            className="cursor-pointer font-mono font-bold text-sm bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1 active:scale-95"
                                                            title="Bấm để sao chép mã"
                                                        >
                                                            {promo.code}
                                                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                        </span>
                                                        <h4 className="font-bold text-sm max-w-[200px] truncate" title={promo.name}>
                                                            {promo.name}
                                                        </h4>
                                                    </div>
                                                    {promo.description && (
                                                        <p className="text-xs text-outline line-clamp-1 max-w-[240px]" title={promo.description}>
                                                            {promo.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-on-surface">
                                                        {promo.type === 'percentage'
                                                            ? `${promo.value}%`
                                                            : promo.type === 'fixed_amount'
                                                            ? formatCurrency(promo.value)
                                                            : 'Freeship'}
                                                    </span>
                                                    <span className="text-[11px] text-outline mt-0.5 uppercase tracking-wider font-semibold">
                                                        {promo.type === 'percentage'
                                                            ? 'Phần trăm (%)'
                                                            : promo.type === 'fixed_amount'
                                                            ? 'Giảm tiền mặt'
                                                            : 'Miễn phí ship'}
                                                    </span>
                                                    {promo.type === 'percentage' && promo.maxDiscountAmount != null && (
                                                        <span className="text-[10px] text-tertiary font-medium mt-1">
                                                            Giảm tối đa: {formatCurrency(promo.maxDiscountAmount)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-xs rounded-full bg-surface-container px-2.5 py-0.5 w-fit uppercase">
                                                        {promo.scope === 'shop'
                                                            ? 'Toàn sàn'
                                                            : promo.scope === 'category'
                                                            ? 'Danh mục'
                                                            : 'Sản phẩm'}
                                                    </span>
                                                    {promo.scope === 'category' && promo.categories && (
                                                        <span className="text-[10px] text-outline mt-1 max-w-[150px] truncate" title={promo.categories.map(c => c.name).join(', ')}>
                                                            {promo.categories.length} danh mục: {promo.categories.map(c => c.name).join(', ')}
                                                        </span>
                                                    )}
                                                    {promo.scope === 'product' && promo.products && (
                                                        <span className="text-[10px] text-outline mt-1 max-w-[150px] truncate" title={promo.products.map(p => p.name).join(', ')}>
                                                            {promo.products.length} sản phẩm: {promo.products.map(p => p.name).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col text-xs gap-1 text-on-surface-variant font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-outline text-[14px] material-symbols-outlined">play_circle</span>
                                                        <span>{formatDateDisplay(promo.startsAt)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-outline text-[14px] material-symbols-outlined">cancel</span>
                                                        <span>{formatDateDisplay(promo.endsAt)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1 max-w-[120px]">
                                                    <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                                                        <span>{promo.usedCount}</span>
                                                        <span className="text-outline">/</span>
                                                        <span>{promo.usageLimit ?? '∞'}</span>
                                                    </div>
                                                    {promo.usageLimit != null && (
                                                        <div className="h-1.5 w-full rounded-full bg-surface-container overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    (promo.usedCount / promo.usageLimit) >= 1
                                                                        ? 'bg-error'
                                                                        : (promo.usedCount / promo.usageLimit) >= 0.8
                                                                        ? 'bg-warning'
                                                                        : 'bg-primary'
                                                                }`}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        (promo.usedCount / promo.usageLimit) * 100
                                                                    )}%`
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.class}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Toggle Switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleActive(promo)}
                                                        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            promo.isActive ? 'bg-primary' : 'bg-outline-variant'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                                promo.isActive ? 'translate-x-4.5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>

                                                    {/* Edit button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(promo)}
                                                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
                                                        title={isRedeemed ? 'Chỉnh sửa một số cài đặt của khuyến mãi' : 'Chỉnh sửa khuyến mãi'}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {isRedeemed ? 'edit_note' : 'edit'}
                                                        </span>
                                                    </button>

                                                    {/* Delete button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(promo)}
                                                        disabled={isRedeemed}
                                                        className={`rounded-lg p-1.5 transition ${
                                                            isRedeemed
                                                                ? 'text-outline/35 cursor-not-allowed'
                                                                : 'text-error hover:bg-error/10'
                                                        }`}
                                                        title={
                                                            isRedeemed
                                                                ? 'Đã được áp dụng trong đơn hàng, không thể xóa để giữ lịch sử'
                                                                : 'Xóa khuyến mãi'
                                                        }
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {isRedeemed ? 'lock' : 'delete'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredPromotions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-on-surface-variant italic">
                                            Không tìm thấy chương trình khuyến mãi nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/15 px-6 py-4 bg-surface-container-low/20">
                            <div className="text-xs text-outline font-medium">
                                Hiển thị trang {page} / {totalPages} (Tổng cộng {totalCount} khuyến mãi)
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface text-on-surface-variant hover:bg-surface-container transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={page === totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface text-on-surface-variant hover:bg-surface-container transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="h-9 rounded-lg border border-outline-variant/40 bg-surface px-2.5 text-xs outline-none focus:border-primary"
                                >
                                    <option value={10}>10 dòng / trang</option>
                                    <option value={20}>20 dòng / trang</option>
                                    <option value={50}>50 dòng / trang</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bulk Actions Floating Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-45 mx-auto flex max-w-lg items-center justify-between gap-4 rounded-full border border-primary/20 bg-primary/95 px-6 py-3 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in lg:ml-[calc(16rem+2rem)] lg:mr-8">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined">check_box</span>
                        <span className="text-sm font-bold">Đã chọn {selectedIds.length} mã</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkActive(true)}
                            className="flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold transition hover:bg-white/20 active:scale-[0.98]"
                            title="Kích hoạt các mã giảm giá được chọn"
                        >
                            Hiện
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkActive(false)}
                            className="flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold transition hover:bg-white/20 active:scale-[0.98]"
                            title="Tạm ẩn các mã giảm giá được chọn"
                        >
                            Ẩn
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold transition hover:bg-rose-700 active:scale-[0.98] shadow-md"
                            title="Xóa các mã giảm giá được chọn (Mã đã dùng sẽ bị bỏ qua)"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            )}

            {/* Form Modal Dialog */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-xl rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/20 max-h-[92vh] overflow-y-auto transform scale-100 transition-all duration-300">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4 mb-4">
                            <h3 className="text-xl font-bold text-on-surface">
                                {editingPromotion ? 'Chỉnh sửa chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi mới'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1.5 hover:bg-surface-container transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {modalError && (
                            <div className="mb-4 rounded-xl bg-error-container/60 border border-error/20 p-3 text-xs text-on-error-container flex items-start gap-2">
                                <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
                                <span>{modalError}</span>
                            </div>
                        )}

                        {editingPromotion && editingPromotion.usedCount > 0 && (
                            <div className="mb-4 rounded-xl bg-warning-container/40 border border-warning/20 p-3 text-xs text-on-warning-container flex items-start gap-2">
                                <span className="material-symbols-outlined text-[16px] mt-0.5">lock</span>
                                <span>
                                    Khuyến mãi này đã được sử dụng. Vì lý do an toàn dữ liệu lịch sử đơn hàng, các trường: <strong>Mã code, Hình thức giảm, Giá trị giảm, Phạm vi áp dụng</strong> đã được hệ thống khóa cứng.
                                </span>
                            </div>
                        )}

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Auto Code and Promotion Name */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Mã khuyến mãi
                                    </label>
                                    <input
                                        type="text"
                                        disabled // Always auto-generated as requested by user
                                        value={formData.code}
                                        className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs font-mono font-bold text-outline cursor-not-allowed uppercase"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Tên chương trình <span className="text-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Ví dụ: Ưu đãi Khai giảng học kỳ mới"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Mô tả khuyến mãi
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                                    placeholder="Nhập mô tả tóm tắt..."
                                />
                            </div>

                            {/* Type (Discount Method) & Value */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Hình thức giảm giá
                                    </label>
                                    <select
                                        disabled={!!editingPromotion && editingPromotion.usedCount > 0}
                                        value={formData.type}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                type: e.target.value as any,
                                                value: e.target.value === 'free_shipping' ? 0 : formData.value
                                            })
                                        }
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="percentage">Phần trăm (%)</option>
                                        <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                                        <option value="free_shipping">Free ship</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Giá trị giảm {formData.type === 'percentage' ? '(%)' : formData.type === 'fixed_amount' ? '(VNĐ)' : ''}
                                    </label>
                                    <input
                                        type="number"
                                        disabled={
                                            formData.type === 'free_shipping' ||
                                            (!!editingPromotion && editingPromotion.usedCount > 0)
                                        }
                                        required={formData.type !== 'free_shipping'}
                                        min={0}
                                        max={formData.type === 'percentage' ? 100 : undefined}
                                        step="any"
                                        value={formData.type === 'free_shipping' ? 0 : formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Số tiền giảm tối đa (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        disabled={formData.type !== 'percentage'}
                                        min={0}
                                        value={formData.type === 'percentage' ? formData.maxDiscountAmount : ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                maxDiscountAmount: e.target.value !== '' ? Number(e.target.value) : ''
                                            })
                                        }
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Chỉ áp dụng cho %"
                                    />
                                </div>
                            </div>

                            {/* minOrderAmount & maxUsesPerUser & usageLimit */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Đơn tối thiểu (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.minOrderAmount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                minOrderAmount: e.target.value !== '' ? Number(e.target.value) : ''
                                            })
                                        }
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Ví dụ: 25"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Lượt dùng / user
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.maxUsesPerUser}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                maxUsesPerUser: e.target.value !== '' ? parseInt(e.target.value, 10) : ''
                                            })
                                        }
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Ví dụ: 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Tổng giới hạn dùng
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.usageLimit}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                usageLimit: e.target.value !== '' ? parseInt(e.target.value, 10) : ''
                                            })
                                        }
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Không giới hạn nếu trống"
                                    />
                                </div>
                            </div>

                            {/* startsAt & endsAt */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Thời gian bắt đầu
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startsAt}
                                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Thời gian kết thúc
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endsAt}
                                        onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Scope (Apply to) */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Phạm vi áp dụng
                                </label>
                                <div className="flex gap-4">
                                    {['shop', 'category', 'product'].map((sc) => (
                                        <label
                                            key={sc}
                                            className={`flex-1 flex items-center justify-center gap-2 border px-4 py-3 rounded-2xl cursor-pointer transition capitalize ${
                                                formData.scope === sc
                                                    ? 'border-primary bg-primary/5 text-primary font-bold'
                                                    : 'border-outline-variant/40 hover:bg-surface-container-low text-on-surface-variant'
                                            } ${
                                                !!editingPromotion && editingPromotion.usedCount > 0
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                disabled={!!editingPromotion && editingPromotion.usedCount > 0}
                                                name="scope"
                                                value={sc}
                                                checked={formData.scope === sc}
                                                onChange={() => setFormData({ ...formData, scope: sc as any })}
                                                className="sr-only"
                                            />
                                            {sc === 'shop'
                                                ? 'Toàn sàn'
                                                : sc === 'category'
                                                ? 'Theo danh mục'
                                                : 'Theo sản phẩm'}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Category selector */}
                            {formData.scope === 'category' && (
                                <div className="rounded-2xl border border-outline-variant/30 p-4 bg-surface-container-lowest">
                                    <label className="block text-xs font-bold uppercase text-outline mb-2">
                                        Chọn danh mục áp dụng <span className="text-error">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 max-h-[140px] overflow-y-auto">
                                        {categories.map((cat) => (
                                            <label
                                                key={cat.id}
                                                className="flex items-center gap-2.5 text-sm cursor-pointer p-1.5 rounded-lg hover:bg-surface-container transition"
                                            >
                                                <input
                                                    type="checkbox"
                                                    disabled={!!editingPromotion && editingPromotion.usedCount > 0}
                                                    checked={formData.categoryIds.includes(cat.id)}
                                                    onChange={() => handleCategoryCheckboxChange(cat.id)}
                                                    className="h-4.5 w-4.5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                                <span className="font-medium">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Product search & selection */}
                            {formData.scope === 'product' && (
                                <div className="rounded-2xl border border-outline-variant/30 p-4 bg-surface-container-lowest space-y-3">
                                    <label className="block text-xs font-bold uppercase text-outline">
                                        Chọn sản phẩm áp dụng <span className="text-error">*</span>
                                    </label>

                                    {/* Selected Products Chips */}
                                    {selectedProducts.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container-low/40 rounded-xl border border-outline-variant/10 max-h-[120px] overflow-y-auto">
                                            {selectedProducts.map((prod) => (
                                                <span
                                                    key={prod.id}
                                                    className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-xs font-bold px-2.5 py-1 rounded-full animate-fade-in"
                                                >
                                                    <span className="max-w-[150px] truncate">{prod.name}</span>
                                                    {(!editingPromotion || editingPromotion.usedCount === 0) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProduct(prod.id)}
                                                            className="flex hover:bg-primary/20 rounded-full p-0.5 text-primary"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                        </button>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search Input with debounced autocomplete list */}
                                    {(!editingPromotion || editingPromotion.usedCount === 0) && (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={prodQuery}
                                                onChange={(e) => setProdQuery(e.target.value)}
                                                placeholder="Gõ tên sản phẩm để tìm kiếm..."
                                                className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs focus:border-primary focus:outline-none"
                                            />

                                            {searchingProducts && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                                                </div>
                                            )}

                                            {prodCandidates.length > 0 && (
                                                <div className="absolute left-0 right-0 z-50 mt-1 max-h-[180px] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface shadow-xl py-1 divide-y divide-outline-variant/10">
                                                    {prodCandidates.map((cand) => (
                                                        <div
                                                            key={cand.id}
                                                            onClick={() => handleAddProduct(cand)}
                                                            className="flex items-center justify-between px-4 py-2 text-xs font-medium cursor-pointer hover:bg-primary/5 hover:text-primary transition"
                                                        >
                                                            <span>{cand.name}</span>
                                                            <span className="text-[10px] text-outline font-mono">{cand.slug}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* isActive Toggle in Form */}
                            <div className="flex items-center gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/15">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        formData.isActive ? 'bg-primary' : 'bg-outline-variant'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                            formData.isActive ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                                <div>
                                    <span className="block text-sm font-bold text-on-surface">Kích hoạt khuyến mãi</span>
                                    <span className="text-[10px] text-outline">
                                        Khi tắt, khách hàng sẽ không thể sử dụng mã khuyến mãi này tại trang checkout.
                                    </span>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/15 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-2xl border border-outline-variant/40 px-5 py-3 text-sm font-bold transition hover:bg-surface-container"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center justify-center min-w-[100px] rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-container disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                    ) : (
                                        editingPromotion ? 'Lưu thay đổi' : 'Tạo mới'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
