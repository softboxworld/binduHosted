import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  const [inputValue, setInputValue] = useState('');

  if (totalPages <= 1) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNumber = parseInt(inputValue);
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber);
      }
      setInputValue('');
    }
  };

  const handleInputBlur = () => {
    const pageNumber = parseInt(inputValue);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    }
    setInputValue('');
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7; // Total number of page items to show
    const ellipsis = '...';

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // If current page is near the start
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(ellipsis);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // If current page is near the end
        pages.push(ellipsis);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // If current page is in the middle
        pages.push(ellipsis);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(ellipsis);
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={`flex items-center justify-center space-x-1 max-w-[200px] mx-auto ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-1 sm:p-2 rounded-md transition-colors ${
          currentPage === 1
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>

      {renderPageNumbers().map((page, index) => (
        <button
          key={`${page}-${index}`}
          onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
          disabled={typeof page === 'string'}
          className={`min-w-[24px] sm:min-w-[32px] h-6 sm:h-8 px-1 sm:px-2 rounded-md transition-colors text-xs sm:text-sm ${
            page === currentPage
              ? 'bg-gray-300 dark:bg-gray-700 font-medium'
              : typeof page === 'number'
              ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
              : ''
          }`}
        >
          {page}
        </button>
      ))}

      <div className="flex items-center space-x-1 ml-1 sm:ml-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          className="w-8 sm:w-10 h-5 sm:h-6 px-1 sm:px-2 rounded-md border border-gray-300 dark:border-gray-600 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            dark:bg-gray-700 text-center text-xs sm:text-sm"
          placeholder={currentPage.toString()}
          aria-label="Go to page"
        />
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-1 sm:p-2 rounded-md transition-colors ${
          currentPage === totalPages
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Next page"
      >
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
} 