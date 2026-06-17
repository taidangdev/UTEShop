import axiosInstance from './axiosConfig';
import type { ApiEnvelope } from '../types/api';
import type {
    CheckoutInformation,
    CheckoutPreviewData,
    PaymentMethod,
    PlaceOrderResponseData
} from '../types/checkout';
import { notifyCartUpdated } from '../utils/cartStorage';

export interface CheckoutPayload {
    productIds: number[];
    information: CheckoutInformation;
}

export async function previewCheckout(payload: CheckoutPayload): Promise<CheckoutPreviewData> {
    const res = await axiosInstance.post<ApiEnvelope<CheckoutPreviewData>>('/checkout/preview', payload);
    return res.data;
}

export async function placeOrder(
    payload: CheckoutPayload & { paymentMethod: PaymentMethod; guestEmail?: string }
): Promise<PlaceOrderResponseData> {
    const res = await axiosInstance.post<ApiEnvelope<PlaceOrderResponseData>>(
        '/checkout/place-order',
        payload
    );
    notifyCartUpdated();
    return res.data;
}

export async function fetchOrder(orderNumber: string): Promise<PlaceOrderResponseData> {
    const res = await axiosInstance.get<ApiEnvelope<PlaceOrderResponseData>>(
        `/checkout/orders/${encodeURIComponent(orderNumber)}`
    );
    return res.data;
}

export async function cancelOrder(orderNumber: string): Promise<PlaceOrderResponseData> {
    const res = await axiosInstance.post<ApiEnvelope<PlaceOrderResponseData>>(
        `/checkout/orders/${encodeURIComponent(orderNumber)}/cancel`
    );
    return res.data;
}

export async function requestOrderReturn(orderNumber: string, reason: string): Promise<PlaceOrderResponseData> {
    const res = await axiosInstance.post<ApiEnvelope<PlaceOrderResponseData>>(
        `/checkout/orders/${encodeURIComponent(orderNumber)}/return`,
        { reason }
    );
    return res.data;
}
