// src/App.jsx
import { Routes, Route, Navigate  } from "react-router-dom";
import MainPage from "./mainpage.jsx";                 
//import Main from "./main.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import MantUsuarios from "./mantenimientousuarios.jsx";   
import RequireAuth from "./RequireAuth.jsx";
import PublicOnly from "./PublicOnly.jsx";  

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route path="/register" element={<Register />} />

      {/* Protegidas */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<MainPage />} />
        <Route path="/mantenimientousuarios" element={<MantUsuarios />} />
        {/* agrega aquí más rutas protegidas */}
      </Route>

      {/* Desconocidas -> home (protegido) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}