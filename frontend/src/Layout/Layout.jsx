import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <aside>
          <Sidebar />
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;