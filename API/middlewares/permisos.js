// middlewares/permisos.js
const conexion = require("../db/conexion"); // ajusta al archivo que ya usas

function verificarPermiso(codigoObjeto, accion) {
  return (req, res, next) => {
    // 1. Asegurarnos de que el usuario está autenticado
    const user = req.user; // esto viene de verificarToken
    if (!user || !user.id_usuario) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }

    const idUsuario = user.id_usuario;

    // 2. Llamar al SP_TienePermiso
    const sql = "CALL SP_TienePermiso(?, ?, ?)";

    conexion.query(sql, [idUsuario, codigoObjeto, accion], (err, results) => {
      if (err) {
        console.error("Error SP_TienePermiso:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al verificar permisos", error: err.message });
      }

      // results[0][0].tiene_permiso depende de cómo devuelva el driver
      const row = results[0] && results[0][0];
      const tiene = row ? Number(row.tiene_permiso) === 1 : 0;

      if (!tiene) {
        return res
          .status(403)
          .json({ mensaje: "No tienes permiso para realizar esta acción." });
      }

      next(); // ✅ tiene permiso, seguimos
    });
  };
}

module.exports = {
  verificarPermiso,
};
