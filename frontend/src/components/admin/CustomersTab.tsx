import React, { useEffect, useState } from 'react';
import {
    fetchAdminUsers,
    fetchAdminUserDetail,
    updateAdminUserStatus,
    updateAdminUserRole,
    bulkUpdateAdminUserStatus,
    type AdminUser,
    type AdminUserDetail
} from '../../services/adminApi';
import { useNotification } from '../../context/NotificationContext';

export default function CustomersTab() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive, banned
    const [roleFilter, setRoleFilter] = useState('all'); // all, admin, customer, user

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { toast: globalToast, showConfirm } = useNotification();

    // Details Modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Role Edit Modal
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');
    const [savingRole, setSavingRole] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        if (type === 'success') {
            globalToast.success(message);
        } else {
            globalToast.error(message);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminUsers(
                page,
                limit,
                searchQuery,
                statusFilter === 'all' ? '' : statusFilter,
                roleFilter === 'all' ? '' : roleFilter
            );
            if (data) {
                setUsers(data.users || []);
                setTotalCount(data.pagination?.total || 0);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (err: any) {
            setError(err.message || 'Không thể kết nối đến máy chủ');
        } finally {
            setLoading(false);
        }
    };

    // Reload when page, limit, filter change (we debounce search in handler or load on submit/button click)
    useEffect(() => {
        loadUsers();
    }, [page, limit, statusFilter, roleFilter]);

    // Handle search submission
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadUsers();
    };

    // Reset filters
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setRoleFilter('all');
        setPage(1);
    };

    // Checkbox toggles
    const handleSelectToggle = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.length === users.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(users.map((u) => u.id));
        }
    };

    // Ban/Unban user status toggle
    const handleToggleStatus = async (user: AdminUser) => {
        if (user.role === 'admin' && user.status !== 'banned') {
            showToast('Không thể khóa tài khoản của Quản trị viên (Admin)', 'error');
            return;
        }

        const nextStatus = user.status === 'banned' ? 'active' : 'banned';
        const confirmDelete = await showConfirm({
            title: nextStatus === 'banned' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
            message: nextStatus === 'banned'
                ? `Bạn có chắc chắn muốn KHÓA tài khoản "${user.username}"? Người dùng này sẽ bị ngắt kết nối ngay lập tức.`
                : `Bạn có muốn MỞ KHÓA tài khoản "${user.username}"?`,
            type: nextStatus === 'banned' ? 'danger' : 'info',
            confirmText: nextStatus === 'banned' ? 'Khóa tài khoản' : 'Mở khóa'
        });

        if (!confirmDelete) return;

        try {
            await updateAdminUserStatus(user.id, nextStatus);
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
            );
            showToast(
                `Đã ${nextStatus === 'banned' ? 'khóa' : 'mở khóa'} tài khoản "${user.username}" thành công`,
                'success'
            );
        } catch (err: any) {
            showToast(err.message || 'Cập nhật trạng thái thất bại', 'error');
        }
    };

    // Open change role modal
    const handleOpenRoleModal = (user: AdminUser) => {
        setEditingUser(user);
        setNewRole(user.role);
        setShowRoleModal(true);
    };

    // Submit role change
    const handleSaveRole = async () => {
        if (!editingUser) return;
        setSavingRole(true);
        try {
            await updateAdminUserRole(editingUser.id, newRole);
            setUsers((prev) =>
                prev.map((u) => (u.id === editingUser.id ? { ...u, role: newRole } : u))
            );
            showToast(`Cập nhật vai trò người dùng "${editingUser.username}" thành công`, 'success');
            setShowRoleModal(false);
        } catch (err: any) {
            showToast(err.message || 'Cập nhật vai trò thất bại', 'error');
        } finally {
            setSavingRole(false);
        }
    };

    // Bulk status update
    const handleBulkStatusChange = async (status: 'active' | 'banned') => {
        if (selectedIds.length === 0) return;
        const confirmDelete = await showConfirm({
            title: status === 'banned' ? 'Khóa hàng loạt' : 'Mở khóa hàng loạt',
            message: status === 'banned'
                ? `Bạn có chắc chắn muốn KHÓA ${selectedIds.length} tài khoản đã chọn?`
                : `Bạn có chắc chắn muốn MỞ KHÓA ${selectedIds.length} tài khoản đã chọn?`,
            type: status === 'banned' ? 'danger' : 'info',
            confirmText: status === 'banned' ? 'Khóa tất cả' : 'Mở khóa'
        });

        if (!confirmDelete) return;

        try {
            const res = await bulkUpdateAdminUserStatus(selectedIds, status);
            const updatedCount = res.updatedCount || 0;
            const failedNames = res.failedNames || [];

            setUsers((prev) =>
                prev.map((u) => {
                    if (selectedIds.includes(u.id)) {
                        // Skip updating UI for admins who cannot be banned
                        if (u.role === 'admin' && status === 'banned') return u;
                        return { ...u, status };
                    }
                    return u;
                })
            );

            if (failedNames.length > 0) {
                showToast(
                    `Đã cập nhật ${updatedCount} tài khoản. Bỏ qua ${failedNames.length} tài khoản Admin: ${failedNames.join(', ')}`,
                    'error'
                );
            } else {
                showToast(`Đã cập nhật trạng thái thành công cho ${updatedCount} tài khoản`, 'success');
            }

            setSelectedIds([]);
        } catch (err: any) {
            showToast(err.message || 'Cập nhật hàng loạt thất bại', 'error');
        }
    };

    // View User Details
    const handleViewDetail = async (userId: number) => {
        setLoadingDetail(true);
        setSelectedUserDetail(null);
        setShowDetailModal(true);
        try {
            const res = await fetchAdminUserDetail(userId);
            if (res) {
                setSelectedUserDetail(res);
            }
        } catch (err: any) {
            showToast(err.message || 'Không thể tải chi tiết khách hàng', 'error');
            setShowDetailModal(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    // CSV Exporter (Excel support with UTF-8 BOM)
    const handleExportCSV = async () => {
        try {
            showToast('Đang tạo dữ liệu xuất...', 'success');
            // Query without limits to get all matching users (e.g. limit = 50000)
            const data = await fetchAdminUsers(
                1,
                50000,
                searchQuery,
                statusFilter === 'all' ? '' : statusFilter,
                roleFilter === 'all' ? '' : roleFilter
            );

            const exportList = data.users || [];
            if (exportList.length === 0) {
                showToast('Không có dữ liệu khách hàng để xuất!', 'error');
                return;
            }

            const headers = ['ID', 'MSSV', 'Tên đăng nhập', 'Họ tên', 'Email', 'Số điện thoại', 'Địa chỉ', 'Vai trò', 'Trạng thái', 'Điểm tích lũy', 'Ngày tham gia'];
            const rows = exportList.map(u => [
                u.id,
                u.studentId || '',
                u.username,
                u.fullName || '',
                u.email,
                u.phone || '',
                u.address || '',
                u.role,
                u.status,
                u.loyaltyPoints,
                new Date(u.createdAt).toLocaleDateString('vi-VN')
            ]);

            // Add UTF-8 BOM character (\uFEFF) at start of file content so Excel opens accents correctly
            const csvContent = '\uFEFF' + [
                headers.join(','),
                ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `danh_sach_khach_hang_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Xuất tệp CSV thành công!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Lỗi xuất dữ liệu', 'error');
        }
    };

    const formatCurrency = (val: number | null) => {
        if (val == null) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Quản lý khách hàng</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Xem hồ sơ, khóa tài khoản, phân quyền và kiểm tra lịch sử đặt hàng của thành viên.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex h-10 items-center rounded-xl border border-outline-variant/60 bg-surface px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined mr-2 text-[20px]">download</span>
                        Xuất CSV
                    </button>
                </div>
            </div>

            {/* Filter section */}
            <form onSubmit={handleSearchSubmit} className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/20">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
                    <div className="relative md:col-span-2">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="MSSV, Tên, Email, Số điện thoại..."
                            className="h-10 w-full rounded-xl border border-outline-variant/40 bg-surface pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Hoạt động (Active)</option>
                        <option value="inactive">Chưa kích hoạt (Inactive)</option>
                        <option value="banned">Bị khóa (Banned)</option>
                    </select>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm"
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                        <option value="customer">Khách hàng (Customer)</option>
                    </select>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 h-10 rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover active:scale-[0.98] transition"
                        >
                            Tìm kiếm
                        </button>
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="h-10 rounded-xl border border-outline-variant/50 px-3 text-sm font-semibold hover:bg-surface-container-high transition"
                            title="Làm mới bộ lọc"
                        >
                            <span className="material-symbols-outlined text-[20px] align-middle">restart_alt</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Loading / Error States */}
            {loading && (
                <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl bg-error-container p-6 text-on-error-container">
                    {error}
                </div>
            )}

            {/* Data Table */}
            {!loading && !error && (
                <div className="rounded-3xl bg-surface-container-lowest shadow-sm border border-outline-variant/15 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="bg-surface-container-low/50">
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={users.length > 0 && selectedIds.length === users.length}
                                            onChange={handleSelectAllToggle}
                                            className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-outline font-semibold">MSSV / Avatar</th>
                                    <th className="px-6 py-4 text-outline font-semibold">Họ tên & Tài khoản</th>
                                    <th className="px-6 py-4 text-outline font-semibold">Liên hệ</th>
                                    <th className="px-6 py-4 text-outline font-semibold">Điểm / Đơn hàng</th>
                                    <th className="px-6 py-4 text-outline font-semibold">Vai trò & Trạng thái</th>
                                    <th className="px-6 py-4 text-outline font-semibold text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/15">
                                {users.map((user) => {
                                    const isSelected = selectedIds.includes(user.id);
                                    const initial = user.fullName
                                        ? user.fullName.charAt(0).toUpperCase()
                                        : user.username.charAt(0).toUpperCase();

                                    return (
                                        <tr
                                            key={user.id}
                                            className={`transition-colors hover:bg-surface-container-low/30 ${
                                                user.status === 'banned' ? 'opacity-80 bg-surface-container-low/10' : ''
                                            }`}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectToggle(user.id)}
                                                    className="h-4.5 w-4.5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                                                        {initial}
                                                    </div>
                                                    <span className="font-mono text-xs text-on-surface-variant font-medium">
                                                        {user.studentId || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <h4 className="font-bold text-base text-on-surface">{user.fullName || 'Chưa cập nhật'}</h4>
                                                    <p className="text-xs text-outline mt-0.5 font-medium">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-semibold">{user.email}</p>
                                                    <p className="text-xs text-outline">{user.phone || 'Không có sđt'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-semibold text-tertiary">{user.loyaltyPoints} xu</p>
                                                    <p className="text-xs text-outline">{user.orderCount || 0} đơn hàng</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    {/* Role Badge */}
                                                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                        user.role === 'admin'
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    }`}>
                                                        {user.role === 'admin' ? 'Admin' : 'Khách hàng'}
                                                    </span>

                                                    {/* Status Badge */}
                                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                        user.status === 'active'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                            : user.status === 'banned'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300'
                                                    }`}>
                                                        {user.status === 'active'
                                                            ? 'Hoạt động'
                                                            : user.status === 'banned'
                                                            ? 'Bị khóa'
                                                            : 'Chưa kích hoạt'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewDetail(user.id)}
                                                        className="rounded-xl p-1.5 text-primary hover:bg-primary/10 transition"
                                                        title="Xem chi tiết khách hàng"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenRoleModal(user)}
                                                        className="rounded-xl p-1.5 text-tertiary hover:bg-tertiary/10 transition"
                                                        title="Đổi vai trò quyền hạn"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(user)}
                                                        disabled={user.role === 'admin'}
                                                        className={`rounded-xl p-1.5 transition ${
                                                            user.role === 'admin'
                                                                ? 'text-outline/30 cursor-not-allowed'
                                                                : user.status === 'banned'
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-error hover:bg-error/10'
                                                        }`}
                                                        title={
                                                            user.role === 'admin'
                                                                ? 'Không được phép khóa Admin'
                                                                : user.status === 'banned'
                                                                ? 'Mở khóa tài khoản'
                                                                : 'Khóa tài khoản'
                                                        }
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {user.status === 'banned' ? 'lock_open' : 'lock'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">
                                            Không tìm thấy thành viên nào khớp với bộ lọc.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination control */}
                    {totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/15 px-6 py-4 bg-surface-container-low/20">
                            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                                <span>Hiển thị</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="h-8 rounded-lg border border-outline-variant/40 bg-surface px-2 text-xs"
                                >
                                    <option value={10}>10 dòng</option>
                                    <option value={20}>20 dòng</option>
                                    <option value={50}>50 dòng</option>
                                </select>
                                <span>trên tổng số {totalCount} khách hàng</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/40 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const pageNum = idx + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            type="button"
                                            onClick={() => setPage(pageNum)}
                                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                                                page === pageNum
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'border border-outline-variant/30 hover:bg-surface-container-high'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/40 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bulk Action Bar (Floating) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-surface-container-high px-6 py-4 shadow-xl border border-outline-variant/40 animate-slide-up">
                    <span className="text-sm font-semibold text-primary">
                        Đã chọn {selectedIds.length} khách hàng
                    </span>
                    <div className="h-4 w-px bg-outline-variant" />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkStatusChange('banned')}
                            className="flex h-9 items-center rounded-xl bg-error px-4 text-xs font-bold text-on-error hover:bg-error/95"
                        >
                            <span className="material-symbols-outlined mr-1.5 text-[16px]">lock</span>
                            Khóa tài khoản
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkStatusChange('active')}
                            className="flex h-9 items-center rounded-xl bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary-hover"
                        >
                            <span className="material-symbols-outlined mr-1.5 text-[16px]">lock_open</span>
                            Mở khóa
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="flex h-9 items-center rounded-xl border border-outline-variant/50 bg-surface px-4 text-xs font-bold hover:bg-surface-container-high"
                        >
                            Hủy chọn
                        </button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-4xl rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/30 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setShowDetailModal(false)}
                            className="absolute right-4 top-4 rounded-full p-2 hover:bg-surface-container-high transition"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h3 className="text-xl font-bold mb-6">Hồ sơ chi tiết khách hàng</h3>

                        {loadingDetail ? (
                            <div className="flex justify-center py-20">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            </div>
                        ) : selectedUserDetail ? (
                            <div className="space-y-6">
                                {/* Section 1: General Info Card */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl bg-surface-container-low/40 p-5 border border-outline-variant/15">
                                    <div className="flex flex-col items-center justify-center text-center p-2 border-b md:border-b-0 md:border-r border-outline-variant/20">
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 font-black text-primary text-3xl mb-3">
                                            {selectedUserDetail.user.fullName
                                                ? selectedUserDetail.user.fullName.charAt(0).toUpperCase()
                                                : selectedUserDetail.user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <h4 className="text-lg font-bold">{selectedUserDetail.user.fullName || 'Chưa cập nhật'}</h4>
                                        <p className="text-sm text-outline font-medium">@{selectedUserDetail.user.username}</p>
                                    </div>

                                    <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm px-2">
                                        <div>
                                            <p className="text-outline font-semibold">MSSV / Mã sinh viên:</p>
                                            <p className="font-mono font-bold text-on-surface mt-0.5">
                                                {selectedUserDetail.user.studentId || 'Không cung cấp'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-outline font-semibold">Chuyên ngành học:</p>
                                            <p className="font-bold text-on-surface mt-0.5">
                                                {selectedUserDetail.user.major?.name || 'Chưa định nghĩa'} (Code: {selectedUserDetail.user.major?.code || 'GENERAL'})
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-outline font-semibold">Địa chỉ Email:</p>
                                            <p className="font-bold text-on-surface mt-0.5">{selectedUserDetail.user.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-outline font-semibold">Số điện thoại:</p>
                                            <p className="font-bold text-on-surface mt-0.5">{selectedUserDetail.user.phone || 'Chưa cập nhật'}</p>
                                        </div>
                                        <div>
                                            <p className="text-outline font-semibold">Điểm tích lũy (Loyalty):</p>
                                            <p className="font-bold text-tertiary mt-0.5">{selectedUserDetail.user.loyaltyPoints} xu</p>
                                        </div>
                                        <div>
                                            <p className="text-outline font-semibold">Ngày đăng ký tham gia:</p>
                                            <p className="font-bold text-on-surface mt-0.5">{formatDateTime(selectedUserDetail.user.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Addresses & Orders Tabs */}
                                <div className="space-y-4">
                                    <h4 className="text-base font-bold border-b border-outline-variant/20 pb-2">Danh sách địa chỉ nhận hàng</h4>
                                    {selectedUserDetail.user.addresses && selectedUserDetail.user.addresses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedUserDetail.user.addresses.map(addr => (
                                                <div key={addr.id} className={`p-4 rounded-xl border ${
                                                    addr.isDefault
                                                        ? 'border-primary/40 bg-primary/5'
                                                        : 'border-outline-variant/30'
                                                }`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-sm">{addr.receiverName}</span>
                                                        {addr.isDefault && (
                                                            <span className="rounded bg-primary/10 text-primary font-bold text-[9px] px-1.5 py-0.5 uppercase">
                                                                Mặc định
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-on-surface-variant font-medium">SĐT: {addr.receiverPhone}</p>
                                                    <p className="text-xs text-outline mt-1 leading-relaxed">
                                                        {addr.detailAddress}, {addr.ward}, {addr.district}, {addr.region}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-outline text-center py-4 bg-surface-container-low/10 rounded-xl">
                                            Khách hàng này chưa lưu địa chỉ nhận hàng nào.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-base font-bold border-b border-outline-variant/20 pb-2">10 Đơn hàng gần đây</h4>
                                    {selectedUserDetail.orders && selectedUserDetail.orders.length > 0 ? (
                                        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                                            <table className="min-w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-surface-container-low/40">
                                                        <th className="px-4 py-3 font-semibold text-outline">Mã đơn</th>
                                                        <th className="px-4 py-3 font-semibold text-outline">Ngày đặt</th>
                                                        <th className="px-4 py-3 font-semibold text-outline">Trạng thái</th>
                                                        <th className="px-4 py-3 font-semibold text-outline text-right">Tổng thanh toán</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-outline-variant/15">
                                                    {selectedUserDetail.orders.map(order => (
                                                        <tr key={order.id} className="hover:bg-surface-container-low/20">
                                                            <td className="px-4 py-2.5 font-bold">#{order.orderNumber}</td>
                                                            <td className="px-4 py-2.5">{formatDate(order.placedAt)}</td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold uppercase">
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-primary">
                                                                {formatCurrency(order.total)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-outline text-center py-6 bg-surface-container-low/10 rounded-xl">
                                            Chưa phát sinh lịch sử đặt hàng nào.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-outline py-20">Không tìm thấy thông tin chi tiết.</p>
                        )}

                        <div className="flex justify-end mt-6 pt-4 border-t border-outline-variant/20">
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                className="h-10 rounded-xl bg-surface-container-high px-6 text-sm font-semibold hover:bg-surface-container-highest transition active:scale-[0.98]"
                            >
                                Đóng lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Role Modal */}
            {showRoleModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/30 animate-scale-in">
                        <h3 className="text-lg font-bold mb-2">Đổi vai trò người dùng</h3>
                        <p className="text-xs text-outline mb-4">
                            Đang thay đổi vai trò cho tài khoản: <span className="font-bold text-on-surface">@{editingUser.username}</span>
                        </p>

                        <div className="space-y-4">
                            <label className="block text-sm font-semibold">Chọn vai trò quyền hạn mới:</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 rounded-xl border border-outline-variant/30 p-3 hover:bg-surface-container-low cursor-pointer">
                                    <input
                                        type="radio"
                                        name="user-role"
                                        checked={newRole === 'customer'}
                                        onChange={() => setNewRole('customer')}
                                        className="h-4 w-4 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-on-surface">Customer</p>
                                        <p className="text-xs text-outline">Quyền hạn của khách hàng mua sản phẩm.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-outline-variant/30 p-3 hover:bg-surface-container-low cursor-pointer">
                                    <input
                                        type="radio"
                                        name="user-role"
                                        checked={newRole === 'admin'}
                                        onChange={() => setNewRole('admin')}
                                        className="h-4 w-4 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-on-surface">Admin</p>
                                        <p className="text-xs text-outline">Toàn quyền quản lý hệ thống (CRUD, Khách hàng, Báo cáo).</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/20">
                            <button
                                type="button"
                                onClick={() => setShowRoleModal(false)}
                                className="h-10 rounded-xl bg-surface-container-high px-5 text-sm font-semibold hover:bg-surface-container-highest transition"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRole}
                                disabled={savingRole}
                                className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50"
                            >
                                {savingRole ? 'Đang lưu...' : 'Xác nhận đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
