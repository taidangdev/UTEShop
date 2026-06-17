const { Op } = require('sequelize');
const {
    Consignment,
    ConsignmentImage,
    User,
    Category,
    Product,
    ProductImage,
    sequelize
} = require('../models');
const notificationService = require('./notification.service');

/**
 * Lists all consignments for admin with filters, search, and pagination.
 */
async function listConsignments({ page = 1, limit = 20, status, search } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status && status !== 'all') {
        where.status = status;
    }

    const searchTerm = String(search || '').trim();
    if (searchTerm) {
        const like = `%${searchTerm}%`;

        // Find matching users first
        const matchedUsers = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.like]: like } },
                    { email: { [Op.like]: like } },
                    { fullName: { [Op.like]: like } }
                ]
            },
            attributes: ['id']
        });
        const userIds = matchedUsers.map((u) => u.id);

        const conditions = [
            { title: { [Op.like]: like } },
            { description: { [Op.like]: like } }
        ];

        if (userIds.length > 0) {
            conditions.push({ userId: { [Op.in]: userIds } });
        }

        const idNum = Number(searchTerm);
        if (!Number.isNaN(idNum) && Number.isInteger(idNum)) {
            conditions.push({ id: idNum });
        }

        where[Op.or] = conditions;
    }

    const { rows, count } = await Consignment.findAndCountAll({
        where,
        include: [
            {
                model: ConsignmentImage,
                as: 'images',
                attributes: ['id', 'url']
            },
            {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email', 'fullName', 'phone']
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
 * Updates details of a consignment request by Admin.
 */
async function updateConsignment(id, payload) {
    const transaction = await sequelize.transaction();
    try {
        const consignment = await Consignment.findByPk(id, {
            include: [{ model: ConsignmentImage, as: 'images' }],
            transaction
        });

        if (!consignment) {
            const err = new Error('Yêu cầu ký gửi không tồn tại');
            err.statusCode = 404;
            throw err;
        }

        const updates = {};
        if (payload.adminNote !== undefined) updates.adminNote = payload.adminNote;

        if (payload.approvedPrice !== undefined && payload.approvedPrice !== null) {
            updates.approvedPrice = payload.approvedPrice;
        } else if (consignment.approvedPrice === null || consignment.approvedPrice === undefined) {
            updates.approvedPrice = consignment.suggestedPrice;
        }

        if (payload.status !== undefined) updates.status = payload.status;
        if (payload.productId !== undefined) updates.productId = payload.productId;

        // Auto-create product when status is set to ON_SALE and no product is currently linked
        if (payload.status === 'ON_SALE' && !consignment.productId && !updates.productId) {
            const finalPrice =
                payload.approvedPrice ||
                consignment.approvedPrice ||
                consignment.suggestedPrice ||
                0;

            const baseSlug = (consignment.title || 'san-pham-ky-gui')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            let slug = baseSlug;
            let counter = 1;
            while (true) {
                const existingProduct = await Product.findOne({ where: { slug }, transaction });
                if (!existingProduct) break;
                slug = `${baseSlug}-${counter++}`;
            }

            const uniqueSku = `KG-${consignment.id}-${Date.now().toString().slice(-4)}`;

            const newProduct = await Product.create(
                {
                    categoryId: consignment.categoryId,
                    sellerId: consignment.userId,
                    sku: uniqueSku,
                    name: consignment.title,
                    slug,
                    description: consignment.description || '',
                    price: finalPrice,
                    compareAtPrice: consignment.suggestedPrice || null,
                    stockQuantity: 1,
                    condition: consignment.condition,
                    productType: 'consignment',
                    status: 'active',
                    isFeatured: false,
                    publishedAt: new Date()
                },
                { transaction }
            );

            if (consignment.images && consignment.images.length > 0) {
                for (let i = 0; i < consignment.images.length; i++) {
                    await ProductImage.create(
                        {
                            productId: newProduct.id,
                            url: consignment.images[i].url,
                            altText: consignment.title,
                            sortOrder: i,
                            isPrimary: i === 0
                        },
                        { transaction }
                    );
                }
            }

            updates.productId = newProduct.id;
        }

        // If status becomes COMPLETED or SOLD, set linked product stock quantity to 0
        if (updates.status === 'COMPLETED' || updates.status === 'SOLD') {
            const prodId = updates.productId || consignment.productId;
            if (prodId) {
                await Product.update(
                    { status: 'out_of_stock', stockQuantity: 0 },
                    {
                        where: { id: prodId },
                        transaction
                    }
                );
            }
        }

        // If status becomes RETURNED or REJECTED, archive the product
        if (updates.status === 'RETURNED' || updates.status === 'REJECTED') {
            const prodId = updates.productId || consignment.productId;
            if (prodId) {
                await Product.update(
                    { status: 'archived', stockQuantity: 0 },
                    {
                        where: { id: prodId },
                        transaction
                    }
                );
            }
        }

        const originalStatus = consignment.status;

        await consignment.update(updates, { transaction });
        await transaction.commit();

        const updatedConsignment = await Consignment.findByPk(id, {
            include: [
                { model: ConsignmentImage, as: 'images', attributes: ['id', 'url'] },
                { model: User, as: 'user', attributes: ['id', 'username', 'email', 'fullName', 'phone'] },
                { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
                { model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'price', 'status'] }
            ]
        });

        // Trigger email and system notifications if the status changed
        if (payload.status && payload.status !== originalStatus && updatedConsignment && updatedConsignment.user) {
            try {
                const finalStatus = payload.status;
                const statusLabels = {
                    PENDING: 'Chờ duyệt',
                    APPROVED_SHIPPING: 'Duyệt vận chuyển',
                    RECEIVED: 'Đã nhận hàng',
                    ON_SALE: 'Đang bán',
                    SOLD: 'Đã bán',
                    COMPLETED: 'Hoàn thành',
                    RETURNED: 'Đã trả lại',
                    REJECTED: 'Từ chối'
                };
                const statusLabel = statusLabels[finalStatus] || finalStatus;

                let content = `Trạng thái yêu cầu ký gửi "${updatedConsignment.title}" của bạn đã thay đổi sang: ${statusLabel}.`;
                if (finalStatus === 'APPROVED_SHIPPING') {
                    content = `Yêu cầu ký gửi "${updatedConsignment.title}" của bạn đã được duyệt vận chuyển. Vui lòng mang sản phẩm đến cửa hàng để đối soát.`;
                } else if (finalStatus === 'RECEIVED') {
                    content = `Cửa hàng đã nhận sản phẩm ký gửi "${updatedConsignment.title}" từ bạn.`;
                } else if (finalStatus === 'ON_SALE') {
                    content = `Sản phẩm ký gửi "${updatedConsignment.title}" đã được đăng bán chính thức trên cửa hàng với giá chốt $${updatedConsignment.approvedPrice} (Phí sàn: $${updatedConsignment.consignmentFee}, Thực nhận: $${updatedConsignment.receiveAmount}).`;
                } else if (finalStatus === 'SOLD') {
                    content = `Sản phẩm ký gửi "${updatedConsignment.title}" của bạn đã bán thành công. Đang chờ đối soát thanh toán.`;
                } else if (finalStatus === 'COMPLETED') {
                    content = `Yêu cầu ký gửi "${updatedConsignment.title}" đã hoàn thành. Cửa hàng đã tất toán số tiền thực nhận là $${updatedConsignment.receiveAmount} cho bạn (sau khi trừ 10% phí sàn). Cảm ơn bạn đã tin tưởng dịch vụ!`;
                } else if (finalStatus === 'RETURNED') {
                    content = `Sản phẩm ký gửi "${updatedConsignment.title}" đã được hoàn trả lại cho bạn.`;
                } else if (finalStatus === 'REJECTED') {
                    content = `Yêu cầu ký gửi "${updatedConsignment.title}" của bạn đã bị từ chối.${payload.adminNote ? ` Lý do: ${payload.adminNote}` : ''}`;
                }

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 10px;">
                        <h2 style="color: #6200ee; text-align: center;">Cập nhật yêu cầu ký gửi tại UTEShop</h2>
                        <p>Xin chào <strong>${updatedConsignment.user.fullName || updatedConsignment.user.username}</strong>,</p>
                        <p>Chúng tôi xin thông báo về trạng thái mới cho yêu cầu ký gửi của bạn:</p>
                        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Sản phẩm:</strong> ${updatedConsignment.title}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Mã ký gửi:</strong> #${updatedConsignment.id}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Trạng thái mới:</strong> <span style="background-color: #6200ee; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${statusLabel.toUpperCase()}</span></p>
                            <p style="margin: 0;"><strong>Nội dung:</strong> ${content}</p>
                        </div>
                        ${finalStatus === 'ON_SALE' ? `
                        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32;">
                            <p style="margin: 0 0 5px 0; color: #2e7d32; font-weight: bold;">Thông tin bán hàng:</p>
                            <p style="margin: 0 0 5px 0;">Giá bán niêm yết: <strong>$${updatedConsignment.approvedPrice}</strong></p>
                            <p style="margin: 0 0 5px 0;">Phí sàn (10%): <strong>$${updatedConsignment.consignmentFee}</strong></p>
                            <p style="margin: 0;">Thực nhận sau khi bán (90%): <strong>$${updatedConsignment.receiveAmount}</strong></p>
                        </div>
                        ` : ''}
                        <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                            Đây là email tự động từ hệ thống UTEShop. Vui lòng không phản hồi lại email này.
                        </p>
                    </div>
                `;

                await notificationService.createNotification({
                    userId: updatedConsignment.userId,
                    title: `Cập nhật trạng thái ký gửi #${updatedConsignment.id}`,
                    content,
                    type: 'consignment_status_update',
                    relatedId: String(updatedConsignment.id),
                    emailOptions: {
                        email: updatedConsignment.user.email,
                        subject: `[UTEShop] Cập nhật yêu cầu ký gửi #${updatedConsignment.id}`,
                        message: content,
                        html: emailHtml
                    }
                });
            } catch (notifErr) {
                console.error('❌ Failed to trigger notification for consignment update:', notifErr);
            }
        }

        return updatedConsignment;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Deletes a consignment request by Admin.
 */
async function deleteConsignment(id) {
    const transaction = await sequelize.transaction();
    try {
        const consignment = await Consignment.findByPk(id, { transaction });
        if (!consignment) {
            const err = new Error('Yêu cầu ký gửi không tồn tại');
            err.statusCode = 404;
            throw err;
        }

        // Remove associated images
        await ConsignmentImage.destroy({
            where: { consignmentId: id },
            transaction
        });

        // Delete the consignment itself
        await consignment.destroy({ transaction });
        await transaction.commit();

        return { message: 'Xóa yêu cầu ký gửi thành công' };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    listConsignments,
    updateConsignment,
    deleteConsignment
};
