import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import AdminPagination from '../components/admin/AdminPagination';
import {
    fetchAdminConsignments,
    updateAdminConsignment,
    deleteAdminConsignment
} from '../services/adminApi';
import type { Consignment } from '../types/consignment';
import { useNotification } from '../context/NotificationContext';

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED_SHIPPING: 'bg-blue-100 text-blue-800',
    RECEIVED: 'bg-cyan-100 text-cyan-800',
    ON_SALE: 'bg-green-100 text-green-800',
    SOLD: 'bg-emerald-100 text-emerald-800',
    COMPLETED: 'bg-teal-100 text-teal-800',
    RETURNED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-rose-100 text-rose-800'
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED_SHIPPING: 'Duyệt vận chuyển',
    RECEIVED: 'Đã nhận hàng',
    ON_SALE: 'Đang bán',
    SOLD: 'Đã bán',
    COMPLETED: 'Hoàn thành',
    RETURNED: 'Đã trả lại',
    REJECTED: 'Từ chối'
};

const CONDITION_LABELS: Record<string, string> = {
    new: 'Mới nguyên seal (New)',
    like_new: 'Như mới (Like new)',
    used: 'Đã qua sử dụng (Used)',
    refurbished: 'Tân trang (Refurbished)'
};

function formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
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

function getAvailableStatuses(currentStatus: string): string[] {
    switch (currentStatus) {
        case 'PENDING':
            return ['PENDING', 'APPROVED_SHIPPING', 'REJECTED'];
        case 'APPROVED_SHIPPING':
            return ['APPROVED_SHIPPING', 'RECEIVED', 'RETURNED'];
        case 'RECEIVED':
            return ['RECEIVED', 'ON_SALE', 'RETURNED'];
        case 'ON_SALE':
            return ['ON_SALE', 'SOLD', 'RETURNED'];
        case 'SOLD':
            return ['SOLD', 'COMPLETED', 'RETURNED'];
        default:
            return [currentStatus];
    }
}

export default function AdminConsignmentsPage() {
    const [consignments, setConsignments] = useState<Consignment[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { toast, showConfirm } = useNotification();

    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
    const [updating, setUpdating] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [approvedPrice, setApprovedPrice] = useState('');
    const [statusVal, setStatusVal] = useState('');

    const loadConsignments = useCallback(
        async (page = pagination.page) => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAdminConsignments({
                    page,
                    limit: pagination.limit,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    search: search || undefined
                });
                setConsignments(data.consignments);
                setPagination(data.pagination);
            } catch (err: any) {
                setError(err.message || 'Không thể tải danh sách ký gửi');
            } finally {
                setLoading(false);
            }
        },
        [pagination.limit, pagination.page, search, statusFilter]
    );

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
        loadConsignments(1);
    }, [statusFilter, search]);

    const openDetail = (item: Consignment) => {
        setSelectedConsignment(item);
        setAdminNote(item.adminNote || '');
        setApprovedPrice(
            item.approvedPrice !== null && item.approvedPrice !== undefined
                ? String(item.approvedPrice)
                : String(item.suggestedPrice)
        );
        setStatusVal(item.status);
    };

    const closeDetail = () => {
        setSelectedConsignment(null);
        setAdminNote('');
        setApprovedPrice('');
        setStatusVal('');
    };

    const handleUpdate = async () => {
        if (!selectedConsignment) return;
        setUpdating(true);
        try {
            const priceNum = approvedPrice ? Number(approvedPrice) : undefined;
            if (priceNum !== undefined && (Number.isNaN(priceNum) || priceNum < 0)) {
                toast.error('Giá duyệt bán không hợp lệ');
                setUpdating(false);
                return;
            }

            const updated = await updateAdminConsignment(selectedConsignment.id, {
                status: statusVal,
                adminNote: adminNote.trim() || undefined,
                approvedPrice: priceNum
            });

            // Update in place
            setConsignments((prev) =>
                prev.map((c) => (c.id === selectedConsignment.id ? updated : c))
            );
            setSelectedConsignment(updated);
            toast.success('Cập nhật yêu cầu ký gửi thành công');
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi cập nhật yêu cầu ký gửi');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedConsignment) return;
        const confirmDelete = await showConfirm({
            title: 'Xóa yêu cầu ký gửi',
            message: 'Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu ký gửi này?',
            type: 'danger',
            confirmText: 'Xóa yêu cầu'
        });
        if (!confirmDelete) return;

        setUpdating(true);
        try {
            await deleteAdminConsignment(selectedConsignment.id);
            setConsignments((prev) => prev.filter((c) => c.id !== selectedConsignment.id));
            closeDetail();
            toast.success('Xóa yêu cầu ký gửi thành công');
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi xóa yêu cầu ký gửi');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <AdminLayout
            title="Quản lý ký gửi"
            subtitle="Duyệt yêu cầu ký gửi đồ cũ, thiết bị học tập của sinh viên theo hướng bán được mới nhận tiền."
        >
            {/* Filters & Search */}
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
                        Tất cả
                    </button>
                    {Object.keys(STATUS_LABELS).map((statusKey) => (
                        <button
                            key={statusKey}
                            type="button"
                            onClick={() => setStatusFilter(statusKey)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                statusFilter === statusKey
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                            {STATUS_LABELS[statusKey]}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã ký gửi, tên sản phẩm, thông tin khách hàng..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
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

                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('');
                            setSearch('');
                            setStatusFilter('all');
                        }}
                        className="h-10 rounded-xl border border-outline-variant/50 px-5 text-sm font-semibold hover:bg-surface-container-low transition shrink-0"
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
                <div className="rounded-[24px] bg-error-container p-6 text-on-error-container">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <section className="rounded-[32px] bg-surface-container-lowest shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="bg-surface-container-low/60">
                                    <th className="px-6 py-4 text-outline">Mã KG</th>
                                    <th className="px-6 py-4 text-outline">Khách hàng</th>
                                    <th className="px-6 py-4 text-outline">Tên sản phẩm</th>
                                    <th className="px-6 py-4 text-outline">Giá đề xuất</th>
                                    <th className="px-6 py-4 text-outline">Giá duyệt bán</th>
                                    <th className="px-6 py-4 text-outline">Trạng thái</th>
                                    <th className="px-6 py-4 text-outline">Ngày tạo</th>
                                    <th className="px-6 py-4 text-outline">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {consignments.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-surface-container-low"
                                    >
                                        <td className="px-6 py-4 font-semibold">#{item.id}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-on-surface">
                                                {item.user?.fullName || item.user?.username || '—'}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                {item.user?.email || '—'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-on-surface max-w-xs truncate">
                                            {item.title}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-on-surface">
                                            {formatCurrency(item.suggestedPrice)}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {item.approvedPrice ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-emerald-600">{formatCurrency(item.approvedPrice)}</span>
                                                    <span className="text-[10px] text-on-surface-variant">
                                                        Phí sàn (10%): {formatCurrency(item.consignmentFee || item.approvedPrice * 0.1)}
                                                    </span>
                                                    <span className="text-[10px] text-primary font-bold">
                                                        Thực nhận (90%): {formatCurrency(item.receiveAmount || item.approvedPrice * 0.9)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-outline">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                                                    STATUS_STYLES[item.status] || ''
                                                }`}
                                            >
                                                {STATUS_LABELS[item.status] || item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">
                                            {formatDate(item.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => openDetail(item)}
                                                className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-primary/10 hover:text-primary active:scale-95"
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {consignments.length === 0 && (
                            <div className="p-10 text-center text-on-surface-variant">
                                Không tìm thấy yêu cầu ký gửi nào.
                            </div>
                        )}
                    </div>

                    <AdminPagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        itemLabel="yêu cầu"
                        onPageChange={loadConsignments}
                    />
                </section>
            )}

            {/* Consignment Detail & Approval Modal */}
            {selectedConsignment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
                    <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-surface-container-lowest shadow-xl my-8">
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-container bg-surface-container-lowest px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold">
                                    Chi tiết yêu cầu ký gửi #{selectedConsignment.id}
                                </h3>
                                <p className="text-xs text-on-surface-variant">
                                    Khởi tạo ngày {formatDate(selectedConsignment.createdAt)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="rounded-full p-2 hover:bg-surface-container-low transition"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-6 p-6">
                            {/* Process Timeline */}
                            {!['REJECTED', 'RETURNED'].includes(selectedConsignment.status) && (
                                <div className="rounded-2xl bg-surface-container-low p-5">
                                    <p className="text-xs uppercase text-on-surface-variant mb-4 font-bold">Quy trình ký gửi</p>
                                    <div className="flex items-center justify-between relative px-2">
                                        {/* Progress Line */}
                                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-surface-container-high z-0" />
                                        
                                        {/* Active Progress Line */}
                                        <div 
                                            className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-primary transition-all duration-300 z-0"
                                            style={{
                                                width: `${
                                                    Math.max(0, ['PENDING', 'APPROVED_SHIPPING', 'RECEIVED', 'ON_SALE', 'SOLD', 'COMPLETED'].indexOf(statusVal)) * 20
                                                }%`
                                            }}
                                        />

                                        {['PENDING', 'APPROVED_SHIPPING', 'RECEIVED', 'ON_SALE', 'SOLD', 'COMPLETED'].map((step, idx) => {
                                            const stepIdx = ['PENDING', 'APPROVED_SHIPPING', 'RECEIVED', 'ON_SALE', 'SOLD', 'COMPLETED'].indexOf(statusVal);
                                            const isDone = idx < stepIdx;
                                            const isActive = idx === stepIdx;
                                            return (
                                                <div key={step} className="flex flex-col items-center z-10 relative">
                                                    <div 
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                            isDone 
                                                                ? 'bg-primary text-on-primary'
                                                                : isActive
                                                                    ? 'bg-primary/20 text-primary ring-2 ring-primary'
                                                                    : 'bg-surface-container-high text-on-surface-variant'
                                                        }`}
                                                    >
                                                        {isDone ? (
                                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] mt-1.5 font-semibold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                                                        {STATUS_LABELS[step]}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Rejected or Returned State */}
                            {['REJECTED', 'RETURNED'].includes(selectedConsignment.status) && (
                                <div className={`rounded-2xl p-5 flex items-center gap-3 ${
                                    selectedConsignment.status === 'REJECTED' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'
                                }`}>
                                    <span className="material-symbols-outlined text-[32px]">
                                        {selectedConsignment.status === 'REJECTED' ? 'cancel' : 'assignment_return'}
                                    </span>
                                    <div>
                                        <p className="font-bold text-sm">
                                            Yêu cầu ký gửi này đã {selectedConsignment.status === 'REJECTED' ? 'bị từ chối' : 'được trả lại cho khách hàng'}.
                                        </p>
                                        <p className="text-xs opacity-80 mt-0.5">
                                            Đây là trạng thái cuối cùng và không thể thực hiện thêm quy trình duyệt nào.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {/* Images Gallery */}
                            {selectedConsignment.images && selectedConsignment.images.length > 0 && (
                                <div className="rounded-2xl bg-surface-container-low p-4">
                                    <p className="text-xs uppercase text-on-surface-variant mb-2">Hình ảnh sản phẩm</p>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {selectedConsignment.images.map((img) => (
                                            <div
                                                key={img.id}
                                                className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest"
                                            >
                                                <img
                                                    src={img.url}
                                                    alt="Ký gửi"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/PremiumLaptop.png';
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Two-column details */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="rounded-2xl bg-surface-container-low p-4 space-y-2.5">
                                    <p className="text-xs uppercase text-on-surface-variant">Thông tin sản phẩm</p>
                                    <p className="font-semibold text-base">{selectedConsignment.title}</p>
                                    {selectedConsignment.description && (
                                        <p className="text-sm text-on-surface-variant leading-relaxed">
                                            {selectedConsignment.description}
                                        </p>
                                    )}
                                    <hr className="border-outline-variant/20 my-2" />
                                    <div className="text-xs space-y-1.5 text-on-surface-variant">
                                        <p>
                                            Danh mục:{' '}
                                            <strong className="text-on-surface">
                                                {selectedConsignment.category?.name || '—'}
                                            </strong>
                                        </p>
                                        <p>
                                            Tình trạng:{' '}
                                            <strong className="text-on-surface">
                                                {CONDITION_LABELS[selectedConsignment.condition] ||
                                                    selectedConsignment.condition}
                                            </strong>
                                        </p>
                                        <p>
                                            Giá đề xuất:{' '}
                                            <strong className="text-on-surface">
                                                {formatCurrency(selectedConsignment.suggestedPrice)}
                                            </strong>
                                        </p>
                                        {selectedConsignment.approvedPrice ? (
                                            <>
                                                <p>
                                                    Giá duyệt bán:{' '}
                                                    <strong className="text-emerald-600 font-bold text-sm">
                                                        {formatCurrency(selectedConsignment.approvedPrice)}
                                                    </strong>
                                                </p>
                                                <p>
                                                    Phí sàn (10%):{' '}
                                                    <strong className="text-on-surface font-semibold">
                                                        {formatCurrency(selectedConsignment.consignmentFee || selectedConsignment.approvedPrice * 0.1)}
                                                    </strong>
                                                </p>
                                                <p>
                                                    Thực nhận (90%):{' '}
                                                    <strong className="text-primary font-bold">
                                                        {formatCurrency(selectedConsignment.receiveAmount || selectedConsignment.approvedPrice * 0.9)}
                                                    </strong>
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p>
                                                    Phí sàn ước tính (10%):{' '}
                                                    <strong className="text-on-surface font-medium">
                                                        {formatCurrency(selectedConsignment.suggestedPrice * 0.1)}
                                                    </strong>
                                                </p>
                                                <p>
                                                    Thực nhận ước tính (90%):{' '}
                                                    <strong className="text-primary font-bold">
                                                        {formatCurrency(selectedConsignment.suggestedPrice * 0.9)}
                                                    </strong>
                                                </p>
                                            </>
                                        )}
                                        {selectedConsignment.product && (
                                            <p className="mt-1">
                                                Sản phẩm liên kết:{' '}
                                                <a
                                                    href={`/products/${selectedConsignment.product.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline font-semibold"
                                                >
                                                    {selectedConsignment.product.name} ({selectedConsignment.product.status})
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-surface-container-low p-4 space-y-2.5">
                                    <p className="text-xs uppercase text-on-surface-variant">Thông tin người gửi</p>
                                    <p className="font-semibold text-base">
                                        {selectedConsignment.user?.fullName || selectedConsignment.user?.username || '—'}
                                    </p>
                                    <div className="text-xs space-y-1.5 text-on-surface-variant">
                                        <p>
                                            Tên tài khoản:{' '}
                                            <strong className="text-on-surface">
                                                {selectedConsignment.user?.username || '—'}
                                            </strong>
                                        </p>
                                        <p>
                                            Email:{' '}
                                            <strong className="text-on-surface">
                                                {selectedConsignment.user?.email || '—'}
                                            </strong>
                                        </p>
                                        <p>
                                            SĐT liên kết:{' '}
                                            <strong className="text-on-surface">
                                                {selectedConsignment.user?.phone || '—'}
                                            </strong>
                                        </p>
                                        {selectedConsignment.contactPhone && (
                                            <p>
                                                SĐT liên hệ ký gửi:{' '}
                                                <strong className="text-primary font-bold">
                                                    {selectedConsignment.contactPhone}
                                                </strong>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Approval Form */}
                            <div className="rounded-2xl border border-outline-variant/30 p-5 space-y-4 bg-surface-container-low/40">
                                <h4 className="font-bold text-sm">Duyệt & Cập nhật trạng thái ký gửi</h4>

                                {/* Dynamic Action Buttons */}
                                {!['COMPLETED', 'RETURNED', 'REJECTED'].includes(selectedConsignment.status) && (
                                    <div className="rounded-xl bg-surface p-4 border border-outline-variant/20 space-y-2">
                                        <p className="text-xs font-bold text-on-surface-variant">Hành động khả dụng cho bước tiếp theo:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {getAvailableStatuses(selectedConsignment.status)
                                                .filter((status) => status !== selectedConsignment.status)
                                                .map((status) => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        onClick={() => setStatusVal(status)}
                                                        className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-95 border ${
                                                            statusVal === status
                                                                ? 'bg-primary text-on-primary border-primary shadow-sm'
                                                                : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/30'
                                                        }`}
                                                    >
                                                        {status === 'APPROVED_SHIPPING' && 'Duyệt vận chuyển'}
                                                        {status === 'RECEIVED' && 'Đã nhận hàng'}
                                                        {status === 'ON_SALE' && 'Đăng bán lên Store'}
                                                        {status === 'SOLD' && 'Đánh dấu đã bán'}
                                                        {status === 'COMPLETED' && 'Hoàn thành ký gửi'}
                                                        {status === 'REJECTED' && 'Từ chối ký gửi'}
                                                        {status === 'RETURNED' && 'Hủy & Trả lại sản phẩm'}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-on-surface-variant">
                                            Trạng thái ký gửi
                                        </label>
                                        <select
                                            value={statusVal}
                                            onChange={(e) => setStatusVal(e.target.value)}
                                            disabled={['COMPLETED', 'RETURNED', 'REJECTED'].includes(selectedConsignment.status)}
                                            className="h-12 w-full rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-75 disabled:bg-surface-container"
                                        >
                                            {getAvailableStatuses(selectedConsignment.status).map((key) => (
                                                <option key={key} value={key}>
                                                    {STATUS_LABELS[key]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-on-surface-variant">
                                            Giá duyệt bán (approvedPrice)
                                        </label>
                                        <input
                                            type="number"
                                            value={approvedPrice}
                                            onChange={(e) => setApprovedPrice(e.target.value)}
                                            placeholder="Nhập giá duyệt bán chính thức"
                                            className="h-12 w-full rounded-xl border border-outline-variant/40 bg-surface px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        <p className="mt-1 text-[10px] text-on-surface-variant/80 italic">
                                            * Mặc định là giá người bán đăng ký: {formatCurrency(selectedConsignment.suggestedPrice)}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-on-surface-variant">
                                        Phản hồi cho khách hàng (Ghi chú nội dung của Admin)
                                    </label>
                                    <textarea
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        rows={3}
                                        placeholder="Nhập phản hồi từ chối hoặc hướng dẫn thanh toán gửi người gửi..."
                                        className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={updating}
                                        className="h-12 rounded-xl border border-error/30 text-error px-5 text-sm font-semibold hover:bg-red-50 transition active:scale-95 disabled:opacity-50"
                                    >
                                        Xóa yêu cầu
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={closeDetail}
                                            disabled={updating}
                                            className="h-12 rounded-xl bg-surface-container px-6 text-sm font-semibold text-on-surface transition active:scale-95 disabled:opacity-50"
                                        >
                                            Hủy bỏ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleUpdate}
                                            disabled={updating}
                                            className="h-12 rounded-xl bg-primary px-8 text-sm font-bold text-on-primary hover:shadow-lg transition active:scale-95 disabled:opacity-50"
                                        >
                                            {updating ? 'Đang cập nhật...' : 'Cập nhật và Lưu'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
