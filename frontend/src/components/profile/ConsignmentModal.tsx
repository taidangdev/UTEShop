import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
    fetchConsignmentFormOptions,
    createConsignment,
    updateConsignment,
    uploadConsignmentImage
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
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        title: '',
        categoryId: '',
        suggestedPrice: '',
        condition: 'used' as 'new' | 'like_new' | 'used' | 'refurbished',
        contactPhone: '',
        images: [] as string[]
    });

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);
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
            setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
        } catch (err: any) {
            setError(err.message || 'Không thể tải ảnh lên');
        } finally {
            setUploading(false);
        }
    };

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
                    images: consignment.images?.map((img) => img.url) || []
                });
            } else {
                setForm({
                    title: '',
                    categoryId: '',
                    suggestedPrice: '',
                    condition: 'used',
                    contactPhone: '',
                    images: []
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

        const titleTrimmed = form.title.trim();
        if (!titleTrimmed) {
            setError('Tiêu đề ký gửi là bắt buộc');
            return;
        }
        if (titleTrimmed.length > 100) {
            setError('Tiêu đề ký gửi không được vượt quá 100 ký tự');
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
        const phoneTrimmed = form.contactPhone.trim();
        if (phoneTrimmed && !/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(phoneTrimmed)) {
            setError('Số điện thoại liên hệ không đúng định dạng Việt Nam');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CreateConsignmentPayload = {
                title: titleTrimmed,
                categoryId: Number(form.categoryId),
                suggestedPrice: priceNum,
                condition: form.condition,
                contactPhone: phoneTrimmed || undefined,
                images: form.images
            };

            if (consignment) {
                await updateConsignment(consignment.id, payload);
            } else {
                await createConsignment(payload);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
                setError(err.errors.map((e: any) => e.msg).join(', '));
            } else {
                setError(err.message || 'Có lỗi xảy ra khi lưu yêu cầu ký gửi');
            }
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
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-xs font-semibold text-on-surface-variant">
                                Tiêu đề sản phẩm ký gửi
                            </label>
                            <span className={`text-[10px] ${form.title.length > 100 ? 'text-error font-bold' : form.title.length > 90 ? 'text-error font-semibold' : 'text-on-surface-variant/60'}`}>
                                {form.title.length}/100
                            </span>
                        </div>
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleFieldChange}
                            className={`${inputClass} ${form.title.length > 100 ? 'ring-2 ring-error/50 border border-error bg-error/5' : ''}`}
                            placeholder="Ví dụ: Giáo trình kỹ thuật lập trình, máy tính cũ..."
                            required
                        />
                        {form.title.length > 100 && (
                            <p className="mt-1.5 ml-1 text-xs text-error font-medium animate-pulse">
                                Tiêu đề ký gửi không được vượt quá 100 ký tự
                            </p>
                        )}
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
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="block text-xs font-semibold text-on-surface-variant">
                                    Số điện thoại liên hệ
                                </label>
                            </div>
                            <input
                                name="contactPhone"
                                value={form.contactPhone}
                                onChange={handleFieldChange}
                                className={`${inputClass} ${form.contactPhone.trim() && !/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(form.contactPhone.trim()) ? 'ring-2 ring-error/50 border border-error bg-error/5' : ''}`}
                                placeholder="Ví dụ: 0987654321 hoặc +84987654321"
                            />
                            {form.contactPhone.trim() && !/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(form.contactPhone.trim()) && (
                                <p className="mt-1.5 ml-1 text-xs text-error font-medium animate-pulse">
                                    Số điện thoại liên hệ không đúng định dạng Việt Nam
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 ml-1 block text-xs font-semibold text-on-surface-variant">
                            Hình ảnh sản phẩm (Có thể chọn nhiều ảnh)
                        </label>
                        <div className="grid grid-cols-3 gap-3 rounded-xl border border-dashed border-outline-variant p-4 bg-surface-container-low">
                            {form.images.map((url, idx) => (
                                <div key={url + idx} className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-container shadow-sm border border-outline/10">
                                    <img
                                        src={url}
                                        alt={`Product image ${idx + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForm(prev => ({
                                                ...prev,
                                                images: prev.images.filter((_, i) => i !== idx)
                                            }));
                                        }}
                                        className="absolute right-1 top-1 rounded-full bg-on-surface/80 p-1 text-surface transition hover:bg-on-surface flex items-center justify-center"
                                        aria-label="Xóa ảnh"
                                    >
                                        <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                                    </button>
                                </div>
                            ))}

                            {uploading ? (
                                <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg bg-surface-container">
                                    <span className="animate-spin material-symbols-outlined text-primary text-xl">
                                        progress_activity
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant font-medium text-center">Đang tải...</span>
                                </div>
                            ) : (
                                <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg bg-surface-container transition hover:bg-surface-container-high border border-outline-variant/30">
                                    <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                                        add_a_photo
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant font-medium text-center">
                                        Thêm ảnh
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
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
