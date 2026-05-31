const { Order, OrderItem, Payment, Address, User, Product } = require('../models');
const demoOrderTemplates = require('./data/demoOrders.json');

/**
 * Idempotent seeder: orders for demo@uteshop.local (in-progress + completed).
 */
const seedOrders = async () => {
    try {
        console.log('  Starting to seed orders for demo@uteshop.local...');

        const demoUser = await User.findOne({ where: { email: 'demo@uteshop.local' } });
        if (!demoUser) {
            console.warn('  ! User demo@uteshop.local not found. Skipping order seeding.');
            return;
        }

        const products = await Product.findAll({ where: { status: 'active' } });
        if (products.length === 0) {
            console.warn('  ! No active products. Skipping order seeding.');
            return;
        }

        const productBySlug = new Map(products.map((p) => [p.slug, p]));

        let shippingAddress = await Address.findOne({ where: { userId: demoUser.id } });
        if (!shippingAddress) {
            shippingAddress = await Address.create({
                userId: demoUser.id,
                recipientName: demoUser.fullName || 'Demo Student',
                phone: demoUser.phone || '0987654321',
                line1: 'Ký túc xá Khu A, ĐH Sư phạm Kỹ thuật TP.HCM',
                line2: 'Võ Văn Ngân, Linh Chiểu',
                ward: 'Linh Chiểu',
                district: 'Thủ Đức',
                city: 'Hồ Chí Minh',
                isDefault: true,
                label: 'dorm'
            });
            console.log('    + Created default address for demo user');
        }

        const getDateOffset = (daysAgo) => {
            if (daysAgo === undefined || daysAgo === null) return null;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            return date;
        };

        const resolveItems = (templateItems, fallbackProducts) => {
            const lines = [];
            if (templateItems?.length) {
                for (const row of templateItems) {
                    const prod =
                        productBySlug.get(row.productSlug) ||
                        fallbackProducts.find((p) => p.slug === row.productSlug);
                    if (!prod) {
                        console.warn(`    ! Product slug not found: ${row.productSlug}`);
                        continue;
                    }
                    const qty = row.quantity || 1;
                    const price = Number(prod.price);
                    lines.push({
                        productId: prod.id,
                        productName: prod.name,
                        sku: prod.sku,
                        quantity: qty,
                        unitPrice: price,
                        lineTotal: price * qty
                    });
                }
            }
            if (lines.length === 0) {
                const pick = fallbackProducts[0];
                const price = Number(pick.price);
                lines.push({
                    productId: pick.id,
                    productName: pick.name,
                    sku: pick.sku,
                    quantity: 1,
                    unitPrice: price,
                    lineTotal: price
                });
            }
            return lines;
        };

        const createOrderFromTemplate = async (template, itemsToCreate) => {
            const subtotal = itemsToCreate.reduce((sum, i) => sum + i.lineTotal, 0);
            const shippingFee = template.shippingFee ?? 0;
            const discountAmount = template.discountAmount ?? 0;
            const total = Math.max(0, subtotal + shippingFee - discountAmount);

            const recipientName = demoUser.fullName || demoUser.username || 'Demo Student';
            const phone = demoUser.phone || shippingAddress.phone || '0987654321';

            const shippingSnapshot = {
                fullName: recipientName,
                phone,
                studentId: demoUser.studentId || '21110001',
                deliveryType: template.deliveryType || 'campus',
                street: 'Ký túc xá Khu A, ĐH Sư phạm Kỹ thuật TP.HCM',
                city: 'Hồ Chí Minh',
                state: 'Thủ Đức',
                postalCode: '700000',
                coupon: discountAmount > 0 ? 'MOCKDISCOUNT' : null,
                discountCode: discountAmount > 0 ? 'STUDENT15' : null,
                appliedDiscountCode: discountAmount > 0 ? 'STUDENT15' : null
            };

            const order = await Order.create({
                orderNumber: template.orderNumber,
                userId: demoUser.id,
                guestEmail: null,
                guestPhone: phone,
                shippingAddressId: shippingAddress.id,
                shippingSnapshot,
                status: template.status,
                subtotal,
                discountAmount,
                shippingFee,
                total,
                note: template.note || 'Đơn hàng demo UTEShop.',
                adminNote: template.adminNote || null,
                placedAt: getDateOffset(template.daysAgo),
                paidAt: getDateOffset(template.paidDaysAgo),
                shippedAt: getDateOffset(template.shippedDaysAgo),
                deliveredAt: getDateOffset(template.deliveredDaysAgo),
                cancelledAt: getDateOffset(template.cancelledDaysAgo)
            });

            for (const item of itemsToCreate) {
                await OrderItem.create({
                    orderId: order.id,
                    productId: item.productId,
                    variantId: null,
                    productName: item.productName,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.lineTotal
                });
            }

            await Payment.create({
                orderId: order.id,
                method: template.paymentMethod,
                status: template.paymentStatus,
                amount: total,
                transactionRef:
                    template.paymentStatus === 'paid'
                        ? `TXN-DEMO-${order.id}-${Date.now().toString(36).toUpperCase()}`
                        : null,
                paidAt: getDateOffset(template.paidDaysAgo)
            });

            return order;
        };

        let seededCount = 0;
        let skipCount = 0;

        for (const template of demoOrderTemplates) {
            const existing = await Order.findOne({
                where: { orderNumber: template.orderNumber }
            });
            if (existing) {
                skipCount++;
                continue;
            }

            const itemsToCreate = resolveItems(template.items, products);
            await createOrderFromTemplate(template, itemsToCreate);
            seededCount++;
            console.log(`    + ${template.orderNumber} (${template.status})`);
        }

        console.log(
            `    Demo orders: ${seededCount} created, ${skipCount} skipped (already exist).`
        );
        console.log(
            '    Status mix: pending/confirmed/processing/shipping = chưa hoàn thành; delivered = đã giao.'
        );
    } catch (error) {
        console.error('  ! Failed to seed orders:', error);
        throw error;
    }
};

module.exports = { seedOrders };
