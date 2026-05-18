export interface ProductCategory {
    id: number;
    name: string;
    slug: string;
    parentName?: string | null;
    parent?: { id: number; name: string; slug: string } | null;
}

export interface ProductMajor {
    id: number;
    code: string;
    name: string;
}

export interface CatalogProduct {
    id: number;
    name: string;
    slug: string;
    shortDescription?: string | null;
    description?: string | null;
    sku?: string | null;
    price: number;
    compareAtPrice?: number | null;
    discountPercent?: number | null;
    stockQuantity?: number;
    lowStockThreshold?: number;
    soldCount?: number;
    viewCount?: number;
    condition?: string;
    isFeatured?: boolean;
    productType?: string;
    tags?: string[];
    attributes?: Record<string, unknown>;
    imageUrl?: string | null;
    imageAlt?: string;
    images?: Array<{ id?: number; url: string; altText?: string; isPrimary?: boolean }>;
    category?: ProductCategory | null;
    majors?: ProductMajor[];
}

export interface CategoryWithCount {
    slug: string;
    name: string;
    productCount: number;
}

export interface Major {
    id: number;
    code: string;
    name: string;
}

export interface ProductReview {
    id: number | string;
    rating: number;
    comment?: string | null;
    title?: string;
    subtitle?: string;
    user?: { id?: number; fullName?: string | null; username?: string | null } | null;
}

export interface ProductDetail extends CatalogProduct {
    reviews?: ProductReview[];
    reviewSummary?: { average: number | null; count: number };
}

export interface ProductDetailResponse {
    product: ProductDetail;
    similarProducts: CatalogProduct[];
}

export interface PromoBanner {
    id: number;
    title: string;
    subtitle?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    badgeText?: string | null;
    placement: 'hero' | 'promo_left' | 'promo_right';
}

export interface HomePageData {
    banners: PromoBanner[];
    categories: CategoryWithCount[];
    featured: CatalogProduct[];
    newest: CatalogProduct[];
    bestSellers: CatalogProduct[];
    mostViewed: CatalogProduct[];
    majors: Major[];
}
