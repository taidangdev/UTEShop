import { useCallback, useEffect, useState } from 'react';
import StarRatingInput from './StarRatingInput';
import { createProductReview, fetchEligibleReviewItems } from '../../services/reviewApi';
import type { EligibleReviewItem, ReviewRewardType } from '../../types/review';

interface WriteReviewModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    /** When set, only show eligible items for this product */
    productId?: number;
    /** When set, only show items from this order (e.g. from My Orders) */
    orderNumber?: string;
    /** Pre-select a specific order line */
    orderItemId?: number;
}

export default function WriteReviewModal({
    open,
    onClose,
    onSuccess,
    productId,
    orderNumber,
    orderItemId: initialOrderItemId
}: WriteReviewModalProps) {
    const [items, setItems] = useState<EligibleReviewItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [rewardType, setRewardType] = useState<ReviewRewardType>('points');

    const loadEligible = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let list = await fetchEligibleReviewItems();
            if (productId != null) {
                list = list.filter((i) => i.productId === productId);
            }
            if (orderNumber) {
                list = list.filter((i) => i.orderNumber === orderNumber);
            }
            setItems(list);

            if (initialOrderItemId && list.some((i) => i.orderItemId === initialOrderItemId)) {
                setSelectedItemId(initialOrderItemId);
            } else if (list.length >= 1) {
                setSelectedItemId(list[0].orderItemId);
            } else {
                setSelectedItemId(null);
            }
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { message?: string })?.message || 'Không thể tải các sản phẩm để đánh giá';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [productId, orderNumber, initialOrderItemId]);

    useEffect(() => {
        if (!open) {
            setSuccessMessage(null);
            setError(null);
            setRating(5);
            setTitle('');
            setComment('');
            setRewardType('points');
            setSelectedItemId(null);
            setItems([]);
            return;
        }
        loadEligible();
    }, [open, loadEligible]);

    const selectedItem = items.find((i) => i.orderItemId === selectedItemId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId) {
            setError('Vui lòng chọn một sản phẩm từ đơn hàng của bạn');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const result = await createProductReview({
                orderItemId: selectedItemId,
                rating,
                title: title.trim() || undefined,
                comment: comment.trim() || undefined,
                rewardType
            });
            const rewardMsg =
                result.reward.type === 'points'
                    ? `Bạn nhận được ${result.reward.points ?? 0} điểm thưởng! Số dư: ${result.loyaltyPoints}`
                    : `Bạn nhận được mã giảm giá ${result.reward.coupon?.code ?? ''} (Giảm ${result.reward.coupon?.discountValue ?? 0}%)`;
            setSuccessMessage(rewardMsg);
            onSuccess?.();
            window.setTimeout(() => {
                onClose();
            }, 2200);
        } catch (err) {
            const msg =
                typeof err === 'string'
                    ? err
                    : (err as { response?: { data?: { message?: string } }; message?: string })
                          ?.response?.data?.message ||
                      (err as { message?: string })?.message ||
                      'Không thể gửi đánh giá';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close"
                onClick={onClose}
            />
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-surface-container-lowest p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-on-surface">Viết đánh giá</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {successMessage ? (
                    <div className="rounded-xl bg-primary/10 px-4 py-6 text-center text-sm text-on-surface">
                        <span className="material-symbols-outlined mb-2 text-4xl text-primary">
                            celebration
                        </span>
                        <p className="font-medium">{successMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {loading && (
                            <div className="flex justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        )}

                        {!loading && items.length === 0 && (
                            <p className="rounded-xl bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                                Chưa có sản phẩm nào đủ điều kiện đánh giá. Chỉ các sản phẩm từ những đơn hàng đã giao thành công mới có thể đánh giá.
                            </p>
                        )}

                        {!loading && items.length > 0 && (
                            <>
                                {items.length > 1 && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-on-surface-variant">
                                            {orderNumber
                                                ? 'Chọn sản phẩm trong đơn này'
                                                : 'Chọn sản phẩm cần đánh giá'}
                                        </label>
                                        <select
                                            value={selectedItemId ?? ''}
                                            onChange={(e) =>
                                                setSelectedItemId(Number(e.target.value) || null)
                                            }
                                            className="h-12 rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary"
                                            required
                                        >
                                            <option value="">Chọn…</option>
                                            {items.map((item) => (
                                                <option key={item.orderItemId} value={item.orderItemId}>
                                                    {item.productName} (#{item.orderNumber})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {selectedItem && (
                                    <div className="flex gap-3 rounded-xl bg-surface-container-low p-3">
                                        {selectedItem.productImageUrl ? (
                                            <img
                                                src={selectedItem.productImageUrl}
                                                alt=""
                                                className="h-14 w-14 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                                                <span className="material-symbols-outlined">inventory_2</span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">
                                                {selectedItem.productName}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                Đơn hàng #{selectedItem.orderNumber}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-on-surface-variant">
                                        Đánh giá của bạn
                                    </label>
                                    <StarRatingInput value={rating} onChange={setRating} disabled={submitting} />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Tiêu đề (tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={200}
                                        placeholder="Tóm tắt trải nghiệm của bạn"
                                        className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Nhận xét (tùy chọn)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={4}
                                        placeholder="Chia sẻ chi tiết cho các sinh viên khác…"
                                        className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                                    />
                                </div>

                                <div>
                                    <p className="mb-2 text-sm font-medium text-on-surface-variant">
                                        Chọn phần thưởng của bạn
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setRewardType('points')}
                                            className={`rounded-xl border-2 p-4 text-left transition ${
                                                rewardType === 'points'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-outline-variant hover:border-primary/40'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-primary">
                                                stars
                                            </span>
                                            <p className="mt-2 text-sm font-bold text-on-surface">Điểm thưởng</p>
                                            <p className="text-xs text-on-surface-variant">
                                                Sử dụng cho lần thanh toán tiếp theo
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRewardType('coupon')}
                                            className={`rounded-xl border-2 p-4 text-left transition ${
                                                rewardType === 'coupon'
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-outline-variant hover:border-primary/40'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-primary">
                                                local_offer
                                            </span>
                                            <p className="mt-2 text-sm font-bold text-on-surface">Mã giảm giá</p>
                                            <p className="text-xs text-on-surface-variant">
                                                Giảm phần trăm cho đơn hàng tiếp theo
                                            </p>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {error && (
                            <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
                                {error}
                            </p>
                        )}

                        {!loading && items.length > 0 && (
                            <button
                                type="submit"
                                disabled={submitting || !selectedItemId}
                                className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary disabled:opacity-50"
                            >
                                {submitting ? 'Đang gửi…' : 'Gửi đánh giá & Nhận thưởng'}
                            </button>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
