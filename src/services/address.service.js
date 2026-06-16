const { Address, sequelize } = require('../models');

async function listAddresses(userId) {
    return Address.findAll({
        where: { userId },
        order: [
            ['isDefault', 'DESC'],
            ['createdAt', 'DESC']
        ]
    });
}

async function createAddress(userId, data) {
    const transaction = await sequelize.transaction();
    try {
        const count = await Address.count({ where: { userId }, transaction });
        let isDefault = !!data.isDefault;
        if (count === 0) {
            isDefault = true;
        }

        if (isDefault) {
            await Address.update(
                { isDefault: false },
                { where: { userId }, transaction }
            );
        }

        const newAddress = await Address.create(
            {
                userId,
                recipientName: data.recipientName,
                phone: data.phone,
                line1: data.line1,
                line2: data.line2 || null,
                ward: data.ward || null,
                district: data.district || null,
                city: data.city,
                isDefault,
                label: data.label || 'home'
            },
            { transaction }
        );

        await transaction.commit();
        return newAddress;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function setDefaultAddress(userId, addressId) {
    const transaction = await sequelize.transaction();
    try {
        const address = await Address.findOne({
            where: { id: addressId, userId },
            transaction
        });

        if (!address) {
            const err = new Error('Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn');
            err.statusCode = 404;
            throw err;
        }

        await Address.update(
            { isDefault: false },
            { where: { userId }, transaction }
        );

        await address.update({ isDefault: true }, { transaction });

        await transaction.commit();
        return address;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function deleteAddress(userId, addressId) {
    const transaction = await sequelize.transaction();
    try {
        const address = await Address.findOne({
            where: { id: addressId, userId },
            transaction
        });

        if (!address) {
            const err = new Error('Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn');
            err.statusCode = 404;
            throw err;
        }

        const wasDefault = address.isDefault;
        await address.destroy({ transaction });

        if (wasDefault) {
            // Find another address to set as default
            const anotherAddress = await Address.findOne({
                where: { userId },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (anotherAddress) {
                await anotherAddress.update({ isDefault: true }, { transaction });
            }
        }

        await transaction.commit();
        return { success: true };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    listAddresses,
    createAddress,
    setDefaultAddress,
    deleteAddress
};
