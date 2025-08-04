import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const ImportDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, getThemeStyle } = useTheme();

  const importOptions = [
    {
      title: 'Import Client Data',
      description: 'Import client information from CSV files',
      path: 'client-data',
    },
    {
      title: 'Import Order Data',
      description: 'Import order information from CSV files',
      path: 'order-data',
    },
    {
      title: 'Import Order Data (Fix)',
      description: 'Import order information from CSV files (Fix)',
      path: 'order-data-fix',
    },
    {
      title: 'Import Payment Data',
      description: 'Import payment information from CSV files',
      path: 'payment-data',
    }
  ];

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${getThemeStyle(theme, 'background', 'primary')}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 font-['Space_Grotesk'] ${getThemeStyle(theme, 'text', 'primary')}`}>
            Data Import Center
          </h1>
          <p className={`text-lg ${getThemeStyle(theme, 'text', 'secondary')}`}>
            Select the type of data you want to import from CSV files
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {importOptions.map((option) => (
            <div
              key={option.title}
              className={`group relative rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'border', 'primary')} hover:border-blue-200`}
            >
              <div className="p-6">
                <h2 className={`text-2xl font-semibold mb-4 text-center group-hover:text-blue-600 transition-colors duration-300 ${getThemeStyle(theme, 'text', 'primary')}`}>
                  {option.title}
                </h2>
                <p className={`text-center mb-6 ${getThemeStyle(theme, 'text', 'secondary')}`}>
                  {option.description}
                </p>
                <div className="text-center">
                  <button
                    onClick={() => navigate(option.path)}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                  >
                    Import Data
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImportDataPage;
