import type { ShopPromotion } from '../types/promotion';
import { formatPrice } from './formatPrice';

export function promotionScopeLabel(scope: ShopPromotion['scope']): string {
    switch (scope) {
        case 'shop':
            return 'Toàn cửa hàng';
        case 'category':
            return 'Theo danh mục';
        case 'product':
            return 'Sản phẩm chọn lọc';
        default:
            return scope;
    }
}

export function promotionDiscountLabel(promo: ShopPromotion): string {
    if (promo.type === 'free_shipping') return 'Miễn phí vận chuyển';
    if (promo.type === 'fixed_amount') return `Giảm ${formatPrice(promo.value)}`;
    return `Giảm ${promo.value}%`;
}

export function promotionMinOrderLabel(min: number): string | null {
    if (!min || min <= 0) return null;
    return `Đơn tối thiểu ${formatPrice(min)}`;
}
