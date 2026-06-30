// TODO: Viết global error handler để xử lý toàn bộ exception
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle database "Data too long" errors
    if (err.name === 'SequelizeDatabaseError' && err.message.includes('Data too long')) {
        statusCode = 400;
        if (err.message.includes("'title'")) {
            message = 'Tiêu đề sản phẩm không được vượt quá 100 ký tự';
        } else if (err.message.includes("'contactPhone'")) {
            message = 'Số điện thoại liên hệ không được vượt quá 20 ký tự';
        } else {
            message = 'Dữ liệu nhập vào quá dài so với giới hạn cho phép';
        }
    }

    const body = {
        status: 'error',
        message
    };
    if (err.code && typeof err.code === 'string') {
        body.code = err.code;
    }
    if (process.env.NODE_ENV === 'development' && err.stack) {
        body.stack = err.stack;
    }
    res.status(statusCode).json(body);
};

module.exports = errorHandler;
