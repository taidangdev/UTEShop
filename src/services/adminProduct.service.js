const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Product, ProductImage, ProductMajor, Category, Major } = require('../models');

const PRODUCT_STATUSES = ['draft', 'active', 'out_of_stock', 'archived'];
const PRODUCT_CONDITIONS = ['new', 'like_new', 'used', 'refurbished'];
const PRODUCT_TYPES = ['standard', 'consignment'];

const STATUS_LABELS = {
    draft: 'Nháp',
    active: 'Đang bán',
    out_of_stock: 'Hết hàng',
    archived: 'Lưu trữ'
};

function toNumber(value) {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
}

function slugify(text) {
    return (
        String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 200) || 'product'
    );
}

async function ensureUniqueSlug(baseSlug, excludeId = null, transaction = null) {
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const where = { slug };
        if (excludeId) where.id = { [Op.ne]: excludeId };
        const existing = await Product.findOne({ where, transaction });
        if (!existing) return slug;
        slug = `${baseSlug}-${counter++}`;
    }
}

function resolveStatus(status, stockQuantity) {
    const stock = parseInt(stockQuantity, 10) || 0;
    if (status === 'active' && stock === 0) return 'out_of_stock';
    if (status === 'out_of_stock' && stock > 0) return 'active';
    return status;
}

function mapAdminProductRow(product) {
    const json = product.toJSON ? product.toJSON() : product;
    const primaryImage = json.images?.find((img) => img.isPrimary) || json.images?.[0] || null;
    const parentCategory = json.category?.parent || null;
    const leafCategory = json.category;

    return {
        id: json.id,
        sku: json.sku,
        name: json.name,
        slug: json.slug,
        price: toNumber(json.price),
        compareAtPrice: json.compareAtPrice != null ? toNumber(json.compareAtPrice) : null,
        stockQuantity: json.stockQuantity ?? 0,
        status: json.status,
        statusLabel: STATUS_LABELS[json.status] || json.status,
        condition: json.condition,
        productType: json.productType,
        isFeatured: json.isFeatured,
        soldCount: json.soldCount ?? 0,
        viewCount: json.viewCount ?? 0,
        imageUrl: primaryImage?.url || null,
        category: leafCategory
            ? {
                  id: leafCategory.id,
                  name: leafCategory.name,
                  slug: leafCategory.slug,
                  parentName: parentCategory?.name || null
              }
            : null,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt
    };
}

function mapAdminProductDetail(product) {
    const row = mapAdminProductRow(product);
    const json = product.toJSON ? product.toJSON() : product;

    return {
        ...row,
        shortDescription: json.shortDescription,
        description: json.description,
        costPrice: json.costPrice != null ? toNumber(json.costPrice) : null,
        lowStockThreshold: json.lowStockThreshold ?? 5,
        weightGrams: json.weightGrams,
        tags: json.tags || [],
        attributes: json.attributes || {},
        publishedAt: json.publishedAt,
        images: (json.images || []).map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText || json.name,
            sortOrder: img.sortOrder ?? 0,
            isPrimary: img.isPrimary
        })),
        majors: (json.majors || []).map((m) => ({ id: m.id, code: m.code, name: m.name }))
    };
}

const productIncludes = [
    {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug', 'parentId'],
        include: [
            {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name', 'slug'],
                required: false
            }
        ]
    },
    {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'url', 'altText', 'sortOrder', 'isPrimary'],
        separate: true,
        order: [
            ['isPrimary', 'DESC'],
            ['sortOrder', 'ASC']
        ]
    },
    {
        model: Major,
        as: 'majors',
        attributes: ['id', 'code', 'name'],
        through: { attributes: [] },
        required: false
    }
];

async function getStatusCounts() {
    const rows = await Product.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true
    });
    const countMap = {};
    for (const row of rows) {
        countMap[row.status] = parseInt(row.count, 10) || 0;
    }
    return PRODUCT_STATUSES.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: countMap[status] || 0
    }));
}

async function listProducts({ page = 1, limit = 20, status, search, categoryId } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const where = {};

    if (PRODUCT_STATUSES.includes(status)) {
        where.status = status;
    }

    const parsedCategoryId = parseInt(categoryId, 10);
    if (!Number.isNaN(parsedCategoryId) && parsedCategoryId > 0) {
        where.categoryId = parsedCategoryId;
    }

    const searchTerm = String(search || '').trim();
    if (searchTerm) {
        const like = `%${searchTerm}%`;
        where[Op.or] = [
            { name: { [Op.like]: like } },
            { sku: { [Op.like]: like } },
            { slug: { [Op.like]: like } },
            { shortDescription: { [Op.like]: like } }
        ];
    }

    const { rows, count } = await Product.findAndCountAll({
        where,
        include: productIncludes,
        order: [['updatedAt', 'DESC']],
        limit: safeLimit,
        offset,
        distinct: true
    });

    const statusCounts = await getStatusCounts();

    return {
        products: rows.map((row) => mapAdminProductRow(row)),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: count,
            totalPages: Math.max(1, Math.ceil(count / safeLimit))
        },
        statusCounts
    };
}

async function getProductById(id) {
    const product = await Product.findByPk(id, { include: productIncludes });
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }
    return { product: mapAdminProductDetail(product) };
}

async function getFormOptions() {
    const categories = await Category.findAll({
        where: { isActive: true },
        include: [
            {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name', 'slug'],
                required: false
            }
        ],
        order: [
            ['sortOrder', 'ASC'],
            ['name', 'ASC']
        ]
    });

    const majors = await Major.findAll({
        where: { isActive: true },
        order: [
            ['sortOrder', 'ASC'],
            ['name', 'ASC']
        ]
    });

    return {
        categories: categories.map((category) => {
            const json = category.toJSON();
            const parent = json.parent;
            return {
                id: json.id,
                name: json.name,
                slug: json.slug,
                parentId: json.parentId,
                parentName: parent?.name || null,
                label: parent ? `${parent.name} › ${json.name}` : json.name
            };
        }),
        majors: majors.map((major) => ({
            id: major.id,
            code: major.code,
            name: major.name
        })),
        statuses: PRODUCT_STATUSES.map((value) => ({
            value,
            label: STATUS_LABELS[value]
        })),
        conditions: PRODUCT_CONDITIONS,
        productTypes: PRODUCT_TYPES
    };
}

async function assertCategoryExists(categoryId, transaction) {
    const category = await Category.findByPk(categoryId, { transaction });
    if (!category || !category.isActive) {
        const err = new Error('Category not found');
        err.statusCode = 400;
        throw err;
    }
    return category;
}

async function assertSkuAvailable(sku, excludeId = null, transaction = null) {
    if (!sku) return;
    const where = { sku };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const existing = await Product.findOne({ where, transaction });
    if (existing) {
        const err = new Error('SKU already exists');
        err.statusCode = 400;
        throw err;
    }
}

async function syncProductImages(productId, images, productName, transaction) {
    await ProductImage.destroy({ where: { productId }, transaction });
    if (!images || images.length === 0) return;

    const normalized = images
        .filter((img) => img && img.url)
        .map((img, index) => ({
            productId,
            url: String(img.url).trim(),
            altText: img.altText || productName,
            sortOrder: img.sortOrder ?? index,
            isPrimary: img.isPrimary === true
        }));

    if (normalized.length === 0) return;

    const primaryIndex = normalized.findIndex((img) => img.isPrimary);
    normalized.forEach((img, index) => {
        img.isPrimary = index === (primaryIndex >= 0 ? primaryIndex : 0);
    });

    for (const img of normalized) {
        await ProductImage.create(img, { transaction });
    }
}

async function syncProductMajors(productId, majorIds, transaction) {
    await ProductMajor.destroy({ where: { productId }, transaction });
    for (const majorId of majorIds || []) {
        const parsed = parseInt(majorId, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            await ProductMajor.create({ productId, majorId: parsed }, { transaction });
        }
    }
}

async function createProduct(payload) {
    const transaction = await sequelize.transaction();
    try {
        await assertCategoryExists(payload.categoryId, transaction);
        await assertSkuAvailable(payload.sku, null, transaction);

        const baseSlug = payload.slug?.trim() || slugify(payload.name);
        const slug = await ensureUniqueSlug(baseSlug, null, transaction);
        const stockQuantity = parseInt(payload.stockQuantity, 10) || 0;
        const status = resolveStatus(payload.status || 'draft', stockQuantity);

        const product = await Product.create(
            {
                categoryId: payload.categoryId,
                sku: payload.sku?.trim() || null,
                name: payload.name.trim(),
                slug,
                shortDescription: payload.shortDescription?.trim() || null,
                description: payload.description?.trim() || null,
                price: payload.price,
                compareAtPrice: payload.compareAtPrice ?? null,
                costPrice: payload.costPrice ?? null,
                stockQuantity,
                lowStockThreshold: payload.lowStockThreshold ?? 5,
                condition: payload.condition || 'new',
                productType: payload.productType || 'standard',
                status,
                isFeatured: payload.isFeatured === true,
                weightGrams: payload.weightGrams ?? null,
                tags: payload.tags || [],
                attributes: payload.attributes || {},
                publishedAt: status === 'draft' || status === 'archived' ? null : new Date()
            },
            { transaction }
        );

        await syncProductImages(product.id, payload.images, product.name, transaction);
        await syncProductMajors(product.id, payload.majorIds, transaction);

        await transaction.commit();
        return getProductById(product.id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function updateProduct(id, payload) {
    const transaction = await sequelize.transaction();
    try {
        const product = await Product.findByPk(id, { transaction });
        if (!product) {
            const err = new Error('Product not found');
            err.statusCode = 404;
            throw err;
        }

        if (payload.categoryId != null) {
            await assertCategoryExists(payload.categoryId, transaction);
        }

        if (payload.sku !== undefined) {
            await assertSkuAvailable(payload.sku?.trim() || null, id, transaction);
        }

        const updates = {};

        if (payload.categoryId != null) updates.categoryId = payload.categoryId;
        if (payload.sku !== undefined) updates.sku = payload.sku?.trim() || null;
        if (payload.name != null) updates.name = payload.name.trim();
        if (payload.shortDescription !== undefined) {
            updates.shortDescription = payload.shortDescription?.trim() || null;
        }
        if (payload.description !== undefined) {
            updates.description = payload.description?.trim() || null;
        }
        if (payload.price != null) updates.price = payload.price;
        if (payload.compareAtPrice !== undefined) {
            updates.compareAtPrice = payload.compareAtPrice ?? null;
        }
        if (payload.costPrice !== undefined) updates.costPrice = payload.costPrice ?? null;
        if (payload.stockQuantity != null) {
            updates.stockQuantity = parseInt(payload.stockQuantity, 10) || 0;
        }
        if (payload.lowStockThreshold != null) {
            updates.lowStockThreshold = parseInt(payload.lowStockThreshold, 10) || 5;
        }
        if (payload.condition != null) updates.condition = payload.condition;
        if (payload.productType != null) updates.productType = payload.productType;
        if (payload.isFeatured != null) updates.isFeatured = payload.isFeatured === true;
        if (payload.weightGrams !== undefined) updates.weightGrams = payload.weightGrams ?? null;
        if (payload.tags != null) updates.tags = payload.tags;
        if (payload.attributes != null) updates.attributes = payload.attributes;

        if (payload.slug != null && payload.slug.trim()) {
            updates.slug = await ensureUniqueSlug(payload.slug.trim(), id, transaction);
        } else if (payload.name != null && !payload.slug) {
            updates.slug = await ensureUniqueSlug(slugify(payload.name), id, transaction);
        }

        const nextStock =
            updates.stockQuantity != null ? updates.stockQuantity : product.stockQuantity;
        const nextStatus = payload.status != null ? payload.status : product.status;
        updates.status = resolveStatus(nextStatus, nextStock);

        if (
            updates.status !== 'draft' &&
            updates.status !== 'archived' &&
            !product.publishedAt
        ) {
            updates.publishedAt = new Date();
        }

        await product.update(updates, { transaction });

        if (payload.images != null) {
            await syncProductImages(
                product.id,
                payload.images,
                updates.name || product.name,
                transaction
            );
        }

        if (payload.majorIds != null) {
            await syncProductMajors(product.id, payload.majorIds, transaction);
        }

        await transaction.commit();
        return getProductById(id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function deleteProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }
    await product.update({ status: 'archived' });
    return { product: { id: product.id, status: 'archived', statusLabel: STATUS_LABELS.archived } };
}

module.exports = {
    PRODUCT_STATUSES,
    PRODUCT_CONDITIONS,
    PRODUCT_TYPES,
    STATUS_LABELS,
    listProducts,
    getProductById,
    getFormOptions,
    createProduct,
    updateProduct,
    deleteProduct
};
