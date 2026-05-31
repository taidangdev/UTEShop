import type { CartItemDto } from './cart';

export type DeliveryType = 'campus' | 'home';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card';

export type CheckoutCoupon = '' | 'NEW2024' | 'FREESHIP' | 'LABKIT';

export interface CheckoutInformation {
    fullName: string;
    phone: string;
    studentId: string;
    deliveryType: DeliveryType;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    coupon: CheckoutCoupon;
    discountCode: string;
    appliedDiscountCode: string;
    /** Personal coupon from review rewards */
    userCouponCode: string;
    /** Loyalty points to redeem at checkout */
    pointsToRedeem: number;
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
}

export interface CheckoutPreviewData {
    items: CartItemDto[];
    totals: Omit<CheckoutTotals, 'shippingLabel'>;
    information: CheckoutInformation;
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
}

export interface PlaceOrderResponseData {
    order: OrderDto;
}
