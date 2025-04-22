import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../utils/api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Get the user from localStorage
    const storedUser = localStorage.getItem("admin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    adminApi.logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center">
            {user && (
              <span className="mr-4 text-gray-600">Welcome, {user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
          <p className="text-gray-600">
            Welcome to the admin dashboard. This is a placeholder that you can
            expand with real functionality.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-blue-800">Users</h3>
              <p className="text-blue-600 text-2xl font-bold">0</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-green-800">Content</h3>
              <p className="text-green-600 text-2xl font-bold">0</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium text-purple-800">Activity</h3>
              <p className="text-purple-600 text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
