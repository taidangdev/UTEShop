import type { CartLine } from './cartStorage';
import type { CheckoutInformation, CheckoutTotals } from '../types/checkout';

const HOME_SHIPPING_FEE = 12000;

/** Client-side estimate when API preview is unavailable */
export function calculateCheckoutTotals(
    items: CartLine[],
    info: CheckoutInformation
): CheckoutTotals {
    const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const shippingFee = info.deliveryType === 'campus' ? 0 : HOME_SHIPPING_FEE;

    return {
        subtotal,
        shippingFee,
        discountAmount: 0,
        total: subtotal + shippingFee,
        shippingLabel: shippingFee === 0 ? 'FREE' : String(shippingFee)
    };
}
