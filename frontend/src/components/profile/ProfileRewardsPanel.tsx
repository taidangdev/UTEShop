import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyCoupons, fetchMyPoints } from '../../services/reviewApi';
import { fetchActivePromotions } from '../../services/promotionApi';
import type { ShopPromotion } from '../../types/promotion';
import type { UserCoupon } from '../../types/review';

interface ProfileRewardsPanelProps {
    loyaltyPoints?: number;
}

export default function ProfileRewardsPanel({ loyaltyPoints: initialPoints }: ProfileRewardsPanelProps) {
    const [balance, setBalance] = useState(initialPoints ?? 0);
    const [transactions, setTransactions] = useState<
        Array<{ id: number; amount: number; type: string; note: string | null; createdAt: string }>
    >([]);
    const [coupons, setCoupons] = useState<UserCoupon[]>([]);
    const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const [pointsData, couponList, promoList] = await Promise.all([
                    fetchMyPoints(),
                    fetchMyCoupons(),
                    fetchActivePromotions()
                ]);
                if (!cancelled) {
                    setBalance(pointsData.balance);
                    setTransactions(pointsData.transactions.slice(0, 8));
                    setCoupons(couponList);
                    setPromotions(promoList);
                }
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-primary/10 p-6">
                    <p className="text-xs font-semibold uppercase text-primary">Điểm tích lũy</p>
                    <p className="mt-2 text-4xl font-bold text-primary">{balance}</p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                        Đổi điểm khi thanh toán (100 điểm = 1.000đ, tối đa 20% đơn)
                    </p>
                    <Link
                        to="/categories"
                        className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                    >
                        Mua sắm để dùng điểm →
                    </Link>
                </div>
                <div className="rounded-[24px] bg-surface-container-low p-6">
                    <p className="text-xs font-semibold uppercase text-on-surface-variant">
                        Phiếu cá nhân
                    </p>
                    <p className="mt-2 text-4xl font-bold text-on-surface">{coupons.length}</p>
                    <p className="mt-2 text-xs text-on-surface-variant">Từ đánh giá sản phẩm đã mua</p>
                </div>
            </div>

            {coupons.length > 0 && (
                <div className="rounded-[24px] bg-surface-container-lowest p-6">
                    <h3 className="mb-4 text-lg font-semibold text-on-surface">Phiếu giảm giá của bạn</h3>
                    <ul className="space-y-2">
                        {coupons.map((c) => (
                            <li
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-sm"
                            >
                                <span className="font-mono font-bold text-primary">{c.code}</span>
                                <span className="text-on-surface-variant">
                                    {c.discountType === 'free_shipping'
                                        ? 'Miễn phí ship'
                                        : `Giảm ${c.discountValue}%`}{' '}
                                    · HSD {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {promotions.length > 0 && (
                <div className="rounded-[24px] bg-surface-container-lowest p-6">
                    <h3 className="mb-4 text-lg font-semibold text-on-surface">Mã khuyến mãi đang chạy</h3>
                    <ul className="space-y-3">
                        {promotions.map((p) => (
                            <li key={p.id} className="rounded-xl border border-outline-variant/30 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-primary">{p.code}</span>
                                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase">
                                        {p.scope === 'product'
                                            ? 'Sản phẩm'
                                            : p.scope === 'category'
                                              ? 'Danh mục'
                                              : 'Toàn shop'}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm font-medium text-on-surface">{p.name}</p>
                                {p.description && (
                                    <p className="mt-1 text-xs text-on-surface-variant">{p.description}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {transactions.length > 0 && (
                <div className="rounded-[24px] bg-surface-container-lowest p-6">
                    <h3 className="mb-4 text-lg font-semibold text-on-surface">Lịch sử điểm</h3>
                    <ul className="divide-y divide-outline-variant/20">
                        {transactions.map((t) => (
                            <li
                                key={t.id}
                                className="flex items-center justify-between py-3 text-sm first:pt-0"
                            >
                                <div>
                                    <p className="font-medium text-on-surface">
                                        {t.amount > 0 ? 'Nhận điểm' : 'Đổi điểm'}
                                    </p>
                                    <p className="text-xs text-on-surface-variant">
                                        {t.note || t.type} ·{' '}
                                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                                <span
                                    className={`font-bold ${t.amount > 0 ? 'text-primary' : 'text-error'}`}
                                >
                                    {t.amount > 0 ? '+' : ''}
                                    {t.amount}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
