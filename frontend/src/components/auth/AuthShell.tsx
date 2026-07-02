import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthBrand() {
    return (
        <div className="mb-10 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg">
                <span className="material-symbols-outlined text-[32px]">engineering</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-primary">UTEShop</h1>
            <p className="mt-2 text-sm font-medium text-on-surface-variant">
                Thiết bị Công nghệ Chuẩn Kỹ thuật
            </p>
        </div>
    );
}

interface AuthTabsProps {
    active: 'login' | 'signup';
}

export function AuthTabs({ active }: AuthTabsProps) {
    const loginActive = active === 'login';
    return (
        <div className="flex border-b border-outline-variant/20">
            <Link
                to="/login"
                className={`flex-1 py-5 text-center text-sm font-medium transition-colors ${
                    loginActive
                        ? 'border-b-2 border-primary bg-primary/5 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container'
                }`}
                aria-current={loginActive ? 'page' : undefined}
            >
                Đăng nhập
            </Link>
            <Link
                to="/register"
                className={`flex-1 py-5 text-center text-sm font-medium transition-colors ${
                    !loginActive
                        ? 'border-b-2 border-primary bg-primary/5 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container'
                }`}
                aria-current={!loginActive ? 'page' : undefined}
            >
                Đăng ký
            </Link>
        </div>
    );
}

export function AuthFooter() {
    return (
        <footer className="w-full border-t border-outline-variant/10 bg-surface py-2">
            <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-6">
                <p className="text-xs text-on-surface-variant">© 2024 UTEShop. Chất lượng chuẩn kỹ thuật.</p>
                <div className="flex gap-6">
                    <a
                        href="#support"
                        className="text-xs text-on-surface-variant transition-colors hover:text-primary"
                    >
                        Chính sách bảo mật
                    </a>
                    <a
                        href="#support"
                        className="text-xs text-on-surface-variant transition-colors hover:text-primary"
                    >
                        Điều khoản dịch vụ
                    </a>
                    <a
                        href="#support"
                        className="text-xs text-on-surface-variant transition-colors hover:text-primary"
                    >
                        Hỗ trợ
                    </a>
                </div>
            </div>
        </footer>
    );
}

interface SecondaryLink {
    to: string;
    title: string;
    subtitle: string;
}

interface AuthShellProps {
    children: ReactNode;
    activeTab: 'login' | 'signup';
    showBrand?: boolean;
    secondaryLink?: SecondaryLink | null;
}

export default function AuthShell({
    children,
    activeTab,
    showBrand = false,
    secondaryLink = {
        to: '/register',
        title: 'Sinh viên mới? Đăng ký tài khoản ngay.',
        subtitle: 'Mã xác thực sẽ được gửi qua email sinh viên.'
    }
}: AuthShellProps) {
    return (
        <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-surface text-on-surface">
            <main className="relative flex flex-grow items-center justify-center overflow-hidden px-4 py-10 md:px-6 md:py-14">
                <div className="pointer-events-none absolute inset-0 -z-10 opacity-30" aria-hidden>
                    <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute bottom-24 right-24 h-64 w-64 rounded-full bg-tertiary-fixed-dim/20 blur-3xl" />
                </div>

                <div className="z-10 w-full max-w-[480px]">
                    {showBrand && <AuthBrand />}

                    <div className="overflow-hidden rounded-[32px] border border-outline-variant/30 bg-surface-container-lowest shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                        <AuthTabs active={activeTab} />
                        {children}
                    </div>

                    {secondaryLink && (
                        <Link
                            to={secondaryLink.to}
                            className="mt-8 flex items-center gap-4 rounded-3xl border border-primary/10 bg-primary/5 p-6 transition-colors hover:bg-primary/10"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                <span className="material-symbols-outlined text-primary">mail</span>
                            </div>
                            <div className="min-w-0 flex-grow">
                                <p className="text-sm font-semibold text-on-surface">{secondaryLink.title}</p>
                                <p className="text-xs text-on-surface-variant">{secondaryLink.subtitle}</p>
                            </div>
                            <span className="material-symbols-outlined shrink-0 text-on-surface-variant">
                                chevron_right
                            </span>
                        </Link>
                    )}

                    <p className="mt-12 text-center text-xs text-on-surface-variant/60">
                        Cổng cung cấp thiết bị Khoa Kỹ thuật v2.4
                    </p>
                </div>
            </main>

            <AuthFooter />
        </div>
    );
}
