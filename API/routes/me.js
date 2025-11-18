//API/ROUTES/ME.JS 
const express = require("express");
const router = express.Router();

module.exports = (conexion, { verificarToken, bloquearCambioRolSiNoAdmin }) => {
  // GET /api/me  -> datos del usuario autenticado (sin contraseña)
  router.get("/me", verificarToken, (req, res) => {
   const q = `
  SELECT id_usuario, nombre, nombre_usuario, correo, id_rol
  FROM tbl_usuario
  WHERE id_usuario = ?
  LIMIT 1
`;

    conexion.query(q, [req.user.id_usuario], (err, rows) => {
      if (err) return res.status(500).json({ mensaje: "Error consultando perfil" });
      if (!rows.length) return res.status(404).json({ mensaje: "Usuario no encontrado" });
      return res.json(rows[0]);
    });
  });

  // PUT /api/me  -> actualizar solo nombre, nombre_usuario, correo
  router.put("/me", verificarToken, bloquearCambioRolSiNoAdmin, (req, res) => {
    let { nombre, nombre_usuario, correo } = req.body;

    if (correo) correo = String(correo).trim().toLowerCase();
    if (nombre_usuario) nombre_usuario = String(nombre_usuario).trim();

    // Bloquear cambios no permitidos
    if (req.body.contraseña !== undefined || req.body.password !== undefined) {
      return res.status(400).json({ mensaje: "La contraseña no se puede cambiar aquí." });
    }
    if (req.body.id_rol !== undefined || req.body.rol_nombre !== undefined) {
      return res.status(403).json({ mensaje: "No puedes cambiar tu rol." });
    }

    // Validación simple de email
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (correo && !isEmail(correo)) {
      return res.status(400).json({ mensaje: "Correo inválido." });
    }

    const sets = [];
    const params = [];
    if (typeof nombre === "string" && nombre.length) { sets.push("nombre = ?"); params.push(nombre); }
    if (typeof nombre_usuario === "string" && nombre_usuario.length) { sets.push("nombre_usuario = ?"); params.push(nombre_usuario); }
    if (typeof correo === "string" && correo.length) { sets.push("correo = ?"); params.push(correo); }

    if (!sets.length) {
  return res.status(400).json({ mensaje: "No hay cambios para aplicar." });
}

const q = `UPDATE tbl_usuario SET ${sets.join(", ")} WHERE id_usuario = ?`;
params.push(req.user.id_usuario);


    conexion.query(q, params, (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          const msg = err.sqlMessage?.includes("uq_usuario")
            ? "El nombre de usuario ya existe."
            : err.sqlMessage?.includes("uq_correo")
            ? "El correo ya está registrado."
            : "Dato duplicado.";
          return res.status(409).json({ mensaje: msg });
        }
        return res.status(500).json({ mensaje: "Error actualizando perfil." });
      }
      return res.json({ ok: true, mensaje: "Perfil actualizado." });
    });
  });

  return router;
};
