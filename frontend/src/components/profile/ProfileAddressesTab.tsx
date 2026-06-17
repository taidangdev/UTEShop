import { useEffect, useState } from 'react';
import {
    fetchMyAddresses,
    createUserAddress,
    setDefaultAddress,
    deleteUserAddress
} from '../../services/addressApi';
import type { UserAddress, UserAddressPayload } from '../../types/address';
import { useNotification } from '../../context/NotificationContext';

const inputClass =
    'h-12 w-full rounded-lg border border-outline-variant bg-white px-4 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary text-sm';

export default function ProfileAddressesTab() {
    const [addresses, setAddresses] = useState<UserAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null); // tracks id of setting default or deleting
    const [showAddForm, setShowAddForm] = useState(false);

    const { toast, showConfirm } = useNotification();

    // Form states
    const [recipientName, setRecipientName] = useState('');
    const [phone, setPhone] = useState('');
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [ward, setWard] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [label, setLabel] = useState<'home' | 'campus' | 'work' | 'other'>('home');
    const [formError, setFormError] = useState<string | null>(null);
    const [formSubmitting, setFormSubmitting] = useState(false);

    const loadAddresses = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchMyAddresses();
            setAddresses(list);
        } catch {
            setError('Không thể tải danh sách địa chỉ. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAddresses();
    }, []);

    const handleSetDefault = async (id: number) => {
        setActionLoading(id);
        try {
            await setDefaultAddress(id);
            toast.success('Thiết lập địa chỉ mặc định thành công.');
            // Refresh address list
            const list = await fetchMyAddresses();
            setAddresses(list);
        } catch {
            toast.error('Không thể thiết lập địa chỉ mặc định.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmDelete = await showConfirm({
            title: 'Xóa địa chỉ',
            message: 'Bạn có chắc chắn muốn xóa địa chỉ này?',
            type: 'warning',
            confirmText: 'Xóa địa chỉ'
        });
        if (!confirmDelete) return;

        setActionLoading(id);
        try {
            await deleteUserAddress(id);
            toast.success('Xóa địa chỉ thành công.');
            // Refresh list
            const list = await fetchMyAddresses();
            setAddresses(list);
        } catch {
            toast.error('Không thể xóa địa chỉ.');
        } finally {
            setActionLoading(null);
        }
    };

    const resetForm = () => {
        setRecipientName('');
        setPhone('');
        setLine1('');
        setLine2('');
        setWard('');
        setDistrict('');
        setCity('');
        setIsDefault(false);
        setLabel('home');
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!recipientName.trim()) return setFormError('Họ và tên người nhận là bắt buộc');
        if (!phone.trim()) return setFormError('Số điện thoại là bắt buộc');
        if (!line1.trim()) return setFormError('Địa chỉ chi tiết là bắt buộc');
        if (!city.trim()) return setFormError('Thành phố là bắt buộc');

        setFormSubmitting(true);
        try {
            const payload: UserAddressPayload = {
                recipientName: recipientName.trim(),
                phone: phone.trim(),
                line1: line1.trim(),
                line2: line2.trim() || undefined,
                ward: ward.trim() || undefined,
                district: district.trim() || undefined,
                city: city.trim(),
                isDefault,
                label
            };
            await createUserAddress(payload);
            resetForm();
            setShowAddForm(false);
            // Reload addresses
            const list = await fetchMyAddresses();
            setAddresses(list);
        } catch (err: any) {
            setFormError(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo địa chỉ.');
        } finally {
            setFormSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-on-surface">Sổ địa chỉ của tôi</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                        Quản lý các địa chỉ nhận hàng để thanh toán nhanh hơn.
                    </p>
                </div>
                {!showAddForm && (
                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            setShowAddForm(true);
                        }}
                        className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:shadow transition-all hover:bg-primary/95 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Thêm địa chỉ mới
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error">
                    {error}
                </div>
            )}

            {showAddForm ? (
                <div className="rounded-[24px] bg-surface-container-lowest p-6 shadow-sm border border-outline-variant/30">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-on-surface">Thêm địa chỉ giao hàng</h3>
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    {formError && (
                        <div className="mb-4 rounded-xl bg-error-container/80 px-4 py-3 text-sm text-on-error-container">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Họ và tên người nhận
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Số điện thoại nhận hàng
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Ví dụ: 0912345678"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                Địa chỉ chi tiết (Số nhà, Tên đường, Tòa nhà)
                            </label>
                            <input
                                type="text"
                                required
                                value={line1}
                                onChange={(e) => setLine1(e.target.value)}
                                placeholder="Ví dụ: 123 Đường Lê Lợi hoặc Phòng 402, Tòa nhà A"
                                className={inputClass}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Thành phố
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="Ví dụ: TP. Hồ Chí Minh"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Quận / Huyện
                                </label>
                                <input
                                    type="text"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    placeholder="Ví dụ: Quận 1 (Tùy chọn)"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Phường / Xã
                                </label>
                                <input
                                    type="text"
                                    value={ward}
                                    onChange={(e) => setWard(e.target.value)}
                                    placeholder="Ví dụ: Phường Bến Nghé (Tùy chọn)"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Mã bưu điện / Ghi chú
                                </label>
                                <input
                                    type="text"
                                    value={line2}
                                    onChange={(e) => setLine2(e.target.value)}
                                    placeholder="Ví dụ: 700000 (Tùy chọn)"
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant px-1">
                                    Loại địa chỉ
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['home', 'work', 'campus', 'other'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setLabel(type)}
                                            className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-medium transition-all ${
                                                label === type
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/50'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px] mb-0.5">
                                                {type === 'home'
                                                    ? 'home'
                                                    : type === 'work'
                                                      ? 'work'
                                                      : type === 'campus'
                                                        ? 'school'
                                                        : 'tag'}
                                            </span>
                                            <span>
                                                {type === 'home'
                                                    ? 'Nhà riêng'
                                                    : type === 'work'
                                                      ? 'Công ty'
                                                      : type === 'campus'
                                                        ? 'Trường'
                                                        : 'Khác'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input
                                id="isDefaultCheckbox"
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="h-5 w-5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                            />
                            <label
                                htmlFor="isDefaultCheckbox"
                                className="cursor-pointer text-sm font-medium text-on-surface-variant select-none"
                            >
                                Đặt địa chỉ này làm mặc định
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="rounded-full border border-outline-variant px-6 py-2.5 text-sm font-semibold hover:bg-surface-container-high transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={formSubmitting}
                                className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:shadow hover:bg-primary/95 transition-all disabled:opacity-50"
                            >
                                {formSubmitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {addresses.length === 0 ? (
                        <div className="col-span-full rounded-[24px] border-2 border-dashed border-primary/20 bg-primary/5 p-12 text-center">
                            <span className="material-symbols-outlined text-[48px] text-primary mb-3">
                                location_on
                            </span>
                            <h3 className="text-lg font-bold text-on-surface">Chưa có địa chỉ nào được lưu</h3>
                            <p className="text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
                                Hãy thêm địa chỉ giao hàng để chúng tôi có thể phục vụ bạn nhanh chóng và chính xác nhất.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(true)}
                                className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary/95 transition-all"
                            >
                                Thêm địa chỉ đầu tiên
                            </button>
                        </div>
                    ) : (
                        addresses.map((addr) => {
                            const isActionLoading = actionLoading === addr.id;
                            return (
                                <div
                                    key={addr.id}
                                    className={`soft-shadow relative flex flex-col rounded-[24px] bg-surface-container-lowest p-6 border transition-all ${
                                        addr.isDefault
                                            ? 'border-primary shadow-sm'
                                            : 'border-outline-variant/30 hover:border-primary/30'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[20px]">
                                                {addr.label === 'campus'
                                                    ? 'school'
                                                    : addr.label === 'work'
                                                      ? 'work'
                                                      : addr.label === 'home'
                                                        ? 'home'
                                                        : 'tag'}
                                            </span>
                                            <span className="font-bold text-on-surface text-sm">
                                                {addr.label === 'campus'
                                                    ? 'Trường học'
                                                    : addr.label === 'work'
                                                      ? 'Công ty'
                                                      : addr.label === 'home'
                                                        ? 'Nhà riêng'
                                                        : 'Khác'}
                                            </span>
                                        </div>
                                        {addr.isDefault && (
                                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                Mặc định
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4 space-y-1.5 flex-1 text-sm text-on-surface-variant">
                                        <p className="font-bold text-on-surface">{addr.recipientName}</p>
                                        <p className="font-medium">{addr.phone}</p>
                                        <p className="line-clamp-3">
                                            {addr.line1}
                                            {addr.ward ? `, ${addr.ward}` : ''}
                                            {addr.district ? `, ${addr.district}` : ''}
                                            {addr.city ? `, ${addr.city}` : ''}
                                        </p>
                                        {addr.line2 && <p className="text-xs italic">({addr.line2})</p>}
                                    </div>

                                    <div className="mt-6 flex items-center justify-between border-t border-outline-variant/20 pt-4 gap-2">
                                        {!addr.isDefault ? (
                                            <button
                                                type="button"
                                                disabled={isActionLoading}
                                                onClick={() => handleSetDefault(addr.id)}
                                                className="text-xs font-semibold text-primary hover:underline hover:text-primary/80 disabled:opacity-50"
                                            >
                                                Đặt mặc định
                                            </button>
                                        ) : (
                                            <span className="text-xs text-on-surface-variant font-medium">
                                                Địa chỉ nhận hàng chính
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            disabled={isActionLoading}
                                            onClick={() => handleDelete(addr.id)}
                                            className="flex items-center gap-1 text-xs font-semibold text-error hover:underline hover:text-error/80 disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">
                                                delete
                                            </span>
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
