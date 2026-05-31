const sequelize = require('../config/db');
const {
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    Address,
    Product,
    ProductVariant
} = require('../models');
const {
    ensureCart,
    resolveProductLine,
    mapCartItemRow,
    assertStock
} = require('./cart.service');
const couponService = require('./coupon.service');
const loyaltyService = require('./loyalty.service');

const HOME_SHIPPING_FEE = 12;

const PAYMENT_METHOD_MAP = {
    cash: 'cod',
    bank_transfer: 'bank_transfer',
    credit_card: 'vnpay'
};

function generateOrderNumber() {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `UTE-${ymd}-${rnd}`;
}

function normalizeInformation(raw = {}) {
    return {
        fullName: String(raw.fullName || '').trim(),
        phone: String(raw.phone || '').trim(),
        studentId: String(raw.studentId || '').trim(),
        deliveryType: raw.deliveryType === 'home' ? 'home' : 'campus',
        street: String(raw.street || '').trim(),
        city: String(raw.city || '').trim(),
        state: String(raw.state || '').trim(),
        postalCode: String(raw.postalCode || '').trim(),
        coupon: raw.coupon || '',
        discountCode: String(raw.discountCode || '').trim(),
        appliedDiscountCode: String(raw.appliedDiscountCode || '').trim(),
        userCouponCode: String(raw.userCouponCode || raw.appliedDiscountCode || '').trim(),
        pointsToRedeem: Math.max(0, parseInt(raw.pointsToRedeem, 10) || 0)
    };
}

function validateInformation(info) {
    if (!info.fullName) {
        const err = new Error('Full name is required');
        err.statusCode = 400;
        throw err;
    }
    if (!info.phone) {
        const err = new Error('Phone number is required');
        err.statusCode = 400;
        throw err;
    }
    if (!info.street) {
        const err = new Error('Street address is required');
        err.statusCode = 400;
        throw err;
    }
    if (!info.city) {
        const err = new Error('City is required');
        err.statusCode = 400;
        throw err;
    }
    if (!info.state) {
        const err = new Error('State / Province is required');
        err.statusCode = 400;
        throw err;
    }
    if (!info.postalCode) {
        const err = new Error('Postal code is required');
        err.statusCode = 400;
        throw err;
    }
}

async function calculateCheckoutTotals(lineItems, information, userId) {
    const subtotal = lineItems.reduce((sum, row) => sum + row.lineTotal, 0);
    let shippingFee = information.deliveryType === 'campus' ? 0 : HOME_SHIPPING_FEE;
    let discountAmount = 0;
    let appliedUserCouponId = null;
    let pointsRedeemed = 0;
    let pointsDiscount = 0;
    let userCouponCode = null;

    if (information.coupon === 'FREESHIP') {
        shippingFee = 0;
    }
    if (information.coupon === 'NEW2024') {
        discountAmount += 150;
    }
    if (information.coupon === 'LABKIT') {
        discountAmount += subtotal * 0.05;
    }
    if (information.studentId) {
        discountAmount += subtotal * 0.15;
    }
    if (information.appliedDiscountCode.toUpperCase() === 'STUDENT15') {
        discountAmount += subtotal * 0.15;
    }

    if (userId && information.userCouponCode) {
        const coupon = await couponService.findValidUserCoupon(
            userId,
            information.userCouponCode
        );
        if (coupon) {
            if (coupon.discountType === 'free_shipping') {
                shippingFee = 0;
            } else {
                discountAmount += couponService.calculateCouponDiscount(coupon, subtotal);
            }
            appliedUserCouponId = coupon.id;
            userCouponCode = coupon.code;
        } else {
            const err = new Error('Invalid or expired coupon code');
            err.statusCode = 400;
            err.code = 'INVALID_COUPON';
            throw err;
        }
    }

    if (userId && information.pointsToRedeem > 0) {
        const balance = await loyaltyService.getBalance(userId);
        const maxPoints = loyaltyService.maxRedeemablePoints(subtotal, balance);
        pointsRedeemed = Math.min(information.pointsToRedeem, maxPoints);
        if (pointsRedeemed > 0) {
            pointsDiscount = loyaltyService.pointsToDiscountAmount(pointsRedeemed);
            discountAmount += pointsDiscount;
        }
    }

    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    return {
        subtotal: roundMoney(subtotal),
        shippingFee: roundMoney(shippingFee),
        discountAmount: roundMoney(discountAmount),
        total: roundMoney(total),
        appliedUserCouponId,
        userCouponCode,
        pointsRedeemed,
        pointsDiscount: roundMoney(pointsDiscount)
    };
}

function roundMoney(value) {
    return Math.round(value * 100) / 100;
}

function filterCartItems(cart, productIds) {
    const items = cart.items || [];
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return items;
    }
    const idSet = new Set(productIds.map((id) => Number(id)));
    return items.filter((item) => idSet.has(item.productId));
}

async function buildCheckoutLines(cartItems) {
    if (!cartItems.length) {
        const err = new Error('No items selected for checkout');
        err.statusCode = 400;
        err.code = 'EMPTY_CHECKOUT';
        throw err;
    }

    const lines = [];

    for (const cartItem of cartItems) {
        const { product, variant, unitPrice, stockQuantity } = await resolveProductLine(
            cartItem.productId,
            cartItem.variantId
        );
        assertStock(stockQuantity, cartItem.quantity);

        const lineTotal = roundMoney(unitPrice * cartItem.quantity);
        const mapped = mapCartItemRow({
            ...cartItem.toJSON(),
            unitPrice,
            product,
            variant
        });

        lines.push({
            cartItemId: cartItem.id,
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            quantity: cartItem.quantity,
            unitPrice,
            lineTotal,
            productName: product.name,
            sku: product.sku,
            mapped
        });
    }

    const unavailable = lines.filter((l) => !l.mapped.inStock);
    if (unavailable.length > 0) {
        const err = new Error('Some items in your cart are out of stock');
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
    }

    return lines;
}

function buildShippingSnapshot(information) {
    return {
        fullName: information.fullName,
        phone: information.phone,
        studentId: information.studentId || null,
        deliveryType: information.deliveryType,
        street: information.street,
        city: information.city,
        state: information.state,
        postalCode: information.postalCode,
        coupon: information.coupon || null,
        discountCode: information.discountCode || null,
        appliedDiscountCode: information.appliedDiscountCode || null,
        userCouponCode: information.userCouponCode || null,
        pointsToRedeem: information.pointsToRedeem || 0
    };
}

async function previewCheckout(cartContext, { productIds, information: rawInformation }) {
    const information = normalizeInformation(rawInformation);
    validateInformation(information);

    const cart = await ensureCart(cartContext);
    const selectedItems = filterCartItems(cart, productIds);
    const lines = await buildCheckoutLines(selectedItems);
    const totals = await calculateCheckoutTotals(lines, information, cartContext.userId);

    return {
        items: lines.map((l) => l.mapped),
        totals,
        information,
        loyaltyPoints: cartContext.userId
            ? await loyaltyService.getBalance(cartContext.userId)
            : null
    };
}

async function saveUserAddress(userId, information, transaction) {
    const snapshot = buildShippingSnapshot(information);
    return Address.create(
        {
            userId,
            recipientName: information.fullName,
            phone: information.phone,
            line1: information.street,
            line2: [information.state, information.postalCode].filter(Boolean).join(', ') || null,
            ward: information.deliveryType === 'campus' ? 'Campus Delivery' : null,
            district: information.state,
            city: information.city,
            isDefault: false,
            label: information.deliveryType === 'campus' ? 'campus' : 'home'
        },
        { transaction }
    );
}

async function decrementStock(line, transaction) {
    if (line.variantId) {
        const variant = await ProductVariant.findByPk(line.variantId, { transaction });
        if (!variant) return;
        await variant.update(
            { stockQuantity: Math.max(0, variant.stockQuantity - line.quantity) },
            { transaction }
        );
        return;
    }

    const product = await Product.findByPk(line.productId, { transaction });
    if (!product) return;

    const nextStock = Math.max(0, product.stockQuantity - line.quantity);
    const updates = { stockQuantity: nextStock };
    if (nextStock === 0 && product.status === 'active') {
        updates.status = 'out_of_stock';
    }
    await product.update(updates, { transaction });
}

function mapPaymentStatus(method, frontendMethod) {
    if (frontendMethod === 'credit_card') {
        return { status: 'paid', paidAt: new Date() };
    }
    return { status: 'pending', paidAt: null };
}

function mapOrderResponse(order, items, payment) {
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        shippingFee: Number(order.shippingFee),
        total: Number(order.total),
        placedAt: order.placedAt,
        shippingSnapshot: order.shippingSnapshot,
        items: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal)
        })),
        payment: payment
            ? {
                  method: payment.method,
                  status: payment.status,
                  amount: Number(payment.amount),
                  paidAt: payment.paidAt
              }
            : null
    };
}

async function placeOrder(
    cartContext,
    { userId, guestEmail },
    { productIds, information: rawInformation, paymentMethod: rawPaymentMethod }
) {
    const information = normalizeInformation(rawInformation);
    validateInformation(information);

    const paymentMethod = rawPaymentMethod || 'cash';
    const dbPaymentMethod = PAYMENT_METHOD_MAP[paymentMethod];
    if (!dbPaymentMethod) {
        const err = new Error('Invalid payment method');
        err.statusCode = 400;
        throw err;
    }

    const cart = await ensureCart(cartContext);
    const selectedItems = filterCartItems(cart, productIds);
    const lines = await buildCheckoutLines(selectedItems);
    const totals = await calculateCheckoutTotals(lines, information, userId);
    const shippingSnapshot = {
        ...buildShippingSnapshot(information),
        userCouponCode: totals.userCouponCode,
        pointsRedeemed: totals.pointsRedeemed,
        pointsDiscount: totals.pointsDiscount
    };

    const transaction = await sequelize.transaction();

    try {
        let shippingAddressId = null;
        if (userId) {
            const address = await saveUserAddress(userId, information, transaction);
            shippingAddressId = address.id;
        }

        const now = new Date();
        const order = await Order.create(
            {
                orderNumber: generateOrderNumber(),
                userId: userId || null,
                guestEmail: guestEmail || null,
                guestPhone: information.phone,
                shippingAddressId,
                shippingSnapshot,
                status: 'pending',
                subtotal: totals.subtotal,
                discountAmount: totals.discountAmount,
                shippingFee: totals.shippingFee,
                total: totals.total,
                note: information.studentId
                    ? `Student ID: ${information.studentId}`
                    : null,
                placedAt: now
            },
            { transaction }
        );

        const orderItems = [];
        for (const line of lines) {
            const orderItem = await OrderItem.create(
                {
                    orderId: order.id,
                    productId: line.productId,
                    variantId: line.variantId,
                    productName: line.productName,
                    sku: line.sku,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.lineTotal
                },
                { transaction }
            );
            orderItems.push(orderItem);
            await decrementStock(line, transaction);
        }

        const paymentState = mapPaymentStatus(dbPaymentMethod, paymentMethod);
        const payment = await Payment.create(
            {
                orderId: order.id,
                method: dbPaymentMethod,
                status: paymentState.status,
                amount: totals.total,
                paidAt: paymentState.paidAt
            },
            { transaction }
        );

        if (paymentState.status === 'paid') {
            await order.update({ paidAt: paymentState.paidAt, status: 'confirmed' }, { transaction });
            order.status = 'confirmed';
            order.paidAt = paymentState.paidAt;
        }

        const cartItemIds = selectedItems.map((i) => i.id);
        await CartItem.destroy({
            where: { id: cartItemIds, cartId: cart.id },
            transaction
        });

        const remaining = await CartItem.count({ where: { cartId: cart.id }, transaction });
        if (remaining === 0) {
            await cart.update({ status: 'converted' }, { transaction });
        }

        if (userId && totals.appliedUserCouponId) {
            await couponService.markCouponUsed(totals.appliedUserCouponId, order.id, transaction);
        }

        if (userId && totals.pointsRedeemed > 0) {
            await loyaltyService.redeemPoints(
                userId,
                totals.pointsRedeemed,
                {
                    referenceType: 'order',
                    referenceId: order.id,
                    note: `Redeemed on order ${order.orderNumber}`
                },
                transaction
            );
        }

        await transaction.commit();

        return {
            order: mapOrderResponse(order, orderItems, payment)
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function getOrderForUser(orderNumber, userId) {
    const order = await Order.findOne({
        where: { orderNumber },
        include: [
            { model: OrderItem, as: 'items' },
            { model: Payment, as: 'payment' }
        ]
    });

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    if (order.userId && order.userId !== userId) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }

    return { order: mapOrderResponse(order, order.items, order.payment) };
}

async function incrementStock(line, transaction) {
    if (line.variantId) {
        const variant = await ProductVariant.findByPk(line.variantId, { transaction });
        if (!variant) return;
        await variant.update(
            { stockQuantity: variant.stockQuantity + line.quantity },
            { transaction }
        );
        return;
    }

    const product = await Product.findByPk(line.productId, { transaction });
    if (!product) return;

    const nextStock = product.stockQuantity + line.quantity;
    const updates = { stockQuantity: nextStock };
    if (product.status === 'out_of_stock' && nextStock > 0) {
        updates.status = 'active';
    }
    await product.update(updates, { transaction });
}

async function cancelOrderForUser(orderNumber, userId) {
    const transaction = await sequelize.transaction();
    try {
        const order = await Order.findOne({
            where: { orderNumber },
            include: [
                { model: OrderItem, as: 'items' },
                { model: Payment, as: 'payment' }
            ],
            transaction
        });

        if (!order) {
            const err = new Error('Order not found');
            err.statusCode = 404;
            throw err;
        }

        if (order.userId && order.userId !== userId) {
            const err = new Error('Forbidden');
            err.statusCode = 403;
            throw err;
        }

        const cancellableStatuses = ['pending', 'confirmed'];
        if (!cancellableStatuses.includes(order.status)) {
            const err = new Error('Order cannot be cancelled in its current state');
            err.statusCode = 400;
            throw err;
        }

        const originalStatus = order.status;
        const now = new Date();

        if (originalStatus === 'pending') {
            await order.update({
                status: 'cancelled',
                cancelledAt: now
            }, { transaction });

            if (order.payment) {
                await order.payment.update({
                    status: 'failed'
                }, { transaction });
            }
        } else if (originalStatus === 'confirmed') {
            await order.update({
                status: 'refunded',
                cancelledAt: now
            }, { transaction });

            if (order.payment) {
                await order.payment.update({
                    status: 'refunded'
                }, { transaction });
            }
        }

        for (const item of order.items) {
            await incrementStock(
                {
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity
                },
                transaction
            );
        }

        await transaction.commit();

        const updatedOrder = await Order.findOne({
            where: { orderNumber },
            include: [
                { model: OrderItem, as: 'items' },
                { model: Payment, as: 'payment' }
            ]
        });

        return { order: mapOrderResponse(updatedOrder, updatedOrder.items, updatedOrder.payment) };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function autoConfirmPendingOrders() {
    const { Op } = require('sequelize');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const ordersToConfirm = await Order.findAll({
        where: {
            status: 'pending',
            placedAt: {
                [Op.lte]: fiveMinutesAgo
            }
        },
        include: [{ model: Payment, as: 'payment' }]
    });

    if (ordersToConfirm.length === 0) return 0;

    let count = 0;
    for (const order of ordersToConfirm) {
        const transaction = await sequelize.transaction();
        try {
            await order.update({
                status: 'confirmed'
            }, { transaction });

            if (order.payment) {
                const nonCodMethods = ['bank_transfer', 'momo', 'vnpay'];
                if (nonCodMethods.includes(order.payment.method)) {
                    await order.payment.update({
                        status: 'paid',
                        paidAt: new Date()
                    }, { transaction });

                    await order.update({
                        paidAt: new Date()
                    }, { transaction });
                }
            }

            await transaction.commit();
            count++;
            console.log(`[AutoConfirm] Successfully confirmed order: ${order.orderNumber}`);
        } catch (err) {
            await transaction.rollback();
            console.error(`[AutoConfirm] Failed to confirm order ${order.orderNumber}:`, err);
        }
    }

    return count;
}

module.exports = {
    previewCheckout,
    placeOrder,
    getOrderForUser,
    cancelOrderForUser,
    autoConfirmPendingOrders,
    normalizeInformation
};
