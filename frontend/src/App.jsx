import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, matchPath } from 'react-router-dom';
import Header from './components/header/Index.jsx';
import MobileBottomNavigation from './components/mobile/MobileBottomNavigation.jsx';
import MobileSearchPage from './pages/products/MobileSearchPage.jsx';
import ProductPage from './pages/products/ProductPage.jsx';
import CartPage from './pages/carts/CartPage.jsx';
import CheckoutPage from './pages/payments/CheckoutPage.jsx';
import WishesPage from './pages/user/WishesPage.jsx';
import Products from './components/product/Products.jsx';
import LoginPage from './pages/user/LoginPage.jsx';
import SignupPage from './pages/user/SignupPage.jsx';
import { AuthProvider,useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext.jsx';
import { CategoryProvider } from "./contexts/CategoryContext.jsx";
import ProfilePage from './pages/user/ProfilePage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import FilteredProductPage from "./pages/products/FilteredProductPage.jsx";
import MyPointPage from './pages/payments/MyPointPage.jsx';
import PaymentRegistrationPage from './pages/payments/PaymentRegistrationPage.jsx';
import ChargePage from './pages/payments/ChargePage.jsx';
import PaypayBalancePage from './pages/payments/PaypayBalancePage.jsx';
import CardBalancePage from './pages/payments/CardBalancePage.jsx';
import OrderSuccessPage from './pages/orders/OrderSuccessPage.jsx';
import { AuthContext } from "./contexts/AuthContext";
import OrderHistoryPage from './pages/orders/OrderHistoryPage.jsx';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import ReviewPage from './pages/user/ReviewPage.jsx';
import Promotions from "./components/product/Promotions.jsx";


const ProtectedRoute = ({ requiresAuth = false, onlyUnauthenticated = false, redirectPath = '/' }) => {
        const { isLoggedIn,loading } = useAuth();

        if (loading) {
            return null;
        }

        //case 1 : not login
        if(onlyUnauthenticated){
            if(isLoggedIn) return <Navigate to={redirectPath} replace />; //'replace' no back
            return <Outlet />;
        }

        //case 2 : only login
        if(requiresAuth){
            if(!isLoggedIn) return <Navigate to={redirectPath} replace />;
            return <Outlet />
        }
        //case 3 : public ok
        return <Outlet />;
    };

function AppContent() {

    const location = useLocation();

    const promotionPaths = [
        "/",
    ]

    const shouldShowPromotions = promotionPaths.some(path => matchPath(path, location.pathname));

    const { user, logout } = useAuth(); // user 정보와 logout 함수

    const [isCatalogOpen, setIsCatalogOpen] = useState(false); // 상태 선언 추가

    const handleLogout = () => {
        logout();
    };

    return (
      <>
        {/* AuthContext */}
      <CartProvider>
        <Header
            isCatalogOpen={isCatalogOpen}
            setIsCatalogOpen={setIsCatalogOpen}
        />

        {/* Routing Area */}
        <main className="min-h-screen pb-20">
            {shouldShowPromotions && <Promotions />}
            {/* public */}
            <Routes>
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Products />} />
                  <Route path="/products" element={<FilteredProductPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/search" element={<MobileSearchPage />} />
                  <Route path="/review/:productId" element={<ReviewPage />} />
                {/* (Payment/Checkout) 機能はショッピングカート内のアクションか別途ページ
                    もし/checkoutページがあれば、次のように保護:
                    <Route path="/checkout" element={<ProtectedRoute requiresAuth={true} redirectPath="/login"><CheckoutPage /></ProtectedRoute>} />
                    */}
              </Route>

                  {/* not Login */}
                  <Route element={<ProtectedRoute onlyUnauthenticated={true} redirectPath="/" />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                  </Route>

                  {/* Need Login */}
                  <Route element={<ProtectedRoute requiresAuth={true} redirectPath="/login" />}>
                    <Route path="/wishes" element={<WishesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/my-points" element={<MyPointPage />} />
                    <Route path="/payment-registration" element={<PaymentRegistrationPage />} />
                    <Route path="/charge" element={<ChargePage />} />
                    <Route path="/paypay-balance-page" element={<PaypayBalancePage />} />
                    <Route path="/card-balance-page" element={<CardBalancePage />} />
                    <Route path="/order-success" element={<OrderSuccessPage />} />
                    <Route path="/orders" element={<OrderHistoryPage />} />
                    <Route path="/my-orders/:orderId" element={<OrderDetailPage />} />

                    {/*  + login need page(ex: /profile, /dashboard) */}
                    {/* <Route path="/profile" element={<ProfilePage />} /> */}
                    {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
                  </Route>

                  {/* 404 Not Found page */}
                  <Route path="*" element={<div>(404 Not Found)</div>} />
                </Routes>
          </main>
          </CartProvider>

        {/* Footer */}
        {/* <Footer /> */}

            {/* Mobile Bottom Navigation */}
          <MobileBottomNavigation
              user={user}
              onLogout={handleLogout}
              setIsCatalogOpen={setIsCatalogOpen}
          />
      </>
    );
  }

export default function App() {
    return (
      <Router>
          <CategoryProvider>
              <AuthProvider>
                  <AppContent />
                  </AuthProvider>
          </CategoryProvider>
      </Router>
    );
}
