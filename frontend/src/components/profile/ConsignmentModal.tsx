import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
    fetchConsignmentFormOptions,
    createConsignment,
    updateConsignment
} from '../../services/consignmentApi';
import type {
    Consignment,
    ConsignmentCategoryOption,
    CreateConsignmentPayload
} from '../../types/consignment';

interface ConsignmentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    consignment?: Consignment | null;
}

export default function ConsignmentModal({
    open,
    onClose,
    onSuccess,
    consignment
}: ConsignmentModalProps) {
    const [categories, setCategories] = useState<ConsignmentCategoryOption[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        categoryId: '',
        suggestedPrice: '',
        condition: 'used' as 'new' | 'like_new' | 'used' | 'refurbished',
        contactPhone: '',
        imageUrl: ''
    });

    useEffect(() => {
        if (open) {
            const loadOptions = async () => {
                setCategoriesLoading(true);
                setError(null);
                try {
                    const options = await fetchConsignmentFormOptions();
                    setCategories(options.categories || []);
                } catch {
                    setError('Không thể tải danh mục ký gửi');
                } finally {
                    setCategoriesLoading(false);
                }
            };
            loadOptions();
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (consignment) {
                setForm({
                    title: consignment.title || '',
                    categoryId: consignment.categoryId ? String(consignment.categoryId) : '',
                    suggestedPrice: consignment.suggestedPrice ? String(consignment.suggestedPrice) : '',
                    condition: consignment.condition || 'used',
                    contactPhone: consignment.contactPhone || '',
                    imageUrl: consignment.images?.[0]?.url || ''
                });
            } else {
                setForm({
                    title: '',
                    categoryId: '',
                    suggestedPrice: '',
                    condition: 'used',
                    contactPhone: '',
                    imageUrl: ''
                });
            }
        }
    }, [consignment, open]);

    if (!open) return null;

    const handleFieldChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!form.title.trim()) {
            setError('Tiêu đề ký gửi là bắt buộc');
            return;
        }
        if (!form.categoryId) {
            setError('Vui lòng chọn danh mục ký gửi');
            return;
        }
        const priceNum = Number(form.suggestedPrice);
        if (Number.isNaN(priceNum) || priceNum <= 0) {
            setError('Giá đề xuất phải là số dương hợp lệ');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CreateConsignmentPayload = {
                title: form.title.trim(),
                categoryId: Number(form.categoryId),
                suggestedPrice: priceNum,
                condition: form.condition,
                contactPhone: form.contactPhone.trim() || undefined,
                images: form.imageUrl.trim() ? [form.imageUrl.trim()] : []
            };

            if (consignment) {
                await updateConsignment(consignment.id, payload);
            } else {
                await createConsignment(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi lưu yêu cầu ký gửi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass =
        'h-12 w-full rounded-xl border-none bg-surface-container px-4 text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
        >
            <button
                type="button"
                className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Đóng"
            />
            <div className="relative z-10 w-full max-w-lg rounded-[24px] bg-surface-container-lowest p-8 soft-shadow my-8">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-on-surface">
                        {consignment ? 'Chỉnh sửa ký gửi' : 'Tạo yêu cầu ký gửi'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
                        aria-label="Đóng"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Tiêu đề sản phẩm ký gửi
                        </label>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleFieldChange}
                            className={inputClass}
                            placeholder="Ví dụ: Giáo trình kỹ thuật lập trình, máy tính cũ..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                                Danh mục
                            </label>
                            <select
                                name="categoryId"
                                value={form.categoryId}
                                onChange={handleFieldChange}
                                className={inputClass}
                                required
                                disabled={categoriesLoading}
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                                Tình trạng sản phẩm
                            </label>
                            <select
                                name="condition"
                                value={form.condition}
                                onChange={handleFieldChange}
                                className={inputClass}
                                required
                            >
                                <option value="new">Mới nguyên seal (New)</option>
                                <option value="like_new">Như mới (Like new)</option>
                                <option value="used">Đã qua sử dụng (Used)</option>
                                <option value="refurbished">Tân trang (Refurbished)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                                Giá đề xuất ($ / VNĐ)
                            </label>
                            <input
                                type="number"
                                name="suggestedPrice"
                                value={form.suggestedPrice}
                                onChange={handleFieldChange}
                                className={inputClass}
                                placeholder="Nhập giá mong muốn"
                                min="0"
                                step="any"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                                Số điện thoại liên hệ
                            </label>
                            <input
                                name="contactPhone"
                                value={form.contactPhone}
                                onChange={handleFieldChange}
                                className={inputClass}
                                placeholder="Nhập SĐT của bạn"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Hình ảnh sản phẩm (Link URL)
                        </label>
                        <input
                            name="imageUrl"
                            value={form.imageUrl}
                            onChange={handleFieldChange}
                            className={inputClass}
                            placeholder="Nhập địa chỉ hình ảnh (URL)"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-container-low text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary transition hover:shadow-lg disabled:opacity-70"
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Lưu lại'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
