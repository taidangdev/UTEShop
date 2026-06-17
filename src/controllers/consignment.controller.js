const consignmentService = require('../services/consignment.service');
const { successResponse } = require('../utils/responseHandler');

const getMyConsignments = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const data = await consignmentService.listMyConsignments(req.user.id, { page, limit });
        return successResponse(res, 200, 'Danh sách ký gửi của bạn', data);
    } catch (error) {
        next(error);
    }
};

const getFormOptions = async (req, res, next) => {
    try {
        const data = await consignmentService.getFormOptions();
        return successResponse(res, 200, 'Tải danh mục ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

const createConsignment = async (req, res, next) => {
    try {
        const data = await consignmentService.createConsignment(req.user.id, req.body);
        return successResponse(res, 201, 'Tạo yêu cầu ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

const updateConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await consignmentService.updateConsignment(Number(id), req.user.id, req.body);
        return successResponse(res, 200, 'Cập nhật yêu cầu ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

const deleteConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await consignmentService.deleteConsignment(Number(id), req.user.id);
        return successResponse(res, 200, data.message || 'Xóa ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyConsignments,
    getFormOptions,
    createConsignment,
    updateConsignment,
    deleteConsignment
};
