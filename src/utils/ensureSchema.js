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
        }
    };

    await addIfMissing('majorId', { type: DataTypes.INTEGER, allowNull: true });
    await addIfMissing('studentId', { type: DataTypes.STRING(20), allowNull: true });
    await addIfMissing('avatarUrl', { type: DataTypes.STRING(500), allowNull: true });
    await addIfMissing('emailVerifiedAt', { type: DataTypes.DATE, allowNull: true });

    // Ensure users.role column has ENUM('admin', 'customer', 'user')
    try {
        await sequelize.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'customer', 'user') DEFAULT 'customer'");
        console.log('  + Verified users.role ENUM values');
    } catch (err) {
        console.warn('  ! Warning updating users.role ENUM:', err.message);
    }
};

module.exports = { ensureUserColumns };
