import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ✅ 2 PROTECTED ROUTES RIÊNG BIỆT
import UserProtectedRoute from './ProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';

// Layouts
import MainLayout from '../components/layout/MainLayout';
import PublicLayout from '../components/layout/PublicLayout';

// --- PUBLIC PAGES ---
import Login from '../pages/auth/Login';
import AdminLogin from '../pages/auth/AdminLogin';
import Register from '../pages/auth/Register';
import RegisterLandlord from '../pages/auth/RegisterLandlord';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import OAuth2Redirect from '../pages/auth/OAuth2Redirect';
import HomePage from '../pages/public/HomePage';
import MarketAnalytics from '../pages/public/MarketAnalytics';
import NotFound from '../pages/common/NotFound';

// --- COMMON PAGES (User + Admin) ---
import RoomDetail from '../pages/common/RoomDetail';
import LandlordProfile from '../pages/common/LandlordProfile';
import UserProfile from '../pages/common/UserProfile';
import SearchMap from '../pages/common/SearchMap';
import FilterPage from '../pages/common/FilterPage';
import KycVerification from '../pages/common/KycVerification';
import NotificationPage from '../pages/common/NotificationPage';
import ChatPage from '../pages/common/ChatPage';
import PaymentSuccess from '../pages/common/PaymentSuccess';
import PaymentFailed from '../pages/common/PaymentFailed';
import MyFavorites from '../pages/common/MyFavorites';

// --- LANDLORD PAGES ---
import LandlordDashboard from '../pages/landlord/LandlordDashboard';
import CreateRoom from '../pages/landlord/CreateRoom';
import MyRooms from '../pages/landlord/MyRooms';
import AppointmentManagement from '../pages/landlord/AppointmentManagement';
import LandlordFinance from '../pages/landlord/LandlordFinance';
import CustomerManagement from '../pages/landlord/CustomerManagement';
import VIPServicePage from '../pages/landlord/LandlordVIP';

// --- ADMIN PAGES ---
import AdminDashboard from '../pages/admin/Dashboard';
import RecommendDashboard from '../pages/admin/RecommendDashboard';
import RoomApprove from '../pages/admin/RoomApprove';
import RoomManagement from '../pages/admin/RoomManagement';
import ProjectManagement from '../pages/admin/ProjectManagement';
import MasterData from '../pages/admin/MasterData';
import UserManagement from '../pages/admin/UserManagement';
import ServicePackages from '../pages/admin/ServicePackages';

const AppRoutes = () => {
    return (
        <Routes>
            {/* ========================================================= */}
            {/* 0. PUBLIC LOGIN PAGES - KHÔNG CẦN AUTH                    */}
            {/* ========================================================= */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/login-success" element={<OAuth2Redirect />} />
            <Route path="/register" element={<Register />} />
            {/* <Route path="/register-landlord" element={<RegisterLandlord />} /> */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ========================================================= */}
            {/* 1. PUBLIC PAGES - KHÔNG CẦN LOGIN                         */}
            {/* ========================================================= */}
            <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/search" element={<SearchMap />} />
                <Route path="/filter" element={<FilterPage />} />
                {/* Public profile - ai cũng xem được */}
                <Route path="/users/public-profile/:slug" element={<LandlordProfile />} />
                {/* Room detail - public */}
                <Route path="/rooms/:id" element={<RoomDetail />} />
                <Route path="/analytics" element={<MarketAnalytics />} />
            </Route>

            {/* ========================================================= */}
            {/* 2. USER ROUTES - USER PROTECTED ROUTE                      */}
            {/* Cho: USER, TENANT, LANDLORD                               */}
            {/* ========================================================= */}
            <Route element={<UserProtectedRoute allowedRoles={['USER', 'TENANT', 'LANDLORD']} />}>
                <Route element={<MainLayout />}>
                    {/* Common cho tất cả user đã login */}
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/favorites" element={<MyFavorites />} />
                    <Route path="/kyc" element={<KycVerification />} />
                    <Route path="/notifications" element={<NotificationPage />} />
                    <Route path="/messages" element={<ChatPage />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                </Route>
            </Route>

            {/* ========================================================= */}
            {/* 3. LANDLORD ONLY - USER PROTECTED ROUTE                    */}
            {/* ========================================================= */}
            <Route element={<UserProtectedRoute allowedRoles={['LANDLORD']} />}>
                <Route path="/landlord" element={<MainLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<LandlordDashboard />} />
                    <Route path="create-room" element={<CreateRoom />} />
                    <Route path="room-list" element={<MyRooms />} />
                    <Route path="appointments" element={<AppointmentManagement />} />
                    <Route path="customers" element={<CustomerManagement />} />
                    <Route path="finance" element={<LandlordFinance />} />
                    <Route path="vip-packages" element={<VIPServicePage />} />
                </Route>
            </Route>

            {/* ========================================================= */}
            {/* 4. ADMIN ROUTES - ADMIN PROTECTED ROUTE (RIÊNG BIỆT!)     */}
            {/* ========================================================= */}
            <Route element={<AdminProtectedRoute />}>
                <Route path="/admin" element={<MainLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="recommend-dashboard" element={<RecommendDashboard />} />
                    <Route path="approve-rooms" element={<RoomApprove />} />
                    <Route path="rooms" element={<RoomManagement />} />
                    <Route path="projects" element={<ProjectManagement />} />
                    <Route path="master-data" element={<MasterData />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="service-packages" element={<ServicePackages />} />
                </Route>
            </Route>

            {/* ========================================================= */}
            {/* 5. 404 NOT FOUND                                           */}
            {/* ========================================================= */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;