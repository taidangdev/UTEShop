import type { CartLine } from '../../utils/cartStorage';
import type { CheckoutInformation, CheckoutTotals } from '../../types/checkout';
import { formatPrice } from '../../utils/formatPrice';

interface CheckoutOrderSummaryProps {
    items: CartLine[];
    totals: CheckoutTotals;
    information: CheckoutInformation;
    showCoupons?: boolean;
    onCouponChange?: (coupon: CheckoutInformation['coupon']) => void;
    onDiscountCodeChange?: (code: string) => void;
    onApplyDiscount?: () => void;
    compact?: boolean;
}

export default function CheckoutOrderSummary({
    items,
    totals,
    information,
    showCoupons = false,
    onCouponChange,
    onDiscountCodeChange,
    onApplyDiscount,
    compact = false
}: CheckoutOrderSummaryProps) {
    const showStudentDiscount = information.studentId.trim().length > 0;
    const showCouponDiscount =
        information.coupon === 'NEW2024' || information.coupon === 'LABKIT';

    return (
        <div
            className={`sticky top-28 space-y-8 rounded-lg border border-white/30 bg-white/80 p-6 backdrop-blur-xl ${
                compact ? 'shadow-[0_10px_30px_rgba(0,0,0,0.04)]' : ''
            }`}
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

            {showCoupons && onCouponChange && onDiscountCodeChange && onApplyDiscount && (
                <div className="space-y-4 border-t border-outline-variant/30 pt-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-on-surface-variant">
                            Available Coupons
                        </label>
                        <select
                            value={information.coupon}
                            onChange={(e) =>
                                onCouponChange(e.target.value as CheckoutInformation['coupon'])
                            }
                            className="h-10 cursor-pointer rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                            <option value="">Select a coupon...</option>
                            <option value="NEW2024">Student Welcome (-$150.00)</option>
                            <option value="FREESHIP">Campus Delivery (FREE)</option>
                            <option value="LABKIT">Engineering Lab Kit (-5%)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-on-surface-variant">
                            Discount Code
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={information.discountCode}
                                onChange={(e) => onDiscountCodeChange(e.target.value)}
                                placeholder="Enter code"
                                className="h-10 flex-1 rounded-lg border border-outline-variant bg-white px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <button
                                type="button"
                                onClick={onApplyDiscount}
                                className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary transition hover:bg-primary-container"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3 border-t border-outline-variant/30 pt-6">
                <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Subtotal</span>
                    <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Shipping</span>
                    <span className={totals.shippingFee === 0 ? 'font-bold text-primary' : ''}>
                        {totals.shippingFee === 0 ? 'FREE' : formatPrice(totals.shippingFee)}
                    </span>
                </div>
                {showStudentDiscount && totals.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Student Discount (15%)</span>
                        <span className="text-error">
                            -{formatPrice(totals.subtotal * 0.15)}
                        </span>
                    </div>
                )}
                {showCouponDiscount && information.coupon === 'NEW2024' && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Student Welcome</span>
                        <span className="text-primary">-{formatPrice(150)}</span>
                    </div>
                )}
                {information.coupon === 'LABKIT' && (
                    <div className="flex justify-between text-sm text-on-surface-variant">
                        <span>Lab Kit (-5%)</span>
                        <span className="text-primary">
                            -{formatPrice(totals.subtotal * 0.05)}
                        </span>
                    </div>
                )}
                <div className="flex justify-between border-t border-outline-variant pt-4 text-2xl font-semibold text-on-surface">
                    <span>Total</span>
                    <span className={compact ? 'text-primary' : ''}>{formatPrice(totals.total)}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-tertiary-fixed p-3 text-on-tertiary-fixed-variant">
                <span className="material-symbols-outlined text-lg">verified</span>
                <p className="text-xs font-semibold">Academic eligibility verified.</p>
            </div>
        </div>
    );
}
