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

const ensureSchema = async (sequelize) => {
    await ensureUserColumns(sequelize);
    await ensureProductReviewColumns(sequelize);
};

module.exports = { ensureUserColumns, ensureProductReviewColumns, ensureSchema };
