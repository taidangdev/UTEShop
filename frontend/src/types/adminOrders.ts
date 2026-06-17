export interface AdminOrderStatusOption {
    status: string;
    label: string;
}

export interface AdminOrderListItem {
    id: number;
    orderNumber: string;
    status: string;
    statusLabel: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    total: number;
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    paymentMethod: string | null;
    paymentStatus: string | null;
    placedAt: string | null;
    paidAt: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
    returnedAt: string | null;
    returnReason: string | null;
    returnRequestedAt: string | null;
    returnApprovedAt: string | null;
    deliveryFailCount: number;
    maxDeliveryAttempts: number;
    deliveryType: string | null;
    itemCount: number;
    allowedNextStatuses: AdminOrderStatusOption[];
}

export interface AdminOrderItem {
    id: number;
    productId: number;
    variantId: number | null;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discountAmount: number;
    promotionId: number | null;
}

export interface AdminOrderPayment {
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
    transactionRef: string | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
    userId: number | null;
    guestEmail: string | null;
    guestPhone: string | null;
    note: string | null;
    adminNote: string | null;
    promotionCode: string | null;
    shippingSnapshot: Record<string, unknown>;
    items: AdminOrderItem[];
    payment: AdminOrderPayment | null;
}

export interface AdminOrderStatusCount {
    status: string;
    label: string;
    count: number;
}

export interface AdminOrdersPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminOrdersListData {
    orders: AdminOrderListItem[];
    pagination: AdminOrdersPagination;
    statusCounts: AdminOrderStatusCount[];
}

export interface AdminOrdersQuery {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
}

export interface UpdateAdminOrderStatusPayload {
    status: string;
    adminNote?: string | null;
}
