import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ShopLayout from './components/layout/ShopLayout';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import CouponsPage from './pages/CouponsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutInformationPage from './pages/CheckoutInformationPage';
import CheckoutPaymentPage from './pages/CheckoutPaymentPage';
import ProfilePage from './pages/ProfilePage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import MyOrdersPage from './pages/MyOrdersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import ConsignmentPage from './pages/ConsignmentPage';
import AdminConsignmentsPage from './pages/AdminConsignmentsPage';

function HomeRouteGuard() {
    const user = useAppSelector((state) => state.auth.user);
    if (user?.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
    }
    return <HomePage />;
}

function App() {
    return (
        <NotificationProvider>
            <SocketProvider>
            <Router>
                <Routes>
                    <Route element={<ShopLayout />}>
                        <Route path="/" element={<HomeRouteGuard />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/coupons" element={<CouponsPage />} />
                        <Route path="/products/:slug" element={<ProductDetailPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/activate" element={<ActivateAccountPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <ProfilePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/orders"
                            element={
                                <ProtectedRoute>
                                    <MyOrdersPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile/orders/:orderNumber"
                            element={
                                <ProtectedRoute>
                                    <OrderTrackingPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/consignments"
                            element={
                                <ProtectedRoute>
                                    <ConsignmentPage />
                                </ProtectedRoute>
                            }
                        />
                    </Route>
                    <Route path="/checkout" element={<CheckoutInformationPage />} />
                    <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminDashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/orders"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminOrdersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/products"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminProductsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/consignments"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminConsignmentsPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </SocketProvider>
    </NotificationProvider>
    );
}

export default App;

