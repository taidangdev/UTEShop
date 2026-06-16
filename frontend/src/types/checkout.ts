import type { CartItemDto } from './cart';

export type DeliveryType = 'campus' | 'home';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card';

export interface CheckoutInformation {
    fullName: string;
    phone: string;
    studentId: string;
    deliveryType: DeliveryType;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    discountCode: string;
    /** Shop promotion code from promotions table */
    appliedDiscountCode: string;
    /** Personal coupon from user_coupons (review rewards) */
    userCouponCode: string;
    pointsToRedeem: number;
    addressId?: number | null;
    saveAddress?: boolean;
}

export interface CheckoutTotals {
    subtotal: number;
    shippingFee: number;
    discountAmount: number;
    total: number;
    shippingLabel: string;
    pointsRedeemed?: number;
    pointsDiscount?: number;
    userCouponCode?: string | null;
    userCouponDiscount?: number;
    appliedPromotionId?: number | null;
    promotionCode?: string | null;
    promotionName?: string | null;
    promotionDiscount?: number;
}

export interface CheckoutPreviewData {
    items: CartItemDto[];
    totals: Omit<CheckoutTotals, 'shippingLabel'>;
    information: CheckoutInformation;
    loyaltyPoints?: number | null;
    maxPointsRedeemable?: number;
}

export interface OrderItemDto {
    id: number;
    productId: number;
    variantId: number | null;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discountAmount?: number;
    promotionId?: number | null;
}

export interface OrderPaymentDto {
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
}

export interface OrderDto {
    id: number;
    orderNumber: string;
    status: string;
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    total: number;
    placedAt: string | null;
    shippingSnapshot?: Record<string, unknown>;
    items: OrderItemDto[];
    payment: OrderPaymentDto | null;
    adminNote?: string | null;
}

export interface PlaceOrderResponseData {
    order: OrderDto;
}
