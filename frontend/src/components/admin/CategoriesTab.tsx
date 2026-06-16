import React, { useEffect, useState, useMemo } from 'react';
import {
    fetchAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
    bulkActiveAdminCategories,
    bulkDeleteAdminCategories,
    type AdminCategory
} from '../../services/adminApi';

const COMMON_ICONS = [
    { value: 'category', label: 'Mặc định (Category)' },
    { value: 'school', label: 'Học tập (School)' },
    { value: 'menu_book', label: 'Sách vở (Book)' },
    { value: 'checkroom', label: 'Quần áo (Checkroom)' },
    { value: 'laptop_mac', label: 'Công nghệ (Laptop)' },
    { value: 'construction', label: 'Dụng cụ (Tools)' },
    { value: 'local_mall', label: 'Mua sắm (Mall)' },
    { value: 'auto_stories', label: 'Tài liệu (Stories)' },
    { value: 'electric_bolt', label: 'Linh kiện (Electricity)' },
    { value: 'home_repair_service', label: 'Tiện ích (Home)' }
];

export default function CategoriesTab() {
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected items for bulk action
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Toast notification
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        parentId: '' as string | number,
        slug: '',
        description: '',
        icon: 'category',
        sortOrder: 0,
        isActive: true
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const loadCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminCategories();
            setCategories(data.categories || []);
        } catch (err: any) {
            setError(err.message || 'Không thể kết nối đến server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    // Get all direct children of a category ID
    const getChildren = (parentId: number | null) => {
        return categories.filter((c) => c.parentId === parentId);
    };

    // Split parent categories (where parentId is null)
    const parentCategories = useMemo(() => {
        return categories.filter((c) => c.parentId === null);
    }, [categories]);

    // Recursive descendant finder to prevent circular references in Parent dropdown
    const getDescendantIds = (catId: number): number[] => {
        const directChildren = categories.filter((c) => c.parentId === catId);
        let ids = directChildren.map((c) => c.id);
        directChildren.forEach((c) => {
            ids = [...ids, ...getDescendantIds(c.id)];
        });
        return ids;
    };

    // Filter parent options for dropdown
    const parentOptions = useMemo(() => {
        if (!editingCategory) {
            return parentCategories;
        }
        const descendants = getDescendantIds(editingCategory.id);
        return parentCategories.filter(
            (c) => c.id !== editingCategory.id && !descendants.includes(c.id)
        );
    }, [parentCategories, editingCategory, categories]);

    const handleSelectToggle = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.length === categories.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(categories.map((c) => c.id));
        }
    };

    const handleOpenCreateModal = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            parentId: '',
            slug: '',
            description: '',
            icon: 'category',
            sortOrder: 0,
            isActive: true
        });
        setModalError(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (category: AdminCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            parentId: category.parentId || '',
            slug: category.slug,
            description: category.description || '',
            icon: category.icon || 'category',
            sortOrder: category.sortOrder,
            isActive: category.isActive
        });
        setModalError(null);
        setShowModal(true);
    };

    const handleToggleActive = async (category: AdminCategory) => {
        try {
            const nextValue = !category.isActive;
            await updateAdminCategory(category.id, {
                name: category.name,
                isActive: nextValue
            });
            setCategories((prev) =>
                prev.map((c) => (c.id === category.id ? { ...c, isActive: nextValue } : c))
            );
            showToast(
                `Đã ${nextValue ? 'kích hoạt' : 'tạm ẩn'} danh mục "${category.name}" thành công`,
                'success'
            );
        } catch (err: any) {
            showToast(err.message || 'Lỗi kết nối', 'error');
        }
    };

    const handleDelete = async (category: AdminCategory) => {
        if (category.childCount > 0) {
            showToast('Không thể xóa danh mục này vì nó đang chứa các danh mục con', 'error');
            return;
        }
        if (category.productCount > 0) {
            showToast('Không thể xóa danh mục này vì đang có sản phẩm liên kết', 'error');
            return;
        }

        const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`);
        if (!confirmDelete) return;

        try {
            await deleteAdminCategory(category.id);
            setCategories((prev) => prev.filter((c) => c.id !== category.id));
            setSelectedIds((prev) => prev.filter((id) => id !== category.id));
            showToast(`Đã xóa danh mục "${category.name}"`, 'success');
        } catch (err: any) {
            showToast(err.message || 'Lỗi khi xóa', 'error');
        }
    };

    const handleBulkActive = async (isActive: boolean) => {
        if (selectedIds.length === 0) return;
        try {
            await bulkActiveAdminCategories(selectedIds, isActive);
            setCategories((prev) =>
                prev.map((c) => (selectedIds.includes(c.id) ? { ...c, isActive } : c))
            );
            showToast(
                `Đã ${isActive ? 'kích hoạt' : 'tạm ẩn'} hàng loạt ${selectedIds.length} danh mục thành công`,
                'success'
            );
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message || 'Lỗi cập nhật hàng loạt', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} danh mục đã chọn?`);
        if (!confirmDelete) return;

        try {
            const data = await bulkDeleteAdminCategories(selectedIds);
            const deletedCount = data.deletedCount || 0;
            const failedNames = data.failedNames || [];

            if (deletedCount > 0) {
                // Reload list to get updated counts and items
                const updatedData = await fetchAdminCategories();
                setCategories(updatedData.categories || []);
            }

            if (failedNames.length > 0) {
                showToast(
                    `Đã xóa ${deletedCount} danh mục. Bỏ qua ${failedNames.length} danh mục có sản phẩm/con liên kết: ${failedNames.join(', ')}`,
                    'error'
                );
            } else {
                showToast(`Đã xóa thành công ${deletedCount} danh mục`, 'success');
            }
            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message || 'Lỗi xóa hàng loạt', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setModalError('Tên danh mục là bắt buộc');
            return;
        }

        setSubmitting(true);
        setModalError(null);

        const payload = {
            name: formData.name,
            parentId: formData.parentId ? Number(formData.parentId) : null,
            slug: formData.slug.trim() || undefined,
            description: formData.description.trim() || null,
            icon: formData.icon || null,
            sortOrder: Number(formData.sortOrder) || 0,
            isActive: formData.isActive
        };

        try {
            if (editingCategory) {
                await updateAdminCategory(editingCategory.id, payload);
                showToast(`Đã cập nhật danh mục "${formData.name}"`, 'success');
                setShowModal(false);
                loadCategories();
            } else {
                await createAdminCategory(payload);
                showToast(`Đã tạo danh mục "${formData.name}" thành công`, 'success');
                setShowModal(false);
                loadCategories();
            }
        } catch (err: any) {
            setModalError(err.message || 'Lỗi server');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Custom Toast Alert */}
            {toast && (
                <div className={`fixed right-6 top-24 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 max-w-md ${
                    toast.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}>
                    <span className="material-symbols-outlined mt-0.5">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="text-sm font-semibold">{toast.message}</span>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold">Quản lý Danh mục</h2>
                    <p className="text-sm text-on-surface-variant">
                        Thiết lập danh mục sản phẩm của UTEShop hỗ trợ sắp xếp và lọc sản phẩm.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {categories.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSelectAllToggle}
                            className="flex items-center gap-1.5 rounded-2xl border border-outline-variant/50 px-4 py-3 text-sm font-bold hover:bg-surface-container-high transition"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {selectedIds.length === categories.length ? 'deselect' : 'select_all'}
                            </span>
                            {selectedIds.length === categories.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-primary/30 hover:scale-[1.01]"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Thêm danh mục
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
                <div className="space-y-4">
                    {parentCategories.map((parent) => {
                        const children = getChildren(parent.id);
                        const isParentSelected = selectedIds.includes(parent.id);
                        return (
                            <div
                                key={parent.id}
                                className={`rounded-2xl border bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-md ${
                                    parent.isActive ? 'border-outline-variant/30' : 'border-dashed border-outline-variant/50 opacity-75'
                                }`}
                            >
                                {/* Parent Category Row */}
                                <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low/50 px-6 py-4 dark:bg-surface-container-high/20 border-b border-outline-variant/20">
                                    <div className="flex items-center gap-4">
                                        {/* Selection Checkbox */}
                                        <input
                                            type="checkbox"
                                            data-id={parent.id}
                                            checked={isParentSelected}
                                            onChange={() => handleSelectToggle(parent.id)}
                                            className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                        />

                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                                parent.isActive ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-outline'
                                            }`}>
                                                <span className="material-symbols-outlined">
                                                    {parent.icon || 'category'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-base">{parent.name}</h4>
                                                    <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[10px] font-mono text-on-surface-variant">
                                                        {parent.slug}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-outline mt-0.5">
                                                    {parent.description || 'Không có mô tả'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Group */}
                                    <div className="flex items-center gap-4">
                                        <div className="hidden items-center gap-4 text-xs text-on-surface-variant md:flex">
                                            <span className="rounded-full bg-surface-container px-3 py-1 font-semibold">
                                                {children.length} danh mục con
                                            </span>
                                            <span className="rounded-full bg-surface-container px-3 py-1 font-semibold">
                                                {parent.productCount} sản phẩm
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-4">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(parent)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    parent.isActive ? 'bg-primary' : 'bg-outline-variant'
                                                }`}
                                                title={parent.isActive ? 'Đang hoạt động' : 'Tạm ẩn'}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                        parent.isActive ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditModal(parent)}
                                                className="rounded-xl p-2 text-primary hover:bg-primary/10 transition"
                                                title="Sửa danh mục"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(parent)}
                                                disabled={parent.productCount > 0 || children.length > 0}
                                                className={`rounded-xl p-2 transition ${
                                                    parent.productCount > 0 || children.length > 0
                                                        ? 'text-outline/40 cursor-not-allowed'
                                                        : 'text-error hover:bg-error/10'
                                                }`}
                                                title={
                                                    parent.productCount > 0 || children.length > 0
                                                        ? 'Không thể xóa vì chứa danh mục con hoặc sản phẩm'
                                                        : 'Xóa danh mục'
                                                }
                                            >
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {parent.productCount > 0 || children.length > 0 ? 'lock' : 'delete'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Child Categories container */}
                                {children.length > 0 ? (
                                    <div className="divide-y divide-outline-variant/15 px-6 py-2 bg-surface-container-lowest/50">
                                        {children.map((child) => {
                                            const isChildSelected = selectedIds.includes(child.id);
                                            return (
                                                <div
                                                    key={child.id}
                                                    className={`flex flex-wrap items-center justify-between gap-4 py-3 transition ${
                                                        child.isActive ? '' : 'opacity-65'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4 pl-4 border-l-2 border-outline-variant/25">
                                                        <input
                                                            type="checkbox"
                                                            data-id={child.id}
                                                            checked={isChildSelected}
                                                            onChange={() => handleSelectToggle(child.id)}
                                                            className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                                        />

                                                        <div className="flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-outline-variant text-[18px]">
                                                                {child.icon || 'subdirectory_arrow_right'}
                                                            </span>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-sm">{child.name}</span>
                                                                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[9px] font-mono text-outline">
                                                                        {child.slug}
                                                                    </span>
                                                                </div>
                                                                {child.description && (
                                                                    <p className="text-[11px] text-outline mt-0.5">
                                                                        {child.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs text-on-surface-variant font-medium bg-surface-container-high/50 px-2 py-0.5 rounded-md">
                                                            {child.productCount} sản phẩm
                                                        </span>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleActive(child)}
                                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                    child.isActive ? 'bg-primary' : 'bg-outline-variant'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                                        child.isActive ? 'translate-x-4' : 'translate-x-0'
                                                                    }`}
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(child)}
                                                                className="rounded-lg p-1.5 text-primary hover:bg-primary/5 transition"
                                                                title="Sửa danh mục con"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(child)}
                                                                disabled={child.productCount > 0}
                                                                className={`rounded-lg p-1.5 transition ${
                                                                    child.productCount > 0
                                                                        ? 'text-outline/30 cursor-not-allowed'
                                                                        : 'text-error hover:bg-error/5'
                                                                }`}
                                                                title={
                                                                    child.productCount > 0
                                                                        ? 'Chứa sản phẩm, không thể xóa'
                                                                        : 'Xóa danh mục con'
                                                                }
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">
                                                                    {child.productCount > 0 ? 'lock' : 'delete'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-12 py-3 text-xs text-outline italic">
                                        Không có danh mục con trực thuộc.
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {parentCategories.length === 0 && (
                        <div className="rounded-3xl bg-surface-container-lowest p-12 text-center text-on-surface-variant">
                            Chưa có danh mục nào được khởi tạo. Bấm "Thêm danh mục" để bắt đầu!
                        </div>
                    )}
                </div>
            )}

            {/* Premium Sticky Floating Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-0 right-0 z-40 mx-auto flex max-w-lg items-center justify-between gap-4 rounded-full border border-primary/20 bg-primary/95 px-6 py-3 text-white shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in lg:ml-[calc(16rem+2rem)] lg:mr-8">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined">library_add_check</span>
                        <span className="text-sm font-bold">Đã chọn {selectedIds.length} mục</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkActive(true)}
                            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold transition hover:bg-white/20 active:scale-[0.98]"
                            title="Hiển thị tất cả danh mục đã chọn"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            Hiện
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkActive(false)}
                            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold transition hover:bg-white/20 active:scale-[0.98]"
                            title="Tạm ẩn tất cả danh mục đã chọn"
                        >
                            <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                            Ẩn
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold transition hover:bg-rose-700 active:scale-[0.98] shadow-md"
                            title="Xóa tất cả danh mục đã chọn"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Xóa
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Dialog for Create / Edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/20 max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-300">
                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4 mb-4">
                            <h3 className="text-xl font-bold">
                                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1.5 hover:bg-surface-container transition"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {modalError && (
                            <div className="mb-4 rounded-xl bg-error-container/60 border border-error/20 p-3 text-xs text-on-error-container">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Category Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Tên danh mục <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ví dụ: Giáo trình kỹ thuật"
                                />
                            </div>

                            {/* Parent Category Dropdown */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Danh mục cha
                                </label>
                                <select
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Không có (Là danh mục gốc)</option>
                                    {parentOptions.map((parent) => (
                                        <option key={parent.id} value={parent.id}>
                                            {parent.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-outline mt-1">
                                    {editingCategory 
                                        ? 'Các danh mục con hoặc cháu của chính danh mục này đã bị ẩn đi để tránh tham chiếu vòng.' 
                                        : 'Chỉ chọn nếu đây là danh mục con (Cấp 2).'}
                                </p>
                            </div>

                            {/* Custom Slug */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Đường dẫn Slug (Tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                                    placeholder="giao-trinh-ky-thuat (Tự sinh từ Tên nếu để trống)"
                                />
                            </div>

                            {/* Icon Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Biểu tượng (Icon)
                                    </label>
                                    <select
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        {COMMON_ICONS.map((ico) => (
                                            <option key={ico.value} value={ico.value}>
                                                {ico.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                        Thứ tự sắp xếp (Sort Order)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-outline mb-1.5">
                                    Mô tả danh mục
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                                    placeholder="Nhập mô tả tóm tắt về danh mục này..."
                                />
                            </div>

                            {/* isActive toggle in Form */}
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
                                    <span className="block text-sm font-bold">Kích hoạt danh mục</span>
                                    <span className="text-[10px] text-outline">
                                        Ẩn danh mục khỏi người dùng trên trang chủ nếu tắt.
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
                                        editingCategory ? 'Lưu thay đổi' : 'Tạo mới'
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
