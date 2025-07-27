import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './SideBar.jsx';
import Header from './Header.jsx';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarWidth = isSidebarOpen ? '16rem' : '5rem'; 

  return (
    <div className="flex h-screen bg-gray-100" style={{ '--sidebar-width': sidebarWidth }}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 mt-16"> 
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;