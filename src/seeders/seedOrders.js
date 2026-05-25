const { Order, OrderItem, Payment, Address, User, Product } = require('../models');

/**
 * Idempotent seeder for Orders, OrderItems, and Payments.
 * Simulates real-world scenario orders with diverse statuses and payment configurations.
 */
const seedOrders = async () => {
    try {
        console.log('  Starting to seed orders...');

        // 1. Get user "demo" for member orders
        const demoUser = await User.findOne({ where: { email: 'demo@uteshop.local' } });
        if (!demoUser) {
            console.warn('  ! Warning: User demo@uteshop.local not found. Skipping order seeding.');
            return;
        }

        // 2. Get active products
        const products = await Product.findAll({ where: { status: 'active' } });
        if (products.length === 0) {
            console.warn('  ! Warning: No active products found in DB. Skipping order seeding.');
            return;
        }

        // 3. Ensure "demo" has shipping addresses in addresses table
        let shippingAddress = await Address.findOne({ where: { userId: demoUser.id } });
        if (!shippingAddress) {
            shippingAddress = await Address.create({
                userId: demoUser.id,
                recipientName: 'Demo Student',
                phone: '0987654321',
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

        // 4. Set up mock order data structures
        const orderTemplates = [
            {
                orderNumber: 'UTE-20260525-0001',
                status: 'pending',
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 0,
                daysAgo: 1
            },
            {
                orderNumber: 'UTE-20260525-0002',
                status: 'pending',
                paymentMethod: 'bank_transfer',
                paymentStatus: 'pending',
                deliveryType: 'campus',
                shippingFee: 0,
                discountAmount: 15, // Student discount
                daysAgo: 1
            },
            {
                orderNumber: 'UTE-20260525-0003',
                status: 'confirmed',
                paymentMethod: 'bank_transfer',
                paymentStatus: 'paid',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 0,
                daysAgo: 2,
                paidDaysAgo: 2
            },
            {
                orderNumber: 'UTE-20260525-0004',
                status: 'confirmed',
                paymentMethod: 'vnpay',
                paymentStatus: 'paid',
                deliveryType: 'campus',
                shippingFee: 0,
                discountAmount: 10,
                daysAgo: 2,
                paidDaysAgo: 2
            },
            {
                orderNumber: 'UTE-20260525-0005',
                status: 'processing',
                paymentMethod: 'vnpay',
                paymentStatus: 'paid',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 0,
                daysAgo: 3,
                paidDaysAgo: 3
            },
            {
                orderNumber: 'UTE-20260525-0006',
                status: 'shipping',
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 5,
                daysAgo: 4,
                shippedDaysAgo: 1
            },
            {
                orderNumber: 'UTE-20260525-0007',
                status: 'shipping',
                paymentMethod: 'momo',
                paymentStatus: 'paid',
                deliveryType: 'campus',
                shippingFee: 0,
                discountAmount: 15,
                daysAgo: 4,
                paidDaysAgo: 4,
                shippedDaysAgo: 1
            },
            {
                orderNumber: 'UTE-20260525-0008',
                status: 'delivered',
                paymentMethod: 'cod',
                paymentStatus: 'paid',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 0,
                daysAgo: 7,
                shippedDaysAgo: 5,
                deliveredDaysAgo: 4,
                paidDaysAgo: 4 // COD paid when delivered
            },
            {
                orderNumber: 'UTE-20260525-0009',
                status: 'delivered',
                paymentMethod: 'vnpay',
                paymentStatus: 'paid',
                deliveryType: 'campus',
                shippingFee: 0,
                discountAmount: 20,
                daysAgo: 8,
                paidDaysAgo: 8,
                shippedDaysAgo: 6,
                deliveredDaysAgo: 5
            },
            {
                orderNumber: 'UTE-20260525-0010',
                status: 'cancelled',
                paymentMethod: 'cod',
                paymentStatus: 'pending',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 0,
                daysAgo: 5,
                cancelledDaysAgo: 4,
                adminNote: 'Khách hàng yêu cầu hủy đơn hàng qua hotline.'
            },
            {
                orderNumber: 'UTE-20260525-0011',
                status: 'cancelled',
                paymentMethod: 'bank_transfer',
                paymentStatus: 'failed',
                deliveryType: 'campus',
                shippingFee: 0,
                discountAmount: 0,
                daysAgo: 6,
                cancelledDaysAgo: 5,
                adminNote: 'Hủy đơn tự động do quá thời gian chuyển khoản 24h.'
            },
            {
                orderNumber: 'UTE-20260525-0012',
                status: 'refunded',
                paymentMethod: 'momo',
                paymentStatus: 'refunded',
                deliveryType: 'home',
                shippingFee: 12,
                discountAmount: 15,
                daysAgo: 10,
                paidDaysAgo: 10,
                shippedDaysAgo: 8,
                deliveredDaysAgo: 7,
                cancelledDaysAgo: 6, // Refund/Cancellation date
                adminNote: 'Sản phẩm lỗi kỹ thuật, đã hoàn tiền 100% qua ví MoMo.'
            }
        ];

        // Helper to get time offset
        const getDateOffset = (daysAgo) => {
            if (daysAgo === undefined) return null;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            return date;
        };

        let seededCount = 0;
        let skipCount = 0;

        for (const template of orderTemplates) {
            // Check if order already exists
            const existingOrder = await Order.findOne({ where: { orderNumber: template.orderNumber } });
            if (existingOrder) {
                skipCount++;
                continue;
            }

            // Pick 1-3 random products to purchase
            const orderProductCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 products
            const selectedProducts = [];
            const productPool = [...products];

            for (let i = 0; i < orderProductCount; i++) {
                if (productPool.length === 0) break;
                const randomIndex = Math.floor(Math.random() * productPool.length);
                selectedProducts.push(productPool.splice(randomIndex, 1)[0]);
            }

            // Build shipping snapshot
            const shippingSnapshot = {
                fullName: 'Demo Student',
                phone: '0987654321',
                studentId: '21110001',
                deliveryType: template.deliveryType,
                street: 'Ký túc xá Khu A, ĐH Sư phạm Kỹ thuật TP.HCM',
                city: 'Hồ Chí Minh',
                state: 'Thủ Đức',
                postalCode: '700000',
                coupon: template.discountAmount > 0 ? 'MOCKDISCOUNT' : null,
                discountCode: template.discountAmount > 0 ? 'STUDENT15' : null,
                appliedDiscountCode: template.discountAmount > 0 ? 'STUDENT15' : null
            };

            // Calculate money figures
            let subtotal = 0;
            const itemsToCreate = [];

            for (const prod of selectedProducts) {
                const qty = Math.floor(Math.random() * 2) + 1; // 1 to 2 items
                const price = Number(prod.price);
                const lineTotal = price * qty;
                subtotal += lineTotal;

                itemsToCreate.push({
                    productId: prod.id,
                    productName: prod.name,
                    sku: prod.sku,
                    quantity: qty,
                    unitPrice: price,
                    lineTotal: lineTotal
                });
            }

            const shippingFee = template.shippingFee;
            const discountAmount = template.discountAmount;
            const total = Math.max(0, subtotal + shippingFee - discountAmount);

            // Create Order
            const order = await Order.create({
                orderNumber: template.orderNumber,
                userId: demoUser.id,
                guestEmail: null,
                guestPhone: shippingAddress.phone,
                shippingAddressId: shippingAddress.id,
                shippingSnapshot: shippingSnapshot,
                status: template.status,
                subtotal: subtotal,
                discountAmount: discountAmount,
                shippingFee: shippingFee,
                total: total,
                note: 'Đơn hàng thử nghiệm giao diện.',
                adminNote: template.adminNote || null,
                placedAt: getDateOffset(template.daysAgo),
                paidAt: getDateOffset(template.paidDaysAgo),
                shippedAt: getDateOffset(template.shippedDaysAgo),
                deliveredAt: getDateOffset(template.deliveredDaysAgo),
                cancelledAt: getDateOffset(template.cancelledDaysAgo)
            });

            // Create OrderItems
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

            // Create Payment
            await Payment.create({
                orderId: order.id,
                method: template.paymentMethod,
                status: template.paymentStatus,
                amount: total,
                transactionRef: template.paymentStatus === 'paid' ? `TXN-${Math.floor(100000 + Math.random() * 900000)}` : null,
                paidAt: getDateOffset(template.paidDaysAgo)
            });

            seededCount++;
        }

        console.log(`    Successfully seeded: ${seededCount} orders, skipped ${skipCount} existing orders.`);
    } catch (error) {
        console.error('  ! Failed to seed orders:', error);
        throw error;
    }
};

module.exports = { seedOrders };
