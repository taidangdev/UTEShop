import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../../services/authSession';
import { useAppSelector } from '../../store/hooks';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string;
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const user = useAppSelector((state) => state.auth.user);
    const location = useLocation();
    const token = getAccessToken();

    if (!user && !token) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
