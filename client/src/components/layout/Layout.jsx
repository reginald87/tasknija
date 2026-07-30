import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

function Layout({ children }) {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const showSidebar =
    location.pathname === '/' ||
    location.pathname.startsWith('/search') ||
    location.pathname.startsWith('/category') ||
    location.pathname.startsWith('/business');

  return (
    <div className="layout">
      <Header
        onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)}
      />
      <div className="layout-body">
        <Sidebar
          showDesktop={showSidebar}
          isMobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <main className={`main-content ${!showSidebar ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default Layout;