import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Building2 } from 'lucide-react';

export default function AuthLayout() {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-gray-900 to-gray-800 text-white p-16 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-y-0 -left-1/2 w-[200%] bg-gradient-to-r from-blue-500 to-purple-500 transform rotate-12"></div>
        </div>
        
        <div className="relative">
          <div className="flex items-center space-x-3 mb-16">
            <div className="h-12 w-12 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Sten360</span>
          </div>
          
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-bold leading-tight mb-4">
                Welcome to<br />
                Sten360
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Your complete business management solution
              </p>
            </div>
            
            <div className="max-w-md">
              <p className="text-gray-400 text-lg leading-relaxed">
                Streamline your operations, boost productivity, and make data-driven decisions with our comprehensive suite of business tools.
              </p>
            </div>
          </div>
        </div>

        <div className="relative space-y-8">
          <div className="p-6 bg-gray-800 rounded-2xl backdrop-blur-xl bg-opacity-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold">SJ</span>
              </div>
              <div>
                <p className="text-sm font-medium">Sarah Johnson</p>
                <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">
                  "Sten360 has revolutionized how we manage our business operations. The platform is intuitive and powerful."
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Sten Business Solutions. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Light */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center p-8 sm:p-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}