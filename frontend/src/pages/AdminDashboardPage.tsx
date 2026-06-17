import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { fetchAdminDashboard } from '../services/adminApi';
import type { AdminDashboardData } from '../types/adminDashboard';
import CategoriesTab from '../components/admin/CategoriesTab';
import PromotionsTab from '../components/admin/PromotionsTab';
import CustomersTab from '../components/admin/CustomersTab';

const PRESET_OPTIONS = [
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
    { value: '90d', label: '90 ngày' },
    { value: '365d', label: '1 năm' }
] as const;

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

function shortBucketLabel(bucket: string, groupBy: 'day' | 'month') {
    const date = new Date(bucket);
    if (groupBy === 'month') {
        return `T${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCompact(value: number) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
}

export default function AdminDashboardPage() {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'dashboard';
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [preset, setPreset] = useState<(typeof PRESET_OPTIONS)[number]['value']>('30d');
    const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
    const [status, setStatus] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const loadDashboard = useCallback(
        async (next: {
            preset?: '7d' | '30d' | '90d' | '365d';
            groupBy?: 'day' | 'month';
            status?: string;
            from?: string;
            to?: string;
        } = {}) => {
            setLoading(true);
            setError(null);
            try {
                const payload = await fetchAdminDashboard({
                    preset: next.preset ?? preset,
                    groupBy: next.groupBy ?? groupBy,
                    status: next.status ?? status,
                    from: next.from,
                    to: next.to
                });
                setData(payload);
            } catch (err: unknown) {
                const message =
                    typeof err === 'object' && err && 'message' in err
                        ? String((err as { message?: string }).message || '')
                        : '';
                setError(message || 'Không thể tải dashboard admin');
            } finally {
                setLoading(false);
            }
        },
        [groupBy, preset, status]
    );

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const revenueSeries = data?.revenueSeries || [];
    const maxRevenue = useMemo(
        () => Math.max(1, ...revenueSeries.map((item) => item.revenue)),
        [revenueSeries]
    );

    const selectedStatusLabel = useMemo(() => {
        if (!data) return 'Tất cả';
        return data.orderStats.byStatus.find((s) => s.status === status)?.label || 'Tất cả';
    }, [data, status]);

    const topOrders = data?.orderStats.orders.slice(0, 5) || [];

    return (
        <AdminLayout
            title={activeTab === 'dashboard' ? 'Chào buổi sáng, Admin!' : undefined}
            subtitle={activeTab === 'dashboard' ? 'Theo dõi doanh thu, đơn hàng và dòng tiền theo thời gian thực.' : undefined}
        >
            {activeTab === 'dashboard' && (
                <>
                    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                </div>
                                <span className="text-xs font-semibold text-tertiary">+Live</span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Tổng doanh thu</p>
                            <p className="mt-1 text-2xl font-bold">
                                {data ? formatCurrency(data.overview.totalRevenue) : '--'}
                            </p>
                        </div>

                        <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl bg-surface-container-high p-3 text-on-surface-variant">
                                    <span className="material-symbols-outlined">shopping_bag</span>
                                </div>
                                <span className="text-xs font-semibold text-primary">
                                    {data ? `${data.overview.totalOrders} đơn` : '--'}
                                </span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Tổng đơn hàng</p>
                            <p className="mt-1 text-2xl font-bold">{data ? formatCompact(data.overview.totalOrders) : '--'}</p>
                        </div>

                        <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl bg-[#ffdbcd] p-3 text-tertiary">
                                    <span className="material-symbols-outlined">person_celebrate</span>
                                </div>
                                <span className="text-xs font-semibold text-primary">Khách mới</span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Khách hàng mới</p>
                            <p className="mt-1 text-2xl font-bold">{data ? data.overview.newCustomers : '--'}</p>
                        </div>

                        <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-2xl bg-error-container p-3 text-error">
                                    <span className="material-symbols-outlined">local_shipping</span>
                                </div>
                                <span className="rounded-full bg-error-container px-2 py-1 text-[10px] font-bold text-error">
                                    CẦN XỬ LÝ
                                </span>
                            </div>
                            <p className="text-sm text-on-surface-variant">Đơn đang giao</p>
                            <p className="mt-1 text-2xl font-bold">
                                {data ? `${data.cashflow.inTransitOrders} đơn` : '--'}
                            </p>
                        </div>
                    </section>

                    <section className="rounded-[24px] bg-surface-container-lowest p-5 shadow-sm">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                            <select
                                className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                value={preset}
                                onChange={async (e) => {
                                    const nextPreset = e.target.value as '7d' | '30d' | '90d' | '365d';
                                    setPreset(nextPreset);
                                    setFromDate('');
                                    setToDate('');
                                    await loadDashboard({
                                        preset: nextPreset,
                                        groupBy,
                                        status,
                                        from: undefined,
                                        to: undefined
                                    });
                                }}
                            >
                                {PRESET_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                                value={groupBy}
                                onChange={async (e) => {
                                    const next = e.target.value as 'day' | 'month';
                                    setGroupBy(next);
                                    await loadDashboard({
                                        preset,
                                        groupBy: next,
                                        status,
                                        from: fromDate || undefined,
                                        to: toDate || undefined
                                    });
                                }}
                            >
                                <option value="day">Nhóm theo ngày</option>
                                <option value="month">Nhóm theo tháng</option>
                            </select>

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
                                className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
                                onClick={() =>
                                    loadDashboard({
                                        preset,
                                        groupBy,
                                        status,
                                        from: fromDate || undefined,
                                        to: toDate || undefined
                                    })
                                }
                            >
                                Áp dụng
                            </button>
                            <button
                                type="button"
                                className="h-10 rounded-xl border border-outline-variant/50 px-4 text-sm font-semibold"
                                onClick={() =>
                                    loadDashboard({ preset, groupBy, status, from: undefined, to: undefined })
                                }
                            >
                                Làm mới
                            </button>
                        </div>
                    </section>

                    {loading && (
                        <div className="flex justify-center py-20">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-[24px] bg-error-container p-6 text-on-error-container">
                            {error}
                        </div>
                    )}

                    {!loading && data && (
                        <>
                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                                <div className="xl:col-span-2 rounded-[32px] bg-surface-container-lowest p-8 shadow-sm">
                                    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-2xl font-semibold">Biểu đồ doanh thu</h3>
                                            <p className="text-sm text-on-surface-variant">
                                                Dữ liệu theo {data.range.groupBy === 'day' ? 'ngày' : 'tháng'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-surface-container-low px-3 py-2 text-xs font-semibold text-primary">
                                            {preset.toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="flex h-[280px] items-end gap-3 overflow-x-auto px-2">
                                        {revenueSeries.map((item) => {
                                            const height = Math.max(
                                                10,
                                                Math.round((item.revenue / maxRevenue) * 210)
                                            );
                                            return (
                                                <div
                                                    key={item.bucket}
                                                    className="flex min-w-[56px] flex-col items-center gap-3"
                                                >
                                                    <div
                                                        className={`w-full rounded-t-xl transition-all duration-700 ${
                                                            item.revenue === maxRevenue
                                                                ? 'bg-primary'
                                                                : 'bg-surface-container-highest'
                                                        }`}
                                                        style={{ height: `${height}px` }}
                                                        title={`${shortBucketLabel(item.bucket, data.range.groupBy)}: ${formatCurrency(item.revenue)}`}
                                                    />
                                                    <span
                                                        className={`text-xs ${
                                                            item.revenue === maxRevenue
                                                                ? 'font-bold text-on-surface'
                                                                : 'text-outline'
                                                        }`}
                                                    >
                                                        {shortBucketLabel(item.bucket, data.range.groupBy)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-[32px] bg-surface-container-lowest p-8 shadow-sm">
                                    <h3 className="text-2xl font-semibold">Đơn theo trạng thái</h3>
                                    <p className="mb-6 text-sm text-on-surface-variant">
                                        Tổng {data.orderStats.total} đơn trong kỳ
                                    </p>
                                    <div className="space-y-4">
                                        {data.orderStats.byStatus.map((item) => (
                                            <button
                                                key={item.status}
                                                type="button"
                                                onClick={() => {
                                                    setStatus(item.status);
                                                    loadDashboard({
                                                        preset,
                                                        groupBy,
                                                        status: item.status,
                                                        from: fromDate || undefined,
                                                        to: toDate || undefined
                                                    });
                                                }}
                                                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                                    status === item.status
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-outline-variant/30 hover:bg-surface-container-low'
                                                }`}
                                            >
                                                <div className="mb-2 flex items-center justify-between text-sm">
                                                    <span>{item.label}</span>
                                                    <span className="font-bold text-primary">{item.count}</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
                                                    <div
                                                        className="h-full rounded-full bg-primary"
                                                        style={{
                                                            width: `${Math.min(
                                                                100,
                                                                (item.count / Math.max(1, data.orderStats.total)) *
                                                                    100
                                                            )}%`
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[32px] bg-surface-container-lowest shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container px-8 py-6">
                                    <h3 className="text-2xl font-semibold">Đơn hàng mới nhất</h3>
                                    <div className="text-sm text-on-surface-variant">
                                        Đang xem trạng thái: <span className="font-semibold">{selectedStatusLabel}</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-surface-container-low/60">
                                                <th className="px-8 py-4 text-outline">Mã đơn</th>
                                                <th className="px-8 py-4 text-outline">Khách hàng</th>
                                                <th className="px-8 py-4 text-outline">Ngày đặt</th>
                                                <th className="px-8 py-4 text-outline">Trạng thái</th>
                                                <th className="px-8 py-4 text-right text-outline">Tổng tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-container">
                                            {topOrders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    className="transition-colors hover:bg-surface-container-low"
                                                >
                                                    <td className="px-8 py-5 font-semibold">
                                                        #{order.orderNumber}
                                                    </td>
                                                    <td className="px-8 py-5">{order.customerName}</td>
                                                    <td className="px-8 py-5 text-on-surface-variant">
                                                        {formatDate(order.placedAt)}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold">
                                                            {order.statusLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-bold">
                                                        {formatCurrency(order.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {topOrders.length === 0 && (
                                        <div className="p-8 text-center text-on-surface-variant">
                                            Không có đơn cho trạng thái: {selectedStatusLabel}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                                <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                                    <h3 className="mb-4 text-xl font-semibold">Quản lý dòng tiền</h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl bg-surface-container-low p-4">
                                            <p className="text-xs uppercase text-on-surface-variant">
                                                Đơn đang giao
                                            </p>
                                            <p className="mt-1 text-xl font-bold text-tertiary">
                                                {formatCurrency(data.cashflow.inTransitAmount)}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                {data.cashflow.inTransitOrders} đơn
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-surface-container-low p-4">
                                            <p className="text-xs uppercase text-on-surface-variant">
                                                Đơn đã giao (vào ví)
                                            </p>
                                            <p className="mt-1 text-xl font-bold text-primary">
                                                {formatCurrency(data.cashflow.settledAmount)}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                {data.cashflow.settledOrders} đơn
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm">
                                    <h3 className="mb-4 text-xl font-semibold">Top 10 sản phẩm bán chạy</h3>
                                    <div className="space-y-3">
                                        {data.topProducts.slice(0, 5).map((item) => (
                                            <div
                                                key={item.productId}
                                                className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        #{item.rank} {item.productName}
                                                    </p>
                                                    <p className="text-xs text-on-surface-variant">
                                                        {item.totalQuantity} sản phẩm • {item.orderCount} đơn
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-primary">
                                                    {formatCurrency(item.totalRevenue)}
                                                </p>
                                            </div>
                                        ))}
                                        {data.topProducts.length === 0 && (
                                            <p className="text-sm text-on-surface-variant">
                                                Chưa có dữ liệu sản phẩm trong khoảng thời gian này.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}

            {activeTab === 'category' && <CategoriesTab />}
            {activeTab === 'sell' && <PromotionsTab />}
            {activeTab === 'group' && <CustomersTab />}

            {activeTab !== 'dashboard' && activeTab !== 'category' && activeTab !== 'sell' && activeTab !== 'group' && (
                <div className="rounded-[32px] bg-surface-container-lowest p-8 shadow-sm text-center py-20">
                    <span className="material-symbols-outlined text-outline text-6xl mb-4 text-[#ff8b66]">construction</span>
                    <h3 className="text-2xl font-bold mb-2">Tính năng đang phát triển</h3>
                    <p className="text-on-surface-variant max-w-md mx-auto">
                        Chức năng quản lý này đang được thiết kế và xây dựng. Vui lòng quay lại sau!
                    </p>
                </div>
            )}
        </AdminLayout>
    );
}
