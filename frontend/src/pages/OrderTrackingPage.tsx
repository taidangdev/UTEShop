import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import WriteReviewModal from '../components/reviews/WriteReviewModal';
import { fetchOrder, cancelOrder, requestOrderReturn } from '../services/checkoutApi';
import { fetchEligibleReviewItems } from '../services/reviewApi';
import type { OrderDto } from '../types/checkout';
import { useNotification } from '../context/NotificationContext';

const REVIEWABLE_STATUSES = new Set(['delivered']);

const STATUS_CONFIG: Record<string, { label: string; icon: string; colorClass: string; step: number }> = {
    pending: { label: 'Đơn hàng mới', icon: 'pending_actions', colorClass: 'bg-surface-container-highest text-on-surface-variant', step: 1 },
    confirmed: { label: 'Đã xác nhận đơn hàng', icon: 'check_circle', colorClass: 'bg-primary/10 text-primary', step: 2 },
    processing: { label: 'Đang chuẩn bị hàng', icon: 'inventory_2', colorClass: 'bg-secondary-container text-on-secondary-container', step: 3 },
    shipping: { label: 'Đang giao hàng', icon: 'local_shipping', colorClass: 'bg-tertiary-container text-on-tertiary-container', step: 4 },
    delivery_failed: { label: 'Giao hàng thất bại', icon: 'error', colorClass: 'bg-error-container text-on-error-container', step: 4 },
    delivered: { label: 'Đã giao thành công', icon: 'task_alt', colorClass: 'bg-success/10 text-success', step: 5 },
    return_requested: { label: 'Chờ duyệt trả hàng', icon: 'history', colorClass: 'bg-amber-500/10 text-amber-500', step: 0 },
    return_approved: { label: 'Chờ thu hồi hàng', icon: 'forward_to_inbox', colorClass: 'bg-indigo-500/10 text-indigo-500', step: 0 },
    returned: { label: 'Hoàn trả hàng', icon: 'undo', colorClass: 'bg-error-container text-on-error-container', step: 0 },
    cancelled: { label: 'Đã hủy đơn hàng', icon: 'cancel', colorClass: 'bg-error-container text-on-error-container', step: 0 },
    refunded: { label: 'Đã hoàn tiền', icon: 'keyboard_return', colorClass: 'bg-error-container text-on-error-container', step: 0 },
    cancel_requested: { label: 'Yêu cầu hủy', icon: 'pending_actions', colorClass: 'bg-amber-500/10 text-amber-500', step: 0 }
};

const PAYMENT_METHODS: Record<string, string> = {
    cod: 'Thanh toán tiền mặt (COD)',
    bank_transfer: 'Chuyển khoản ngân hàng',
    momo: 'Ví điện tử MoMo',
    vnpay: 'Cổng thanh toán VNPAY'
};

const PAYMENT_STATUSES: Record<string, { label: string; class: string }> = {
    pending: { label: 'Chờ thanh toán', class: 'bg-surface-container-high text-on-surface-variant' },
    paid: { label: 'Đã thanh toán', class: 'bg-primary/10 text-primary' },
    failed: { label: 'Thanh toán thất bại', class: 'bg-error-container text-on-error-container' },
    refunded: { label: 'Đã hoàn tiền', class: 'bg-error-container text-on-error-container' }
};

export default function OrderTrackingPage() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const location = useLocation();
    const justOrdered = Boolean((location.state as { justOrdered?: boolean } | null)?.justOrdered);
    const [showSuccessBanner, setShowSuccessBanner] = useState(justOrdered);
    const [order, setOrder] = useState<OrderDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [returning, setReturning] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewOrderItemId, setReviewOrderItemId] = useState<number | undefined>();
    const [reviewableItemIds, setReviewableItemIds] = useState<Set<number>>(() => new Set());

    const { toast } = useNotification();

    const loadReviewableItems = useCallback(async (currentOrderNumber: string) => {
        try {
            const items = await fetchEligibleReviewItems();
            const ids = new Set(
                items
                    .filter((item) => item.orderNumber === currentOrderNumber)
                    .map((item) => item.orderItemId)
            );
            setReviewableItemIds(ids);
        } catch {
            setReviewableItemIds(new Set());
        }
    }, []);

    const loadOrderData = async () => {
        if (!orderNumber) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchOrder(orderNumber);
            setOrder(data.order);
            if (data.order.status === 'delivered') {
                await loadReviewableItems(orderNumber);
            } else {
                setReviewableItemIds(new Set());
            }
        } catch (err: any) {
            console.error('Failed to load order details:', err);
            setError(err?.response?.data?.message || err?.message || 'Không thể tải thông tin đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrderData();
    }, [orderNumber]);

    const handleCancelOrder = async () => {
        if (!orderNumber) return;
        setCancelling(true);
        try {
            await cancelOrder(orderNumber);
            toast.success(`Hủy đơn hàng #${orderNumber} thành công`);
            await loadOrderData(); // Reload data
            setShowCancelModal(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Không thể hủy đơn hàng');
        } finally {
            setCancelling(false);
        }
    };

    const handleRequestReturn = async () => {
        if (!orderNumber || !returnReason.trim()) return;
        setReturning(true);
        try {
            await requestOrderReturn(orderNumber, returnReason);
            toast.success('Gửi yêu cầu trả hàng thành công');
            await loadOrderData();
            setShowReturnModal(false);
            setReturnReason('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Không thể gửi yêu cầu trả hàng');
        } finally {
            setReturning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="mx-auto max-w-[1280px] px-6 py-20 text-center text-on-surface">
                <span className="material-symbols-outlined text-[64px] text-error">error</span>
                <h1 className="mt-4 text-2xl font-bold">Đã xảy ra lỗi</h1>
                <p className="mt-2 text-on-surface-variant">{error || 'Không tìm thấy đơn hàng'}</p>
                <Link to="/profile" className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary">
                    Về Lịch Sử Mua Hàng
                </Link>
            </div>
        );
    }

    const currentStatus = order.status;
    const isDisputeState = currentStatus === 'return_requested' || currentStatus === 'return_approved' || currentStatus === 'cancel_requested';
    const isTerminalFailure =
        currentStatus === 'cancelled' ||
        currentStatus === 'refunded' ||
        currentStatus === 'returned';
    const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending;
    const currentStep = statusConfig.step;
    const deliveryFailCount = order.deliveryFailCount || 0;

    // Helper to format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total);
    const formattedSubtotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.subtotal);
    const formattedShippingFee = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.shippingFee);
    const formattedDiscount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.discountAmount);

    // Extract shipping snapshot address info safely
    const snapshot = (order.shippingSnapshot as any) || {};

    const steps = [
        { key: 1, label: 'Đơn mới', desc: 'Đã nhận đơn' },
        { key: 2, label: 'Đã xác nhận', desc: 'Shop đã duyệt' },
        { key: 3, label: 'Chuẩn bị hàng', desc: 'Đang đóng gói' },
        { key: 4, label: 'Đang giao', desc: 'Shipper đang giao' },
        { key: 5, label: 'Đã giao', desc: 'Hoàn tất đơn hàng' }
    ];


    return (
        <div className="min-h-screen bg-surface py-10 text-on-surface antialiased">
            <main className="mx-auto max-w-[960px] px-6">
                {/* Header breadcrumbs */}
                <div className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
                    <Link to="/profile" className="hover:text-primary transition">Tài khoản của tôi</Link>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    <span className="font-medium text-on-surface">Theo dõi đơn hàng #{order.orderNumber}</span>
                </div>

                {/* Order Success Celebration Banner */}
                {showSuccessBanner && (
                    <div className="mb-8 overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/5 via-surface-container-low to-tertiary-container/20 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
                        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                            <span className="material-symbols-outlined animate-[bounce_1s_ease-in-out_3] text-[48px] text-primary">
                                check_circle
                            </span>
                            <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" style={{ animationDuration: '2s', animationIterationCount: '3' }} />
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface">Đặt hàng thành công! 🎉</h2>
                        <p className="mt-2 text-sm text-on-surface-variant">
                            Cảm ơn bạn đã mua sắm tại UTEShop. Đơn hàng <span className="font-semibold text-primary">#{order.orderNumber}</span> đã được tiếp nhận và đang chờ xử lý.
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                            Bạn có thể theo dõi trạng thái đơn hàng ngay bên dưới.
                        </p>
                        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                to="/categories"
                                className="inline-flex h-11 items-center gap-2 rounded-full border border-outline-variant px-6 text-sm font-semibold text-on-surface-variant transition hover:border-primary hover:text-primary active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                                Tiếp tục mua sắm
                            </Link>
                            <button
                                type="button"
                                onClick={() => setShowSuccessBanner(false)}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:opacity-90 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                                Theo dõi đơn hàng
                            </button>
                        </div>
                    </div>
                )}

                {/* Main panel card */}
                <div className="soft-shadow overflow-hidden rounded-[28px] bg-surface-container-lowest border border-outline-variant/30">
                    {/* Top banner info */}
                    <div className="flex flex-col justify-between border-b border-outline-variant/30 bg-surface-container-low p-8 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Đơn hàng</p>
                            <h2 className="text-2xl font-bold text-on-surface">#{order.orderNumber}</h2>
                            <p className="mt-1 text-sm text-on-surface-variant">Đặt ngày: {formatDate(order.placedAt)}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-3 sm:mt-0">
                            <span className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${statusConfig.colorClass}`}>
                                <span className="material-symbols-outlined text-[18px]">{statusConfig.icon}</span>
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>

                    {/* Order Tracking Progress Stepper */}
                    <div className="p-8 border-b border-outline-variant/30">
                        {currentStatus === 'delivery_failed' && (
                            <div className="mb-6 rounded-2xl border border-error/20 bg-error-container/20 p-4">
                                <p className="text-sm font-semibold text-error">
                                    Giao hàng không thành công ({deliveryFailCount}/3 lần)
                                </p>
                                <p className="mt-1 text-sm text-on-surface-variant">
                                    Shop đang sắp xếp giao lại. Nếu sau 3 lần vẫn không giao được,
                                    đơn hàng sẽ được hoàn trả.
                                </p>
                            </div>
                        )}
                        {isDisputeState ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-500/10 p-8 text-center border border-amber-500/20">
                                <span className="material-symbols-outlined text-[48px] text-amber-600">
                                    {currentStatus === 'cancel_requested'
                                        ? 'cancel_presentation'
                                        : currentStatus === 'return_requested'
                                          ? 'assignment_return'
                                          : 'local_shipping'}
                                </span>
                                <h3 className="mt-3 text-lg font-bold text-amber-700">
                                    {currentStatus === 'cancel_requested'
                                        ? 'Đang chờ duyệt Yêu cầu Hủy đơn'
                                        : currentStatus === 'return_requested'
                                          ? 'Đang chờ duyệt Yêu cầu Trả hàng'
                                          : 'Yêu cầu Trả hàng được Chấp nhận'}
                                </h3>
                                <p className="mt-1 max-w-lg text-sm text-on-surface-variant leading-relaxed">
                                    {currentStatus === 'cancel_requested'
                                        ? 'Yêu cầu hủy đơn hàng của bạn đã được ghi nhận và đang chờ shop phê duyệt.'
                                        : currentStatus === 'return_requested'
                                          ? 'Yêu cầu trả hàng của bạn đã được ghi nhận và đang chờ shop phê duyệt.'
                                          : 'Shop đã phê duyệt yêu cầu trả hàng của bạn. Vui lòng chờ shipper liên hệ để thu hồi sản phẩm.'}
                                </p>
                                {order.returnReason && (
                                    <p className="mt-2 text-sm text-on-surface-variant font-medium">
                                        Lý do trả hàng: <span className="italic font-normal">&quot;{order.returnReason}&quot;</span>
                                    </p>
                                )}
                            </div>
                        ) : isTerminalFailure ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-error-container/20 p-8 text-center border border-error/10">
                                <span className="material-symbols-outlined text-[48px] text-error">
                                    {currentStatus === 'cancelled'
                                        ? 'cancel'
                                        : currentStatus === 'returned'
                                          ? 'undo'
                                          : 'keyboard_return'}
                                </span>
                                <h3 className="mt-3 text-lg font-bold text-error">
                                    {currentStatus === 'cancelled'
                                        ? 'Đơn hàng đã bị Hủy'
                                        : currentStatus === 'returned'
                                          ? 'Đơn hàng đã Hoàn trả'
                                          : 'Đơn hàng đã Hoàn tiền'}
                                </h3>
                                <p className="mt-1 max-w-lg text-sm text-on-error-container">
                                    {currentStatus === 'returned' && order.returnedAt
                                        ? `Hoàn trả lúc: ${formatDate(order.returnedAt)}.`
                                        : `Đơn hàng này được cập nhật trạng thái lúc: ${formatDate(order.placedAt || new Date().toISOString())}.`}
                                    {deliveryFailCount > 0 && currentStatus === 'returned' && (
                                        <span className="block mt-1">
                                            Đã giao thất bại {deliveryFailCount} lần trước khi hoàn trả.
                                        </span>
                                    )}
                                    {order.returnReason && (
                                        <span className="block mt-1 italic font-medium">Lý do trả hàng: &quot;{order.returnReason}&quot;</span>
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="mb-8 text-lg font-semibold text-on-surface">Hành trình đơn hàng</h3>
                                <div className="relative flex flex-col justify-between md:flex-row gap-6">
                                    {/* Line running behind steps */}
                                    <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-outline-variant/30 md:left-0 md:right-0 md:top-[15px] md:h-0.5 md:w-auto" />
                                    
                                    {steps.map((step) => {
                                        const isCompleted = step.key <= currentStep;
                                        const isActive = step.key === currentStep;

                                        return (
                                            <div key={step.key} className="relative flex items-start md:flex-col md:items-center gap-4 flex-1">
                                                <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                                                    isCompleted 
                                                        ? 'bg-primary text-on-primary' 
                                                        : 'bg-surface-container-high text-outline'
                                                } ${isActive ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                                                    {isCompleted ? (
                                                        <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold">{step.key}</span>
                                                    )}
                                                </div>
                                                <div className="md:text-center">
                                                    <p className={`text-sm font-bold leading-tight ${isCompleted ? 'text-on-surface' : 'text-outline'}`}>{step.label}</p>
                                                    <p className="mt-0.5 text-[11px] text-on-surface-variant leading-none">{step.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {order.adminNote && (
                            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">
                                    info
                                </span>
                                <div className="text-left">
                                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Ghi chú từ cửa hàng</p>
                                    <p className="mt-1 text-sm font-medium text-on-surface">
                                        &quot;{order.adminNote}&quot;
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delivery & Payment Snapshots Info */}
                    <div className="grid grid-cols-1 divide-y border-b border-outline-variant/30 md:grid-cols-2 md:divide-x md:divide-y-0 divide-outline-variant/30">
                        {/* Shipping snapshot */}
                        <div className="p-8">
                            <h3 className="mb-4 text-base font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-primary">local_shipping</span>
                                Địa chỉ giao nhận
                            </h3>
                            <div className="space-y-1.5 text-sm text-on-surface-variant">
                                <p className="font-semibold text-on-surface">{snapshot.fullName || 'Người nhận mẫu'}</p>
                                <p>SĐT: {snapshot.phone || '—'}</p>
                                <p>Địa chỉ: {snapshot.street}, {snapshot.city}</p>
                                <p className="inline-block mt-2 rounded bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                                    Hình thức: {snapshot.deliveryType === 'campus' ? 'Nhận tại trường (Free Ship)' : 'Giao tận nơi'}
                                </p>
                            </div>
                        </div>

                        {/* Payment details */}
                        <div className="p-8">
                            <h3 className="mb-4 text-base font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px] text-primary">payments</span>
                                Thông tin thanh toán
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs text-on-surface-variant">Phương thức thanh toán</p>
                                    <p className="font-semibold text-on-surface">{PAYMENT_METHODS[order.payment?.method || 'cod']}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-on-surface-variant">Trạng thái giao dịch</p>
                                    <span className={`inline-block mt-1 rounded-full px-3 py-1 text-xs font-bold ${
                                        PAYMENT_STATUSES[order.payment?.status || 'pending'].class
                                    }`}>
                                        {PAYMENT_STATUSES[order.payment?.status || 'pending'].label}
                                    </span>
                                    {order.payment?.paidAt && (
                                        <p className="mt-1 text-xs text-on-surface-variant">Vào lúc: {formatDate(order.payment.paidAt)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order items lists */}
                    <div className="p-8 border-b border-outline-variant/30">
                        <h3 className="mb-6 text-base font-bold text-on-surface">Danh sách sản phẩm</h3>
                        <div className="divide-y divide-outline-variant/20">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                                        <img
                                            src="/PremiumLaptop.png"
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-on-surface line-clamp-1">{item.productName}</h4>
                                        <p className="mt-0.5 text-xs text-on-surface-variant">SKU: {item.sku || '—'}</p>
                                        <p className="mt-1 text-xs font-medium text-on-surface">Số lượng: {item.quantity}</p>
                                    </div>
                                    <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-primary">${Number(item.lineTotal).toFixed(2)}</p>
                                            <p className="text-xs text-on-surface-variant">${Number(item.unitPrice).toFixed(2)} / cái</p>
                                        </div>
                                        {REVIEWABLE_STATUSES.has(order.status) &&
                                            reviewableItemIds.has(item.id) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReviewOrderItemId(item.id);
                                                    setReviewModalOpen(true);
                                                }}
                                                className="rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                                            >
                                                Đánh giá
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order financial totals summary */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end p-8 gap-6 bg-surface-container-lowest">
                        {/* Cancellation options */}
                        <div>
                            {(() => {
                                const isWithin30Mins = order.placedAt
                                    ? (new Date().getTime() - new Date(order.placedAt).getTime()) < 30 * 60 * 1000
                                    : false;
                                const canDirectCancel = (currentStatus === 'pending' || currentStatus === 'confirmed') && isWithin30Mins;
                                const canRequestCancel = currentStatus === 'processing' && isWithin30Mins;

                                if (canDirectCancel) {
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowCancelModal(true)}
                                            className="flex items-center gap-2 rounded-full border border-error/30 px-6 py-3 text-sm font-semibold text-error hover:bg-error/5 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                                            Hủy đơn hàng này
                                        </button>
                                    );
                                }
                                if (canRequestCancel) {
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowCancelModal(true)}
                                            className="flex items-center gap-2 rounded-full border border-amber-500/30 px-6 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-500/5 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">cancel_presentation</span>
                                            Yêu cầu hủy đơn hàng
                                        </button>
                                    );
                                }
                                if (order.status === 'delivered') {
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setShowReturnModal(true)}
                                            className="flex items-center gap-2 rounded-full border border-amber-500/30 px-6 py-3 text-sm font-semibold text-amber-500 hover:bg-amber-500/5 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                                            Yêu cầu Trả hàng / Hoàn tiền
                                        </button>
                                    );
                                }
                                if (['return_requested', 'return_approved', 'returned', 'refunded', 'cancel_requested'].includes(order.status)) {
                                    return null;
                                }
                                return (
                                    <p className="text-xs text-on-surface-variant italic">
                                        * Đơn hàng đã đặt quá 30 phút hoặc ở trạng thái không thể tự hủy trực tuyến.
                                    </p>
                                );
                            })()}
                        </div>

                        {/* Summary totals values */}
                        <div className="w-full md:w-80 space-y-3 text-sm">
                            <div className="flex justify-between text-on-surface-variant">
                                <span>Tạm tính:</span>
                                <span>{formattedSubtotal}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                                <span>Phí vận chuyển:</span>
                                <span>{formattedShippingFee}</span>
                            </div>
                            {order.discountAmount > 0 && (
                                <div className="flex justify-between text-error font-medium">
                                    <span>Khuyến mãi giảm giá:</span>
                                    <span>-{formattedDiscount}</span>
                                </div>
                            )}
                            <hr className="border-outline-variant/30 my-1" />
                            <div className="flex justify-between text-base font-bold text-on-surface">
                                <span className="text-lg">Tổng cộng:</span>
                                <span className="text-xl text-primary">{formattedTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-8 text-center">
                    <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Trở lại Lịch Sử Đơn Hàng
                    </Link>
                </div>
            </main>

            <WriteReviewModal
                open={reviewModalOpen}
                onClose={() => {
                    setReviewModalOpen(false);
                    setReviewOrderItemId(undefined);
                }}
                onSuccess={() => orderNumber && loadReviewableItems(orderNumber)}
                orderNumber={orderNumber}
                orderItemId={reviewOrderItemId}
            />

            {/* Premium Confirm Cancellation Dialog Modal popup */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="soft-shadow w-full max-w-md rounded-[28px] bg-surface-container-low p-8 border border-outline-variant/30 text-on-surface">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
                            <span className="material-symbols-outlined text-[24px]">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-on-surface">
                            {currentStatus === 'processing' ? 'Xác nhận yêu cầu hủy?' : 'Xác nhận hủy đơn hàng?'}
                        </h3>
                        
                        {currentStatus === 'processing' ? (
                            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                                Đơn hàng của bạn đang được chuẩn bị. Gửi yêu cầu hủy đơn lúc này sẽ cần chờ shop duyệt. Bạn có chắc chắn muốn tiếp tục không?
                            </p>
                        ) : currentStatus === 'confirmed' ? (
                            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                                Đơn hàng của bạn **đã được xác nhận**. Hủy đơn hàng lúc này sẽ kích hoạt quy trình **Hoàn trả tiền tự động** (qua VNPAY/MoMo/Chuyển khoản). Bạn có chắc chắn muốn tiếp tục không?
                            </p>
                        ) : (
                            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                                Bạn có chắc chắn muốn hủy đơn hàng **#{order.orderNumber}**? Quyết định hủy đơn sẽ hoàn kho lập tức sản phẩm và không thể hoàn tác.
                            </p>
                        )}

                        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(false)}
                                disabled={cancelling}
                                className="h-12 rounded-full bg-surface-container-high px-6 text-sm font-semibold text-on-surface transition active:scale-95"
                            >
                                Bỏ qua
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelOrder}
                                disabled={cancelling}
                                className="flex h-12 items-center justify-center gap-2 rounded-full bg-error px-6 text-sm font-semibold text-on-error hover:bg-red-700 hover:shadow-md transition active:scale-95 disabled:opacity-60"
                            >
                                {cancelling ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Đang xử lý...
                                    </>
                                ) : currentStatus === 'processing' ? (
                                    'Gửi yêu cầu hủy'
                                ) : (
                                    'Đồng ý hủy đơn'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Request Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="soft-shadow w-full max-w-md rounded-[28px] bg-surface-container-low p-8 border border-outline-variant/30 text-on-surface">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                            <span className="material-symbols-outlined text-[24px]">keyboard_return</span>
                        </div>
                        <h3 className="text-xl font-bold text-on-surface">Yêu cầu Trả hàng / Hoàn tiền</h3>
                        <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                            Vui lòng chọn hoặc nhập lý sớ lý do chi tiết để cửa hàng duyệt yêu cầu của bạn nhanh nhất:
                        </p>

                        <div className="mt-4 space-y-2">
                            {['Hàng lỗi / hư hỏng do nhà sản xuất', 'Sản phẩm không đúng với mô tả', 'Gửi sai sản phẩm / thiếu hàng', 'Khác (vui lòng tự nhập lý do)'].map((reasonOpt) => (
                                <button
                                    key={reasonOpt}
                                    type="button"
                                    onClick={() => setReturnReason(reasonOpt)}
                                    className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition ${
                                        returnReason === reasonOpt
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-outline-variant/40 bg-surface hover:bg-surface-container-high text-on-surface-variant'
                                    }`}
                                >
                                    {reasonOpt}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            rows={3}
                            placeholder="Mô tả chi tiết lý do (bắt buộc nếu chọn Khác)..."
                            className="mt-4 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />

                        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowReturnModal(false);
                                    setReturnReason('');
                                }}
                                disabled={returning}
                                className="h-12 rounded-full bg-surface-container-high px-6 text-sm font-semibold text-on-surface transition active:scale-95"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleRequestReturn}
                                disabled={returning || !returnReason.trim()}
                                className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:shadow-md transition active:scale-95 disabled:opacity-60"
                            >
                                {returning ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    'Gửi yêu cầu'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
