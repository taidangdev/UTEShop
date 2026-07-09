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

function getPromotionIneligibilityReason(
    p: ShopPromotion,
    items: CartLine[],
    subtotal: number,
    rejectedPromotions?: Record<string, string>
) {
    if (rejectedPromotions?.[p.code]) {
        return rejectedPromotions[p.code];
    }
    if (p.maxUsesPerUser != null && (p.userUsedCount ?? 0) >= p.maxUsesPerUser) {
        return 'Bạn đã sử dụng mã khuyến mãi này tối đa số lần cho phép';
    }
    if (p.usageLimit !== undefined && p.usedCount !== undefined && p.usedCount >= p.usageLimit) {
        return "Mã đã hết lượt sử dụng trên hệ thống.";
    }
    if (subtotal < (p.minOrderAmount || 0)) {
        return `Yêu cầu đơn tối thiểu từ ${formatPrice(p.minOrderAmount)}.`;
    }
    if (!isPromotionUsableForCart(p, items)) {
        if (p.scope === 'category') {
            return "Không áp dụng cho danh mục sản phẩm trong giỏ.";
        }
        if (p.scope === 'product') {
            return "Không áp dụng cho các sản phẩm trong giỏ.";
        }
    }
    return null;
}

function getCouponIneligibilityReason(c: UserCoupon, subtotal: number) {
    if (subtotal < (c.minOrderAmount || 0)) {
        return `Yêu cầu đơn tối thiểu từ ${formatPrice(c.minOrderAmount)}.`;
    }
    return null;
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
    rejectedPromotions?: Record<string, string>;
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
    rejectedPromotions = {},
    userCoupons = [],
    pointsBalance = 0,
    maxPointsRedeemable = 0,
    onUserCouponChange,
    onPointsChange,
    compact = false
}: CheckoutOrderSummaryProps) {
    const pointsCap = Math.min(pointsBalance, maxPointsRedeemable);
    const subtotalAfterPromo = totals.subtotal - (totals.promotionDiscount || 0);

    return (
        <div
            className={
                compact
                    ? 'space-y-6'
                    : 'sticky top-28 space-y-8 rounded-lg border border-white/30 bg-white/80 p-6 backdrop-blur-xl'
            }
        >
            <div>
                <h3 className="mb-4 text-2xl font-semibold text-on-surface">Tóm tắt đơn hàng</h3>
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
                                    SL {item.quantity} × {formatPrice(item.price)}
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
                    {/* Mã khuyến mãi cửa hàng */}
                    <div className="flex flex-col gap-3">
                        <label className="text-sm font-semibold text-on-surface-variant flex items-center justify-between">
                            <span>Mã khuyến mãi cửa hàng</span>
                            <Link
                                to="/coupons"
                                target="_blank"
                                className="text-xs text-primary hover:underline font-normal flex items-center gap-0.5"
                            >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span> Xem tất cả
                            </Link>
                        </label>

                        {promotionsLoading ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-on-surface-variant">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                                Đang tải danh sách khuyến mãi...
                            </div>
                        ) : shopPromotions.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic">Không có mã khuyến mãi đang hoạt động.</p>
) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {[...shopPromotions]
                                    .sort((a, b) => {
                                        const aSelected = information.appliedDiscountCode === a.code;
                                        const bSelected = information.appliedDiscountCode === b.code;
                                        if (aSelected && !bSelected) return -1;
                                        if (!aSelected && bSelected) return 1;

                                        const aUsable = !getPromotionIneligibilityReason(a, items, totals.subtotal, rejectedPromotions);
                                        const bUsable = !getPromotionIneligibilityReason(b, items, totals.subtotal, rejectedPromotions);
                                        if (aUsable && !bUsable) return -1;
                                        if (!aUsable && bUsable) return 1;

                                        return 0;
                                    })
                                    .map((p) => {
                                    const ineligibilityReason = getPromotionIneligibilityReason(
                                        p,
                                        items,
                                        totals.subtotal,
                                        rejectedPromotions
                                    );
                                    const isSelected =
                                        information.appliedDiscountCode === p.code &&
                                        totals.promotionCode === p.code;
                                    const isUsable = !ineligibilityReason;

                                    return (
                                        <div
                                            key={p.id}
                                            className={`relative rounded-xl border p-3 transition flex flex-col gap-1.5 ${
                                                isSelected
                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                    : isUsable
                                                      ? 'border-outline-variant bg-white hover:border-primary/50'
                                                      : 'border-outline-variant/40 bg-surface-container-lowest opacity-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-sm font-bold tracking-wider text-on-surface">
                                                            {p.code}
                                                        </span>
                                                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                                                            {promotionDiscountLabel(p)}
                                                        </span>
                                                    </div>
                                                    <h4 className="mt-1 text-xs font-semibold text-on-surface line-clamp-1">{p.name}</h4>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={promotionApplying || (!isUsable && !isSelected)}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            onPromotionSelect?.('');
                                                        } else {
                                                            onPromotionSelect?.(p.code);
                                                        }
                                                    }}
                                                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                                                        isSelected
                                                            ? 'bg-primary text-on-primary hover:bg-primary/90'
                                                            : isUsable
                                                              ? 'bg-surface-container-highest text-on-surface hover:bg-primary/10 hover:text-primary'
                                                              : 'bg-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isSelected ? 'Bỏ chọn' : 'Áp dụng'}
                                                </button>
                                            </div>
                                            
                                            {p.description && (
                                                <p className="text-[10px] text-on-surface-variant leading-relaxed line-clamp-2">
                                                    {p.description}
                                                </p>
                                            )}

                                            {!isUsable && ineligibilityReason && (
                                                <div className="mt-1 flex items-start gap-1 text-[10px] text-error font-medium">
                                                    <span className="material-symbols-outlined text-[13px] shrink-0 mt-0.5">info</span>
                                                    <span>{ineligibilityReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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

                    {/* Phiếu cá nhân */}
                    {onUserCouponChange && userCoupons.length > 0 && (
                        <div className="flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
                            <label className="text-sm font-semibold text-on-surface-variant">
                                Phiếu giảm giá cá nhân (từ đánh giá)
                            </label>
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {[...userCoupons]
                                    .sort((a, b) => {
                                        const aSelected = information.userCouponCode === a.code;
                                        const bSelected = information.userCouponCode === b.code;
                                        if (aSelected && !bSelected) return -1;
                                        if (!aSelected && bSelected) return 1;

                                        const aUsable = !getCouponIneligibilityReason(a, subtotalAfterPromo);
                                        const bUsable = !getCouponIneligibilityReason(b, subtotalAfterPromo);
                                        if (aUsable && !bUsable) return -1;
                                        if (!aUsable && bUsable) return 1;

                                        return 0;
                                    })
                                    .map((c) => {
                                    const ineligibilityReason = getCouponIneligibilityReason(c, subtotalAfterPromo);
                                    const isSelected =
                                        information.userCouponCode === c.code &&
                                        totals.userCouponCode === c.code;
                                    const isUsable = !ineligibilityReason;
                                    
                                    const discountValueLabel =
                                        c.discountType === 'free_shipping'
                                            ? 'Miễn phí ship'
                                            : c.discountType === 'fixed_amount'
                                              ? `Giảm ${formatPrice(c.discountValue)}`
                                              : `Giảm ${c.discountValue}%`;

                                    return (
                                        <div
                                            key={c.id}
                                            className={`relative rounded-xl border p-3 transition flex flex-col gap-1.5 ${
                                                isSelected
                                                    ? 'border-tertiary bg-tertiary/5 shadow-sm'
                                                    : isUsable
                                                      ? 'border-outline-variant bg-white hover:border-tertiary/50'
                                                      : 'border-outline-variant/40 bg-surface-container-lowest opacity-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-sm font-bold tracking-wider text-on-surface">
                                                            {c.code}
                                                        </span>
                                                        <span className="rounded bg-tertiary/10 px-1.5 py-0.5 text-[10px] font-bold text-tertiary shrink-0">
                                                            {discountValueLabel}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[10px] text-on-surface-variant">
                                                        Hạn dùng: {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={!isUsable && !isSelected}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            onUserCouponChange('');
                                                        } else {
                                                            onUserCouponChange(c.code);
                                                        }
                                                    }}
                                                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition active:scale-95 ${
                                                        isSelected
                                                            ? 'bg-tertiary text-on-tertiary hover:bg-tertiary/90'
                                                            : isUsable
                                                              ? 'bg-surface-container-highest text-on-surface hover:bg-tertiary/10 hover:text-tertiary'
                                                              : 'bg-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isSelected ? 'Bỏ chọn' : 'Áp dụng'}
                                                </button>
                                            </div>

                                            {!isUsable && ineligibilityReason && (
                                                <div className="mt-1 flex items-start gap-1 text-[10px] text-error font-medium">
                                                    <span className="material-symbols-outlined text-[13px] shrink-0 mt-0.5">info</span>
                                                    <span>{ineligibilityReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                                100 điểm = 1.000đ giảm giá (tối đa 20% giá trị hàng sau khuyến mãi)
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
                        {totals.shippingFee === 0 ? 'Miễn phí' : formatPrice(totals.shippingFee)}
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
