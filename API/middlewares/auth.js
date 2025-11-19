// API/middlewares/auth.js
const jwt = require("jsonwebtoken");

function getTokenFromReq(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

function verificarToken(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ mensaje: "No autenticado" });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "1984");
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

function autorizarRoles(...rolesPermitidos) {
  const rolesNorm = rolesPermitidos.map(r => r.toLowerCase());

  return (req, res, next) => {
    const rol = (req.user?.rol_nombre || "").toLowerCase();

    if (!rolesNorm.includes(rol)) {
      return res.status(403).json({ mensaje: "No autorizado" });
    }

    next();
  };
}


function autorizarSelfOrAdmin(paramName = "id") {
  return (req, res, next) => {
    const esAdmin = req.user?.rol_nombre === "Administrador";
    const idParam = Number(req.params[paramName]);
    const idToken = Number(req.user?.id_usuario);
    if (esAdmin || (Number.isFinite(idParam) && idParam === idToken)) return next();
    return res.status(403).json({ mensaje: "No autorizado" });
  };
}

function bloquearCambioRolSiNoAdmin(req, res, next) {
  const esAdmin = req.user?.rol_nombre === "Administrador";
  if (!esAdmin && (req.body.id_rol !== undefined || req.body.rol_nombre !== undefined)) {
    return res.status(403).json({ mensaje: "No puedes cambiar tu rol" });
  }
  next();
}

module.exports = {
  verificarToken,
  autorizarRoles,
  autorizarSelfOrAdmin,
  bloquearCambioRolSiNoAdmin,
};
