import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (await login(email, password)) {
            navigate('/');
        } else {
            setError('Invalid credentials.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-violet-500 p-3 rounded-xl shadow-lg shadow-violet-500/30">
                        <LayoutDashboard className="h-8 w-8 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8 tracking-tight">Admin Portal</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border-l-4 border-red-500">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all duration-200 shadow-sm"
                            placeholder="admin@company.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all duration-200 shadow-sm"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-violet-600 text-white py-2.5 px-4 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20 transition-all duration-200 font-medium shadow-md shadow-violet-500/20 active:transform active:scale-[0.98]"
                    >
                        Sign In
                    </button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-500">
                    Use admin@company.com / admin123
                </div>
            </div>
        </div>
    );
};

export default Login;
