const crypto = require('crypto');
const { Cart, CartItem, Product, ProductImage, ProductVariant } = require('../models');

const CART_ITEM_INCLUDES = [
    {
        model: Product,
        as: 'product',
        include: [
            {
                model: ProductImage,
                as: 'images',
                attributes: ['id', 'url', 'altText', 'isPrimary', 'sortOrder']
            }
        ]
    },
    {
        model: ProductVariant,
        as: 'variant',
        required: false
    }
];

function mapCartItemRow(item) {
    const json = item.toJSON ? item.toJSON() : item;
    const product = json.product;
    const variant = json.variant;
    const quantity = json.quantity;
    const unitPrice = Number(json.unitPrice);
    const lineTotal = unitPrice * quantity;

    const primaryImage =
        product?.images?.find((img) => img.isPrimary) || product?.images?.[0] || null;

    const currentPrice =
        variant?.price != null ? Number(variant.price) : product ? Number(product.price) : unitPrice;

    const stockQuantity =
        variant != null ? variant.stockQuantity : product?.stockQuantity ?? 0;

    const inStock = product?.status === 'active' && stockQuantity >= quantity;
    const priceChanged = Math.abs(currentPrice - unitPrice) > 0.009;

    return {
        id: json.id,
        productId: json.productId,
        variantId: json.variantId,
        quantity,
        unitPrice,
        lineTotal,
        currentUnitPrice: currentPrice,
        inStock,
        priceChanged,
        product: product
            ? {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  shortDescription: product.shortDescription,
                  price: Number(product.price),
                  status: product.status,
                  stockQuantity: product.stockQuantity,
                  imageUrl: primaryImage?.url || null,
                  imageAlt: primaryImage?.altText || product.name
              }
            : null,
        variant: variant
            ? {
                  id: variant.id,
                  name: variant.name,
                  price: variant.price != null ? Number(variant.price) : null,
                  stockQuantity: variant.stockQuantity,
                  isActive: variant.isActive
              }
            : null
    };
}

function mapCartResponse(cart) {
    const items = (cart.items || []).map(mapCartItemRow);
    const subtotal = items.reduce((sum, row) => sum + row.lineTotal, 0);
    const itemCount = items.reduce((sum, row) => sum + row.quantity, 0);

    return {
        id: cart.id,
        status: cart.status,
        items,
        subtotal,
        itemCount
    };
}

async function loadCartWithItems(cartId) {
    return Cart.findByPk(cartId, {
        include: [
            {
                model: CartItem,
                as: 'items',
                include: CART_ITEM_INCLUDES
            }
        ],
        order: [[{ model: CartItem, as: 'items' }, 'id', 'ASC']]
    });
}

async function resolveProductLine(productId, variantId) {
    const product = await Product.findByPk(productId, {
        include: [{ model: ProductImage, as: 'images' }]
    });

    if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        throw err;
    }

    if (product.status !== 'active') {
        const err = new Error('Product is not available for purchase');
        err.statusCode = 400;
        err.code = 'PRODUCT_UNAVAILABLE';
        throw err;
    }

    let variant = null;
    if (variantId != null) {
        variant = await ProductVariant.findOne({
            where: { id: variantId, productId: product.id, isActive: true }
        });
        if (!variant) {
            const err = new Error('Product variant not found');
            err.statusCode = 404;
            throw err;
        }
    }

    const unitPrice = variant?.price != null ? Number(variant.price) : Number(product.price);
    const stockQuantity = variant != null ? variant.stockQuantity : product.stockQuantity;

    return { product, variant, unitPrice, stockQuantity };
}

function assertStock(stockQuantity, requestedQty) {
    if (requestedQty < 1) {
        const err = new Error('Quantity must be at least 1');
        err.statusCode = 400;
        throw err;
    }
    if (stockQuantity < requestedQty) {
        const err = new Error(`Only ${stockQuantity} item(s) available in stock`);
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_STOCK';
        throw err;
    }
}

async function findActiveCart({ userId, sessionId }) {
    const where = { status: 'active' };
    if (userId) {
        where.userId = userId;
    } else {
        where.sessionId = sessionId;
    }
    return Cart.findOne({
        where,
        include: [
            {
                model: CartItem,
                as: 'items',
                include: CART_ITEM_INCLUDES
            }
        ],
        order: [[{ model: CartItem, as: 'items' }, 'id', 'ASC']]
    });
}

async function getOrCreateActiveCart({ userId, sessionId }) {
    if (!userId && !sessionId) {
        const err = new Error('Cart session is required');
        err.statusCode = 400;
        throw err;
    }

    let cart = await findActiveCart({ userId, sessionId });

    if (!cart) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        cart = await Cart.create({
            userId: userId || null,
            sessionId: userId ? null : sessionId,
            status: 'active',
            expiresAt
        });
        cart = await loadCartWithItems(cart.id);
    }

    return cart;
}

async function ensureCart({ userId, sessionId }) {
    if (userId && sessionId) {
        return mergeSessionCartIntoUserCart(userId, sessionId);
    }
    return getOrCreateActiveCart({ userId, sessionId });
}

async function mergeSessionCartIntoUserCart(userId, sessionId) {
    if (!sessionId) return null;

    const sessionCart = await findActiveCart({ sessionId });
    if (!sessionCart || !sessionCart.items?.length) {
        return getOrCreateActiveCart({ userId });
    }

    const userCart = await getOrCreateActiveCart({ userId });

    for (const line of sessionCart.items) {
        const variantKey = line.variantId ?? null;
        const existing = userCart.items.find(
            (i) => i.productId === line.productId && (i.variantId ?? null) === variantKey
        );

        if (existing) {
            const newQty = existing.quantity + line.quantity;
            const { stockQuantity } = await resolveProductLine(line.productId, line.variantId);
            const cappedQty = Math.min(newQty, stockQuantity);
            await existing.update({
                quantity: cappedQty,
                unitPrice: line.unitPrice
            });
        } else {
            await CartItem.create({
                cartId: userCart.id,
                productId: line.productId,
                variantId: line.variantId,
                quantity: line.quantity,
                unitPrice: line.unitPrice
            });
        }
    }

    await sessionCart.update({ status: 'abandoned' });
    return loadCartWithItems(userCart.id);
}

async function getCart({ userId, sessionId }) {
    if (userId && sessionId) {
        const cart = await mergeSessionCartIntoUserCart(userId, sessionId);
        return mapCartResponse(cart);
    }

    const cart = await getOrCreateActiveCart({ userId, sessionId });
    return mapCartResponse(cart);
}

async function addItem({ userId, sessionId }, { productId, variantId, quantity }) {
    const qty = quantity ?? 1;
    const { unitPrice, stockQuantity } = await resolveProductLine(productId, variantId ?? null);

    const cart = await ensureCart({ userId, sessionId });
    const variantKey = variantId ?? null;

    const existing = cart.items.find(
        (i) => i.productId === productId && (i.variantId ?? null) === variantKey
    );

    const nextQty = existing ? existing.quantity + qty : qty;
    assertStock(stockQuantity, nextQty);

    if (existing) {
        await existing.update({ quantity: nextQty, unitPrice });
    } else {
        await CartItem.create({
            cartId: cart.id,
            productId,
            variantId: variantId ?? null,
            quantity: qty,
            unitPrice
        });
    }

    const refreshed = await loadCartWithItems(cart.id);
    return mapCartResponse(refreshed);
}

async function updateItemQuantity({ userId, sessionId }, itemId, quantity) {
    const cart = await ensureCart({ userId, sessionId });
    const line = cart.items.find((i) => i.id === itemId);

    if (!line) {
        const err = new Error('Cart item not found');
        err.statusCode = 404;
        throw err;
    }

    if (quantity < 1) {
        await line.destroy();
        const refreshed = await loadCartWithItems(cart.id);
        return mapCartResponse(refreshed);
    }

    const { unitPrice, stockQuantity } = await resolveProductLine(line.productId, line.variantId);
    assertStock(stockQuantity, quantity);

    await line.update({ quantity, unitPrice });
    const refreshed = await loadCartWithItems(cart.id);
    return mapCartResponse(refreshed);
}

async function removeItem({ userId, sessionId }, itemId) {
    const cart = await ensureCart({ userId, sessionId });
    const line = cart.items.find((i) => i.id === itemId);

    if (!line) {
        const err = new Error('Cart item not found');
        err.statusCode = 404;
        throw err;
    }

    await line.destroy();
    const refreshed = await loadCartWithItems(cart.id);
    return mapCartResponse(refreshed);
}

async function clearCart({ userId, sessionId }) {
    const cart = await ensureCart({ userId, sessionId });
    await CartItem.destroy({ where: { cartId: cart.id } });
    const refreshed = await loadCartWithItems(cart.id);
    return mapCartResponse(refreshed);
}

async function mergeGuestItems(userId, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return getCart({ userId, sessionId: null });
    }

    const cart = await getOrCreateActiveCart({ userId });

    for (const raw of items) {
        const productId = Number(raw.productId);
        const variantId = raw.variantId != null ? Number(raw.variantId) : null;
        const quantity = Math.max(1, Number(raw.quantity) || 1);

        if (!productId) continue;

        const { unitPrice, stockQuantity } = await resolveProductLine(productId, variantId);
        const variantKey = variantId ?? null;
        const existing = cart.items.find(
            (i) => i.productId === productId && (i.variantId ?? null) === variantKey
        );

        const nextQty = existing ? existing.quantity + quantity : quantity;
        const cappedQty = Math.min(nextQty, stockQuantity);

        if (existing) {
            await existing.update({ quantity: cappedQty, unitPrice });
        } else if (cappedQty > 0) {
            await CartItem.create({
                cartId: cart.id,
                productId,
                variantId,
                quantity: cappedQty,
                unitPrice
            });
        }

        cart.items = (await loadCartWithItems(cart.id)).items;
    }

    const refreshed = await loadCartWithItems(cart.id);
    return mapCartResponse(refreshed);
}

function createCartSessionId() {
    return crypto.randomUUID();
}

module.exports = {
    getCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
    mergeGuestItems,
    createCartSessionId,
    mapCartResponse,
    mapCartItemRow,
    ensureCart,
    resolveProductLine,
    loadCartWithItems,
    assertStock
};
