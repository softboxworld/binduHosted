import { Link } from 'react-router-dom';
import {
  Building2, ClipboardList, DollarSign,
  Package, BarChart4,
  ArrowRight, CheckCircle, Clock, UserCircle,
  Receipt, Globe, Star
} from 'lucide-react';

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LandingPage() {
  const { user } = useAuthStore();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm z-50 border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-blue-400 ml-2 text-xl font-bold">Bindu</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
            <a href="#pricing" className="text-gray-300 hover:text-blue-400 font-medium">Pricing</a>
            <Link
              to="/auth/signin"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg transition-all duration-300"
            >
              Sign In
            </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div 
        className="relative overflow-hidden bg-gray-900"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px,rgba(59, 130, 246, .2) 1px, transparent 0),
            linear-gradient(to right, #111827, #111827)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '-19px -19px'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <nav className="absolute top-0 left-0 right-0 p-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600" />
                <span className="text-blue-400 ml-2 text-xl font-bold">Sten360</span>
              </div>
              <div className="flex items-center space-x-4">
                                  <Link to="#resources" className="text-gray-300 hover:text-white hidden sm:block">Resources</Link>
                  <Link to="#pricing" className="text-gray-300 hover:text-white hidden sm:block">Pricing</Link>
                <Link
                  to="/auth/signin"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </nav>

          <div className="relative mt-8 flex flex-col lg:flex-row gap-8">
            {/* Left Side Content */}
            <div className="w-full lg:w-1/2 flex items-center px-4 lg:px-0 text-center lg:text-left">
              <div>
                <h1 className="text-4xl xs:text-5xl font-bold text-white leading-tight">
                  All Systems Go.
                  <span className="block text-gray-300 mt-2">Make your business use Tech - Updated! 🚀</span>
                </h1>
                <p className="mt-6 text-base xs:text-lg text-gray-300 max-w-[90%] sm:max-w-[70%] lg:max-w-full mx-auto lg:mx-0">
                  Our platform manages everything: clients, staff, orders, inventory, payments, and receipts—simple like drinking koko
                </p>
                <div className="mt-8">
                  <Link
                    to="/auth/signup"
                    className="inline-flex items-center px-4 xs:px-6 py-2 xs:py-3 text-sm xs:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side Elements */}
            <div className="w-full lg:w-1/2 relative h-[400px] xs:h-[400px] sm:h-[550px] md:h-[600px] lg:h-[650px] mt-10 xs:mt-16 sm:mt-20 lg:mt-0 text-gray-900">
              {/* Desktop layout - Large screens with overlapping cards */}
              <div className="h-full w-full relative max-w-[530px] mx-auto">

                <div className="absolute top-0 left-0 bg-white rounded-xl shadow-lg w-[70%] h-[16/9] z-30 transform hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                  <img src="/images/dashboardLight.webp" alt="Client Management" className="w-full h-full object-cover" />
                </div>

                <div className="absolute top-[5%] right-0 bg-white rounded-xl shadow-lg w-[70%] h-[16/9] z-20 transform hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden">
                  <img src="/images/dashboardDark.webp" alt="Order Management" className="w-full h-full object-cover" />
                </div>

                <div className="absolute top-[31%] left-4 bg-white rounded-xl shadow-lg w-[70%] h-[16/9] z-10 transform hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden">
                  <img src="/images/OrdersLight.webp" alt="Payment Tracking" className="w-full h-full object-cover" />
                </div>

                <div className="absolute top-[38%] right-0 bg-white rounded-xl shadow-lg w-[70%] h-[16/9] z-0 transform hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden">
                  <img src="/images/OrdersDark.webp" alt="Operations" className="w-full h-full object-cover" />
                </div>

                <div className="absolute top-[65%] left-[20%] bg-white rounded-xl shadow-lg w-[70%] h-[16/9] z-20 transform hover:-translate-y-2 hover:z-40 transition-all duration-300 overflow-hidden">
                  <img src="/images/OrderDetailsLight.webp" alt="Operations" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="relative py-20 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Floating Icons */}
          <div className="absolute top-20 right-1/4 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-32 left-1/4 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4s'}}>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="absolute top-1/2 right-10 animate-bounce" style={{animationDelay: '2.5s', animationDuration: '3.5s'}}>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl text-white mb-6 leading-tight mt-8">
              <span className="bg-gradient-to-rt">
                Grow your Business
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Designed specifically for Ghanaian Businesses to manage clients, orders, and finances effortlessly with cutting-edge technology.
            </p>
            
            {/* Decorative Line */}
            <div className="flex items-center justify-center mt-8">
              <div className="w-20 h-1 bg-gradient-to-r from-transparent to-blue-600 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full mx-4 animate-pulse"></div>
              <div className="w-20 h-1 bg-gradient-to-l from-transparent to-purple-600 rounded-full"></div>
            </div>
          </div>

          {/* Enhanced Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Service 1 - Record Keeping */}
            <div className="group relative">
              {/* Background Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl transform rotate-6 group-hover:rotate-3 transition-transform duration-500 opacity-10 group-hover:opacity-20"></div>
              
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-800 group-hover:border-blue-500">
                {/* Floating Icon Container */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                    <ClipboardList className="w-10 h-10 text-white" />
                  </div>
                  {/* Floating Particles */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-300 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">
                  Never Lose a Customer's Details Again
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  No more scattered exercise books or lost measurement cards. Keep all your customer information, their measurements, fabric preferences, and promised delivery dates in one safe place that you can access anytime.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium">Customer Details</span>
                  <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium">Measurements Safe</span>
                  <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium">Delivery Dates</span>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </div>

            {/* Service 2 - Outstanding Balance */}
            <div className="group relative">
              {/* Background Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl transform -rotate-6 group-hover:-rotate-3 transition-transform duration-500 opacity-10 group-hover:opacity-20"></div>
              
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-800 group-hover:border-purple-500">
                {/* Floating Icon Container */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                    <DollarSign className="w-10 h-10 text-white" />
                  </div>
                  {/* Floating Particles */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-300 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                  {/* Money Symbol Animation */}
                  <div className="absolute top-0 left-0 w-6 h-6 text-purple-300 animate-bounce" style={{animationDelay: '1s'}}>
                    ₵
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors duration-300">
                  No More "I'll Pay You Next Week"
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Stop losing money to customers who say they'll pay later. Keep track of who owes you what, send gentle reminders, and get your money without the stress of chasing people around.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm font-medium">Who Owes You</span>
                  <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm font-medium">Smart Reminders</span>
                  <span className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm font-medium">Payment Records</span>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </div>

            {/* Service 3 - Financial Reports */}
            <div className="group relative">
              {/* Background Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl transform rotate-6 group-hover:rotate-3 transition-transform duration-500 opacity-10 group-hover:opacity-20"></div>
              
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-800 group-hover:border-green-500">
                {/* Floating Icon Container */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg">
                    <Receipt className="w-10 h-10 text-white" />
                  </div>
                  {/* Floating Particles */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-300 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  {/* Chart Animation */}
                  <div className="absolute -top-1 -left-1">
                    <BarChart4 className="w-4 h-4 text-green-300 animate-bounce" style={{animationDelay: '0.5s'}} />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
                  Show Them You're Serious Business
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Print proper receipts that make your customers respect your work. Know exactly how much you're making each month and plan your business growth like the professional you are.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm font-medium">Reports</span>
                  <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm font-medium">Receipts</span>
                  <span className="px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-sm font-medium">Analytics</span>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Section */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center bg-gradient-to-r from-gray-800 to-gray-700 rounded-full px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-600">
              <div className="flex -space-x-2 mr-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AK</span>
                </div>
                <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">KA</span>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">EA</span>
                </div>
                <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+500</span>
                </div>
              </div>
              <span className="text-gray-200 font-medium">Join 500+ Ghanaian tailors already growing with Bindu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {/* <div className="py-16 bg-gradient-to-r from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Tailors Using Bindu</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25K+</div>
              <div className="text-blue-100">Orders Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₵2M+</div>
              <div className="text-blue-100">Revenue Managed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99%</div>
              <div className="text-blue-100">Client Satisfaction</div>
            </div>
          </div>
        </div>
      </div> */}

      
      {/* Financial Management Section */}
      <div className="relative py-24 pt-36 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-28 h-28 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
          <div className="absolute top-60 right-16 w-36 h-36 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Floating Icons */}
          <div className="absolute top-32 right-1/3 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="absolute bottom-40 left-1/5 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4s'}}>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="absolute top-1/2 right-12 animate-bounce" style={{animationDelay: '2.5s', animationDuration: '3.5s'}}>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Enhanced Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl text-white mb-6 leading-tight mt-8">
              <span className="">
                Get Paid on Time, Every Time
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Stop chasing payments and start growing your business
            </p>
            
            {/* Decorative Line */}
            <div className="flex items-center justify-center mt-8">
              <div className="w-20 h-1 bg-gradient-to-r from-transparent to-green-600 rounded-full"></div>
              <div className="w-3 h-3 bg-green-600 rounded-full mx-4 animate-pulse"></div>
              <div className="w-20 h-1 bg-gradient-to-l from-transparent to-blue-600 rounded-full"></div>
            </div>
          </div>
          
          <div className="mb-16">
            <img 
              src="/images/dashboardDark.webp" 
              alt="Financial Management Dashboard for Tailors" 
              className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Know Who Still Owes You</h3>
                  <p className="text-gray-300 text-sm">Stop forgetting who hasn't paid - see it all in one place</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Send Reminders Politely</h3>
                  <p className="text-gray-300 text-sm">No more awkward conversations - the system reminds them for you</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Look Professional</h3>
                  <p className="text-gray-300 text-sm">Give proper receipts that show you mean business</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-green-400 mb-2">₵2.5K</div>
                <p className="text-gray-300">Average monthly revenue increase</p>
              </div>
              <blockquote className="text-gray-200 italic text-center">
                "Before Bindu, I was always mixing up my customers' measurements and losing their fabric details. Now everything is organized and I don't have to worry about disappointing anyone."
              </blockquote>
              <div className="text-center mt-4">
                <p className="text-sm font-medium text-white">- Akosua, Kumasi Tailor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Management Section */}
      <div className="relative py-24 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-16 right-20 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
          <div className="absolute top-48 left-16 w-28 h-28 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-24 right-1/4 w-36 h-36 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          {/* Floating Icons */}
          <div className="absolute top-28 left-1/4 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-36 right-1/5 animate-bounce" style={{animationDelay: '1.5s', animationDuration: '4s'}}>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="absolute top-1/2 left-12 animate-bounce" style={{animationDelay: '2.5s', animationDuration: '3.5s'}}>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCircle className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Enhanced Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl text-white mb-6 leading-tight mt-16">
              <span className="">
                Never Lose Track of Orders Again
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Organize every detail from measurements to delivery
            </p>
            
            {/* Decorative Line */}
            <div className="flex items-center justify-center mt-8">
              <div className="w-20 h-1 bg-gradient-to-r from-transparent to-blue-600 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full mx-4 animate-pulse"></div>
              <div className="w-20 h-1 bg-gradient-to-l from-transparent to-purple-600 rounded-full"></div>
            </div>
          </div>
          
          <div className="mb-16">
            <img 
              src="/images/dashboardDark.webp" 
              alt="Professional Tailoring Order Management System" 
              className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl"
            />
          </div>

          <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Track Every Order Detail</h3>
                <p className="text-gray-300">Keep detailed records of measurements, fabric choices, special instructions, and customer preferences all in one organized system.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Never Miss a Delivery Date</h3>
                <p className="text-gray-300">Set deadlines, get automatic reminders, and ensure your clients always receive their orders exactly when promised.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Access Complete Client History</h3>
                <p className="text-gray-300">Instantly view past orders, preferred styles, and payment history to provide personalized service and build stronger relationships.</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Pricing Section */}
      <div id="pricing" className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Choose Affordable Prices</h2>
            <p className="text-xl text-gray-300">
              Flexible pricing plans designed specifically for Ghanaian tailoring businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Economy Plan */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-700">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Starter Plan</h3>
                <div className="text-4xl font-bold text-white mb-2">₵50</div>
                <p className="text-gray-300">Billed Monthly</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Up to 50 Client Records
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Basic Order Tracking
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Receipt Printing
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  WhatsApp Support
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Basic Financial Reports
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 py-3 rounded-full font-medium hover:from-gray-600 hover:to-gray-500 transition-all duration-300">
                Select Package
              </button>
            </div>

            {/* Silver Plan */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">Popular</span>
              </div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Professional Plan</h3>
                <div className="text-4xl font-bold text-white mb-2">₵120</div>
                <p className="text-gray-300">Billed Monthly</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Unlimited Client Records
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Advanced Order Management
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Debt Management & Reminders
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  24/7 Phone Support
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Detailed Financial Reports
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Custom Receipt Templates
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-full font-medium hover:shadow-lg transition-all duration-300">
                Select Package
              </button>
            </div>

            {/* Platinum Plan */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border border-gray-700">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Enterprise Plan</h3>
                <div className="text-4xl font-bold text-white mb-2">₵200</div>
                <p className="text-gray-300">Billed Monthly</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Multiple Shop Locations
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Staff Management System
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Inventory Management
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Priority Support
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Advanced Analytics
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Data Backup & Security
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  Mobile Money Integration
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 py-3 rounded-full font-medium hover:from-gray-600 hover:to-gray-500 transition-all duration-300">
                Select Package
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">What Ghanaian Tailors Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">
                "Before Bindu, I was always mixing up my customers' measurements and losing their fabric details. Now everything is organized and I don't have to worry about disappointing anyone."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">AK</span>
                </div>
                <div>
                  <div className="font-bold text-white">Akosua Kwarteng</div>
                  <div className="text-gray-400 text-sm">Tailor, Kumasi</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">
                "You know how customers say 'I'll pay you next week' and then disappear? This system helps me send them gentle reminders so I can get my money without the stress."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">KA</span>
                </div>
                <div>
                  <div className="font-bold text-white">Kwame Asante</div>
                  <div className="text-gray-400 text-sm">Fashion Designer, Accra</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">
                "The receipt printing feature makes my business look so professional. My clients are impressed with the detailed receipts I can now provide."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">EA</span>
                </div>
                <div>
                  <div className="font-bold text-white">Esi Amoah</div>
                  <div className="text-gray-400 text-sm">Seamstress, Takoradi</div>
                </div>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">
                "Finally, a system built for us Ghanaian tailors! The financial reports help me understand my business better and plan for growth."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">YO</span>
                </div>
                <div>
                  <div className="font-bold text-white">Yaw Osei</div>
                  <div className="text-gray-400 text-sm">Master Tailor, Tema</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Logos Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-lg text-gray-300">Join hundreds of Ghanaian tailors already using Bindu to grow their businesses</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 items-center opacity-60">
            {/* Logo placeholders */}
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-12 bg-gray-700 rounded mx-auto flex items-center justify-center">
                <span className="text-gray-300 font-bold text-xs">LOGO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="relative py-20 bg-[url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSugV5t14UC7Q9oX4VTxlTDa2h5TUIBNypGtg&s)] bg-contain  bg-left-top">
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/70"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Transform your tailoring business today!
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the digital revolution and take your tailoring business to the next level.
          </p>
          <Link
            to="/auth/signup"
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Sign Up
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-black to-gray-900 text-white py-16  border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center mb-4">
                <Building2 className="h-8 w-8 text-blue-400" />
                <span className="text-blue-400 ml-2 text-xl font-bold">Bindu</span>
              </div>
              <p className="text-gray-400 mb-4">
                Comprehensive business management platform designed specifically for Ghanaian tailors and fashion entrepreneurs.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs">f</span>
                </div>
                <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs">t</span>
                </div>
                <div className="w-8 h-8 bg-pink-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs">i</span>
                </div>
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs">i</span>
                </div>
              </div>
            </div>
            {/* <div>
              <h3 className="font-bold mb-4">Demos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="#" className="hover:text-white">Demo 1</Link></li>
                <li><Link to="#" className="hover:text-white">Demo 2</Link></li>
                <li><Link to="#" className="hover:text-white">Demo 3</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Pages</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="#" className="hover:text-white">About</Link></li>
                <li><Link to="#" className="hover:text-white">Contact</Link></li>
                <li><Link to="#" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Blog</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="#" className="hover:text-white">Latest Posts</Link></li>
                <li><Link to="#" className="hover:text-white">Categories</Link></li>
                <li><Link to="#" className="hover:text-white">Archive</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Pricing</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="#" className="hover:text-white">Plans</Link></li>
                <li><Link to="#" className="hover:text-white">Enterprise</Link></li>
                <li><Link to="#" className="hover:text-white">Compare</Link></li>
              </ul>
            </div> */}
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>Bindu - Tailoring Business Management © 2024. All Rights Reserved</p>
          </div>
        </div>
      </footer>
    </div>
  );
}