import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { fetchActivePromotions } from '../services/promotionApi';
import { fetchMyCoupons } from '../services/reviewApi';
import type { ShopPromotion } from '../types/promotion';
import type { UserCoupon } from '../types/review';
import {
    promotionDiscountLabel,
    promotionMinOrderLabel,
    promotionScopeLabel
} from '../utils/promotionDisplay';

const HERO_IMAGE = '/PremiumLaptop.png';

type ScopeFilter = 'all' | ShopPromotion['scope'];

const SCOPE_FILTERS: { value: ScopeFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'shop', label: 'Toàn shop' },
    { value: 'category', label: 'Danh mục' },
    { value: 'product', label: 'Sản phẩm' }
];

function CouponsFooter() {
    return (
        <footer className="w-full bg-surface-container-low py-20">
            <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-6 border-t border-outline-variant/30 pt-10 md:flex-row">
                    <div className="text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="text-sm text-on-surface-variant">
                        © 2024 UTEShop. Engineering-Grade Quality.
                    </p>
                    <div className="flex gap-6">
                        <Link to="/categories" className="text-sm text-on-surface-variant hover:text-primary">
                            Sản phẩm
                        </Link>
                        <Link to="/cart" className="text-sm text-on-surface-variant hover:text-primary">
                            Giỏ hàng
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function CopyCodeButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-container active:scale-95"
        >
            <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Đã sao chép' : 'Sao chép mã'}
        </button>
    );
}

function ShopPromotionCard({ promo }: { promo: ShopPromotion }) {
    const minLabel = promotionMinOrderLabel(promo.minOrderAmount);

    return (
        <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-outline-variant/20 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(0,74,198,0.08)]">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-primary">
                        {promotionDiscountLabel(promo)}
                    </span>
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                        {promotionScopeLabel(promo.scope)}
                    </span>
                </div>
                <h3 className="text-xl font-semibold text-on-surface">{promo.name}</h3>
                {promo.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{promo.description}</p>
                )}
                {promo.scope === 'category' && promo.categories && promo.categories.length > 0 && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-primary font-semibold">
                        <span className="material-symbols-outlined text-[16px] mt-0.5">category</span>
                        <span>
                            Danh mục: {promo.categories.map((c) => c.name).join(', ')}
                        </span>
                    </div>
                )}
                {promo.scope === 'product' && promo.products && promo.products.length > 0 && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-primary font-semibold">
                        <span className="material-symbols-outlined text-[16px] mt-0.5">inventory_2</span>
                        <span className="line-clamp-2" title={promo.products.map((p) => p.name).join(', ')}>
                            Sản phẩm: {promo.products.map((p) => p.name).join(', ')}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-6 pt-2">
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                    <span className="font-mono text-lg font-bold tracking-wider text-primary">{promo.code}</span>
                    <span className="material-symbols-outlined text-primary/60">sell</span>
                </div>
                {minLabel && (
                    <p className="mb-4 text-xs text-on-surface-variant">{minLabel}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-3">
                    <CopyCodeButton code={promo.code} />
                    <Link
                        to="/categories"
                        className="flex h-11 items-center rounded-full border border-outline-variant px-5 text-sm font-medium text-on-surface transition hover:border-primary hover:text-primary"
                    >
                        Mua ngay
                    </Link>
                </div>
            </div>
        </article>
    );
}

function PersonalCouponCard({ coupon }: { coupon: UserCoupon }) {
    const discountLabel =
        coupon.discountType === 'free_shipping'
            ? 'Miễn phí ship'
            : coupon.discountType === 'fixed_amount'
              ? `Giảm $${coupon.discountValue}`
              : `Giảm ${coupon.discountValue}%`;

    return (
        <article className="flex h-full flex-col rounded-[24px] border border-tertiary/30 bg-tertiary-fixed/30 p-6">
            <span className="mb-2 w-fit rounded-full bg-tertiary px-3 py-1 text-[10px] font-bold uppercase text-on-tertiary">
                Phiếu cá nhân
            </span>
            <p className="text-lg font-semibold text-on-surface">{discountLabel}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Từ đánh giá sản phẩm</p>
            <div className="my-4 rounded-xl border border-dashed border-tertiary/50 bg-white/80 px-4 py-3 font-mono font-bold text-tertiary">
                {coupon.code}
            </div>
            <p className="text-xs text-on-surface-variant">
                HSD {new Date(coupon.expiresAt).toLocaleDateString('vi-VN')}
            </p>
            <div className="mt-4">
                <CopyCodeButton code={coupon.code} />
            </div>
        </article>
    );
}

export default function CouponsPage() {
    const user = useAppSelector((state) => state.auth.user);
    const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
    const [personalCoupons, setPersonalCoupons] = useState<UserCoupon[]>([]);
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const promoList = await fetchActivePromotions();
                if (cancelled) return;
                setPromotions(promoList);

                if (user) {
                    try {
                        const coupons = await fetchMyCoupons();
                        if (!cancelled) setPersonalCoupons(coupons);
                    } catch {
                        if (!cancelled) setPersonalCoupons([]);
                    }
                } else {
                    setPersonalCoupons([]);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg =
                        typeof err === 'string'
                            ? err
                            : (err as { message?: string })?.message || 'Không tải được khuyến mãi';
                    setError(msg);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [user]);

    const filteredPromotions = useMemo(() => {
        if (scopeFilter === 'all') return promotions;
        return promotions.filter((p) => p.scope === scopeFilter);
    }, [promotions, scopeFilter]);

    return (
        <div className="min-h-screen bg-surface text-on-surface antialiased">
            <section className="mx-auto max-w-[1280px] px-6 pb-12 pt-10 lg:px-8">
                <div className="group relative h-[320px] overflow-hidden rounded-[24px] md:h-[380px]">
                    <img
                        src={HERO_IMAGE}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center bg-gradient-to-r from-on-surface/70 to-transparent p-8 md:p-12">
                        <div className="max-w-xl">
                            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/80">
                                UTEShop Rewards
                            </p>
                            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                                Mã giảm giá & Khuyến mãi
                            </h1>
                            <p className="mb-8 text-lg text-white/90">
                                Áp mã khi thanh toán — giảm theo sản phẩm, danh mục hoặc toàn đơn hàng.
                            </p>
                            <Link
                                to="/categories"
                                className="inline-flex h-14 items-center rounded-[24px] bg-primary px-8 text-sm font-medium text-on-primary transition active:scale-95 hover:shadow-lg"
                            >
                                Khám phá sản phẩm
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1280px] px-6 pb-8 lg:px-8">
                <div className="rounded-[24px] bg-surface-container-lowest p-6 md:p-8">
                    <h2 className="mb-2 text-lg font-semibold text-on-surface">Cách sử dụng</h2>
                    <ol className="grid gap-3 text-sm text-on-surface-variant md:grid-cols-3">
                        <li className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                1
                            </span>
                            Chọn sản phẩm và tiến hành thanh toán
                        </li>
                        <li className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                2
                            </span>
                            Nhập mã khuyến mãi tại bước thông tin giao hàng
                        </li>
                        <li className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                3
                            </span>
                            Có thể kết hợp phiếu cá nhân và điểm tích lũy (nếu đã đăng nhập)
                        </li>
                    </ol>
                </div>
            </section>

            {user && personalCoupons.length > 0 && (
                <section className="mx-auto max-w-[1280px] px-6 pb-12 lg:px-8">
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-on-surface">Phiếu của bạn</h2>
                            <p className="mt-1 text-sm text-on-surface-variant">
                                Nhận từ đánh giá đơn hàng đã giao — dùng riêng tại checkout
                            </p>
                        </div>
                        <Link
                            to="/profile?tab=rewards"
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Xem điểm tích lũy →
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {personalCoupons.map((c) => (
                            <PersonalCouponCard key={c.id} coupon={c} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mx-auto max-w-[1280px] px-6 pb-20 lg:px-8">
                <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-on-surface">Khuyến mãi cửa hàng</h2>
                        <p className="mt-1 text-sm text-on-surface-variant">
                            {loading
                                ? 'Đang tải...'
                                : `${filteredPromotions.length} mã đang hoạt động`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SCOPE_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => setScopeFilter(f.value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                    scopeFilter === f.value
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <p className="mb-6 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                        {error}
                    </p>
                )}

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    </div>
                ) : filteredPromotions.length === 0 ? (
                    <div className="rounded-[24px] bg-surface-container-low py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-outline">local_offer</span>
                        <p className="mt-4 text-on-surface-variant">Chưa có mã phù hợp bộ lọc.</p>
                        <button
                            type="button"
                            onClick={() => setScopeFilter('all')}
                            className="mt-4 text-sm font-medium text-primary hover:underline"
                        >
                            Xem tất cả
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPromotions.map((promo) => (
                            <ShopPromotionCard key={promo.id} promo={promo} />
                        ))}
                    </div>
                )}

                {!user && (
                    <p className="mt-10 text-center text-sm text-on-surface-variant">
                        <Link to="/login" className="font-medium text-primary hover:underline">
                            Đăng nhập
                        </Link>{' '}
                        để xem phiếu cá nhân và điểm tích lũy từ đánh giá sản phẩm.
                    </p>
                )}
            </section>

            <CouponsFooter />
        </div>
    );
}
