export interface ConsignmentImage {
    id: number;
    url: string;
}

export interface ConsignmentCategory {
    id: number;
    name: string;
    slug: string;
}

export interface ConsignmentProduct {
    id: number;
    name: string;
    slug: string;
    price: number;
    status: string;
}

export interface Consignment {
    id: number;
    userId: number;
    title: string;
    description: string | null;
    categoryId: number;
    suggestedPrice: number;
    approvedPrice: number | null;
    condition: 'new' | 'like_new' | 'used' | 'refurbished';
    status:
        | 'PENDING'
        | 'APPROVED_SHIPPING'
        | 'RECEIVED'
        | 'ON_SALE'
        | 'SOLD'
        | 'COMPLETED'
        | 'RETURNED'
        | 'REJECTED';
    adminNote: string | null;
    productId: number | null;
    contactPhone: string | null;
    consignmentFee: number | null;
    receiveAmount: number | null;
    createdAt: string;
    updatedAt: string;
    images?: ConsignmentImage[];
    category?: ConsignmentCategory;
    product?: ConsignmentProduct;
    user?: {
        id: number;
        username: string;
        fullName: string | null;
        email: string;
        phone: string | null;
    } | null;
}

export interface ConsignmentCategoryOption {
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
    parentName: string | null;
    label: string;
}

export interface ConsignmentFormOptions {
    categories: ConsignmentCategoryOption[];
}

export interface CreateConsignmentPayload {
    title: string;
    description?: string;
    categoryId: number;
    suggestedPrice: number;
    condition: 'new' | 'like_new' | 'used' | 'refurbished';
    contactPhone?: string;
    images?: string[];
}
