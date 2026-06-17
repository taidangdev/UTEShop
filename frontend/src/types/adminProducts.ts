export interface AdminProductCategory {
    id: number;
    name: string;
    slug: string;
    parentName?: string | null;
}

export interface AdminProductListItem {
    id: number;
    sku: string | null;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    stockQuantity: number;
    status: string;
    statusLabel: string;
    condition: string;
    productType: string;
    isFeatured: boolean;
    soldCount: number;
    viewCount: number;
    imageUrl: string | null;
    category: AdminProductCategory | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminProductImage {
    id?: number;
    url: string;
    altText?: string;
    sortOrder?: number;
    isPrimary?: boolean;
}

export interface AdminProductMajor {
    id: number;
    code: string;
    name: string;
}

export interface AdminProductDetail extends AdminProductListItem {
    shortDescription: string | null;
    description: string | null;
    costPrice: number | null;
    lowStockThreshold: number;
    weightGrams: number | null;
    tags: string[];
    attributes: Record<string, unknown>;
    publishedAt: string | null;
    images: AdminProductImage[];
    majors: AdminProductMajor[];
}

export interface AdminProductStatusCount {
    status: string;
    label: string;
    count: number;
}

export interface AdminProductsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminProductsListData {
    products: AdminProductListItem[];
    pagination: AdminProductsPagination;
    statusCounts: AdminProductStatusCount[];
}

export interface AdminProductsQuery {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    categoryId?: number;
}

export interface AdminProductFormCategory {
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
    parentName: string | null;
    label: string;
}

export interface AdminProductFormOptions {
    categories: AdminProductFormCategory[];
    majors: AdminProductMajor[];
    statuses: Array<{ value: string; label: string }>;
    conditions: string[];
    productTypes: string[];
}

export interface AdminProductPayload {
    categoryId: number;
    name: string;
    slug?: string | null;
    sku?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    stockQuantity: number;
    lowStockThreshold?: number;
    condition?: string;
    productType?: string;
    status?: string;
    isFeatured?: boolean;
    weightGrams?: number | null;
    tags?: string[];
    attributes?: Record<string, unknown>;
    majorIds?: number[];
    images?: AdminProductImage[];
}

export interface AdminProductFormState {
    categoryId: string;
    name: string;
    slug: string;
    sku: string;
    shortDescription: string;
    description: string;
    price: string;
    compareAtPrice: string;
    costPrice: string;
    stockQuantity: string;
    lowStockThreshold: string;
    condition: string;
    productType: string;
    status: string;
    isFeatured: boolean;
    imageUrl: string;
    tags: string;
    majorIds: number[];
}

export const EMPTY_PRODUCT_FORM: AdminProductFormState = {
    categoryId: '',
    name: '',
    slug: '',
    sku: '',
    shortDescription: '',
    description: '',
    price: '',
    compareAtPrice: '',
    costPrice: '',
    stockQuantity: '0',
    lowStockThreshold: '5',
    condition: 'new',
    productType: 'standard',
    status: 'draft',
    isFeatured: false,
    imageUrl: '',
    tags: '',
    majorIds: []
};
