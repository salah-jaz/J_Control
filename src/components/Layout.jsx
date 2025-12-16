import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children, title }) => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm/50">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-right hidden sm:block">
                            <p className="font-medium text-gray-900">{user?.name}</p>
                            <p className="text-gray-500 text-xs uppercase tracking-wider">{user?.role}</p>
                        </div>
                        <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm">
                            {user?.name?.charAt(0)}
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
