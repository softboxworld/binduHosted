import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, ClipboardList, DollarSign,
  FileSpreadsheet, MessageSquare, Shield, UserSquare2,
  Package, ShoppingCart, BarChart4, Scissors,
  ArrowRight, CheckCircle, Clock, UserCircle,
  Receipt, Briefcase, Boxes
} from 'lucide-react';

const industries = [
  {
    icon: Scissors,
    name: 'Fashion & Tailoring',
    description: 'Perfect for fashion houses, tailoring shops, and clothing manufacturers.'
  },
  {
    icon: Package,
    name: 'Service-Based Businesses',
    description: 'Ideal for businesses offering services like cleaning, repairs, or installations.'
  },
  {
    icon: Users,
    name: 'Contractors & Freelancers',
    description: 'Great for managing contract workers, freelancers, and project-based teams.'
  },
  {
    icon: ShoppingCart,
    name: 'Retail & Custom Orders',
    description: 'Suitable for retail businesses handling custom orders and made-to-order products.'
  }
];

const features = [
  {
    icon: Users,
    title: 'Workforce Management',
    description: 'Track workers, assign tasks, and manage project rates with WhatsApp integration.'
  },
  {
    icon: UserSquare2,
    title: 'Client Management',
    description: 'Maintain client profiles with custom fields and track client-specific information.'
  },
  {
    icon: Package,
    title: 'Service Catalog',
    description: 'Define and price your services, create service packages, and track service delivery.'
  },
  {
    icon: ShoppingCart,
    title: 'Order Management',
    description: 'Process client orders, assign workers, and track order fulfillment end-to-end.'
  },
  {
    icon: ClipboardList,
    title: 'Task & Project Tracking',
    description: 'Monitor tasks, track progress, and manage project timelines efficiently.'
  },
  {
    icon: FileSpreadsheet,
    title: 'Detailed Reports',
    description: 'Export financial reports, worker performance, and order analytics in Excel/PDF.'
  },
  {
    icon: DollarSign,
    title: 'Financial Controls',
    description: 'Track earnings, manage deductions, and monitor financial performance.'
  },
  {
    icon: MessageSquare,
    title: 'Communication',
    description: 'Integrated WhatsApp messaging for seamless communication.'
  },
  {
    icon: BarChart4,
    title: 'Business Analytics',
    description: 'Get insights into your business performance, worker productivity, and client trends.'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with role-based access control and data protection.'
  }
];

const benefits = [
  {
    title: 'Save Time',
    description: 'Streamline operations and reduce administrative overhead with automated workflows.'
  },
  {
    title: 'Grow Revenue',
    description: 'Manage more clients, track orders efficiently, and increase business throughput.'
  },
  {
    title: 'Better Insights',
    description: 'Make data-driven decisions with comprehensive business analytics and reporting.'
  },
  {
    title: 'Improve Client Satisfaction',
    description: 'Deliver better service with organized client management and order tracking.'
  }
];

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div 
        className="relative min-h-[70vh] overflow-hidden bg-[#F8F9FB]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px,rgba(18, 50, 119, .2) 1px, transparent 0),
            linear-gradient(to right, #F8F9FB, #F8F9FB)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: '-19px -19px'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <nav className="absolute top-0 left-0 right-0 p-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
              <div className="flex items-center">
                <img src="/favicon.ico" alt="Sten360" className="h-12 w-12" />
                <span className="text-blue-600 ml-2 text-xl font-bold">Sten360</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="#resources" className="text-gray-600 hover:text-gray-900 hidden sm:block">Resources</Link>
                <Link to="#pricing" className="text-gray-600 hover:text-gray-900 hidden sm:block">Pricing</Link>
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
                <h1 className="text-4xl xs:text-5xl font-bold text-gray-900 leading-tight">
                  All Systems Go.

                  <span className="block text-gray-500 mt-2">Make your business use Tech</span>
                </h1>
                <p className="mt-6 text-base xs:text-lg text-gray-600 max-w-[90%] sm:max-w-[70%] lg:max-w-full mx-auto lg:mx-0">
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

      {/* Industries Section */}
      <div className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Industries We Serve
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Our platform is tailored for businesses that rely on skilled workers and custom orders
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="relative bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center">
                  <span className="flex-shrink-0 rounded-lg inline-flex p-3 bg-blue-50 text-blue-600">
                    <industry.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {industry.name}
                    </h3>
                    <p className="mt-2 text-base text-gray-500">
                      {industry.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Your All-in-One Business Solution
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Powerful features designed to help you manage and grow your business efficiently
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg hover:shadow-lg transition-shadow duration-200"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600 ring-4 ring-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2">
              Transform Your Business Operations
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Streamline operations, boost efficiency, and accelerate growth with our integrated platform
            </p>
          </div>

          <div className="mt-20">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-12">
              {benefits.map((benefit, index) => (
                <div key={index} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <CheckCircle className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{benefit.title}</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">{benefit.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Success Story Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 sm:p-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8 text-center">
                How Kofi Ghana Kloding Scaled with Sten360
              </h2>

              <p className="text-gray-600 mb-8">
                Before switching to Sten360, Kofi Ghana Kloding struggled with disorganized client records,
                delayed orders, and inefficient workforce management. Manual processes made it difficult to
                track tailor assignments, manage finances, and keep up with growing customer demand.
              </p>

              <p className="text-lg font-semibold text-gray-900 mb-6">
                With Sten360, Kofi Ghana Kloding transformed its operations:
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Seamless Order & Client Management</p>
                    <p className="text-gray-600">Orders are tracked end-to-end, ensuring every client gets timely service.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Workforce Efficiency</p>
                    <p className="text-gray-600">Tailors receive assignments instantly, and their progress is monitored in real-time.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Smarter Financial Controls</p>
                    <p className="text-gray-600">Earnings, expenses, and worker payments are automatically tracked, reducing financial errors.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Stronger Customer Relationships</p>
                    <p className="text-gray-600">With detailed client profiles and history, Kofi delivers a more personalized experience.</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-center mb-8">
                Now, Kofi Ghana spends less time handling admin tasks and more time growing his brand.
              </p>

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Ready to take your business to the next level?
                </h3>
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Get Started with Sten360 Today!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-lg shadow-xl overflow-hidden">
            <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
              <div className="lg:self-center">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Ready to get started?</span>
                  <span className="block">Transform your business today.</span>
                </h2>
                <p className="mt-4 text-lg leading-6 text-blue-200">
                  Sign up for free and experience the difference. No credit card required.
                </p>
                <Link
                  to="/auth/signup"
                  className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors duration-200"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center mb-2">
              <Building2 className="h-6 w-6 text-gray-400" />
              <span className="ml-2 text-gray-500">© 2024 Sten Media Network. All rights reserved.</span>
            </div>
            <p className="text-sm text-gray-400">
              Sten360 is a product of Sten Business, a subsidiary of Sten Media Network
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}