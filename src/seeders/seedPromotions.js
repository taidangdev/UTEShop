const {
    Promotion,
    PromotionCategory,
    PromotionProduct,
    Product,
    Category
} = require('../models');
const promotions = require('./data/promotions.json');

async function resolveCategoryIds(slugs, categorySlugToId) {
    const ids = [];
    for (const slug of slugs || []) {
        const id = categorySlugToId?.[slug];
        if (id) ids.push(id);
        else {
            const cat = await Category.findOne({ where: { slug } });
            if (cat) ids.push(cat.id);
        }
    }
    return [...new Set(ids)];
}

async function resolveProductIds(slugs) {
    const ids = [];
    for (const slug of slugs || []) {
        const product = await Product.findOne({ where: { slug } });
        if (product) ids.push(product.id);
        else console.warn(`  ! promotion seed: product slug not found: ${slug}`);
    }
    return [...new Set(ids)];
}

const seedPromotions = async (categorySlugToId) => {
    for (const row of promotions) {
        const {
            categorySlug,
            categorySlugs,
            productSlugs,
            scope: rowScope,
            ...data
        } = row;

        const scope =
            rowScope ||
            (productSlugs?.length ? 'product' : categorySlug || categorySlugs?.length ? 'category' : 'shop');

        const legacyCategoryId = categorySlug
            ? categorySlugToId?.[categorySlug] ?? null
            : null;

        const [promo, created] = await Promotion.findOrCreate({
            where: { code: data.code },
            defaults: {
                ...data,
                scope,
                categoryId: legacyCategoryId
            }
        });

        if (!created) {
            await promo.update({
                ...data,
                scope,
                categoryId: legacyCategoryId ?? promo.categoryId
            });
        }

        if (scope === 'category') {
            const slugs = categorySlugs?.length
                ? categorySlugs
                : categorySlug
                  ? [categorySlug]
                  : [];
            const categoryIds = await resolveCategoryIds(slugs, categorySlugToId);
            if (legacyCategoryId && !categoryIds.includes(legacyCategoryId)) {
                categoryIds.push(legacyCategoryId);
            }

            await PromotionCategory.destroy({ where: { promotionId: promo.id } });
            for (const categoryId of categoryIds) {
                await PromotionCategory.findOrCreate({
                    where: { promotionId: promo.id, categoryId },
                    defaults: { promotionId: promo.id, categoryId }
                });
            }
            await PromotionProduct.destroy({ where: { promotionId: promo.id } });
        } else if (scope === 'product') {
            const productIds = await resolveProductIds(productSlugs);
            await PromotionProduct.destroy({ where: { promotionId: promo.id } });
            for (const productId of productIds) {
                await PromotionProduct.findOrCreate({
                    where: { promotionId: promo.id, productId },
                    defaults: { promotionId: promo.id, productId }
                });
            }
            await PromotionCategory.destroy({ where: { promotionId: promo.id } });
        } else {
            await PromotionCategory.destroy({ where: { promotionId: promo.id } });
            await PromotionProduct.destroy({ where: { promotionId: promo.id } });
        }

        console.log(`  ${created ? '+' : '·'} promotion: ${data.code} (${scope})`);
    }
};

module.exports = { seedPromotions };
