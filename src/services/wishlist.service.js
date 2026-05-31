const { Wishlist, Product, Category, ProductImage } = require('../models');

const toggleWishlist = async (userId, productId) => {
    const existing = await Wishlist.findOne({
        where: { userId, productId }
    });

    if (existing) {
        await existing.destroy();
        return { isWishlisted: false, message: 'Đã xóa khỏi danh mục yêu thích' };
    }

    await Wishlist.create({ userId, productId });
    return { isWishlisted: true, message: 'Đã thêm vào danh mục yêu thích' };
};

const getWishlistProducts = async (userId) => {
    const wishlistItems = await Wishlist.findAll({
        where: { userId },
        attributes: ['productId']
    });

    if (wishlistItems.length === 0) return [];

    const productIds = wishlistItems.map((item) => item.productId);

    const products = await Product.findAll({
        where: { id: productIds, status: 'active' },
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
            }
        ]
    });

    return products.map((product) => {
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
            isWishlisted: true
        };
    });
};

module.exports = {
    toggleWishlist,
    getWishlistProducts
};
