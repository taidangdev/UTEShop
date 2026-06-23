import { Link } from 'react-router-dom';

export default function CheckoutFooter() {
    return (
        <footer className="mt-20 border-t border-outline-variant/30 bg-surface-container-low">
            <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 px-6 py-20 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                <div>
                    <div className="mb-6 text-2xl font-bold tracking-tight text-on-surface">UTEShop</div>
                    <p className="pr-8 text-base text-on-surface-variant">
                        Providing the tools of tomorrow for the engineers of today. Innovation begins in the
                        classroom.
                    </p>
                </div>
                <div className="space-y-4">
                    <p className="text-sm font-bold text-on-surface">Support</p>
                    <ul className="space-y-2 text-on-surface-variant">
                        <li>
                            <Link to="/support" className="transition hover:text-primary">
                                Academic Support
                            </Link>
                        </li>
                        <li>
                            <Link to="/categories" className="transition hover:text-primary">
                                Student Discounts
                            </Link>
                        </li>
                        <li>
                            <Link to="/support" className="transition hover:text-primary">
                                Warranty &amp; Repairs
                            </Link>
                        </li>
                    </ul>
                </div>
                <div className="space-y-4">
                    <p className="text-sm font-bold text-on-surface">Corporate</p>
                    <ul className="space-y-2 text-on-surface-variant">
                        <li>
                            <Link to="/support" className="transition hover:text-primary">
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link to="/profile" className="transition hover:text-primary">
                                Faculty Portal
                            </Link>
                        </li>
                    </ul>
                </div>
                <div className="space-y-4">
                    <p className="text-sm font-bold text-on-surface">Connect</p>
                    <div className="flex gap-4">
                        <span className="material-symbols-outlined cursor-pointer rounded-full bg-surface-container-highest p-2 transition hover:bg-primary hover:text-white">
                            alternate_email
                        </span>
                        <span className="material-symbols-outlined cursor-pointer rounded-full bg-surface-container-highest p-2 transition hover:bg-primary hover:text-white">
                            public
                        </span>
                        <span className="material-symbols-outlined cursor-pointer rounded-full bg-surface-container-highest p-2 transition hover:bg-primary hover:text-white">
                            terminal
                        </span>
                    </div>
                    <p className="mt-4 text-xs text-outline">
                        © 2024 UTEShop Technology. Engineering Excellence.
                    </p>
                </div>
            </div>
        </footer>
    );
}
