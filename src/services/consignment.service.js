const { Consignment, ConsignmentImage, Category, Product, sequelize } = require('../models');

/**
 * Lists the consignments belonging to the logged-in user.
 */
async function listMyConsignments(userId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await Consignment.findAndCountAll({
        where: { userId },
        include: [
            {
                model: ConsignmentImage,
                as: 'images',
                attributes: ['id', 'url']
            },
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug', 'price', 'status']
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset,
        distinct: true
    });

    return {
        consignments: rows,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages: Math.ceil(count / limitNum) || 0
        }
    };
}

/**
 * Fetches dropdown options (categories) for the consignment form.
 */
async function getFormOptions() {
    const categories = await Category.findAll({
        where: { isActive: true },
        include: [
            {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name', 'slug'],
                required: false
            }
        ],
        order: [
            ['sortOrder', 'ASC'],
            ['name', 'ASC']
        ]
    });

    // Filter out categories that are parents of other active categories
    const parentIds = new Set(
        categories
            .map((c) => c.parentId)
            .filter((parentId) => parentId !== null && parentId !== undefined)
    );
    const leafCategories = categories.filter((c) => !parentIds.has(c.id));

    return {
        categories: leafCategories.map((c) => {
            const parent = c.parent;
            return {
                id: c.id,
                name: c.name,
                slug: c.slug,
                parentId: c.parentId,
                parentName: parent?.name || null,
                label: parent ? `${parent.name} › ${c.name}` : c.name
            };
        })
    };
}

/**
 * Creates a new consignment request.
 */
async function createConsignment(userId, payload) {
    const transaction = await sequelize.transaction();
    try {
        const category = await Category.findByPk(payload.categoryId, { transaction });
        if (!category || !category.isActive) {
            const err = new Error('Danh mục ký gửi không hợp lệ hoặc đã bị khóa');
            err.statusCode = 400;
            throw err;
        }

        const consignment = await Consignment.create(
            {
                userId,
                title: payload.title.trim(),
                description: payload.description?.trim() || null,
                categoryId: payload.categoryId,
                suggestedPrice: payload.suggestedPrice,
                condition: payload.condition || 'used',
                contactPhone: payload.contactPhone?.trim() || null,
                status: 'PENDING'
            },
            { transaction }
        );

        if (payload.images && Array.isArray(payload.images)) {
            for (const url of payload.images) {
                if (url && typeof url === 'string' && url.trim()) {
                    await ConsignmentImage.create(
                        {
                            consignmentId: consignment.id,
                            url: url.trim()
                        },
                        { transaction }
                    );
                }
            }
        }

        await transaction.commit();
        return consignment;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Updates an existing pending consignment request.
 */
async function updateConsignment(id, userId, payload) {
    const transaction = await sequelize.transaction();
    try {
        const consignment = await Consignment.findOne({
            where: { id, userId },
            transaction
        });

        if (!consignment) {
            const err = new Error('Ký gửi không tồn tại hoặc bạn không có quyền cập nhật');
            err.statusCode = 404;
            throw err;
        }

        if (consignment.status !== 'PENDING') {
            const err = new Error('Chỉ có thể chỉnh sửa ký gửi ở trạng thái chưa duyệt (PENDING)');
            err.statusCode = 400;
            throw err;
        }

        if (payload.categoryId) {
            const category = await Category.findByPk(payload.categoryId, { transaction });
            if (!category || !category.isActive) {
                const err = new Error('Danh mục không hợp lệ hoặc đã bị khóa');
                err.statusCode = 400;
                throw err;
            }
        }

        const updates = {};
        if (payload.title !== undefined) updates.title = payload.title.trim();
        if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
        if (payload.categoryId !== undefined) updates.categoryId = payload.categoryId;
        if (payload.suggestedPrice !== undefined) updates.suggestedPrice = payload.suggestedPrice;
        if (payload.condition !== undefined) updates.condition = payload.condition;
        if (payload.contactPhone !== undefined) updates.contactPhone = payload.contactPhone?.trim() || null;

        await consignment.update(updates, { transaction });

        if (payload.images && Array.isArray(payload.images)) {
            // Delete old images
            await ConsignmentImage.destroy({
                where: { consignmentId: id },
                transaction
            });

            // Insert new images
            for (const url of payload.images) {
                if (url && typeof url === 'string' && url.trim()) {
                    await ConsignmentImage.create(
                        {
                            consignmentId: id,
                            url: url.trim()
                        },
                        { transaction }
                    );
                }
            }
        }

        await transaction.commit();
        return consignment;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Deletes a pending consignment request.
 */
async function deleteConsignment(id, userId) {
    const transaction = await sequelize.transaction();
    try {
        const consignment = await Consignment.findOne({
            where: { id, userId },
            transaction
        });

        if (!consignment) {
            const err = new Error('Ký gửi không tồn tại hoặc bạn không có quyền xóa');
            err.statusCode = 404;
            throw err;
        }

        if (consignment.status !== 'PENDING') {
            const err = new Error('Chỉ có thể xóa ký gửi ở trạng thái chưa duyệt (PENDING)');
            err.statusCode = 400;
            throw err;
        }

        // Delete associated images
        await ConsignmentImage.destroy({
            where: { consignmentId: id },
            transaction
        });

        // Delete the consignment
        await consignment.destroy({ transaction });

        await transaction.commit();
        return { message: 'Xóa ký gửi thành công' };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    listMyConsignments,
    getFormOptions,
    createConsignment,
    updateConsignment,
    deleteConsignment
};
