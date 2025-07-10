import { useState, useEffect } from 'react';
import React from 'react';

function Header() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    setCurrentDate(formattedDate);
  }, []);

  return (
    <header className="w-full h-16 bg-white shadow fixed top-0 z-50">
      <div className="mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center">
          {/* Logo */}
          <div className="flex-shrink-0 mr-3">
            <img 
              className="w-10 h-10" 
              src="/logoWithoutLabel.png" 
              alt="DOST Logo" 
            />
          </div>
          
          {/* Title */}
          <h1 className="text-xl font-bold text-sky-700 font-open-sans">
            DEPARTMENT OF SCIENCE AND TECHNOLOGY 1
          </h1>
        </div>

        {/* Current Date */}
        <div className="text-xl font-bold text-sky-700 font-open-sans opacity-100">
          {currentDate.toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Header;
