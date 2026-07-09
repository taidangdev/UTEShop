import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyConsignments, deleteConsignment } from '../services/consignmentApi';
import type { Consignment } from '../types/consignment';
import ConsignmentModal from '../components/profile/ConsignmentModal';
import { useNotification } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';

const TABS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'PENDING', label: 'Chờ duyệt' },
    { id: 'APPROVED_SHIPPING', label: 'Đã duyệt VC' },
    { id: 'RECEIVED', label: 'Đã nhận hàng' },
    { id: 'ON_SALE', label: 'Đang bán' },
    { id: 'SOLD', label: 'Đã bán' },
    { id: 'COMPLETED', label: 'Bán thành công' },
    { id: 'RETURNED', label: 'Đã trả lại' },
    { id: 'REJECTED', label: 'Bị từ chối' }
];

const CONSIGNMENT_STATUS_UI: Record<string, { label: string; bgClass: string; textClass: string }> = {
    PENDING: {
        label: 'Chờ duyệt',
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-800'
    },
    APPROVED_SHIPPING: {
        label: 'Đã duyệt VC',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-800'
    },
    RECEIVED: {
        label: 'Đã nhận hàng',
        bgClass: 'bg-cyan-100',
        textClass: 'text-cyan-800'
    },
    ON_SALE: {
        label: 'Đang bán',
        bgClass: 'bg-green-100',
        textClass: 'text-green-800'
    },
    SOLD: {
        label: 'Đã bán',
        bgClass: 'bg-emerald-100',
        textClass: 'text-emerald-800'
    },
    COMPLETED: {
        label: 'Bán thành công',
        bgClass: 'bg-teal-100',
        textClass: 'text-teal-800'
    },
    RETURNED: {
        label: 'Đã nhận lại',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-800'
    },
    REJECTED: {
        label: 'Bị từ chối',
        bgClass: 'bg-rose-100',
        textClass: 'text-rose-800'
    }
};

const CONDITION_LABELS: Record<string, string> = {
    new: 'Mới nguyên seal (New)',
    like_new: 'Như mới (Like new)',
    used: 'Đã qua sử dụng (Used)',
    refurbished: 'Tân trang (Refurbished)'
};

const formatPrice = (value: any) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '0 VNĐ';
    return `${new Intl.NumberFormat('vi-VN').format(num)} VNĐ`;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function ConsignmentPage() {

    const [consignments, setConsignments] = useState<Consignment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);

    const { toast, showConfirm } = useNotification();
    const { socket } = useSocket();

    const loadConsignments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchMyConsignments();
            setConsignments(data.consignments || []);
        } catch {
            setError('Không thể tải lịch sử ký gửi');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadConsignments();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification: any) => {
            if (notification.type === 'consignment_status_update') {
                loadConsignments();
            }
        };

        socket.on('new_notification', handleNewNotification);
        return () => {
            socket.off('new_notification', handleNewNotification);
        };
    }, [socket]);

    const handleDelete = async (id: number) => {
        const confirmDelete = await showConfirm({
            title: 'Xóa yêu cầu ký gửi',
            message: 'Bạn có chắc chắn muốn xóa yêu cầu ký gửi này?',
            type: 'warning',
            confirmText: 'Xóa yêu cầu'
        });
        if (!confirmDelete) return;

        try {
            await deleteConsignment(id);
            toast.success('Xóa yêu cầu ký gửi thành công');
            loadConsignments();
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa yêu cầu ký gửi');
        }
    };

    // Filter and search logic
    const filteredConsignments = useMemo(() => {
        return consignments.filter((item) => {
            // 1. Filter by status tab
            if (activeTab !== 'all' && item.status !== activeTab) {
                return false;
            }

            // 2. Filter by search query (match id, title, or category name)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchId = String(item.id).includes(query);
                const matchTitle = item.title.toLowerCase().includes(query);
                const matchCategory = item.category?.name.toLowerCase().includes(query) || false;
                return matchId || matchTitle || matchCategory;
            }

            return true;
        });
    }, [consignments, activeTab, searchQuery]);

    return (
        <div className="min-h-screen bg-surface py-10 text-on-surface antialiased">
            <main className="mx-auto max-w-[1024px] px-6">
                {/* Header & Back breadcrumb */}
                <div className="mb-6 flex items-center gap-2 text-sm text-on-surface-variant">
                    <Link to="/" className="hover:text-primary transition">
                        Trang chủ
                    </Link>
                    <span className="material-symbols-outlined text-[16px]">
                        chevron_right
                    </span>
                    <span className="font-medium text-on-surface">Quản lý ký gửi</span>
                </div>

                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
                            Danh sách sản phẩm ký gửi
                        </h1>
                        <p className="mt-1 text-sm text-on-surface-variant">
                            Bán hàng không cần lo lắng — chỉ nhận tiền khi sản phẩm được bán thành công
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedConsignment(null);
                            setModalOpen(true);
                        }}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-on-primary transition active:scale-95 hover:shadow-lg self-start sm:self-auto"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            add
                        </span>
                        Tạo yêu cầu ký gửi
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                    {/* Search bar */}
                    <div className="relative w-full sm:w-80">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm tiêu đề hoặc mã ký gửi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 w-full rounded-full bg-surface-container-low pl-12 pr-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                        />
                    </div>
                </div>

                {/* Status Tabs Navigation */}
                <div className="mb-8 overflow-x-auto border-b border-outline-variant/30">
                    <div className="flex min-w-max gap-2 pb-px">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-4 py-4 text-sm font-semibold transition-all ${
                                        isActive
                                            ? 'text-primary'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Consignments List Content */}
                <div className="space-y-4">
                    {isLoading && (
                        <div className="flex justify-center py-20">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        </div>
                    )}

                    {!isLoading && error && (
                        <div className="rounded-2xl bg-error-container p-6 text-center text-on-error-container">
                            <p>{error}</p>
                            <button
                                type="button"
                                onClick={loadConsignments}
                                className="mt-4 rounded-full bg-error px-6 py-2 text-xs font-semibold text-on-error"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && filteredConsignments.length === 0 && (
                        <div className="rounded-[28px] border border-dashed border-outline-variant p-16 text-center">
                            <span className="material-symbols-outlined text-[48px] text-outline">
                                storefront
                            </span>
                            <p className="mt-4 text-base font-medium text-on-surface-variant">
                                Không tìm thấy yêu cầu ký gửi nào phù hợp.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedConsignment(null);
                                    setModalOpen(true);
                                }}
                                className="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-on-primary transition active:scale-95 hover:shadow-md"
                            >
                                Tạo yêu cầu ký gửi đầu tiên
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && filteredConsignments.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {filteredConsignments.map((item) => {
                                const ui = CONSIGNMENT_STATUS_UI[item.status] || {
                                    label: item.status,
                                    bgClass: 'bg-gray-100',
                                    textClass: 'text-gray-800'
                                };
                                const primaryImage = item.images?.[0]?.url || '/PremiumLaptop.png';
                                const isPending = item.status === 'PENDING';

                                return (
                                    <div
                                        key={item.id}
                                        className="soft-shadow rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest p-6 transition-all hover:border-primary/20"
                                    >
                                        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                                            {/* Left Column: Image & Details */}
                                            <div className="flex min-w-0 flex-1 gap-4">
                                                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-container-high border border-outline-variant/20">
                                                    <img
                                                        src={primaryImage}
                                                        alt={item.title}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = '/PremiumLaptop.png';
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`inline-block whitespace-nowrap rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ui.bgClass} ${ui.textClass}`}
                                                        >
                                                            {ui.label}
                                                        </span>
                                                        <span className="text-xs text-on-surface-variant font-medium">
                                                            Mã ký gửi #{item.id}
                                                        </span>
                                                        <span className="text-[10px] text-outline">
                                                            • Ngày tạo: {formatDate(item.createdAt)}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-base font-bold text-on-surface">
                                                        {item.title}
                                                    </h3>
                                                    {item.description && (
                                                        <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-on-surface-variant">
                                                        {item.category && (
                                                            <span>Danh mục: <strong className="text-on-surface">{item.category.name}</strong></span>
                                                        )}
                                                        <span>Tình trạng: <strong className="text-on-surface">{CONDITION_LABELS[item.condition] || item.condition}</strong></span>
                                                        {item.contactPhone && (
                                                            <span>Liên hệ: <strong className="text-on-surface">{item.contactPhone}</strong></span>
                                                        )}
                                                        {item.product && (
                                                            <span>
                                                                Sản phẩm: <a
                                                                    href={`/products/${item.product.slug}`}
                                                                    className="text-primary hover:underline font-semibold"
                                                                >
                                                                    {item.product.name}
                                                                </a>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.adminNote && (
                                                        <div className="mt-3 rounded-2xl bg-surface-container-low p-4 text-xs text-on-surface-variant border-l-4 border-primary/60">
                                                            <strong>Phản hồi từ Admin:</strong> {item.adminNote}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Column: Suggested Prices & Action buttons */}
                                            <div className="flex flex-row items-center justify-between border-t border-outline-variant/30 pt-4 md:flex-col md:items-end md:justify-start md:border-none md:pt-0 gap-4 shrink-0">
                                                <div className="text-right font-medium">
                                                    <span className="text-xs text-on-surface-variant block">Giá đề xuất</span>
                                                    <span className="text-2xl font-bold text-primary">
                                                        {formatPrice(item.suggestedPrice)}
                                                    </span>
                                                    {item.approvedPrice ? (
                                                        <div className="mt-2 space-y-0.5 text-right">
                                                            <div>
                                                                <span className="text-[10px] text-on-surface-variant">Giá duyệt bán: </span>
                                                                <strong className="text-sm font-bold text-emerald-600">
                                                                    {formatPrice(item.approvedPrice)}
                                                                </strong>
                                                            </div>
                                                            <div className="text-[10px] text-on-surface-variant">
                                                                Phí sàn (10%): <strong className="text-on-surface">{formatPrice(item.consignmentFee)}</strong>
                                                            </div>
                                                            <div className="text-[10px] text-on-surface-variant">
                                                                Thực nhận (90%): <strong className="text-primary font-bold">{formatPrice(item.receiveAmount)}</strong>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-[10px] text-on-surface-variant text-right space-y-0.5">
                                                            <div>
                                                                Phí sàn ước tính (10%): <strong>{formatPrice(item.suggestedPrice * 0.1)}</strong>
                                                            </div>
                                                            <div>
                                                                Thực nhận ước tính (90%): <strong className="text-primary/80">{formatPrice(item.suggestedPrice * 0.9)}</strong>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 flex-wrap justify-end">
                                                    {isPending ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedConsignment(item);
                                                                    setModalOpen(true);
                                                                }}
                                                                className="flex h-10 items-center justify-center rounded-full bg-surface-container-high px-4 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-highest active:scale-95"
                                                            >
                                                                Chỉnh sửa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(item.id)}
                                                                className="flex h-10 items-center justify-center rounded-full bg-red-50 border border-red-200 px-4 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                                                            >
                                                                Xóa
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span
                                                            className="text-xs text-outline italic self-center px-2"
                                                            title="Chỉ có sửa/xóa đối với yêu cầu ký gửi chưa duyệt"
                                                        >
                                                            Đã duyệt (Không thể sửa)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <ConsignmentModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadConsignments}
                consignment={selectedConsignment}
            />
        </div>
    );
}
