import { Link } from 'react-router-dom';
import type { CartLine } from '../../utils/cartStorage';
import type { CheckoutInformation, CheckoutTotals } from '../../types/checkout';
import type { ShopPromotion } from '../../types/promotion';
import type { UserCoupon } from '../../types/review';
import { formatPrice } from '../../utils/formatPrice';
import { promotionDiscountLabel } from '../../utils/promotionDisplay';

function isPromotionUsableForCart(p: ShopPromotion, items: CartLine[]) {
    if (p.scope === 'shop') return true;
    if (p.scope === 'category') {
        const promoCatIds = p.categoryIds || [];
        if (promoCatIds.length === 0) return false;
        return items.some((item) => {
            const catId = item.categoryId;
            return catId && promoCatIds.includes(catId);
        });
    }
    if (p.scope === 'product') {
        const promoProdIds = p.productIds || [];
        if (promoProdIds.length === 0) return false;
        return items.some((item) => promoProdIds.includes(item.productId));
    }
    return false;
}

interface CheckoutOrderSummaryProps {
    items: CartLine[];
    totals: CheckoutTotals;
    information: CheckoutInformation;
    showCoupons?: boolean;
    shopPromotions?: ShopPromotion[];
    promotionsLoading?: boolean;
    promotionApplying?: boolean;
    onPromotionSelect?: (code: string) => void;
    promotionMessage?: string | null;
    userCoupons?: UserCoupon[];
    pointsBalance?: number;
    maxPointsRedeemable?: number;
    onUserCouponChange?: (code: string) => void;
    onPointsChange?: (points: number) => void;
    compact?: boolean;
}

export default function CheckoutOrderSummary({
    items,
    totals,
    information,
    showCoupons = false,
    shopPromotions = [],
    promotionsLoading = false,
    promotionApplying = false,
    onPromotionSelect,
    promotionMessage,
    userCoupons = [],
    pointsBalance = 0,
    maxPointsRedeemable = 0,
    onUserCouponChange,
    onPointsChange,
    compact = false
}: CheckoutOrderSummaryProps) {
    const pointsCap = Math.min(pointsBalance, maxPointsRedeemable);

    const usablePromotions = shopPromotions.filter(
        (p) =>
            (totals.subtotal >= (p.minOrderAmount || 0) && isPromotionUsableForCart(p, items)) ||
            p.code === information.appliedDiscountCode
    );

    const subtotalAfterPromo = totals.subtotal - (totals.promotionDiscount || 0);
    const usableCoupons = userCoupons.filter(
        (c) => subtotalAfterPromo >= (c.minOrderAmount || 0) || c.code === information.userCouponCode
    );

    return (
        <div
            className={
                compact
                    ? 'space-y-6'
                    : 'sticky top-28 space-y-8 rounded-lg border border-white/30 bg-white/80 p-6 backdrop-blur-xl'
            }
        >
            <div>
                <h3 className="mb-4 text-2xl font-semibold text-on-surface">Order Summary</h3>
                <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">
                    {items.map((item) => (
                        <div key={item.cartItemId ?? item.productId} className="flex items-center gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-high">
                                <img
                                    src={item.imageUrl || '/PremiumLaptop.png'}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-on-surface">{item.name}</p>
                                <p className="truncate text-xs text-on-surface-variant">
                                    Qty {item.quantity} × {formatPrice(item.price)}
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-primary">
                                    {formatPrice(item.price * item.quantity)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showCoupons && (
                <div className="space-y-4 border-t border-outline-variant/30 pt-6">
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="shop-promotion-select"
                            className="text-xs font-semibold text-on-surface-variant"
                        >
                            Mã khuyến mãi cửa hàng
                        </label>
                        <select
                            id="shop-promotion-select"
                            value={information.appliedDiscountCode}
                            disabled={promotionsLoading || promotionApplying}
                            onChange={(e) => onPromotionSelect?.(e.target.value)}
                            className="h-10 w-full cursor-pointer rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary disabled:cursor-wait disabled:opacity-60"
                        >
                            <option value="">
                                {promotionsLoading
                                    ? 'Đang tải mã...'
                                    : promotionApplying
                                      ? 'Đang áp dụng...'
                                      : 'Không dùng mã khuyến mãi'}
                            </option>
                            {usablePromotions.map((p) => (
                                <option key={p.id} value={p.code}>
                                    {p.code} — {promotionDiscountLabel(p)}
                                    {p.minOrderAmount > 0
                                        ? ` · đơn từ ${formatPrice(p.minOrderAmount)}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        {!promotionsLoading && shopPromotions.length === 0 && (
                            <p className="text-xs text-on-surface-variant">
                                Hiện không có mã khuyến mãi.{' '}
                                <Link to="/coupons" className="text-primary hover:underline">
                                    Xem trang Coupons
                                </Link>
                            </p>
                        )}
                        {information.appliedDiscountCode && totals.promotionName && (
                            <p className="text-xs font-medium text-primary">
                                Đang áp dụng: {totals.promotionName}
                            </p>
                        )}
                        {promotionMessage && (
                            <p
                                className={`text-xs ${promotionMessage.startsWith('✓') ? 'text-primary' : 'text-error'}`}
                            >
                                {promotionMessage}
                            </p>
                        )}
                    </div>

                    {onUserCouponChange && userCoupons.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-on-surface-variant">
                                Phiếu giảm giá cá nhân (từ đánh giá)
                            </label>
                            {usableCoupons.length > 0 ? (
                                <select
                                    value={information.userCouponCode}
                                    onChange={(e) => onUserCouponChange(e.target.value)}
                                    className="h-10 w-full cursor-pointer rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary"
                                >
                                    <option value="">Không dùng phiếu</option>
                                    {usableCoupons.map((c) => (
                                        <option key={c.id} value={c.code}>
                                            {c.code} (
                                            {c.discountType === 'free_shipping'
                                                ? 'Free ship'
                                                : `${c.discountValue}%`}
                                            )
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs text-on-surface-variant italic">
                                    Không có phiếu giảm giá nào đủ điều kiện cho đơn hàng này.
                                </p>
                            )}
                        </div>
                    )}

                    {onPointsChange && pointsBalance > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-on-surface-variant">
                                Điểm tích lũy ({pointsBalance} điểm · tối đa {pointsCap} đơn này)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={pointsCap}
                                value={information.pointsToRedeem || ''}
                                onChange={(e) =>
                                    onPointsChange(
                                        Math.min(pointsCap, Math.max(0, Number(e.target.value) || 0))
                                    )
                                }
                                placeholder="Nhập điểm đổi"
                                className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary"
                            />
                            <p className="text-[11px] text-on-surface-variant">
                                100 điểm = $1 giảm giá (tối đa 20% giá trị hàng sau khuyến mãi)
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3 border-t border-outline-variant/30 pt-6">
                <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Tạm tính</span>
                    <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Phí vận chuyển</span>
                    <span className={totals.shippingFee === 0 ? 'font-bold text-primary' : ''}>
                        {totals.shippingFee === 0 ? 'FREE' : formatPrice(totals.shippingFee)}
                    </span>
                </div>
                {(totals.promotionDiscount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>
                            Khuyến mãi
                            {totals.promotionCode ? ` (${totals.promotionCode})` : ''}
                        </span>
                        <span className="text-primary">-{formatPrice(totals.promotionDiscount ?? 0)}</span>
                    </div>
                )}
                {(totals.userCouponDiscount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Phiếu cá nhân {totals.userCouponCode ? `(${totals.userCouponCode})` : ''}</span>
                        <span className="text-primary">
                            -{formatPrice(totals.userCouponDiscount ?? 0)}
                        </span>
                    </div>
                )}
                {(totals.pointsRedeemed ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Điểm đổi ({totals.pointsRedeemed})</span>
                        <span className="text-primary">-{formatPrice(totals.pointsDiscount ?? 0)}</span>
                    </div>
                )}
                <div className="flex justify-between border-t border-outline-variant pt-4 text-2xl font-semibold text-on-surface">
                    <span>Tổng cộng</span>
                    <span className={compact ? 'text-primary' : ''}>{formatPrice(totals.total)}</span>
                </div>
            </div>

            {!compact && (
                <div className="flex items-center gap-3 rounded-lg bg-tertiary-fixed p-3 text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined text-lg">verified</span>
                    <p className="text-xs font-semibold">Mã và điểm được tính khi xác nhận đơn hàng.</p>
                </div>
            )}
        </div>
    );
}
