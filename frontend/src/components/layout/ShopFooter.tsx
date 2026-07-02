import { Link } from 'react-router-dom';

export default function ShopFooter() {
    return (
        <footer className="mt-20 w-full border-t border-outline-variant/30 bg-surface-container-low">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 px-6 py-20 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                <div>
                    <div className="mb-4 text-2xl font-bold text-on-surface">UTEShop</div>
                    <p className="mb-4 max-w-xs text-base text-on-surface-variant">
                        "Chất lượng chuẩn kỹ thuật. Được cung cấp hàng ngày cho những người đổi mới của ngày mai."
                    </p>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Tài nguyên</h4>
                    <nav className="flex flex-col gap-3">
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Hỗ trợ sinh viên
                        </a>
                        <Link to="/categories" className="text-sm text-on-surface-variant hover:text-primary">
                            Giảm giá sinh viên
                        </Link>
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Bảo hành & Sửa chữa
                        </a>
                    </nav>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Công ty</h4>
                    <nav className="flex flex-col gap-3">
                        <a href="/#support" className="text-sm text-on-surface-variant hover:text-primary">
                            Chính sách bảo mật
                        </a>
                        <Link to="/profile" className="text-sm text-on-surface-variant hover:text-primary">
                            Cổng Giáo viên
                        </Link>
                    </nav>
                </div>
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary">Bản tin</h4>
                    <p className="mb-4 text-sm text-on-surface-variant">Nhận cập nhật phần cứng và hướng dẫn phòng thí nghiệm.</p>
                    <div className="flex overflow-hidden rounded-full border border-outline-variant">
                        <input
                            type="email"
                            placeholder="edu-email"
                            className="w-full border-none bg-transparent px-4 py-2 text-sm focus:ring-0"
                        />
                        <button type="button" className="bg-primary px-4 text-sm font-medium text-on-primary">
                            Tham gia
                        </button>
                    </div>
                </div>
            </div>
            <div className="border-t border-outline-variant/30 px-6 py-8 text-center lg:text-left">
                <p className="mx-auto max-w-[1280px] text-sm text-outline lg:px-8">
                    © 2024 UTEShop Technology. Chất lượng chuẩn kỹ thuật.
                </p>
            </div>
        </footer>
    );
}
