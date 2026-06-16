import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import {
    fetchAdminOrders,
    fetchAdminOrderDetail,
    updateAdminOrderStatus
} from '../services/adminApi';
import type { AdminOrderDetail, AdminOrderListItem } from '../types/adminOrders';

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-surface-container-high text-on-surface-variant',
    confirmed: 'bg-primary/10 text-primary',
    processing: 'bg-secondary-container text-on-secondary-container',
    shipping: 'bg-tertiary-container text-on-tertiary-container',
    delivery_failed: 'bg-error-container/70 text-on-error-container',
    delivered: 'bg-primary/10 text-primary',
    returned: 'bg-error-container text-on-error-container',
    cancelled: 'bg-error-container text-on-error-container',
    refunded: 'bg-error-container text-on-error-container'
};

const PAYMENT_METHODS: Record<string, string> = {
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
    momo: 'MoMo',
    vnpay: 'VNPay'
};

const ACTION_STYLES: Record<string, string> = {
    confirmed: 'bg-primary text-on-primary hover:bg-primary/90',
    processing: 'bg-primary text-on-primary hover:bg-primary/90',
    shipping: 'bg-tertiary text-on-tertiary hover:bg-tertiary/90',
    delivered: 'bg-primary text-on-primary hover:bg-primary/90',
    delivery_failed: 'border border-error text-error hover:bg-error-container',
    returned: 'border border-error text-error hover:bg-error-container',
    cancelled: 'border border-error text-error hover:bg-error-container',
    refunded: 'border border-error text-error hover:bg-error-container'
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

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
    const [statusCounts, setStatusCounts] = useState<{ status: string; label: string; count: number }[]>(
        []
    );
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [adminNote, setAdminNote] = useState('');

    const loadOrders = useCallback(
        async (page = pagination.page) => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAdminOrders({
                    page,
                    limit: pagination.limit,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    search: search || undefined,
                    from: fromDate || undefined,
                    to: toDate || undefined
                });
                setOrders(data.orders);
                setStatusCounts(data.statusCounts);
                setPagination(data.pagination);
            } catch (err: unknown) {
                const message =
                    typeof err === 'object' && err && 'message' in err
                        ? String((err as { message?: string }).message || '')
                        : '';
                setError(message || 'Không thể tải danh sách đơn hàng');
            } finally {
                setLoading(false);
            }
        },
        [fromDate, pagination.limit, pagination.page, search, statusFilter, toDate]
    );

    useEffect(() => {
        loadOrders(1);
    }, [statusFilter, search, fromDate, toDate]);

    const openOrderDetail = async (orderNumber: string) => {
        setDetailLoading(true);
        setDetailError(null);
        try {
            const data = await fetchAdminOrderDetail(orderNumber);
            setSelectedOrder(data.order);
            setAdminNote(data.order.adminNote || '');
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            setDetailError(message || 'Không thể tải chi tiết đơn hàng');
            setSelectedOrder(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedOrder(null);
        setDetailError(null);
        setAdminNote('');
    };

    const handleStatusUpdate = async (orderNumber: string, newStatus: string) => {
        setUpdatingStatus(newStatus);
        try {
            const data = await updateAdminOrderStatus(orderNumber, {
                status: newStatus,
                adminNote: adminNote.trim() || null
            });
            setSelectedOrder(data.order);
            await loadOrders(pagination.page);
        } catch (err: unknown) {
            const message =
                typeof err === 'object' && err && 'message' in err
                    ? String((err as { message?: string }).message || '')
                    : '';
            alert(message || 'Không thể cập nhật trạng thái đơn hàng');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const totalAll = statusCounts.reduce((sum, item) => sum + item.count, 0);

    return (
        <AdminLayout
            title="Quản lý đơn hàng"
            subtitle="Xem, lọc và cập nhật trạng thái đơn hàng của khách hàng."
            headerExtra={
                <div className="relative w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Tìm mã đơn, email, SĐT, tên khách..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setSearch(searchInput.trim());
                            }
                        }}
                        className="h-10 w-full rounded-full border-none bg-surface-container-low pl-10 pr-4 text-sm outline-none ring-1 ring-transparent focus:ring-primary/40"
                    />
                </div>
            }
        >
            <section className="rounded-[24px] bg-surface-container-lowest p-5 shadow-sm">
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

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                    />
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                    />
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
                            setFromDate('');
                            setToDate('');
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
                                    <th className="px-6 py-4 text-outline">Mã đơn</th>
                                    <th className="px-6 py-4 text-outline">Khách hàng</th>
                                    <th className="px-6 py-4 text-outline">Ngày đặt</th>
                                    <th className="px-6 py-4 text-outline">Thanh toán</th>
                                    <th className="px-6 py-4 text-outline">Trạng thái</th>
                                    <th className="px-6 py-4 text-right text-outline">Tổng tiền</th>
                                    <th className="px-6 py-4 text-outline">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="transition-colors hover:bg-surface-container-low"
                                    >
                                        <td className="px-6 py-4 font-semibold">#{order.orderNumber}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{order.customerName}</p>
                                            {order.customerEmail && (
                                                <p className="text-xs text-on-surface-variant">
                                                    {order.customerEmail}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">
                                            {formatDate(order.placedAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs">
                                                {order.paymentMethod
                                                    ? PAYMENT_METHODS[order.paymentMethod] ||
                                                      order.paymentMethod
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                {order.paymentStatus || '—'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    STATUS_STYLES[order.status] ||
                                                    STATUS_STYLES.pending
                                                }`}
                                            >
                                                {order.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold">
                                            {formatCurrency(order.total)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => openOrderDetail(order.orderNumber)}
                                                className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-primary/10 hover:text-primary"
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orders.length === 0 && (
                            <div className="p-10 text-center text-on-surface-variant">
                                Không tìm thấy đơn hàng phù hợp.
                            </div>
                        )}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-surface-container px-6 py-4">
                            <p className="text-sm text-on-surface-variant">
                                Trang {pagination.page}/{pagination.totalPages} — {pagination.total}{' '}
                                đơn
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1}
                                    onClick={() => loadOrders(pagination.page - 1)}
                                    className="rounded-xl border border-outline-variant/50 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                                >
                                    Trước
                                </button>
                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => loadOrders(pagination.page + 1)}
                                    className="rounded-xl border border-outline-variant/50 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {(selectedOrder || detailLoading || detailError) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-surface-container-lowest shadow-xl">
                        <div className="sticky top-0 flex items-center justify-between border-b border-surface-container bg-surface-container-lowest px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold">
                                    {selectedOrder
                                        ? `Đơn #${selectedOrder.orderNumber}`
                                        : 'Chi tiết đơn hàng'}
                                </h3>
                                {selectedOrder && (
                                    <p className="text-sm text-on-surface-variant">
                                        {selectedOrder.statusLabel}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="rounded-full p-2 hover:bg-surface-container-low"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {detailLoading && (
                            <div className="flex justify-center py-20">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        )}

                        {!detailLoading && detailError && (
                            <div className="p-6 text-error">{detailError}</div>
                        )}

                        {!detailLoading && selectedOrder && (
                            <div className="space-y-6 p-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-surface-container-low p-4">
                                        <p className="text-xs uppercase text-on-surface-variant">
                                            Khách hàng
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {(selectedOrder.shippingSnapshot?.fullName as string) ||
                                                selectedOrder.customerName}
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                            {selectedOrder.customerPhone ||
                                                (selectedOrder.shippingSnapshot?.phone as string) ||
                                                '—'}
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                            {selectedOrder.customerEmail ||
                                                selectedOrder.guestEmail ||
                                                '—'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-surface-container-low p-4">
                                        <p className="text-xs uppercase text-on-surface-variant">
                                            Giao hàng
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {(selectedOrder.shippingSnapshot?.street as string) ||
                                                '—'}
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                            {[
                                                selectedOrder.shippingSnapshot?.city,
                                                selectedOrder.shippingSnapshot?.state,
                                                selectedOrder.shippingSnapshot?.postalCode
                                            ]
                                                .filter(Boolean)
                                                .join(', ') || '—'}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-primary">
                                            {selectedOrder.deliveryType === 'campus'
                                                ? 'Giao tại trường'
                                                : 'Giao tận nơi'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-surface-container-low p-4">
                                    <p className="mb-3 text-xs uppercase text-on-surface-variant">
                                        Sản phẩm ({selectedOrder.items.length})
                                    </p>
                                    <div className="space-y-3">
                                        {selectedOrder.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {item.productName}
                                                    </p>
                                                    <p className="text-xs text-on-surface-variant">
                                                        SL: {item.quantity} ×{' '}
                                                        {formatCurrency(item.unitPrice)}
                                                        {item.sku ? ` • SKU: ${item.sku}` : ''}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold">
                                                    {formatCurrency(item.lineTotal)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-xl bg-surface-container-low p-3 text-center">
                                        <p className="text-xs text-on-surface-variant">Tạm tính</p>
                                        <p className="font-bold">
                                            {formatCurrency(selectedOrder.subtotal)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-low p-3 text-center">
                                        <p className="text-xs text-on-surface-variant">Giảm giá</p>
                                        <p className="font-bold">
                                            -{formatCurrency(selectedOrder.discountAmount)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-low p-3 text-center">
                                        <p className="text-xs text-on-surface-variant">Phí ship</p>
                                        <p className="font-bold">
                                            {formatCurrency(selectedOrder.shippingFee)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-primary/10 p-3 text-center">
                                        <p className="text-xs text-primary">Tổng cộng</p>
                                        <p className="font-bold text-primary">
                                            {formatCurrency(selectedOrder.total)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-surface-container-low p-4 text-sm">
                                        <p>
                                            <span className="text-on-surface-variant">Đặt hàng:</span>{' '}
                                            {formatDate(selectedOrder.placedAt)}
                                        </p>
                                        <p>
                                            <span className="text-on-surface-variant">Thanh toán:</span>{' '}
                                            {selectedOrder.payment
                                                ? `${PAYMENT_METHODS[selectedOrder.payment.method] || selectedOrder.payment.method} — ${selectedOrder.payment.status}`
                                                : '—'}
                                        </p>
                                        {selectedOrder.shippedAt && (
                                            <p>
                                                <span className="text-on-surface-variant">Giao đi:</span>{' '}
                                                {formatDate(selectedOrder.shippedAt)}
                                            </p>
                                        )}
                                        {selectedOrder.deliveredAt && (
                                            <p>
                                                <span className="text-on-surface-variant">
                                                    Giao xong:
                                                </span>{' '}
                                                {formatDate(selectedOrder.deliveredAt)}
                                            </p>
                                        )}
                                        {selectedOrder.returnedAt && (
                                            <p>
                                                <span className="text-on-surface-variant">
                                                    Hoàn trả:
                                                </span>{' '}
                                                {formatDate(selectedOrder.returnedAt)}
                                            </p>
                                        )}
                                        {(selectedOrder.deliveryFailCount > 0 ||
                                            selectedOrder.status === 'delivery_failed') && (
                                            <p className="mt-2 font-semibold text-error">
                                                Lần giao thất bại: {selectedOrder.deliveryFailCount}/
                                                {selectedOrder.maxDeliveryAttempts}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase text-on-surface-variant">
                                            Ghi chú admin
                                        </label>
                                        <textarea
                                            value={adminNote}
                                            onChange={(e) => setAdminNote(e.target.value)}
                                            rows={3}
                                            placeholder="Ghi chú nội bộ cho đơn hàng..."
                                            className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>

                                {selectedOrder.allowedNextStatuses.length > 0 && (
                                    <div className="rounded-2xl border border-outline-variant/30 p-4">
                                        <p className="mb-1 text-sm font-semibold">
                                            Cập nhật trạng thái
                                        </p>
                                        {selectedOrder.status === 'shipping' && (
                                            <p className="mb-3 text-xs text-on-surface-variant">
                                                Nếu giao thất bại lần thứ 3, đơn sẽ tự chuyển sang
                                                Hoàn trả hàng.
                                            </p>
                                        )}
                                        {selectedOrder.status === 'delivery_failed' && (
                                            <p className="mb-3 text-xs text-on-surface-variant">
                                                {selectedOrder.deliveryFailCount <
                                                selectedOrder.maxDeliveryAttempts
                                                    ? `Còn ${selectedOrder.maxDeliveryAttempts - selectedOrder.deliveryFailCount} lần giao lại trước khi hoàn trả tự động.`
                                                    : 'Đã đạt giới hạn giao lại — chỉ có thể hoàn trả hàng.'}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {selectedOrder.allowedNextStatuses.map((action) => (
                                                <button
                                                    key={action.status}
                                                    type="button"
                                                    disabled={updatingStatus !== null}
                                                    onClick={() =>
                                                        handleStatusUpdate(
                                                            selectedOrder.orderNumber,
                                                            action.status
                                                        )
                                                    }
                                                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                                                        ACTION_STYLES[action.status] ||
                                                        'bg-surface-container-high text-on-surface-variant'
                                                    }`}
                                                >
                                                    {updatingStatus === action.status
                                                        ? 'Đang xử lý...'
                                                        : action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
