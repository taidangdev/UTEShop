import { Link, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import type { AuthUser } from '../../types/auth';

const PRIMARY = '#004AC6';
const TEXT_BODY = '#434655';

interface NavLink {
    label: string;
    to: string;
    matchPath?: boolean;
}

const NAV_LINKS: NavLink[] = [
    { label: 'Home', to: '/' },
    { label: 'Products', to: '/categories', matchPath: true },
    { label: 'Study Tools', to: '/categories?category=study-tools' },
    { label: 'Technology', to: '/categories?category=technology' },
    { label: 'Merchandise', to: '/categories?category=merchandise' },
    { label: 'Student Life', to: '/categories?category=student-life' },
    { label: 'Second-hand', to: '/categories?category=second-hand' },
    { label: 'Support', to: '/#support' }
];

function profileLabel(user: AuthUser | null | undefined): string {
    return user?.fullName || user?.username || user?.email || 'Account';
}

function profileInitial(user: AuthUser | null | undefined): string {
    return profileLabel(user).charAt(0).toUpperCase();
}

function isNavActive(location: Location, link: NavLink): boolean {
    if (link.matchPath) {
        return location.pathname === '/categories' && !location.search.includes('category=');
    }
    if (link.to.startsWith('/categories?')) {
        return `${location.pathname}${location.search}` === link.to;
    }
    if (link.to === '/') {
        return location.pathname === '/' && !location.hash;
    }
    if (link.to.startsWith('/#')) {
        return location.pathname === '/' && location.hash === link.to.slice(1);
    }
    return location.pathname === link.to;
}

export default function ShopHeader() {
    const location = useLocation();
    const user = useAppSelector((state) => state.auth.user);

    return (
        <header
            className="fixed top-0 z-50 w-full border-b border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            style={{ backgroundColor: 'rgba(250, 248, 255, 0.8)', backdropFilter: 'blur(24px)' }}
        >
            <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between gap-4 px-6 lg:gap-8 lg:px-8">
                <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-8">
                    <Link
                        to="/"
                        className="shrink-0 font-inter text-2xl font-semibold"
                        style={{ color: PRIMARY }}
                    >
                        UTEShop
                    </Link>
                    <nav className="hidden items-center gap-6 xl:flex" aria-label="Main">
                        {NAV_LINKS.map((link) => {
                            const active = isNavActive(location, link);
                            return (
                                <Link
                                    key={link.label}
                                    to={link.to}
                                    className="font-inter text-sm font-medium leading-5 transition-colors"
                                    style={{
                                        color: active ? PRIMARY : TEXT_BODY,
                                        borderBottom: active
                                            ? `2px solid ${PRIMARY}`
                                            : '2px solid transparent',
                                        paddingBottom: active ? '2px' : '0',
                                        fontWeight: active ? 700 : 500
                                    }}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-[18px]">
                    <button
                        type="button"
                        className="relative rounded-lg p-2 transition hover:bg-black/5 active:scale-95"
                        style={{ color: PRIMARY }}
                        aria-label="Cart, 2 items"
                    >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        <span
                            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-inter text-[10px] font-bold text-on-tertiary"
                            style={{ backgroundColor: '#943700' }}
                        >
                            2
                        </span>
                    </button>

                    <Link
                        to="/categories"
                        className="rounded-lg p-2 text-primary xl:hidden"
                        aria-label="Browse categories"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </Link>

                    {user ? (
                        <Link
                            to="/profile"
                            className="flex h-10 w-10 items-center justify-center rounded-full font-inter text-sm font-semibold text-white shadow-sm ring-2 ring-primary/20 transition hover:ring-primary/40"
                            style={{
                                backgroundColor: PRIMARY,
                                boxShadow:
                                    location.pathname === '/profile'
                                        ? '0 0 0 2px rgba(0,74,198,0.35)'
                                        : undefined
                            }}
                            aria-label={`Profile, ${profileLabel(user)}`}
                            title={profileLabel(user)}
                        >
                            {profileInitial(user)}
                        </Link>
                    ) : (
                        <Link
                            to="/login"
                            className="rounded-full px-4 py-2 font-inter text-sm font-semibold text-white transition hover:opacity-90"
                            style={{ backgroundColor: PRIMARY }}
                        >
                            Đăng nhập
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
