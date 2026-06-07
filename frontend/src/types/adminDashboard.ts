export interface AdminRangeInfo {
    from: string;
    to: string;
    groupBy: 'day' | 'month';
    selectedStatus: string;
}

export interface AdminOverview {
    totalOrders: number;
    totalRevenue: number;
    shippingValue: number;
    deliveredValue: number;
    newCustomers: number;
}

export interface AdminOrderRow {
    id: number;
    orderNumber: string;
    status: string;
    statusLabel: string;
    customerName: string;
    total: number;
    paymentMethod: string | null;
    paymentStatus: string | null;
    placedAt: string | null;
    deliveredAt: string | null;
    deliveryType: string | null;
}

export interface AdminOrderStatusItem {
    status: string;
    label: string;
    count: number;
}

export interface AdminOrderStats {
    total: number;
    byStatus: AdminOrderStatusItem[];
    orders: AdminOrderRow[];
    groupedOrders: Record<string, AdminOrderRow[]>;
}

export interface AdminCashflow {
    inTransitAmount: number;
    settledAmount: number;
    inTransitOrders: number;
    settledOrders: number;
    shippingOrders: AdminOrderRow[];
    deliveredOrders: AdminOrderRow[];
}

export interface AdminRevenuePoint {
    bucket: string;
    revenue: number;
    orderCount: number;
}

export interface AdminTopProduct {
    rank: number;
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
}

export interface AdminDashboardData {
    range: AdminRangeInfo;
    overview: AdminOverview;
    orderStats: AdminOrderStats;
    cashflow: AdminCashflow;
    revenueSeries: AdminRevenuePoint[];
    topProducts: AdminTopProduct[];
}
