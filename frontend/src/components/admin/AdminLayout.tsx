import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/authSlice';

export const ADMIN_SIDEBAR_ITEMS: Array<{
    icon: string;
    label: string;
    path?: string;
}> = [
    { icon: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { icon: 'shopping_cart', label: 'Đơn hàng', path: '/admin/orders' },
    { icon: 'inventory_2', label: 'Sản phẩm', path: '/admin/products' },
    { icon: 'storefront', label: 'Ký gửi', path: '/admin/consignments' },
    { icon: 'category', label: 'Danh mục' },
    { icon: 'sell', label: 'Khuyến mãi' },
    { icon: 'group', label: 'Khách hàng' },
    { icon: 'payments', label: 'Dòng tiền' },
    { icon: 'analytics', label: 'Báo cáo' }
];

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    headerExtra?: ReactNode;
}

export default function AdminLayout({ children, title, subtitle, headerExtra }: AdminLayoutProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-surface text-on-surface">
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col border-r border-outline-variant/30 bg-surface-container-lowest lg:flex">
                <div className="flex h-20 items-center px-8">
                    <span className="text-xl font-bold text-primary">UTEShop</span>
                </div>

                <nav className="flex-1 space-y-2 px-4 py-6">
                    {ADMIN_SIDEBAR_ITEMS.map((item) => {
                        const isActive = item.path ? location.pathname === item.path : false;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled={!item.path}
                                onClick={() => item.path && navigate(item.path)}
                                className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? 'bg-primary/10 font-bold text-primary'
                                        : item.path
                                          ? 'text-on-surface-variant hover:bg-surface-container-low'
                                          : 'cursor-not-allowed text-on-surface-variant/50'
                                }`}
                            >
                                <span
                                    className={`material-symbols-outlined text-[22px] ${
                                        isActive ? 'text-primary' : 'group-hover:text-primary'
                                    }`}
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="border-t border-outline-variant/20 p-6">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-on-surface-variant transition-all duration-200 hover:bg-surface-container-low"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:text-primary">
                            logout
                        </span>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            <main className="min-h-screen lg:ml-72">
                <header className="sticky top-0 z-20 border-b border-outline-variant/30 bg-surface/85 px-6 py-4 backdrop-blur lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1">{headerExtra}</div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="relative rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
                            >
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
                            </button>
                            <div className="text-right">
                                <p className="text-sm font-bold">Admin User</p>
                                <p className="text-[10px] uppercase tracking-wider text-outline">
                                    Super Admin
                                </p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                                AD
                            </div>
                        </div>
                    </div>
                </header>

                <div className="mx-auto max-w-[1280px] space-y-6 p-6 lg:p-8">
                    {(title || subtitle) && (
                        <section>
                            {title && <h2 className="text-3xl font-bold">{title}</h2>}
                            {subtitle && (
                                <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
                            )}
                        </section>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
