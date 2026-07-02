import type { CheckoutInformation, PaymentMethod } from '../types/checkout';

const CHECKOUT_KEY = 'uteshop_checkout';

interface CheckoutSession {
    productIds: number[];
    information?: CheckoutInformation;
    paymentMethod?: PaymentMethod;
}

const defaultInformation = (): CheckoutInformation => ({
    fullName: '',
    phone: '',
    studentId: '',
    deliveryType: 'campus',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    discountCode: '',
    appliedDiscountCode: '',
    userCouponCode: '',
    pointsToRedeem: 0
});

function readSession(): CheckoutSession {
    try {
        const raw = sessionStorage.getItem(CHECKOUT_KEY);
        if (!raw) return { productIds: [] };
        const parsed = JSON.parse(raw) as CheckoutSession;
        if (parsed.information) {
            parsed.information = {
                ...defaultInformation(),
                ...parsed.information,
                pointsToRedeem: parsed.information.pointsToRedeem ?? 0,
                userCouponCode: parsed.information.userCouponCode ?? '',
                appliedDiscountCode: parsed.information.appliedDiscountCode ?? ''
            };
        }
        return parsed;
    } catch {
        return { productIds: [] };
    }
}

function writeSession(session: CheckoutSession) {
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(session));
}

export function saveCheckoutSelection(productIds: number[]) {
    const session = readSession();
    writeSession({ ...session, productIds });
}

export function getCheckoutProductIds(): number[] {
    return readSession().productIds;
}

export function getCheckoutInformation(): CheckoutInformation {
    return readSession().information ?? defaultInformation();
}

export function saveCheckoutInformation(information: CheckoutInformation) {
    const session = readSession();
    writeSession({ ...session, information });
}

export function getPaymentMethod(): PaymentMethod {
    return readSession().paymentMethod ?? 'cash';
}

export function savePaymentMethod(method: PaymentMethod) {
    const session = readSession();
    writeSession({ ...session, paymentMethod: method });
}

export function clearCheckoutSession() {
    sessionStorage.removeItem(CHECKOUT_KEY);
}

export function hasCheckoutSelection(): boolean {
    return readSession().productIds.length > 0;
}

/** Xóa mã giảm giá / điểm khi preview hoặc đặt hàng thất bại do khuyến mãi không hợp lệ */
export function clearCheckoutDiscounts(information: CheckoutInformation): CheckoutInformation {
    return {
        ...information,
        appliedDiscountCode: '',
        discountCode: '',
        userCouponCode: '',
        pointsToRedeem: 0
    };
}
