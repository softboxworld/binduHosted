import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Building2, Users, ClipboardList, Settings as SettingsIcon, LogOut, UserSquare2, Package, ShoppingCart, DollarSign, ChevronLeft, ChevronRight, Plus, Bell, Search, ArrowLeft, X, Menu, ClipboardCheck, Sun, Moon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getThemeStyle } from '../config/theme';
import OrderDetails from './orders/OrderDetails';
import OrdersList from './orders/OrdersList';
import WorkersList from './WorkersList';
import WorkerDetails from './WorkerDetails';
import DashboardOverview from './DashboardOverview';
import TasksList from './TasksList';
import Settings from './Settings';
import ClientsList from './ClientsList';
import FinancialDashboard from './FinancialDashboard';
import ServicesList from './services/ServicesList';
import ProductsList from './inventory/ProductsList';
import SalesOrdersList from './inventory/SalesOrdersList';
import SalesOrderDetails from './inventory/SalesOrderDetails';
import Categories from '../pages/Categories';
import ClientDetails from './clients/ClientDetails';
import ImportDataPage from './importpages/ImportDataPage';
import ClientDataImport from './importpages/ClientDataImport';
import OrderDataImport from './importpages/OrderDataImport';
import PaymentDataImport from './importpages/PaymentDataImport';
import OrderDataImportfix from './importpages/OrderDataImportfix';

export default function Dashboard() {
  const { user, organization } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [screenSize, setScreenSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false
  });

  // Handle window resize with more granular breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 640,    // sm breakpoint
        isTablet: width >= 640 && width < 1024, // sm to lg breakpoint
        isDesktop: width >= 1024  // lg breakpoint
      });
      
      // Auto-collapse sidebar on mobile
      if (width < 640) {
        setIsSidebarExpanded(false);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if organization setup is complete
  const isSetupComplete = organization && organization.country && organization.city && 
    organization.address && organization.employee_count && organization.currency;

  // Redirect to setup if not complete
  if (!isSetupComplete) {
    return <Navigate to="/organization-setup" />;
  }

  // If no user or organization, render nothing - let the router handle redirection
  if (!user || !organization) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await useAuthStore.getState().signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: 'Overview', path: '/dashboard', icon: Building2 },
    { name: 'Workers', path: '/dashboard/workers', icon: Users },
    { name: 'Clients', path: '/dashboard/clients', icon: UserSquare2 },
    { name: 'Orders', path: '/dashboard/orders', icon: ClipboardCheck },
    { name: 'Sales', path: '/dashboard/sales', icon: ShoppingCart },
    { name: 'Tasks', path: '/dashboard/tasks', icon: ClipboardList },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package },
    { name: 'Finances', path: '/dashboard/finances', icon: DollarSign },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon }
  ];

  return (
    <div className={`min-h-screen flex ${getThemeStyle(theme, 'background', 'secondary')}`}>
      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} z-50 flex items-center justify-center p-4`}>
          <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg shadow-xl w-full max-w-md`}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Confirm Sign Out</h3>
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className={getThemeStyle(theme, 'text', 'accent')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className={`${getThemeStyle(theme, 'text', 'secondary')} mb-6`}>
                Are you sure you want to sign out? You will need to sign in again to access your account.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    theme === 'dark' 
                      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Only show on tablet and desktop */}
      {!screenSize.isMobile && (
        <div 
          className={`fixed h-screen shadow-lg ${getThemeStyle(theme, 'sidebar', 'shadow')} will-change-transform ${
            isSidebarExpanded ? 'w-64' : 'w-12'
          } transition-[width] duration-300 ease-in-out overflow-hidden ${getThemeStyle(theme, 'sidebar', 'background')}`}
        >
          {/* Organization Header */}
          <div className="p-2">
            <div className="flex items-center relative">
              <div className="absolute left-0 z-10">
                <Building2 className={`h-6 w-6 ${getThemeStyle(theme, 'text', 'secondary')} min-w-[24px]`} />
              </div>
              <div 
                className="ml-8 transform-gpu transition-transform duration-300 origin-left" 
                style={{ 
                  transform: `scaleX(${isSidebarExpanded ? 1 : 0})`,
                  opacity: isSidebarExpanded ? 1 : 0,
                  transition: 'transform 300ms ease-in-out, opacity 200ms ease-in-out'
                }}
              >
                <span className={`text-lg font-semibold whitespace-nowrap ${getThemeStyle(theme, 'text', 'primary')}`}>
                  {organization.name}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <div className="px-2">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              className={`w-full flex items-center justify-center p-1.5 transition-colors ${getThemeStyle(theme, 'text', 'accent')}`}
            >
              <div className="transform-gpu transition-transform duration-300">
                {isSidebarExpanded ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="overflow-y-auto max-h-[calc(100vh-8rem)]">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={item.name}
                  className={`flex items-center relative ${
                    isSidebarExpanded 
                      ? 'px-3 mx-2' 
                      : 'px-1.5'
                  } py-2.5 rounded transition-[padding,margin,background-color] duration-200 ${
                    isActive
                      ? `${getThemeStyle(theme, 'sidebar', 'itemActive')} ${getThemeStyle(theme, 'sidebar', 'itemActiveText')}`
                      : `${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'sidebar', 'itemHover')}`
                  }`}
                >
                  <div className="absolute left-3 z-10">
                    <item.icon className={`h-5 w-5 ${
                      isActive 
                        ? getThemeStyle(theme, 'text', 'inverse')
                        : getThemeStyle(theme, 'text', 'accent')
                    }`} />
                  </div>
                  <div 
                    className="ml-8 transform-gpu transition-transform duration-300 origin-left"
                    style={{ 
                      transform: `scaleX(${isSidebarExpanded ? 1 : 0})`,
                      opacity: isSidebarExpanded ? 1 : 0,
                      transition: 'transform 300ms ease-in-out, opacity 200ms ease-in-out'
                    }}
                  >
                    <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Button */}
          <div className="absolute bottom-4 w-full">
            <button
              onClick={() => setShowSignOutConfirm(true)}
              title="Sign out"
              className={`flex items-center relative w-full ${
                isSidebarExpanded 
                  ? 'px-3 mx-2' 
                  : 'px-1.5'
              } py-2.5 ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} rounded-lg transition-[padding,margin,background-color] duration-200`}
            >
              <div className="absolute left-3 z-10">
                <LogOut className="h-5 w-5" />
              </div>
              <div 
                className="ml-8 transform-gpu transition-transform duration-300 origin-left"
                style={{ 
                  transform: `scaleX(${isSidebarExpanded ? 1 : 0})`,
                  opacity: isSidebarExpanded ? 1 : 0,
                  transition: 'transform 300ms ease-in-out, opacity 200ms ease-in-out'
                }}
              >
                <span className="text-sm font-medium whitespace-nowrap">Sign out</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {screenSize.isMobile && (
        <div className={`fixed inset-0 z-50 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <div className={`fixed inset-y-0 left-0 w-64 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } shadow-lg transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Organization Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className={`h-6 w-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`} />
                <span className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {organization.name}
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="mt-2 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 ${
                      isActive
                        ? `${getThemeStyle(theme, 'sidebar', 'itemActive')} ${getThemeStyle(theme, 'sidebar', 'itemActiveText')}`
                        : `${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'sidebar', 'itemHover')}`
                    }`}
                  >
                    <item.icon className={`h-5 w-5 mr-3 ${
                      isActive 
                        ? 'text-white' 
                        : theme === 'dark'
                          ? 'text-gray-400'
                          : 'text-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Mobile Sign Out Button */}
            <div className="absolute bottom-4 w-full px-4">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-md ${
                  theme === 'dark'
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <LogOut className="h-5 w-5 mr-2" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        className={`flex-1 transition-[margin] duration-300 ease-in-out ${getThemeStyle(theme, 'background', 'secondary')}`}
        style={{ 
          marginLeft: screenSize.isMobile 
            ? '0' 
            : (isSidebarExpanded ? '16rem' : '3rem')
        }}
      >
        {/* Header */}
        <header className={`${getThemeStyle(theme, 'header', 'background')} shadow-sm ${getThemeStyle(theme, 'sidebar', 'shadow')} sticky top-0 z-10`}>
          <div className="px-2 sm:px-2 md:px-4 lg:px-6">
            <div className="h-12 flex items-center justify-between">
              {/* Left Section */}
              <div className={`flex items-center space-x-2 sm:space-x-4`}>
                {location.pathname !== '/dashboard' && (
                  <button 
                    onClick={() => navigate(-1)}
                    title="Go back"
                    className={`p-[5px] sm:p-[6px] ${getThemeStyle(theme, 'header', 'buttonHover')} rounded-full transition-colors  border ${getThemeStyle(theme, 'border', 'primary')}`}
                  >
                    <ArrowLeft className={`h-4 w-4 sm:h-5 sm:w-5 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  </button>
                )}
                <span className={`text-base sm:text-lg font-semibold truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none ${getThemeStyle(theme, 'text', 'primary')}`}>
                  {navigation.find(item => 
                    location.pathname === item.path || 
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                  )?.name || 'Dashboard'}
                </span>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                

                {/* Notifications
                <button
                  className={`relative p-1.5 sm:p-2 ${getThemeStyle(theme, 'header', 'buttonHover')} rounded-full transition-colors`}
                  title="Notifications"
                >
                  <Bell className={`h-4 w-4 sm:h-5 sm:w-5 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500 rounded-full"></span>
                </button> */}

                {/* User Profile */}
                <div 
                  className="flex items-center space-x-2"
                  title={`Signed in as ${user?.email}`}
                >
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 ${getThemeStyle(theme, 'avatar', 'background')} rounded-full flex items-center justify-center`}>
                    <span className={`text-sm sm:text-base ${getThemeStyle(theme, 'avatar', 'text')}`}>
                      {user?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`relative p-1.5 sm:p-2 ${getThemeStyle(theme, 'header', 'buttonHover')} rounded-full transition-colors`}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <Sun className={`h-4 w-4 sm:h-5 sm:w-5 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  ) : (
                    <Moon className={`h-4 w-4 sm:h-5 sm:w-5 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  )}
                </button>

                {/* Mobile menu button */}
                {screenSize.isMobile && (
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`inline-flex items-center justify-center p-1.5 sm:p-2 rounded-md ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'header', 'buttonHover')} transition-colors`}
                    aria-expanded={isMobileMenuOpen}
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMobileMenuOpen ? (
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className={`${getThemeStyle(theme, 'background', 'secondary')}`}>
          <div className="">
            <Routes>
              <Route index element={<DashboardOverview />} />
              <Route path="workers" element={<WorkersList />} />
              <Route path="workers/:id" element={<WorkerDetails />} />
              <Route path="clients" element={<ClientsList />} />
              <Route path="clients/:id" element={<ClientDetails />} />
              <Route path="orders" element={<OrdersList />} />
              <Route path="orders/services" element={<ServicesList />} />
              <Route path="orders/:id" element={<OrderDetails />} />
              <Route path="tasks" element={<TasksList status={undefined} />} />
              <Route path="tasks/pending" element={<TasksList status="pending" />} />
              <Route path="tasks/in_progress" element={<TasksList status="in_progress" />} />
              <Route path="tasks/delayed" element={<TasksList status="delayed" />} />
              <Route path="tasks/completed" element={<TasksList status="completed" />} />
              <Route path="inventory" element={<ProductsList />} />
              <Route path="categories" element={<Categories />} />
              <Route path="sales" element={<SalesOrdersList />} />
              <Route path="sales/:id" element={<SalesOrderDetails />} />
              <Route path="finances" element={<FinancialDashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="import-data" element={<ImportDataPage />} />
              <Route path="import-data/client-data" element={<ClientDataImport />} />
              <Route path="import-data/order-data" element={<OrderDataImport />} />
              <Route path="import-data/order-data-fix" element={<OrderDataImportfix />} />
              <Route path="import-data/payment-data" element={<PaymentDataImport />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}