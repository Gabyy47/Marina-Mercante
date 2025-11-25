// API/middlewares/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "1984";

/* ======================================================
   OBTENER TOKEN DESDE HEADERS O COOKIES
====================================================== */
function getTokenFromReq(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

/* ======================================================
   VERIFICAR TOKEN
====================================================== */
function verificarToken(req, res, next) {
  try {
    const token = getTokenFromReq(req);

    if (!token) {
      return res.status(401).json({ mensaje: "Token requerido" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; // id_usuario, id_rol, rol_nombre
    next();
  } catch (err) {
    console.error("Error JWT:", err.message);
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

/* ======================================================
   AUTORIZAR POR ROLES
   Ej:
     autorizarRoles("Administrador")
     autorizarRoles("Administrador", "Guarda almacen")
     autorizarRoles(["Administrador","Guarda almacen"])
====================================================== */
function autorizarRoles(...listaDeRoles) {
  // Aplana en caso de recibir un array
  const rolesPermitidos = Array.isArray(listaDeRoles[0])
    ? listaDeRoles[0]
    : listaDeRoles;

  // Normalizar
  const rolesNorm = rolesPermitidos
    .filter((r) => typeof r === "string")
    .map((r) => r.toLowerCase().trim());

  if (!rolesNorm.length) {
    console.error("❌ rolesPermitidos inválidos:", listaDeRoles);
    return (req, res) =>
      res.status(500).json({
        mensaje: "Configuración de roles inválida en el servidor",
      });
  }

  console.log("🔐 autorizarRoles configurado con:", rolesNorm);

  return (req, res, next) => {
    try {
      const rolUsuario =
        (req.user?.rol_nombre || req.user?.rol || "").toLowerCase().trim();

      console.log("➡️ rol usuario:", rolUsuario);

      if (!rolUsuario) {
        return res.status(401).json({ mensaje: "Usuario sin rol en token" });
      }

      if (!rolesNorm.includes(rolUsuario)) {
        return res
          .status(403)
          .json({ mensaje: "No tiene permiso para esta operación" });
      }

      next();
    } catch (err) {
      console.error("Error en autorizarRoles:", err);
      return res
        .status(500)
        .json({ mensaje: "Error interno en autorización" });
    }
  };
}

/* ======================================================
   PERMITIR SOLO ADMIN O EL MISMO USUARIO
====================================================== */
function autorizarSelfOrAdmin(paramName = "id") {
  return (req, res, next) => {
    const esAdmin = req.user?.rol_nombre === "Administrador";
    const idParam = Number(req.params[paramName]);
    const idToken = Number(req.user?.id_usuario);

    if (esAdmin || (Number.isFinite(idParam) && idParam === idToken)) {
      return next();
    }

    return res.status(403).json({ mensaje: "No autorizado" });
  };
}

/* ======================================================
   BLOQUEAR CAMBIO DE ROL SI NO ES ADMIN
====================================================== */
function bloquearCambioRolSiNoAdmin(req, res, next) {
  const esAdmin = req.user?.rol_nombre === "Administrador";

  if (
    !esAdmin &&
    (req.body.id_rol !== undefined || req.body.rol_nombre !== undefined)
  ) {
    return res.status(403).json({
      mensaje: "No puedes cambiar tu rol",
    });
  }

  next();
}

module.exports = {
  verificarToken,
  autorizarRoles,
  autorizarSelfOrAdmin,
  bloquearCambioRolSiNoAdmin,
};
