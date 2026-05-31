const { Op } = require('sequelize');
const { Order, OrderItem, Product, ProductReview, User } = require('../models');
const reviewTemplates = require('./data/reviewTemplates.json');

const REVIEWER_EMAILS = [
    'reviewer1@uteshop.local',
    'reviewer2@uteshop.local',
    'reviewer3@uteshop.local'
];

function pickTemplate(index) {
    return reviewTemplates[index % reviewTemplates.length];
}

function orderNumberForReviewer(email) {
    const slug = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `SEED-REV-${slug}`;
}

/**
 * Creates delivered seed orders + approved reviews so product pages show real data.
 * Idempotent per orderItemId / orderNumber.
 */
const seedReviews = async () => {
    console.log('  Starting to seed product reviews...');

    const reviewers = await User.findAll({
        where: { email: { [Op.in]: REVIEWER_EMAILS } }
    });

    if (reviewers.length === 0) {
        console.warn('  ! No reviewer users found. Add reviewer1-3@uteshop.local to users.json first.');
        return;
    }

    const products = await Product.findAll({
        where: { status: 'active' },
        order: [
            ['soldCount', 'DESC'],
            ['id', 'ASC']
        ],
        limit: 18
    });

    if (products.length === 0) {
        console.warn('  ! No active products. Skipping review seeding.');
        return;
    }

    const assignments = new Map();
    reviewers.forEach((r) => assignments.set(r.id, []));

    products.forEach((product, index) => {
        const reviewer = reviewers[index % reviewers.length];
        assignments.get(reviewer.id).push(product);
    });

    let createdReviews = 0;
    let skippedReviews = 0;

    for (const reviewer of reviewers) {
        const assignedProducts = assignments.get(reviewer.id) || [];
        if (assignedProducts.length === 0) continue;

        const orderNumber = orderNumberForReviewer(reviewer.email);
        let order = await Order.findOne({ where: { orderNumber } });

        if (!order) {
            const placedAt = new Date();
            placedAt.setDate(placedAt.getDate() - 14);

            let subtotal = 0;
            const itemsPayload = assignedProducts.map((prod) => {
                const price = Number(prod.price);
                const qty = 1;
                const lineTotal = price * qty;
                subtotal += lineTotal;
                return {
                    productId: prod.id,
                    productName: prod.name,
                    sku: prod.sku,
                    quantity: qty,
                    unitPrice: price,
                    lineTotal
                };
            });

            order = await Order.create({
                orderNumber,
                userId: reviewer.id,
                guestEmail: null,
                guestPhone: null,
                shippingAddressId: null,
                shippingSnapshot: {
                    fullName: reviewer.fullName || reviewer.username,
                    phone: '0900000000',
                    deliveryType: 'campus',
                    street: 'Campus pickup — Engineering Building',
                    city: 'Ho Chi Minh City',
                    state: 'Thu Duc',
                    postalCode: '700000'
                },
                status: 'delivered',
                subtotal,
                discountAmount: 0,
                shippingFee: 0,
                total: subtotal,
                note: 'Seed order for product reviews',
                placedAt,
                paidAt: placedAt,
                shippedAt: placedAt,
                deliveredAt: placedAt
            });

            for (const item of itemsPayload) {
                await OrderItem.create({
                    orderId: order.id,
                    ...item
                });
            }

            console.log(`    + Seed review order ${orderNumber} (${itemsPayload.length} items)`);
        }

        const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });

        for (let i = 0; i < orderItems.length; i += 1) {
            const orderItem = orderItems[i];
            const existing = await ProductReview.findOne({
                where: { orderItemId: orderItem.id }
            });

            if (existing) {
                skippedReviews += 1;
                continue;
            }

            const template = pickTemplate(createdReviews + i);
            const rewardType = i % 2 === 0 ? 'points' : 'coupon';

            await ProductReview.create({
                productId: orderItem.productId,
                userId: reviewer.id,
                orderId: order.id,
                orderItemId: orderItem.id,
                rating: template.rating,
                title: template.title,
                comment: template.comment,
                status: 'approved',
                rewardType,
                rewardGrantedAt: new Date(),
                rewardPayload:
                    rewardType === 'points'
                        ? { points: 50 }
                        : { couponCode: `SEED-${orderItem.id}`, percent: 10 }
            });

            createdReviews += 1;
        }
    }

    console.log(
        `    Reviews: ${createdReviews} created, ${skippedReviews} skipped (already exist).`
    );
};

module.exports = { seedReviews };
