import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";
import AdminSignInPage from "./admin/Adminsigninpage";
import AdminDashboard from "./admin/AdminDashboard";
import AdminLayout from "./admin/AdminLayout";
import UserDashboard from "./User/UserDashboard";
import UserLayout from "./User/UserLayout";
import UserAnalytics from "./User/UserAnalytics";
import AddMapPage from "./admin/AddMapPage";
import MapManagementPage from "./admin/MapManagementPage";
import MapSelectionPage from "./User/MapSelectionPage";
import ViewMapPage from "./User/ViewMapPage";
import EventManagementPage from "./admin/EventManagementPage";
import SimulationPage from "./admin/SimulationPage";
import RouteSchedulingPage from "./admin/RouteSchedulingPage";
import TrafficAnalyticsPage from "./admin/TrafficAnalyticsPage";

//import { adminApi } from "./utils/api";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
 // const isAuthenticated = adminApi.isLoggedIn();

  // if (!isAuthenticated) {
  //   return <Navigate to="/admin/login" replace />;
  // }

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
          <Route path="maps" element={<MapManagementPage />} />
          <Route path="maps/add" element={<AddMapPage />} />
          <Route path="maps/edit/:id" element={<AddMapPage />} />
          
          {/* New Traffic Management Routes */}
          <Route path="events" element={<EventManagementPage />} />
          <Route path="simulation" element={<SimulationPage />} />
          <Route path="routes" element={<RouteSchedulingPage />} />
          <Route path="analytics" element={<TrafficAnalyticsPage />} />
          
          {/* Existing admin routes */}
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

        {/* User Routes */}
        <Route path="/user" element={<UserLayout />}>
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="maps" element={<MapSelectionPage />} />
          <Route path="maps/:id" element={<ViewMapPage />} />
          <Route path="analytics" element={<UserAnalytics />} />
          <Route path="products" element={<div>Products Page</div>} />
          <Route path="cart" element={<div>Shopping Cart</div>} />
          <Route path="orders" element={<div>Order History</div>} />
          <Route path="wishlist" element={<div>Wishlist</div>} />
          <Route path="profile" element={<div>User Profile</div>} />
        </Route>

        {/* Default route */}
        <Route path="/" element={<Navigate to="/user/maps" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
