const { Op } = require('sequelize');
const { Product, Category, ProductImage, Major, ProductReview, User, Banner, Wishlist, OrderItem, Order, sequelize } = require('../models');

async function resolveCategoryIds(categorySlug) {
    if (!categorySlug || categorySlug === 'all') return null;

    const category = await Category.findOne({
        where: { slug: categorySlug, isActive: true }
    });
    if (!category) return [];

    if (category.parentId) {
        return [category.id];
    }

    const children = await Category.findAll({
        where: { parentId: category.id, isActive: true },
        attributes: ['id']
    });
    if (children.length > 0) {
        return children.map((c) => c.id);
    }
    return [category.id];
}

function mapProductRow(product, wishlistIds = new Set()) {
    const json = product.toJSON ? product.toJSON() : product;
    const primaryImage =
        json.images?.find((img) => img.isPrimary) || json.images?.[0] || null;
    const parentCategory = json.category?.parent || null;
    const leafCategory = json.category;

    return {
        id: json.id,
        name: json.name,
        slug: json.slug,
        shortDescription: json.shortDescription,
        price: Number(json.price),
        compareAtPrice: json.compareAtPrice != null ? Number(json.compareAtPrice) : null,
        isFeatured: json.isFeatured,
        condition: json.condition,
        soldCount: json.soldCount ?? 0,
        viewCount: json.viewCount ?? 0,
        imageUrl: primaryImage?.url || null,
        imageAlt: primaryImage?.altText || json.name,
        category: leafCategory
            ? {
                  id: leafCategory.id,
                  name: leafCategory.name,
                  slug: leafCategory.slug,
                  parentName: parentCategory?.name || null
              }
            : null,
        majors: (json.majors || []).map((m) => ({ id: m.id, code: m.code, name: m.name })),
        isWishlisted: wishlistIds.has(json.id)
    };
}

const listCategoriesWithCounts = async () => {
    const parents = await Category.findAll({
        where: { parentId: null, isActive: true },
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    const activeProductWhere = { status: 'active' };

    const total = await Product.count({ where: activeProductWhere });

    const categories = [
        {
            slug: 'all',
            name: 'All Products',
            productCount: total
        }
    ];

    for (const parent of parents) {
        const childRows = await Category.findAll({
            where: { parentId: parent.id, isActive: true },
            attributes: ['id']
        });
        const ids = childRows.length > 0 ? childRows.map((c) => c.id) : [parent.id];
        const productCount = await Product.count({
            where: { ...activeProductWhere, categoryId: { [Op.in]: ids } }
        });
        categories.push({
            slug: parent.slug,
            name: parent.name,
            productCount
        });
    }

    return { categories, total };
};

const listProducts = async ({
    q,
    categorySlug,
    majorId,
    sort = 'newest',
    page = 1,
    limit = 12,
    featured,
    userId
}) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const wishlistIds = userId
        ? new Set((await Wishlist.findAll({ where: { userId }, attributes: ['productId'] })).map((w) => w.productId))
        : new Set();

    const where = { status: 'active' };

    if (featured === true || featured === 'true' || featured === 1 || featured === '1') {
        where.isFeatured = true;
    }

    const categoryIds = await resolveCategoryIds(categorySlug);
    if (categoryIds !== null) {
        if (categoryIds.length === 0) {
            return {
                products: [],
                pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 }
            };
        }
        where.categoryId = { [Op.in]: categoryIds };
    }

    const trimmedQ = typeof q === 'string' ? q.trim() : '';
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        where[Op.or] = [
            { name: { [Op.like]: like } },
            { shortDescription: { [Op.like]: like } },
            { description: { [Op.like]: like } },
            { sku: { [Op.like]: like } }
        ];
    }

    let order = [['createdAt', 'DESC']];
    switch (sort) {
        case 'price_asc':
            order = [['price', 'ASC']];
            break;
        case 'price_desc':
            order = [['price', 'DESC']];
            break;
        case 'popular':
            order = [
                ['soldCount', 'DESC'],
                ['viewCount', 'DESC']
            ];
            break;
        case 'best_seller':
            order = [['soldCount', 'DESC']];
            break;
        case 'most_viewed':
            order = [['viewCount', 'DESC']];
            break;
        default:
            order = [['createdAt', 'DESC']];
    }

    const include = [
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
            attributes: ['id', 'url', 'altText', 'isPrimary', 'sortOrder'],
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

    if (majorId) {
        include[2].where = { id: majorId };
        include[2].required = true;
    }

    const { rows, count } = await Product.findAndCountAll({
        where,
        include,
        order,
        limit: limitNum,
        offset,
        distinct: true
    });

    return {
        products: rows.map((r) => mapProductRow(r, wishlistIds)),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages: Math.ceil(count / limitNum) || 0
        }
    };
};

function mapProductDetail(product, isWishlisted = false, buyersCount = 0, commentersCount = 0) {
    const json = product.toJSON ? product.toJSON() : product;
    const images = (json.images || []).map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.altText || json.name,
        isPrimary: img.isPrimary
    }));
    const primaryImage = images.find((img) => img.isPrimary) || images[0] || null;
    const parentCategory = json.category?.parent || null;
    const leafCategory = json.category;
    const price = Number(json.price);
    const compareAtPrice =
        json.compareAtPrice != null ? Number(json.compareAtPrice) : null;
    const discountPercent =
        compareAtPrice && compareAtPrice > price
            ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
            : null;

    const approvedReviews = (json.reviews || []).filter((r) => r.status === 'approved');
    const reviewCount = approvedReviews.length;
    const averageRating =
        reviewCount > 0
            ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
            : null;

    return {
        id: json.id,
        name: json.name,
        slug: json.slug,
        sku: json.sku,
        shortDescription: json.shortDescription,
        description: json.description,
        price,
        compareAtPrice,
        discountPercent,
        stockQuantity: json.stockQuantity,
        lowStockThreshold: json.lowStockThreshold ?? 5,
        condition: json.condition,
        isFeatured: json.isFeatured,
        soldCount: json.soldCount ?? 0,
        viewCount: json.viewCount ?? 0,
        productType: json.productType,
        tags: json.tags || [],
        attributes: json.attributes || {},
        imageUrl: primaryImage?.url || null,
        images,
        category: leafCategory
            ? {
                  id: leafCategory.id,
                  name: leafCategory.name,
                  slug: leafCategory.slug,
                  parent: parentCategory
                      ? {
                            id: parentCategory.id,
                            name: parentCategory.name,
                            slug: parentCategory.slug
                        }
                      : null
              }
            : null,
        majors: (json.majors || []).map((m) => ({ id: m.id, code: m.code, name: m.name })),
        reviews: approvedReviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user
                ? {
                      id: r.user.id,
                      fullName: r.user.fullName,
                      username: r.user.username
                  }
                : null
        })),
        reviewSummary: {
            average: averageRating,
            count: reviewCount
        },
        isWishlisted,
        buyersCount,
        commentersCount
    };
}

const productListInclude = [
    {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'url', 'altText', 'isPrimary', 'sortOrder'],
        separate: true,
        order: [
            ['isPrimary', 'DESC'],
            ['sortOrder', 'ASC']
        ]
    },
    {
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug', 'parentId'],
        required: false,
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
        model: Major,
        as: 'majors',
        attributes: ['id', 'code', 'name'],
        through: { attributes: [] },
        required: false
    }
];

const getSimilarProducts = async (productId, categoryId, limit = 4) => {
    if (!categoryId) return [];

    const rows = await Product.findAll({
        where: {
            status: 'active',
            id: { [Op.ne]: productId },
            categoryId
        },
        include: productListInclude,
        order: [
            ['soldCount', 'DESC'],
            ['viewCount', 'DESC'],
            ['createdAt', 'DESC']
        ],
        limit: Math.min(12, Math.max(1, parseInt(limit, 10) || 4))
    });

    return rows.map((r) => mapProductRow(r));
};

const getProductBySlug = async (slug, userId) => {
    const product = await Product.findOne({
        where: { slug, status: 'active' },
        include: [
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
                attributes: ['id', 'url', 'altText', 'isPrimary', 'sortOrder'],
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
                through: { attributes: [] }
            },
            {
                model: ProductReview,
                as: 'reviews',
                where: { status: 'approved' },
                required: false,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'fullName', 'username', 'majorId'],
                        required: false
                    }
                ]
            }
        ]
    });

    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    await product.increment('viewCount');

    const isWishlisted = userId
        ? Boolean(await Wishlist.findOne({ where: { userId, productId: product.id } }))
        : false;

    const buyersQuery = await sequelize.query(`
        SELECT COUNT(DISTINCT IFNULL(o.userId, o.guestEmail)) as count
        FROM order_items oi
        JOIN orders o ON oi.orderId = o.id
        WHERE oi.productId = :productId
          AND o.status NOT IN ('cancelled', 'refunded')
    `, {
        replacements: { productId: product.id },
        type: sequelize.QueryTypes.SELECT
    });
    const buyersCount = buyersQuery[0]?.count || 0;

    const commentersCount = await ProductReview.count({
        distinct: true,
        col: 'userId',
        where: {
            productId: product.id,
            status: 'approved'
        }
    });

    const mapped = mapProductDetail(product, isWishlisted, buyersCount, commentersCount);
    const similarProducts = await getSimilarProducts(
        mapped.id,
        product.categoryId,
        4
    );

    return { product: mapped, similarProducts };
};

const listActiveBanners = async () => {
    const now = new Date();
    const rows = await Banner.findAll({
        where: {
            isActive: true,
            [Op.and]: [
                {
                    [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }]
                },
                {
                    [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }]
                }
            ]
        },
        order: [
            ['sortOrder', 'ASC'],
            ['id', 'ASC']
        ]
    });

    return rows.map((b) => {
        const json = b.toJSON ? b.toJSON() : b;
        return {
            id: json.id,
            title: json.title,
            subtitle: json.subtitle,
            imageUrl: json.imageUrl,
            linkUrl: json.linkUrl,
            badgeText: json.badgeText,
            placement: json.placement
        };
    });
};

const getHomePageData = async (userId) => {
    const [banners, categoriesData, featured, newest, bestSellers, mostViewed, majors] = await Promise.all([
        listActiveBanners(),
        listCategoriesWithCounts(),
        listProducts({ featured: true, limit: 3, sort: 'newest', userId }),
        listProducts({ limit: 4, sort: 'newest', userId }),
        listProducts({ limit: 10, sort: 'best_seller', userId }),
        listProducts({ limit: 10, sort: 'most_viewed', userId }),
        Major.findAll({
            where: { isActive: true },
            order: [
                ['sortOrder', 'ASC'],
                ['name', 'ASC']
            ],
            attributes: ['id', 'code', 'name']
        })
    ]);

    const shopCategories = categoriesData.categories.filter((c) => c.slug !== 'all');

    return {
        banners,
        categories: shopCategories,
        featured: featured.products,
        newest: newest.products,
        bestSellers: bestSellers.products,
        mostViewed: mostViewed.products,
        majors: majors.map((m) => m.toJSON())
    };
};

module.exports = {
    listCategoriesWithCounts,
    listProducts,
    getProductBySlug,
    getSimilarProducts,
    listActiveBanners,
    getHomePageData
};
