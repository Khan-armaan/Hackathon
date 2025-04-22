import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import AdminSignInPage from "./admin/AdminSignInPage";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLayout from "./admin/AdminLayout";

import { adminApi } from "./utils/api";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = adminApi.isLoggedIn();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminSignInPage />} />

        {/* Protected Admin Routes with Layout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          {/* Add other admin routes here */}
          <Route path="stores" element={<div>Stores Management</div>} />
          <Route path="users" element={<div>User Management</div>} />
          <Route path="inventory" element={<div>Product Inventory</div>} />
          <Route path="stock-count" element={<div>Stock Count</div>} />
          <Route path="categories" element={<div>Accounting</div>} />
          <Route path="branding" element={<div>Branding</div>} />
          <Route path="settings" element={<div>Settings</div>} />
          <Route path="purchaseview" element={<div>Purchase View</div>} />
          <Route path="salesview" element={<div>Sales View</div>} />
        </Route>

        {/* Default route */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
