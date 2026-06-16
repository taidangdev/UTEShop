const { DataTypes } = require('sequelize');

/**
 * Adds new columns without Sequelize alter (avoids duplicate index buildup on MySQL).
 */
const ensureUserColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface();
    let table;

    try {
        table = await qi.describeTable('users');
    } catch {
        return;
    }

    const addIfMissing = async (name, spec) => {
        if (!table[name]) {
            await qi.addColumn('users', name, spec);
            console.log(`  + users.${name}`);
            table[name] = spec;
        }
    };

    await addIfMissing('majorId', { type: DataTypes.INTEGER, allowNull: true });
    await addIfMissing('studentId', { type: DataTypes.STRING(20), allowNull: true });
    await addIfMissing('avatarUrl', { type: DataTypes.STRING(500), allowNull: true });
    await addIfMissing('emailVerifiedAt', { type: DataTypes.DATE, allowNull: true });
    await addIfMissing('loyaltyPoints', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    });

    try {
        await sequelize.query(
            "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'customer', 'user') DEFAULT 'customer'"
        );
        console.log('  + Verified users.role ENUM values');
    } catch (err) {
        console.warn('  ! Warning updating users.role ENUM:', err.message);
    }
};

const ensureProductReviewColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface();
    let table;

    try {
        table = await qi.describeTable('product_reviews');
    } catch {
        return;
    }

    const addIfMissing = async (name, spec) => {
        if (!table[name]) {
            await qi.addColumn('product_reviews', name, spec);
            console.log(`  + product_reviews.${name}`);
            table[name] = spec;
        }
    };

    await addIfMissing('orderItemId', { type: DataTypes.INTEGER, allowNull: true, unique: true });
    await addIfMissing('title', { type: DataTypes.STRING(200), allowNull: true });
    await addIfMissing('rewardType', {
        type: DataTypes.ENUM('points', 'coupon'),
        allowNull: true
    });
    await addIfMissing('rewardGrantedAt', { type: DataTypes.DATE, allowNull: true });
    await addIfMissing('rewardPayload', { type: DataTypes.JSON, allowNull: true });
};

const ensurePromotionColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface();
    let table;

    try {
        table = await qi.describeTable('promotions');
    } catch {
        return;
    }

    const addIfMissing = async (name, spec) => {
        if (!table[name]) {
            await qi.addColumn('promotions', name, spec);
            console.log(`  + promotions.${name}`);
            table[name] = spec;
        }
    };

    await addIfMissing('scope', {
        type: DataTypes.ENUM('shop', 'category', 'product'),
        allowNull: false,
        defaultValue: 'shop'
    });
    await addIfMissing('description', { type: DataTypes.STRING(500), allowNull: true });
    await addIfMissing('maxUsesPerUser', { type: DataTypes.INTEGER, allowNull: true });

    const { Promotion, PromotionCategory } = require('../models');
    const withCategory = await Promotion.findAll({
        where: { categoryId: { [require('sequelize').Op.ne]: null } },
        attributes: ['id', 'categoryId', 'scope']
    });

    for (const promo of withCategory) {
        if (promo.scope === 'shop') {
            await promo.update({ scope: 'category' });
        }
        const [row, created] = await PromotionCategory.findOrCreate({
            where: { promotionId: promo.id, categoryId: promo.categoryId },
            defaults: { promotionId: promo.id, categoryId: promo.categoryId }
        });
        if (created) {
            console.log(`  + promotion_categories: promo #${promo.id} → category #${promo.categoryId}`);
        }
        void row;
    }
};

const ensureOrderPromotionColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface();

    try {
        const orders = await qi.describeTable('orders');
        const addOrderCol = async (name, spec) => {
            if (!orders[name]) {
                await qi.addColumn('orders', name, spec);
                console.log(`  + orders.${name}`);
            }
        };
        await addOrderCol('appliedPromotionId', { type: DataTypes.INTEGER, allowNull: true });
        await addOrderCol('promotionCode', { type: DataTypes.STRING(50), allowNull: true });
    } catch {
        // orders table missing
    }

    try {
        const items = await qi.describeTable('order_items');
        const addItemCol = async (name, spec) => {
            if (!items[name]) {
                await qi.addColumn('order_items', name, spec);
                console.log(`  + order_items.${name}`);
            }
        };
        await addItemCol('discountAmount', {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        });
        await addItemCol('promotionId', { type: DataTypes.INTEGER, allowNull: true });

        try {
            await qi.addIndex('order_items', { fields: ['promotionId'], name: 'order_items_promotion_id' });
        } catch {
            // index already exists or column not ready yet
        }
    } catch {
        // order_items missing
    }
};

const ensurePromotionJoinTables = async (sequelize) => {
    const qi = sequelize.getQueryInterface();

    const tables = [
        {
            name: 'promotion_products',
            columns: {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                promotionId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'promotions', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                productId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'products', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            },
            indexes: [
                { unique: true, fields: ['promotionId', 'productId'] },
                { fields: ['productId'] }
            ]
        },
        {
            name: 'promotion_categories',
            columns: {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                promotionId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'promotions', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                categoryId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'categories', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            },
            indexes: [
                { unique: true, fields: ['promotionId', 'categoryId'] },
                { fields: ['categoryId'] }
            ]
        },
        {
            name: 'promotion_redemptions',
            columns: {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                promotionId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'promotions', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                userId: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                orderId: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'orders', key: 'id' },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                discountAmount: {
                    type: DataTypes.DECIMAL(12, 2),
                    allowNull: false,
                    defaultValue: 0
                },
                createdAt: { type: DataTypes.DATE, allowNull: false }
            },
            indexes: [{ fields: ['promotionId', 'userId'] }, { fields: ['orderId'] }]
        }
    ];

    for (const def of tables) {
        try {
            await qi.describeTable(def.name);
        } catch {
            await qi.createTable(def.name, def.columns);
            for (const idx of def.indexes) {
                await qi.addIndex(def.name, idx);
            }
            console.log(`  + table ${def.name}`);
        }
    }
};

const ensureOrderDeliveryColumns = async (sequelize) => {
    const qi = sequelize.getQueryInterface();

    try {
        const orders = await qi.describeTable('orders');
        const addOrderCol = async (name, spec) => {
            if (!orders[name]) {
                await qi.addColumn('orders', name, spec);
                console.log(`  + orders.${name}`);
                orders[name] = spec;
            }
        };

        await addOrderCol('deliveryFailCount', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        });
        await addOrderCol('returnedAt', { type: DataTypes.DATE, allowNull: true });

        try {
            await sequelize.query(
                "ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'returned', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending'"
            );
            console.log('  + Verified orders.status ENUM values');
        } catch (err) {
            console.warn('  ! Warning updating orders.status ENUM:', err.message);
        }
    } catch {
        // orders table missing
    }
};

const ensureSchema = async (sequelize) => {
    await ensureUserColumns(sequelize);
    await ensureProductReviewColumns(sequelize);
    await ensurePromotionJoinTables(sequelize);
    await ensurePromotionColumns(sequelize);
    await ensureOrderPromotionColumns(sequelize);
    await ensureOrderDeliveryColumns(sequelize);
};

module.exports = {
    ensureUserColumns,
    ensureProductReviewColumns,
    ensurePromotionColumns,
    ensureOrderPromotionColumns,
    ensureOrderDeliveryColumns,
    ensurePromotionJoinTables,
    ensureSchema
};
