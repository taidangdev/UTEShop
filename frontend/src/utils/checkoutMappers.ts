import type { CartItemDto } from '../types/cart';
import type { CheckoutTotals } from '../types/checkout';
import type { CartLine } from './cartStorage';

export function cartItemDtoToLine(item: CartItemDto): CartLine {
    return {
        cartItemId: item.id,
        productId: item.productId,
        slug: item.product?.slug ?? '',
        name: item.product?.name ?? 'Unknown product',
        price: item.unitPrice,
        imageUrl: item.product?.imageUrl ?? null,
        quantity: item.quantity,
        inStock: item.inStock,
        priceChanged: item.priceChanged,
        categoryId: item.product?.categoryId
    };
}

export function apiTotalsToCheckoutTotals(
    totals: {
        subtotal: number;
        shippingFee: number;
        discountAmount: number;
        total: number;
        pointsRedeemed?: number;
        pointsDiscount?: number;
        userCouponCode?: string | null;
        userCouponDiscount?: number;
        appliedPromotionId?: number | null;
        promotionCode?: string | null;
        promotionName?: string | null;
        promotionDiscount?: number;
    }
): CheckoutTotals {
    return {
        ...totals,
        shippingLabel: totals.shippingFee === 0 ? 'FREE' : String(totals.shippingFee)
    };
}
