import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TripPage from "./pages/TripPage";
import ProfilePage from "./pages/ProfilePage";
import TripSettingsPage from "./pages/TripSettingsPage";
import TripInfoPage from "./pages/TripInfoPage";
import StaysPage from "./pages/StaysPage";
import TransportPage from './pages/TransportPage'
import AttractionsPage from './pages/AttractionsPage'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id/:cityId?"
            element={
              <ProtectedRoute>
                <TripPage />
              </ProtectedRoute>
            }
          />
          <Route path="/trips/:id/:cityId/attractions" element={
              <ProtectedRoute>
                  <AttractionsPage />
              </ProtectedRoute>
          } />
          <Route
            path="/trips/:id/settings"
            element={
              <ProtectedRoute>
                <TripSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/trips/:id/:cityId/settings" element={
              <ProtectedRoute>
                  <TripSettingsPage />
              </ProtectedRoute>
          } />
          <Route path="/trips/:id/info" element={
              <ProtectedRoute>
                  <TripInfoPage />
              </ProtectedRoute>
          } />
          <Route path="/trips/:id/:cityId/info" element={
              <ProtectedRoute>
                  <TripInfoPage />
              </ProtectedRoute>
          } />
          <Route path="/trips/:id/:cityId/transport" element={
              <ProtectedRoute>
                  <TransportPage />
              </ProtectedRoute>
          } />
          <Route path="/trips/:id/:cityId/stays" element={
              <ProtectedRoute>
                  <StaysPage />
              </ProtectedRoute>
          } />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
