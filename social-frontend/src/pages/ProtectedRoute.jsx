// ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setIsAuth(false);
        setLoading(false);
        return;
      }

      try {
        await axios.get("http://localhost:5001/api/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setIsAuth(true); 
      } catch (err) {
        console.error("Token invalid:", err);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!isAuth) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;
