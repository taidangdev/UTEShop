import type { CartLine } from './cartStorage';
import type { CheckoutInformation, CheckoutTotals } from '../types/checkout';

const HOME_SHIPPING_FEE = 12;

export function calculateCheckoutTotals(
    items: CartLine[],
    info: CheckoutInformation
): CheckoutTotals {
    const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
    let shippingFee = info.deliveryType === 'campus' ? 0 : HOME_SHIPPING_FEE;
    let discountAmount = 0;

    if (info.coupon === 'FREESHIP') {
        shippingFee = 0;
    }
    if (info.coupon === 'NEW2024') {
        discountAmount += 150;
    }
    if (info.coupon === 'LABKIT') {
        discountAmount += subtotal * 0.05;
    }
    if (info.studentId.trim()) {
        discountAmount += subtotal * 0.15;
    }
    if (info.appliedDiscountCode.toUpperCase() === 'STUDENT15') {
        discountAmount += subtotal * 0.15;
    }

    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    return {
        subtotal,
        shippingFee,
        discountAmount,
        total,
        shippingLabel: shippingFee === 0 ? 'FREE' : String(shippingFee)
    };
}
