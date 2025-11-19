// ===== Dependencias =====
var Express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
const mysql = require('mysql2');
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
var speakeasy = require("speakeasy");
var QRCode = require("qrcode"); 

// ===== CONFIGURACIÓN Y ENVÍO DE CORREOS =====
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dns = require('dns');

// URL base del sistema (para enlaces en correos)
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// Variables de entorno
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM
} = process.env;

// Log de configuración
console.log('[SMTP cfg]', { SMTP_HOST, SMTP_PORT, SMTP_SECURE });

// Resolver DNS para verificar conexión
dns.lookup(SMTP_HOST, { all: true }, (err, addrs) => {
  console.log('[SMTP resolve]', err || addrs);
});

// Crear transporter seguro
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: String(SMTP_SECURE) === 'true', // true → 465, false → 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

// Verificar conexión SMTP al iniciar
transporter.verify((err, ok) => {
  if (err) {
    console.error('❌ SMTP VERIFY ERROR:', err);
  } else {
    console.log('✅ SMTP READY:', ok);
  }
});

// ===== Funciones auxiliares =====

// Genera un código de 6 dígitos
function gen6Code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Hashea el código
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Envía correo con código de verificación
async function SendVerifyMail({ to, name, code }) {
  try {
    console.log(`📤 Intentando enviar correo a: ${to}`);

    const info = await transporter.sendMail({
      from: MAIL_FROM || `"Soporte Marina Mercante" <${SMTP_USER}>`,
      to,
      subject: 'Tu código de verificación',
      html: `
        <p>Hola ${name || ''},</p>
        <p>Tu código de verificación es:</p>
        <p style="font-size:20px;font-weight:bold;letter-spacing:3px;">${code}</p>
        <p>Caduca en 15 minutos.</p>
        <p>Si no solicitaste este correo, puedes ignorarlo.</p>
      `,
    });

    console.log('✅ Correo de verificación enviado a:', to);
    console.log('✉️ ID del mensaje:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Error al enviar código:', err);
    throw err;
  }
}

// Exportar para usar en otros módulos
module.exports = { transporter, SendVerifyMail, gen6Code, hashCode };

// ===== Registrar acción en la bitácora =====
function logBitacora(conexion, { id_objeto, id_usuario, accion, descripcion, usuario }, callback) {
  
  // Validación y valores por defecto
  const params = [
    id_objeto ?? null,
    id_usuario ?? null,
    accion ?? 'SIN_ACCION',
    descripcion ?? '',
    usuario ?? 'sistema'
  ];
  const query = "CALL event_bitacora(?, ?, ?, ?, ?)";
  conexion.query(query, params, (err, results) => {
    if (err) {
      console.error(" Error al registrar en bitácora:", err.message);
      if (callback) callback(err);
    } else {
      console.log(` Bitácora registrada correctamente → Acción: ${accion}`);
      if (callback) callback(null, results);
    }
  });
}

// ===== Middlewares de auth (IMPORTAR SOLO UNA VEZ) =====
const {
  verificarToken,
  autorizarRoles,
  autorizarSelfOrAdmin,
  bloquearCambioRolSiNoAdmin,
} = require("./middlewares/auth");

const registrarBitacora = (..._args) => {}; // TODO: implementar de verdad
const meRoutes = require("./routes/me");

// Logger opcional
let logger;
try {
  logger = require("./logger");
} catch {
  logger = console;
}

// ===== Conexión a la base de datos =====

const conexion = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "MysqlRoot47!",
  database: "marina_mercante",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

// ===== Inicio de Express.js =====
var app = Express();

// ===== Configuración de CORS =====
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:49146",
        "http://localhost:3000",
        "http://localhost:5173",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ===== Middlewares =====
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Verificar conexión a la BD y levantar servidor =====
app.use("/api", meRoutes(conexion, { verificarToken, bloquearCambioRolSiNoAdmin }));
const PORT = 49146;
const SECRET_KEY = process.env.JWT_SECRET || "1984";

app.listen(PORT, () => {
  conexion.query("SELECT 1", (err, results) => {
    if (err) {
      console.error(" Error al conectar a la BD:", err.message);
      process.exit(1);
    } else {
      console.log(" Conexión a la BD con éxito.");
      console.log(` API corriendo en http://localhost:${PORT}`);
    }
  });
});

// ===== Utilidades =====
function handleDatabaseError(err, res, message) {
  console.error("x " + message, err);
  res.status(500).json({ error: err.message || "Error de servidor" });
}

// ===== Rutas base =====
app.get("/api/json", (req, res) => {
  res.json({ text: "HOLA ESTE ES UN JSON" });
});

app.get("/", (req, res) => {
  res.send("¡Hola Mundo!");
});

// Ruta protegida de ejemplo
app.get("/api/seguro", verificarToken, (req, res) => {
  res.json({
    mensaje: "Acceso concedido a la ruta segura",
    usuario: req.user,
  });
});

// ====== CRUD PARA tbl_rol ======

// Listar roles
app.get("/api/roles", verificarToken, autorizarRoles("Administrador"),async (req, res) => {
 unificacion
  const { id_usuario } = req.query; 
  try {
    const [rows] = await conexion.promise().query(
      "SELECT id_rol, nombre, descripcion FROM tbl_rol ORDER BY nombre ASC"
    );

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 4, "GET", "Se consultó la lista de roles"]
      );
    }
    res.json(rows);
  } catch (err) {
    handleDatabaseError(err, res, "Error al listar roles:");
  }
});

// Obtener rol por ID
app.get("/api/roles/:id", async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.query;
  try {
    const [rows] = await conexion.promise().query(
      "SELECT id_rol, nombre, descripcion FROM tbl_rol WHERE id_rol = ? LIMIT 1",
      [parseInt(id)]
    );

    if (rows.length === 0)
      return res.status(404).json({ mensaje: "Rol no encontrado" });

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 4, "GET", `Se consultó el rol con ID ${id}`]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, "Error al obtener rol:");
  }
});

// Crear rol
app.post("/api/roles", verificarToken, autorizarRoles("Administrador"), async (req, res) => {
  let { nombre, descripcion, id_usuario } = req.body;
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El nombre del rol es requerido" });
  }

  nombre = nombre.trim().toUpperCase();
  descripcion = (descripcion ?? "").toString().trim();

  try {
    const [result] = await conexion.promise().query(
      "INSERT INTO tbl_rol (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion]
    );

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 4, "INSERT", `Se creó el rol ${nombre}`]
      );
    }

    res.status(201).json({
      mensaje: "Rol creado correctamente",
      id_rol: result.insertId,
      nombre,
      descripcion
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un rol con ese nombre" });
    }
    handleDatabaseError(err, res, "Error al crear rol:");
  }
});

// Actualizar rol
app.put("/api/roles/:id", verificarToken, autorizarRoles("Administrador"),async (req, res) => {
  const id = parseInt(req.params.id);
  let { nombre, descripcion, id_usuario } = req.body;

  if (!id) return res.status(400).json({ mensaje: "ID inválido" });
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El nombre del rol es requerido" });
  }

  nombre = nombre.trim().toUpperCase();
  descripcion = (descripcion ?? "").toString().trim();

  try {
    const [result] = await conexion.promise().query(
      "UPDATE tbl_rol SET nombre = ?, descripcion = ? WHERE id_rol = ?",
      [nombre, descripcion, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Rol no encontrado" });
    }

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 4, "UPDATE", `Se actualizó el rol ${nombre} (ID ${id})`]
      );
    }

    res.json({ mensaje: "Rol actualizado correctamente" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un rol con ese nombre" });
    }
    handleDatabaseError(err, res, "Error al actualizar rol:");
  }
});

// Eliminar rol
app.delete("/api/roles/:id", verificarToken, autorizarRoles("Administrador"), async (req, res) => {
  const id = parseInt(req.params.id);
  const { id_usuario } = req.query;

  if (!id) return res.status(400).json({ mensaje: "ID inválido" });

  try {
    const [result] = await conexion.promise().query(
      "DELETE FROM tbl_rol WHERE id_rol = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Rol no encontrado" });
    }

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 4, "DELETE", `Se eliminó el rol con ID ${id}`]
      );
    }

    res.json({ mensaje: "Rol eliminado correctamente" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
      return res.status(409).json({
        mensaje: "No se puede eliminar: el rol está asignado a uno o más usuarios"
      });
    }
    handleDatabaseError(err, res, "Error al eliminar rol:");
  }
});

// ===== LOGIN =====
app.post("/api/login", (req, res) => {
  console.log("Ruta /api/login llamada");

  const { nombre_usuario, contraseña } = req.body;

  // Validar campos
  if (!nombre_usuario || !contraseña) {
    return res.status(400).json({ mensaje: "Faltan campos obligatorios." }); 
  }

  const q = `
    SELECT 
      u.id_usuario, 
      u.nombre_usuario, 
      u.contraseña, 
      u.is_verified, 
      u.id_rol, 
      r.nombre AS rol_nombre
    FROM tbl_usuario u
    LEFT JOIN tbl_rol r ON u.id_rol = r.id_rol
    WHERE u.nombre_usuario = ? AND u.contraseña = ?
    LIMIT 1
  `;

  // SOLO UNA CONSULTA (la otra la eliminamos)
  conexion.query(q, [nombre_usuario, contraseña], (err, rows) => {
    if (err) {
      console.error("Error en consulta de login:", err);
      return res.status(500).json({ mensaje: "Error interno en la base de datos." });
    }

    if (!rows || rows.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const usuario = rows[0];
    const rolNombre = (usuario.rol_nombre || "").trim().toUpperCase();

    // Verificar rol
    if (!usuario.id_rol || !usuario.rol_nombre || rolNombre === "SIN ROL") {
      return res.status(403).json({
        mensaje: "No tiene un rol asignado. Comuníquese con el Administrador para que le asigne un rol.",
      });
    }

    // Verificar email
    if (Number(usuario.is_verified) !== 1) {
      return res.status(403).json({
        mensaje: "Debes verificar tu correo antes de iniciar sesión.",
      });
    }

    // Generar token
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        id_rol: usuario.id_rol,
        rol_nombre: usuario.rol_nombre,
      },
      process.env.JWT_SECRET || "1984",
      { expiresIn: "1h" }
    );

    // Guardar cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3600000,
    });

    // Registrar en bitácora
    const ID_OBJETO_LOGIN = 1;

    logBitacora(
      conexion,
      {
        id_objeto: ID_OBJETO_LOGIN,
        id_usuario: usuario.id_usuario,
        accion: "LOGIN",
        descripcion: `El usuario ${usuario.nombre_usuario} inició sesión.`,
        usuario: usuario.nombre_usuario,
      },
      (bitErr) => {
        if (bitErr) {
          console.error("No se pudo registrar LOGIN en bitácora:", bitErr.message);
        }

        return res.json({
          mensaje: "Inicio de sesión exitoso",
          token,
          usuario: {
            id_usuario: usuario.id_usuario,
            nombre_usuario: usuario.nombre_usuario,
            id_rol: usuario.id_rol,
            rol_nombre: usuario.rol_nombre,
          },
        });
      }
    );
  });
});

// ===== LOGOUT =====
app.get("/api/logout", (req, res) => {
  console.log("Ruta /api/logout llamada");
  const token = req.cookies.token;
  const ID_OBJETO_LOGIN = 1; 

  if (token) {
    try {
      // Verificar y decodificar token
      const decoded = jwt.verify(token, SECRET_KEY);

      // Registrar acción en bitácora
      logBitacora(
        conexion,
        {
          id_objeto: ID_OBJETO_LOGIN,
          id_usuario: decoded.id_usuario,
          accion: "LOGOUT",
          descripcion: `El usuario ${decoded.nombre_usuario} cerró sesión.`,
          usuario: decoded.nombre_usuario,
        },
        (err) => {
          if (err) {
            console.error(" Error al registrar LOGOUT en bitácora:", err.message);
          } else {
            console.log(" LOGOUT registrado correctamente en bitácora");
          }
        }
      );
    } catch (tokenError) {
      console.warn(" Token inválido o expirado al registrar LOGOUT:", tokenError.message);
    }
  } else {
    console.warn(" No se encontró token en cookie durante LOGOUT.");
  }

  // Eliminar cookie de sesión 
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ mensaje: "Sesión cerrada correctamente." });
});

// ===== Recuperación de contraseña =====
// === 1. Iniciar recuperación ===
app.post("/api/recuperar-iniciar", (req, res) => { 
  console.log("▶ /api/recuperar-iniciar llamado con:", req.body); 
  const { nombre_usuario, correo } = req.body;

  // Validación básica
  if (!nombre_usuario && !correo) {
    return res.status(400).json({ mensaje: "Proporciona nombre de usuario o correo." }); 
  }

  const where = nombre_usuario ? "nombre_usuario = ?" : "correo = ?";
  const value = nombre_usuario || correo;

  const qSel = `
    SELECT id_usuario, correo, nombre_usuario
    FROM tbl_usuario
    WHERE ${where}
    LIMIT 1
  `;

  // Buscar usuario
  conexion.query(qSel, [value], (err, rows) => {
    if (err) {
      console.error(" Error SQL (buscar usuario):", err);
      return res.status(500).json({ mensaje: "Error al buscar usuario." });
    }

    if (!rows.length) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const u = rows[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos 
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expira en 10 minutos 

    const qUpd = `
      UPDATE tbl_usuario
      SET reset_code = ?, reset_expires = ?, reset_used = 0
      WHERE id_usuario = ?
    `;

    // Guardar código en BD 
    conexion.query(qUpd, [code, expiresAt, u.id_usuario], (err2) => { 
      if (err2) {
        console.error(" Error al guardar código:", err2);
        return res.status(500).json({ mensaje: "Error al guardar código de recuperación." });
      }

      // Responder de inmediato al cliente
      res.json({ mensaje: "Código generado y enviado (si el correo es válido)." });

      // Enviar el correo sin bloquear respuesta
      transporter.sendMail(
        {
          from: process.env.MAIL_FROM || `"Soporte Marina Mercante" <${process.env.SMTP_USER}>`,
          to: u.correo,
          subject: "Código para recuperar tu contraseña",
          text: `Hola ${u.nombre_usuario}, tu código es: ${code}. Vence en 10 minutos.`,
          html: `
            <p>Hola <b>${u.nombre_usuario}</b>,</p>
            <p>Tu código de recuperación es: <b>${code}</b></p>
            <p>Vence en <b>10 minutos</b>.</p>
            <p>Si no solicitaste esto, ignora este mensaje.</p>
          `,
        },
        (mailErr, info) => {
          if (mailErr) {
            console.error(" Error enviando correo:", mailErr);
          } else {
            console.log(" EMAIL ENVIADO:", info.response);
          }
        }
      );
    });
  });
});

// === 2. Verificar el código ===
app.post("/api/recuperar-verificar", (req, res) => {
  const { correo, nombre_usuario, codigo } = req.body;

  if ((!correo && !nombre_usuario) || !codigo) {
    return res.status(400).json({ mensaje: "Faltan datos." });
  }

  const where = nombre_usuario ? "nombre_usuario = ?" : "correo = ?";
  const value = nombre_usuario || correo;

  const qSel = `
    SELECT id_usuario, reset_code, reset_expires, reset_used
    FROM tbl_usuario
    WHERE ${where}
    LIMIT 1
  `;

  conexion.query(qSel, [value], (err, rows) => {
    if (err) {
      console.error(" Error al buscar código:", err);
      return res.status(500).json({ mensaje: "Error al buscar código." });
    }

    if (!rows.length) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const u = rows[0];
    const now = new Date();

    if (!u.reset_code || !u.reset_expires) {
      return res.status(400).json({ mensaje: "No hay solicitud activa de recuperación." });
    }
    if (u.reset_used) {
      return res.status(400).json({ mensaje: "Este código ya fue usado." });
    }
    if (now > new Date(u.reset_expires)) {
      return res.status(400).json({ mensaje: "El código ha expirado." });
    }
    if (u.reset_code !== codigo) {
      return res.status(400).json({ mensaje: "Código incorrecto." });
    }

    // Marcar el código como usado
    const qUpd = "UPDATE tbl_usuario SET reset_used = 1 WHERE id_usuario = ?";
    conexion.query(qUpd, [u.id_usuario], (err2) => {
      if (err2) console.error(" Error marcando código usado:", err2);
    });

    res.json({ mensaje: "Código verificado. Ahora puedes establecer una nueva contraseña." });
  });
});


// === 3. Restablecer contraseña ===
app.post("/api/recuperar-restablecer", (req, res) => {
  const { correo, nombre_usuario, nueva_contraseña } = req.body;

  if ((!correo && !nombre_usuario) || !nueva_contraseña) {
    return res.status(400).json({ mensaje: "Faltan datos." });
  }

  const where = nombre_usuario ? "nombre_usuario = ?" : "correo = ?";
  const value = nombre_usuario || correo;

  const qSel = `
    SELECT id_usuario
    FROM tbl_usuario
    WHERE ${where} AND reset_used = 1
    LIMIT 1
  `;

  conexion.query(qSel, [value], (err, rows) => {
    if (err) {
      console.error(" Error al verificar usuario:", err);
      return res.status(500).json({ mensaje: "Error al verificar usuario." });
    }

    if (!rows.length) {
      return res.status(404).json({ mensaje: "Verificación inválida o expirada." });
    }

    const u = rows[0];

    const qUpd = `
      UPDATE tbl_usuario
      SET contraseña = ?, reset_code = NULL, reset_expires = NULL, reset_used = 0
      WHERE id_usuario = ?
    `;

    conexion.query(qUpd, [nueva_contraseña, u.id_usuario], (err2) => {
      if (err2) {
        console.error(" Error al actualizar contraseña:", err2); 
        return res.status(500).json({ mensaje: "Error al actualizar contraseña." });
      }

      res.json({ mensaje: "Contraseña actualizada. Ya puedes iniciar sesión." });
    });
  });
});

// === Helper: generar código de 6 dígitos ===
function gen6Code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ===== CRUD PARA tbl_usuario =====
// Listar todos los usuarios
app.get("/api/usuario", async (req, res) => {
  const { id_usuario } = req.query; // o extrae del token en un futuro
  try {
    const [rows] = await conexion.promise().query(
      "SELECT * FROM tbl_usuario ORDER BY id_usuario DESC"
    );

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 3, "GET", "Se consultó la lista de usuarios"]
      );
    }

    res.json(rows);
  } catch (err) {
    handleDatabaseError(err, res, "Error en listado de usuarios:");
  }
});

// Obtener usuario por ID
app.get("/api/usuario/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { id_usuario } = req.query;

  try {
    const [rows] = await conexion.promise().query(
      "SELECT * FROM tbl_usuario WHERE id_usuario = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // Registrar en bitácora
    if (id_usuario) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_usuario, 3, "GET", `Se consultó el usuario con ID ${id}`]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    handleDatabaseError(err, res, "Error al obtener usuario por ID:");
  }
});

// Insertar nuevo usuario
app.post("/api/usuario", async (req, res) => {
  const {
    id_rol,
    nombre,
    apellido,
    correo,
    nombre_usuario,
    contraseña,
    id_usuario: id_admin // usuario que realiza la acción (admin)
  } = req.body;

  if (!nombre || !apellido || !correo || !nombre_usuario || !contraseña) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const query = `
    INSERT INTO tbl_usuario (id_rol, nombre, apellido, correo, nombre_usuario, contraseña)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [id_rol ?? null, nombre, apellido, correo, nombre_usuario, contraseña];

  try {
    const [result] = await conexion.promise().query(query, values);

    // Registrar en bitácora
    if (id_admin) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [
          id_admin,
          3,
          "INSERT",
          `Se agregó el usuario ${nombre_usuario} (${nombre} ${apellido})`
        ]
      );
    }

    res.json({ mensaje: "Usuario agregado correctamente", id: result.insertId });
  } catch (err) {
    handleDatabaseError(err, res, "Error al insertar usuario:");
  }
});

// Actualizar usuario
app.put("/api/usuario", async (req, res) => {
  const { id_usuario, id_rol, nombre, apellido, correo, nombre_usuario, id_admin } = req.body;

  if (!id_usuario)
    return res.status(400).json({ error: "id_usuario es requerido" });

  const query = `
    UPDATE tbl_usuario
    SET id_rol = ?, nombre = ?, apellido = ?, correo = ?, nombre_usuario = ?
    WHERE id_usuario = ?
  `;
  const values = [id_rol ?? null, nombre, apellido, correo, nombre_usuario, id_usuario];

  try {
    const [result] = await conexion.promise().query(query, values);

    if (result.affectedRows === 0)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // Registrar en bitácora
    if (id_admin) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [
          id_admin,
          3,
          "UPDATE",
          `Se actualizó el usuario ${nombre_usuario} (ID ${id_usuario})`
        ]
      );
    }

    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (err) {
    handleDatabaseError(err, res, "Error al actualizar usuario:");
  }
});

// Eliminar usuario
app.delete("/api/usuario/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { id_admin } = req.query; // el usuario que ejecuta el borrado

  try {
    const [result] = await conexion.promise().query(
      "DELETE FROM tbl_usuario WHERE id_usuario = ?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // Registrar en bitácora
    if (id_admin) {
      await conexion.promise().query(
        "CALL event_bitacora(?, ?, ?, ?)",
        [id_admin, 3, "DELETE", `Se eliminó el usuario con ID ${id}`]
      );
    }

    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (err) {
    handleDatabaseError(err, res, "Error al eliminar usuario:");
  }
});

// ===== Leer cookie (sin bitácora, es solo debug) =====
app.get("/api/cookie", (req, res) => {
  if (!req.cookies) {
    return res.status(400).json({
      error: "Las cookies no están habilitadas o enviadas correctamente.",
    });
  }

  const miCookie = req.cookies.mi_cookie;

  if (miCookie) {
    logger.info("Cookie leída correctamente");
    res.json({ mensaje: "Valor de la cookie:", cookie: miCookie });
  } else {
    res.status(404).json({ mensaje: "No se encontró la cookie" });
  }
});

function gen6Code() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

// === REGISTRO con envío de CÓDIGO ===
app.post('/api/auth/register', (req, res) => {
  const { nombre, apellido, correo, nombre_usuario, contraseña } = req.body;

  if (!nombre || !apellido || !correo || !nombre_usuario || !contraseña) {
    return res.status(400).json({ mensaje: 'Rellena todos los campos.' });
  }

  const qUser = `
    INSERT INTO tbl_usuario (nombre, apellido, correo, nombre_usuario, contraseña, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())
  `;

  conexion.query(qUser, [nombre, apellido, correo, nombre_usuario, contraseña], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'Correo o nombre de usuario ya existe.' });
      }
      return handleDatabaseError(err, res, 'Error al registrar usuario:');
    }

    const id_usuario = result.insertId;

    // 1) Generar y hashear código
    const code = gen6Code();
    const code_hash = hashCode(code);
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // 2) Guardar token
   const qTok = `
  INSERT INTO verificar_email_tokens (id_usuario, token_hash, expires_at, used, created_at)
  VALUES (?, ?, ?, 0, NOW())
`;
    conexion.query(qTok, [id_usuario, code_hash, expires_at], async (err2) => {
      if (err2) return handleDatabaseError(err2, res, 'Error al crear token:');

      // 3) Enviar correo
      try {
        await SendVerifyMail({ to: correo, name: nombre, code });
        return res.status(201).json({
          mensaje: 'Usuario creado. Revisa tu correo para verificar la cuenta con el código enviado.'
        });
      } catch (e) {
        console.error('Email error:', e);
        return res.status(500).json({
          mensaje: 'Usuario creado, pero falló el envío del correo. Intenta “reenviar código”.'
        });
      }
    });
  });
});

//Verificar el código recibido por el usuario
app.post('/api/auth/verify-code', (req, res) => {
  const { correo, code } = req.body;
  if (!correo || !code) {
    return res.status(400).json({ mensaje: 'Faltan datos: correo o código.' });
  }

  // Buscar usuario
  const qUser = `SELECT id_usuario FROM tbl_usuario WHERE correo = ? LIMIT 1`;
  conexion.query(qUser, [correo], (err, rows) => {
    if (err) return handleDatabaseError(err, res, 'Error al buscar usuario:');
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    const id_usuario = rows[0].id_usuario;

    // Generar hash del código recibido
    const code_hash = crypto.createHash('sha256').update(String(code)).digest('hex');

    // Buscar token válido
    const qTok = `
      SELECT id_verificar_email, expires_at, used
      FROM verificar_email_tokens
      WHERE id_usuario = ? AND token_hash = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    conexion.query(qTok, [id_usuario, code_hash], (err2, tokRows) => {
      if (err2) return handleDatabaseError(err2, res, 'Error al verificar token:');
      if (tokRows.length === 0) {
        return res.status(400).json({ mensaje: 'Código inválido o incorrecto.' });
      }

      const token = tokRows[0];
      if (token.used) {
        return res.status(400).json({ mensaje: 'Este código ya fue utilizado.' });
      }

      const now = new Date();
      if (new Date(token.expires_at) < now) {
        return res.status(400).json({ mensaje: 'El código ha expirado. Solicita uno nuevo.' });
      }

      // Marcar token como usado y usuario como verificado
      const qUpdTok = `UPDATE verificar_email_tokens SET used = 1 WHERE id_verificar_email = ?`;
      const qUpdUser = `UPDATE tbl_usuario SET is_verified = 1 WHERE id_usuario = ?`;

      conexion.query(qUpdTok, [token.id_verificar_email], (err3) => {
        if (err3) return handleDatabaseError(err3, res, 'Error al actualizar token:');
        conexion.query(qUpdUser, [id_usuario], (err4) => {
          if (err4) return handleDatabaseError(err4, res, 'Error al actualizar usuario:');

          res.json({ mensaje: ' Cuenta verificada correctamente.' });
        });
      });
    });
  });
});

// ===== REENVIAR CÓDIGO DE VERIFICACIÓN 
app.post('/api/reenviar', (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ mensaje: 'correo es requerido' });

  // Buscar usuario
  const qUser = `
    SELECT id_usuario, nombre, is_verified 
    FROM tbl_usuario 
    WHERE correo = ? 
    LIMIT 1
  `;

  conexion.query(qUser, [correo], (err, rows) => {
    if (err) return handleDatabaseError(err, res, 'Error al buscar usuario:');
    if (rows.length === 0)
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' }); 

    const u = rows[0];

    // Si ya está verificado, no reenviar
    if (u.is_verified)
      return res.json({ mensaje: 'El correo ya está verificado.' });

    // Marcar tokens anteriores como usados (opcional, por seguridad)
    const qMarkUsed = `
      UPDATE verificar_email_tokens 
      SET used = 1 
      WHERE id_usuario = ?
    `;
    conexion.query(qMarkUsed, [u.id_usuario], (err2) => {
      if (err2)
        return handleDatabaseError(err2, res, 'Error al invalidar tokens anteriores:');

      // Generar nuevo código y expiración
      const code = gen6Code(); 
      const code_hash = hashCode(code);
      const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Guardar el nuevo token (used = 0)
      const qTok = `
        INSERT INTO verificar_email_tokens 
        (id_usuario, token_hash, expires_at, created_at, used)
        VALUES (?, ?, ?, NOW(), 0)
      `;

      conexion.query(qTok, [u.id_usuario, code_hash, expires_at], async (err3) => {
        if (err3)
          return handleDatabaseError(err3, res, 'Error al crear nuevo token:');

        // Enviar el correo
        try {
          await SendVerifyMail({ to: correo, name: u.nombre, code });
          console.log(` Nuevo código enviado a ${correo}: ${code}`);

          return res.json({
            mensaje: 'Se envió un nuevo código de verificación al correo proporcionado.',
          });
        } catch (e) {
          console.error(' Error al enviar correo:', e);
          return res.status(500).json({
            mensaje: 'Usuario creado, pero no se pudo enviar el código al correo.',
          });
        }
      });
    });
  });
});

// ===== Insertar nuevo usuario (rol opcional; por defecto sin rol) =====
app.post("/api/usuario", verificarToken, autorizarRoles("Administrador"),  (req, res) => {
  const {
    id_rol,          // opcional: admin puede pasarlo; si no, NULL
    nombre,
    apellido,
    correo,
    nombre_usuario,
    contraseña,
  } = req.body;

  if (!nombre || !apellido || !correo || !nombre_usuario || !contraseña) {
    return res.status(400).json({ mensaje: 'Rellena todos los campos.' });
  }

  const qTok = `
  INSERT INTO verificar_email_tokens (id_usuario, token_hash, expires_at, used, created_at)
  VALUES (?, ?, ?, 0, NOW())
`;


  conexion.query(qUser, [nombre, apellido, correo, nombre_usuario, contraseña], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'Correo o nombre de usuario ya existe.' });
      }
      return handleDatabaseError(err, res, 'Error al registrar usuario:');
    }

    const id_usuario = result.insertId;

    // 1) Generar y hashear código
    const code = gen6Code();
    const code_hash = hashCode(code);
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // 2) Guardar token
    const qTok = `
  INSERT INTO verificar_email_tokens (id_usuario, token_hash, expires_at, used, created_at)
  VALUES (?, ?, ?, 0, NOW())
`;
    conexion.query(qTok, [id_usuario, code_hash, expires_at], async (err2) => {
      if (err2) return handleDatabaseError(err2, res, 'Error al crear token:');

      // 3) Enviar correo
      try {
        await SendVerifyMail({ to: correo, name: nombre, code });
        return res.status(201).json({
          mensaje: 'Usuario creado. Revisa tu correo para verificar la cuenta con el código enviado.'
        });
      } catch (e) {
        console.error('Email error:', e);
        return res.status(500).json({
          mensaje: 'Usuario creado, pero falló el envío del correo. Intenta “reenviar código”.'
        });
      }
    });
  });
});

// REENVIAR CÓDIGO
app.post('/api/reenviar', (req, res) => {
  const { correo } = req.body;

  if (!correo) return res.status(400).json({ mensaje: 'correo es requerido' });

  const qUser = `
    SELECT id_usuario, nombre, is_verified 
    FROM tbl_usuario 
    WHERE correo = ? 
    LIMIT 1
  `;

  conexion.query(qUser, [correo], (err, rows) => {
    if (err) return handleDatabaseError(err, res, 'Error al buscar usuario:');
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const u = rows[0];

    if (u.is_verified) {
      return res.json({ mensaje: 'El correo ya está verificado.' });
    }

    // Generar nuevo código
    const code = gen6Code();
    const code_hash = hashCode(code);
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);

    // Guardar el nuevo token
    const qTok = `
      INSERT INTO verificar_email_tokens (id_usuario, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    conexion.query(qTok, [u.id_usuario, code_hash, expires_at], async (e3) => {
      if (e3) return handleDatabaseError(e3, res, 'Error al crear nuevo token:');

      try {
        await SendVerifyMail({ to: correo, name: u.nombre, code });
        return res.json({ mensaje: 'Se envió un nuevo código de verificación.' });
      } catch (e) {
        console.error('Email error:', e);
        return res.status(500).json({ mensaje: 'No se pudo enviar el código.' });
      }
    });
  });
});

// ===== Actualizar usuario =====
// ACTUALIZAR usuario -> él mismo o Administrador
app.put(
  "/api/usuario/:id",
  verificarToken,
  autorizarSelfOrAdmin("id"),
  bloquearCambioRolSiNoAdmin, // impide que no-admin cambie su rol
  (req, res) => {
    const id = Number(req.params.id);

    // solo campos permitidos para no-admin:
    const campos = [ "nombre", "apellido", "correo", "nombre_usuario", "contraseña"];
    // si es admin, puede incluir id_rol:
    if (req.user.rol_nombre === "Administrador") campos.push("id_rol");

    const update = {};
    for (const c of campos) if (req.body[c] !== undefined) update[c] = req.body[c];
    if (!Object.keys(update).length) return res.status(400).json({ mensaje: "Nada para actualizar" });

    conexion.query("UPDATE tbl_usuario SET ? WHERE id_usuario = ?", [update, id], (err, result) => {
      if (err) return res.status(500).json({ mensaje: "Error al actualizar" });
      if (result.affectedRows === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
      res.json({ mensaje: "Usuario actualizado correctamente" });
    });
  }
);

//Verificar código
app.post('/api/auth/verify-code', (req, res) => {
  const { correo, code } = req.body;
  if (!correo || !code) {
    return res.status(400).json({ mensaje: 'Faltan datos: correo o código.' });
  }

  // Buscar usuario
  const qUser = `SELECT id_usuario FROM tbl_usuario WHERE correo = ? LIMIT 1`;
  conexion.query(qUser, [correo], (err, rows) => {
    if (err) return handleDatabaseError(err, res, 'Error al buscar usuario:');
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    const id_usuario = rows[0].id_usuario;

    // Generar hash del código recibido
    const code_hash = crypto.createHash('sha256').update(String(code)).digest('hex');

    // Buscar token válido
    const qTok = `
      SELECT id_verificar_email, expires_at, used
      FROM verificar_email_tokens
      WHERE id_usuario = ? AND token_hash = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    conexion.query(qTok, [id_usuario, code_hash], (err2, tokRows) => {
      if (err2) return handleDatabaseError(err2, res, 'Error al verificar token:');
      if (tokRows.length === 0) {
        return res.status(400).json({ mensaje: 'Código inválido o incorrecto.' });
      }

      const token = tokRows[0];
      if (token.used) {
        return res.status(400).json({ mensaje: 'Este código ya fue utilizado.' });
      }

      const now = new Date();
      if (new Date(token.expires_at) < now) {
        return res.status(400).json({ mensaje: 'El código ha expirado. Solicita uno nuevo.' });
      }

      // Marcar token como usado y usuario como verificado
      const qUpdTok = `UPDATE verificar_email_tokens SET used = 1 WHERE id_verificar_email = ?`;
      const qUpdUser = `UPDATE tbl_usuario SET is_verified = 1 WHERE id_usuario = ?`;

      conexion.query(qUpdTok, [token.id_verificar_email], (err3) => {
        if (err3) return handleDatabaseError(err3, res, 'Error al actualizar token:');
        conexion.query(qUpdUser, [id_usuario], (err4) => {
          if (err4) return handleDatabaseError(err4, res, 'Error al actualizar usuario:');

          res.json({ mensaje: 'Cuenta verificada correctamente.' });
        });
      });
    });
  });
});

//Verificar código
app.post('/api/auth/verify-code', (req, res) => {
  const { correo, code } = req.body;
  if (!correo || !code) {
    return res.status(400).json({ mensaje: 'Faltan datos: correo o código.' });
  }

  // Buscar usuario
  const qUser = `SELECT id_usuario FROM tbl_usuario WHERE correo = ? LIMIT 1`;
  conexion.query(qUser, [correo], (err, rows) => {
    if (err) return handleDatabaseError(err, res, 'Error al buscar usuario:');
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    const id_usuario = rows[0].id_usuario;

    // Generar hash del código recibido
    const code_hash = crypto.createHash('sha256').update(String(code)).digest('hex');

    // Buscar token válido
    const qTok = `
      SELECT id_verificar_email, expires_at, used
      FROM verificar_email_tokens
      WHERE id_usuario = ? AND token_hash = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    conexion.query(qTok, [id_usuario, code_hash], (err2, tokRows) => {
      if (err2) return handleDatabaseError(err2, res, 'Error al verificar token:');
      if (tokRows.length === 0) {
        return res.status(400).json({ mensaje: 'Código inválido o incorrecto.' });
      }

      const token = tokRows[0];
      if (token.used) {
        return res.status(400).json({ mensaje: 'Este código ya fue utilizado.' });
      }

      const now = new Date();
      if (new Date(token.expires_at) < now) {
        return res.status(400).json({ mensaje: 'El código ha expirado. Solicita uno nuevo.' });
      }

      // Marcar token como usado y usuario como verificado
      const qUpdTok = `UPDATE verificar_email_tokens SET used = 1 WHERE id_verificar_email = ?`;
      const qUpdUser = `UPDATE tbl_usuario SET is_verified = 1 WHERE id_usuario = ?`;

      conexion.query(qUpdTok, [token.id_verificar_email], (err3) => {
        if (err3) return handleDatabaseError(err3, res, 'Error al actualizar token:');
        conexion.query(qUpdUser, [id_usuario], (err4) => {
          if (err4) return handleDatabaseError(err4, res, 'Error al actualizar usuario:');

          res.json({ mensaje: 'Cuenta verificada correctamente.' });
        });
      });
    });
  });
});

//GET cliente 
app.get('/api/cliente', (request, response) => {
    var query = "SELECT * FROM tbl_cliente";
    
    conexion.query(query, (err, rows) => { 
        if (err) {
            logger.error("Error en listado de cliente: " + err.message);
            return response.status(500).json({ error: "Error en listado de cliente" });
        }
        response.json(rows);
        registrarBitacora("tlb_cliente", "GET", request.body); // Registra la petición en la bitácora
        logger.info("Listado de cliente - OK");
    });
});

// GET con where cliente
app.get('/api/cliente/:id',(request, response)=>{
    var query = "SELECT * FROM tbl_cliente WHERE id_cliente = ?"
    var values = [parseInt(request.params.id)];

    conexion.query(query,values,function(err,rows,fields){
        if (err){
            handleDatabaseError(err, response, "Error en listado de cliente con where:");
            return;
        }
        registrarBitacora("tbl_cliente", "GET", request.body); 
        logger.info("Listado de clientes con where - OK");
        response.json(rows);
    });
});

// Insert cliente
app.post('/api/cliente', (request, response) => {
    var query = "INSERT INTO tbl_cliente (nombre, identidad) VALUES (?, ?)";
    var values = [
        request.body["nombre"],
        request.body["identidad"]
    ];

    conexion.query(query, values, function(err, rows, fields) {
        if (err) {
            handleDatabaseError(err, response, "Error en inserción del cliente:");
            return;
        }
        registrarBitacora("cliente", "INSERT", request.body); // Registra accion en la bitácora
        logger.info("INSERT de cliente - OK");
        response.json("INSERT EXITOSO!");
    });
});

// PUT de cliente
app.put('/api/cliente/:id', (request, response) => {
    console.log("Params:", request.params);
    console.log("Body:", request.body);
    const query = `
        UPDATE tbl_cliente 
        SET nombre = ?, identidad = ? WHERE id_cliente = ?
    `;
    const values = [
        request.body["nombre"],
        request.body["identidad"],
        request.body["id_cliente"]
    ];

    conexion.query(query, values, (err) => {
        if (err) {
            handleDatabaseError(err, response, "Error en actualización de cliente:");
            return;
        }
        registrarBitacora("cliente", "PUT");
        logger.info("ACTUALIZACIÓN cliente - OK");
        response.json("UPDATE EXITOSO!");
    });
});


app.delete('/api/cliente/:id', (request, response) => {
    var query = "DELETE FROM tbl_cliente where id_cliente= ?";
    var values = [
        parseInt(request.params.id)
    ];

    conexion.query(query, values, function(err, rows, fields) {
        if (err) {
            handleDatabaseError(err, response, "Error en la eliminación del cliente:");
            return;
        }
        
        registrarBitacora("cliente", "DELETE", request.body); // Registra accion en la bitácora
        logger.info("DELETE de cliente - OK");
        response.json("DELETE EXITOSO!");
    });
});

//Get 
app.get('/api/estado_ticket',(request, response)=>{
    var query = "SELECT * FROM marina_mercante.tl_estado_ticket"
    conexion.query(query,function(err,rows,fields){
        if (err){
            response.send("301 ERROR EN LISTADO DE ESTADOS DE TICKET")
        };
        registrarBitacora("Estados de ticket", "GET", request.body); //REGISTRAR LA PETICION EN LA BITACORA
        response.send(rows)
        console.log("listado de estados de ticket - OK")
    })
});

//Get listado de estado de ticket con where
app.get('/api/estado_ticket/:id',(request, response)=>{
    var query = "SELECT * FROM marina_mercante.tl_estado_ticket WHERE id_estado_ticket = ?"
    var values = [
        parseInt(request.params.id)
    ];
    conexion.query(query,values,function(err,rows,fields){
        if (err){
            response.send("301 ERROR EN LISTADO DE ESTADO DE TICKET")
        };
        registrarBitacora("estado de ticket", "GET", request.body);
        response.send(rows)
        console.log("listado de productos con where - OK")
    })
});


//Post insert de estado ticket
app.post('/api/estado_ticket', (request, response) => {
    var query = "INSERT INTO marina_mercante.tbl_estado_ticket (estado) VALUES (?)"; 
    var values = [
        request.body["estado"],
        
    ];
    conexion.query(query, values, function(err, rows, fields) {
        if (err) {
            console.log(err.message);
            return response.status(500).json({ error: err.message }); // Mejor manejo de errores
        }
        registrarBitacora("Estado ticket", "POST", request.body);
        response.json("INSERT EXITOSO!");
        console.log("INSERT de estado ticket - OK");
    });
});

//Put Update de Estdo ticket
app.put('/api/estado_ticket', (request, response) => {
    var query = "UPDATE marina_mercante.tl_estado_ticket SET estado = ? where id_estado_ticket = ?";
    var values = [
        request.body["estado"]
       
    ];
    conexion.query(query, values, function(err, rows, fields) {
        if (err) {
            console.log(err.message);
            return response.status(500).json({ error: err.message }); // Mejor manejo de errores
        }
        registrarBitacora("estado ticket", "PUT", request.body);
        response.json("UPDATE EXITOSO!");
        console.log("UPDATE de estado ticket - OK");
    });
});


//Delete de estado de ticket
app.delete('/api/estado_ticket/:id', (request, response) => {
    var query = "DELETE FROM marina_mercante.tl_estado_ticket where id_producto = ?";
    var values = [
        parseInt(request.params.id)
    ];
    conexion.query(query, values, function(err, rows, fields) {
        if (err) {
            console.log(err.message);
            return response.status(500).json({ error: err.message }); 
        }
        registrarBitacora("productos", "DELETE", request.body);
        response.json("DELETE EXITOSO!");
        console.log("DELETE de estado ticket - OK");
    });
});


//CRUD PROVEEDORES

app.get('/api/proveedores', (req, res) => { 
  const { id_usuario, usuario } = req.query;
  const usuarioNombre = usuario || req.user?.nombre_usuario || 'sistema';

  const ID_OBJETO_PROVEEDOR = 2;

  conexion.query('SELECT * FROM tbl_proveedor', (err, rows) => {
    if (err) {
      console.error('Error al listar proveedores:', err);
      return res.status(500).json({ mensaje: 'Error al listar proveedores' });
    }

    if (id_usuario) {
      console.log("🔎 Ejecutando logBitacora(GET proveedores)");

      logBitacora(conexion, {
        id_objeto: ID_OBJETO_PROVEEDOR,
        id_usuario: Number(id_usuario),
        accion: 'GET',
        descripcion: 'Se consultó la lista de proveedores',
        usuario: usuarioNombre
      });
    }

    return res.json(rows);
  });
});

app.get('/api/proveedores/:id', (req, res) => {
  const { id } = req.params;
  const { id_usuario, usuario } = req.query;
  const usuarioNombre = usuario || req.user?.nombre_usuario || 'sistema';

  const ID_OBJETO_PROVEEDOR = 2;

  conexion.query(
    'SELECT * FROM tbl_proveedor WHERE id_proveedor = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener proveedor:', err);
        return res.status(500).json({ error: 'Error al obtener proveedor' });
      }
      if (!rows.length) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      if (id_usuario) {
        logBitacora(conexion, {
          id_objeto: ID_OBJETO_PROVEEDOR,
          id_usuario: Number(id_usuario),
          accion: 'GET',
          descripcion: `Se consultó el proveedor id=${id}`,
          usuario: usuarioNombre
        });
      }

      return res.json(rows[0]);
    }
  );
});

app.post('/api/proveedores', (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  const { id_usuario, usuario } = req.query;
  const usuarioNombre = usuario || req.user?.nombre_usuario || 'sistema';

  const ID_OBJETO_PROVEEDOR = 2;

  if (!nombre || !telefono || !direccion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  conexion.query(
    'INSERT INTO tbl_proveedor (nombre, telefono, direccion) VALUES (?, ?, ?)',
    [nombre, telefono, direccion],
    (err, result) => {
      if (err) {
        console.error('Error al insertar proveedor:', err);
        return res.status(500).json({ error: 'Error al insertar proveedor' });
      }

      if (id_usuario) {
        logBitacora(conexion, {
          id_objeto: ID_OBJETO_PROVEEDOR,
          id_usuario: Number(id_usuario),
          accion: 'POST',
          descripcion: `Se creó proveedor (${nombre})`,
          usuario: usuarioNombre
        });
      }

      return res.status(201).json({
        id_proveedor: result.insertId,
        nombre,
        telefono,
        direccion
      });
    }
  );
});

app.put('/api/proveedores/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion } = req.body;
  const { id_usuario, usuario } = req.query;
  const usuarioNombre = usuario || req.user?.nombre_usuario || 'sistema';

  const ID_OBJETO_PROVEEDOR = 2;

  conexion.query(
    'UPDATE tbl_proveedor SET nombre=?, telefono=?, direccion=? WHERE id_proveedor=?',
    [nombre, telefono, direccion, id],
    (err, result) => {
      if (err) {
        console.error('Error al actualizar proveedor:', err);
        return res.status(500).json({ error: 'Error al actualizar proveedor' });
      }

      if (id_usuario) {
        logBitacora(conexion,{
          id_objeto: ID_OBJETO_PROVEEDOR,
          id_usuario: Number(id_usuario),
          accion: 'PUT',
          descripcion: `Se actualizó proveedor (${nombre})`,
          usuario: usuarioNombre
        });
      }

      return res.json({ message: 'Proveedor actualizado correctamente' });
    }
  );
});

app.delete('/api/proveedores/:id', (req, res) => {
  const { id } = req.params;
  const { id_usuario, usuario } = req.query;
  const usuarioNombre = usuario || req.user?.nombre_usuario || 'sistema';

  const ID_OBJETO_PROVEEDOR = 2;

  conexion.query(
    'DELETE FROM tbl_proveedor WHERE id_proveedor = ?',
    [id],
    (err, result) => {

      // *** ERROR AQUÍ — te faltaba cerrar una llave ***
      if (err) {
        console.error('Error al eliminar proveedor:', err);
        return res.status(500).json({ error: 'Error al eliminar proveedor' });
      }  // ← ESTA LLAVE FALTABA

      if (id_usuario) {
        logBitacora(conexion, {
          id_objeto: ID_OBJETO_PROVEEDOR,
          id_usuario: Number(id_usuario),
          accion: 'DELETE',
          descripcion: `Se eliminó proveedor (${id})`,
          usuario: usuarioNombre
        });
      }

      return res.json({ message: 'Proveedor eliminado correctamente' });
    }
  );
});

// ====== CRUD PARA tl_compra ======  
app.get('/api/compra', (req, res) => {  
  const query = "SELECT * FROM tbl_compra";  
  conexion.query(query, (err, rows) => {  
    if (err) {  
      console.error("Error al listar compras:", err);  
      res.status(500).json({ error: "Error al listar compras" });  
      return;  
    }  
    res.json(rows);  
  });  
});  
  
app.get('/api/compra/:id', (req, res) => {  
  const query = "SELECT * FROM tl_compra WHERE id_compra = ?";  
  conexion.query(query, [req.params.id], (err, rows) => {  
    if (err) {  
      console.error("Error al obtener compra:", err);  
      res.status(500).json({ error: "Error al obtener compra" });  
      return;  
    }  
    res.json(rows[0]);  
  });  
});  
  
app.post('/api/compra', (req, res) => {  
  const { id_proveedor, monto_total, fecha_hora_compra, estado_compra } = req.body;  
  const query = "INSERT INTO tl_compra (id_proveedor, monto_total, fecha_hora_compra, estado_compra) VALUES (?, ?, ?, ?)";  
  conexion.query(query, [id_proveedor, monto_total, fecha_hora_compra, estado_compra], (err, result) => {  
    if (err) {  
      console.error("Error al insertar compra:", err);  
      res.status(500).json({ error: "Error al insertar compra" });  
      return;  
    }  
    res.json({ message: "Compra insertada correctamente", id: result.insertId });  
  });  
});  
  
app.put('/api/compra/:id', (req, res) => {  
  const { id_proveedor, monto_total, fecha_hora_compra, estado_compra } = req.body;  
  const query = "UPDATE tl_compra SET id_proveedor = ?, monto_total = ?, fecha_hora_compra = ?, estado_compra = ? WHERE id_compra = ?";  
  conexion.query(query, [id_proveedor, monto_total, fecha_hora_compra, estado_compra, req.params.id], (err) => {  
    if (err) {  
      console.error("Error al actualizar compra:", err);  
      res.status(500).json({ error: "Error al actualizar compra" });  
      return;  
    }  
    res.json({ message: "Compra actualizada correctamente" });  
  });  
});  
  
app.delete('/api/compra/:id', (req, res) => {  
  const query = "DELETE FROM tl_compra WHERE id_compra = ?";  
  conexion.query(query, [req.params.id], (err) => {  
    if (err) {  
      console.error("Error al eliminar compra:", err);  
      res.status(500).json({ error: "Error al eliminar compra" });  
      return;  
    }  
    res.json({ message: "Compra eliminada correctamente" });  
  });  
});

// ====== CRUD PARA tl_detalle_compra ======  
app.get('/api/detalle_compra', (req, res) => {  
  const query = "SELECT * FROM tl_detalle_compra";  
  conexion.query(query, (err, rows) => {  
    if (err) {  
      console.error("Error al listar detalles de compra:", err);  
      res.status(500).json({ error: "Error al listar detalles de compra" });  
      return;  
    }  
    res.json(rows);  
  });  
});  
  
app.get('/api/detalle_compra/:id', (req, res) => {  
  const query = "SELECT * FROM tl_detalle_compra WHERE id_detalle_compra = ?";  
  conexion.query(query, [req.params.id], (err, rows) => {  
    if (err) {  
      console.error("Error al obtener detalle de compra:", err);  
      res.status(500).json({ error: "Error al obtener detalle de compra" });  
      return;  
    }  
    res.json(rows[0]);  
  });  
});  
  
app.post('/api/detalle_compra', (req, res) => {  
  const { id_compra, id_producto, cantidad, precio_compra } = req.body;  
  const query = "INSERT INTO tl_detalle_compra (id_compra, id_producto, cantidad, precio_compra) VALUES (?, ?, ?, ?)";  
  conexion.query(query, [id_compra, id_producto, cantidad, precio_compra], (err, result) => {  
    if (err) {  
      console.error("Error al insertar detalle de compra:", err);  
      res.status(500).json({ error: "Error al insertar detalle de compra" });  
      return;  
    }  
    res.json({ message: "Detalle de compra insertado correctamente", id: result.insertId });  
  });  
});  
  
app.put('/api/detalle_compra/:id', (req, res) => {  
  const { id_compra, id_producto, cantidad, precio_compra } = req.body;  
  const query = "UPDATE tl_detalle_compra SET id_compra = ?, id_producto = ?, cantidad = ?, precio_compra = ? WHERE id_detalle_compra = ?";  
  conexion.query(query, [id_compra, id_producto, cantidad, precio_compra, req.params.id], (err) => {  
    if (err) {  
      console.error("Error al actualizar detalle de compra:", err);  
      res.status(500).json({ error: "Error al actualizar detalle de compra" });  
      return;  
    }  
    res.json({ message: "Detalle de compra actualizado correctamente" });  
  });  
});  
  
app.delete('/api/detalle_compra/:id', (req, res) => {  
  const query = "DELETE FROM tl_detalle_compra WHERE id_detalle_compra = ?";  
  conexion.query(query, [req.params.id], (err) => {  
    if (err) {  
      console.error("Error al eliminar detalle de compra:", err);  
      res.status(500).json({ error: "Error al eliminar detalle de compra" });  
      return;  
    }  
    res.json({ message: "Detalle de compra eliminado correctamente" });  
  });  
});

// Get listado de tipo ticket
app.get('/api/tipo_ticket', (request, response) => {
    const query = "SELECT * FROM marina_mercante.tipo_ticket";
    conexion.query(query, (err, rows) => {
        if (err) {
            return handleDatabaseError(err, response, "Error en listado de tipo ticket:");
        }
        registrarBitacora("tipo ticket", "GET");
        logger.info("Listado de tipo de ticket - OK");
        response.json(rows);
    });
});

// Get tipo ticket con where (por id)
app.get('/api/tipo_ticket/:id', (request, response) => {
    const query = "SELECT * FROM marina_mercante.tipo_ticket WHERE id_tipo_ticket= ?";
    const values = [parseInt(request.params.id)];
    conexion.query(query, values, (err, rows) => {
        if (err) {
            return handleDatabaseError(err, response, "Error en listado de tipo ticket:");
        }
        registrarBitacora("Tipo Ticket", "GET");
        logger.info("Listado de tipo ticket - OK");
        response.json(rows);
    });
});

// Post insert de tipo ticket
app.post('/api/tipo_ticket', (request, response) => {
    try {
        const { tipo_ticket , estado, prefijo } = request.body;
        const query = `
            INSERT INTO marina_mercante.tipo_ticket (tipo_ticket , estado, prefijo) 
            VALUES (?, ?, ?)
        `;
        const values = [tipo_ticket , estado, prefijo];
        conexion.query(query, values, (err) => {
            if (err) {
                return handleDatabaseError(err, response, "Error en inserción de tipo ticket:");
            }
            registrarBitacora("Tipo ticket", "POST");
            logger.info("INSERT de tipo ticket - OK");
            response.json("INSERT EXITOSO!");
        });
    } catch (error) {
        console.error(error);
        response.status(400).json({ error: "Error al analizar el cuerpo de la solicitud JSON" });
    }
});

// Put update de tipo ticket
app.put('/api/tipo_ticket', (request, response) => {
    try {
        const {  tipo_ticket , estado, prefijo, id_tipo_ticket  } = request.body;
        const query = `
            UPDATE imple.tipo_ticket 
            SET tipo_ticket = ? , estado = ? , prefijo = ? WHERE id_tipo_ticket = ?
        `;
        const values = [nombre, modelo, marca, id_proveedor, fecha_adquisicion, estado, costo, ubicacion, id_maquinaria];
        conexion.query(query, values, (err) => {
            if (err) {
                return handleDatabaseError(err, response, "Error en actualización de tipo ticket:");
            }
            registrarBitacora("Tipo ticket", "PUT");
            logger.info("ACTUALIZACIÓN de tipo ticket - OK");
            response.json("UPDATE EXITOSO!");
        });
    } catch (error) {
        console.error(error);
        response.status(400).json({ error: "Error al analizar el cuerpo de la solicitud JSON" });
    }
});

// Delete de tipo ticket
app.delete('/api/tipo_ticket/:id', (request, response) => {
    const query = "DELETE FROM marina_mercante.tipo_ticket WHERE id_tipo_ticket = ?";
    const values = [parseInt(request.params.id)];
    conexion.query(query, values, (err) => {
        if (err) {
            return handleDatabaseError(err, response, "Error en eliminación de tipo ticket:");
        }
        registrarBitacora("tipo ticket", "DELETE");
        logger.info("DELETE de tipo ticket - OK");
        response.json("DELETE EXITOSO!");
    });
});

app.get('/api/ticket', (req, res) => {
    const query = "SELECT * FROM marina_mercante.ticket";
    conexion.query(query, (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al obtener ticket" });
        registrarBitacora("Ticket", "GET");
        res.json({ status: "success", data: rows });
    });
});

app.get('/api/ticket/:id', (req, res) => {
    const query = "SELECT * FROM marina_mercante.tl_ticket WHERE id_ticket = ?";
    const values = [parseInt(req.params.id)];
    conexion.query(query, values, (err, rows) => {
        if (err) return res.status(500).json({ error: "Error al obtener el ticket" });
        if (rows.length === 0) return res.status(404).json({ error: "Ticket no encontrado" });
        registrarBitacora("ticket", "GET");
        res.json({ status: "success", data: rows[0] });
    });
});

app.post('/api/ticket', (req, res) => {
    const { id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket } = req.body;
    if (!id_cliente || !id_estado_ticket || !id_tipo_ticket || !NO_ticket ) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const query = "INSERT INTO marina_mercante.tb_ticket (id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket) VALUES (?, ?, ?, ?)";
    const values = [id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket];
    conexion.query(query, values, (err, result) => {
        if (err) {
            console.error("Error al insertar ticket:", err.message);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: "El correo ya está registrado." });
            }
            return res.status(500).json({ error: err.message });
        }
        registrarBitacora("Ticket", "INSERT");
        res.status(201).json({ status: "success", message: "Ticket agregado con éxito", proveedor_id: result.insertId });
    });
});

app.put('/api/ticket/:id', (req, res) => {
    const { id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket } = req.body;
    const id_ticket = parseInt(req.params.id);
    if (!id_cliente || !id_estado_ticket || !id_tipo_ticket || !NO_ticket) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const query = "UPDATE proveedores SET  id_cliente= ?, id_estado_ticket = ?, id_tipo_ticket = ?, NO_ticket = ? WHERE id_ticket = ?";
    const values = [id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket];
    conexion.query(query, values, (err, result) => {
        if (err) {
            console.error("Error al actualizar ticket:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Ticket no encontrado" });
        }
        registrarBitacora("Ticket", "PUT");
        res.json({ status: "success", message: "Ticket actualizado con éxito" });
    });
});

app.delete('/api/ticket/:id', (req, res) => {
    const query = "DELETE FROM marina_mercante.tl_ticket WHERE id_ticket = ?";
    const values = [parseInt(req.params.id)];
    conexion.query(query, values, (err, result) => {
        if (err) {
            console.error("Error al eliminar ticket:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ticket no encontrado" });
        }
        registrarBitacora("Ticket", "DELETE");
        res.json({ status: "success", message: "Ticket eliminado con éxito" });
    });
});

// ====== CRUD PARA tl_visualizacion ======

// Listar todas las visualizaciones
app.get('/api/visualizaciones', (req, res) => {
  const query = "SELECT * FROM tbl_visualizacion";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar visualizaciones:", err);
      res.status(500).json({ error: "Error al listar visualizaciones" });
      return;
    }
    res.json(rows);
  });
});

// Obtener una visualización por ID
app.get('/api/visualizaciones/:id', (req, res) => {
  const query = "SELECT * FROM tbl_visualizacion WHERE id_visualizacion = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener visualización:", err);
      res.status(500).json({ error: "Error al obtener visualización" });
      return;
    }
    res.json(rows[0]);
  });
});

// Insertar una nueva visualización
app.post('/api/visualizaciones', (req, res) => {
  const { id_usuario, id_ticket, ventanilla } = req.body;
  const query = `
    INSERT INTO tbl_visualizacion (id_usuario, id_ticket, ventanilla)
    VALUES (?, ?, ?)
  `;
  conexion.query(query, [id_usuario, id_ticket, ventanilla], (err, result) => {
    if (err) {
      console.error("Error al insertar visualización:", err);
      res.status(500).json({ error: "Error al insertar visualización" });
      return;
    }
    res.json({ message: "Visualización insertada correctamente", id: result.insertId });
  });
});

// Actualizar una visualización
app.put('/api/visualizaciones/:id', (req, res) => {
  const { id_usuario, id_ticket, ventanilla } = req.body;
  const query = `
    UPDATE tbl_visualizacion
    SET id_usuario = ?, id_ticket = ?, ventanilla = ?
    WHERE id_visualizacion = ?
  `;
  conexion.query(query, [id_usuario, id_ticket, ventanilla, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar visualización:", err);
      res.status(500).json({ error: "Error al actualizar visualización" });
      return;
    }
    res.json({ message: "Visualización actualizada correctamente" });
  });
});

// Eliminar una visualización
app.delete('/api/visualizaciones/:id', (req, res) => {
  const query = "DELETE FROM tbl_visualizacion WHERE id_visualizacion = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar visualización:", err);
      res.status(500).json({ error: "Error al eliminar visualización" });
      return;
    }
    res.json({ message: "Visualización eliminada correctamente" });
  });
});

// GET /api/bitacora
app.get('/api/bitacora', (req, res) => {
  const { id_usuario } = req.query;

  conexion.query(
    'SELECT * FROM tbl_bitacora ORDER BY fecha ASC',
    (err, rows) => {
      if (err) {
        console.error('Error al listar la bitácora:', err);
        return res.status(500).json({ mensaje: 'Error al listar bitácora' });
      }
      // Registrar en bitácora
      if (id_usuario) {
        conexion.query(
          'CALL event_bitacora(?, ?, ?, ?)',
          [id_usuario, 14, 'CONSULTA', 'Se consultó la lista completa de la bitácora del sistema'],
          (e) => {
            if (e) console.error('Error bitácora (GET bitácoras):', e);
            return res.json(rows);
          }
        );
      } else {
        return res.json(rows);
      }
    }
  );
});

// GET /api/bitacora/:id
app.get('/api/bitacora/:id', (req, res) => {
  const { id_usuario } = req.query;
  const { id } = req.params;

  conexion.query(
    'SELECT * FROM tbl_bitacora WHERE id_bitacora = ?',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener bitácora:', err);
        return res.status(500).json({ error: 'Error al obtener bitácora' });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Registro de bitácora no encontrado' });
      }
      if (id_usuario) {
        conexion.query(
          'CALL event_bitacora(?, ?, ?, ?)',
          [id_usuario, 14, 'CONSULTA', `Se consultó la bitácora con ID ${id}`],
          (e) => {
            if (e) console.error('Error bitácora (GET bitácora por id):', e);
            return res.json(rows[0]);
          }
        );
      } else {
        return res.json(rows[0]);
      }
    }
  );
});

const SOLO_ALMACEN_O_ADMIN = autorizarRoles(
  "Administrador",
  "Guarda almacen",
  "Auxiliar de almacen"
);

// ============================
//  GET /api/productos
// ============================
app.get('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const user = req.user; 

  conexion.query("SELECT * FROM tbl_productos", (err, rows) => {
    if (err) {
      console.error("Error al listar productos:", err);
      return res.status(500).json({ error: "Error al listar productos" });
    }

    // Registrar en bitácora
    logBitacora(
      conexion,
      {
        id_objeto: ID_OBJETO_PRODUCTOS,
        id_usuario: user.id_usuario,
        accion: "GET",
        descripcion: "Se consultó la lista de productos",
        usuario: user.nombre_usuario,
      }
    );

    return res.json(rows);
  });
});


// ============================
//  GET /api/productos/:id
// ============================
app.get('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const user = req.user;
  const id = req.params.id;

  conexion.query("SELECT * FROM tbl_productos WHERE id_producto = ?", [id], (err, rows) => {
    if (err) {
      console.error("Error al obtener producto:", err);
      return res.status(500).json({ error: "Error al obtener producto" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Registrar en bitácora
    logBitacora(
      conexion,
      {
        id_objeto: ID_OBJETO_PRODUCTOS,
        id_usuario: user.id_usuario,
        accion: "GET",
        descripcion: `Se consultó el producto id=${id}`,
        usuario: user.nombre_usuario,
      }
    );

    return res.json(rows[0]);
  });
});


// ============================
//  POST /api/productos
// ============================
app.post('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima } = req.body;
  const user = req.user;

  if (!nombre_producto || cantidad_minima == null || cantidad_maxima == null) {
    return res.status(400).json({
      error: "nombre_producto, cantidad_minima y cantidad_maxima son obligatorios"
    });
  }

  const sql = `
    INSERT INTO tbl_productos (nombre_producto, cantidad_minima, cantidad_maxima)
    VALUES (?, ?, ?)
  `;

  conexion.query(
    sql,
    [nombre_producto.trim(), Number(cantidad_minima), Number(cantidad_maxima)],
    (err, result) => {
      if (err) {
        console.error("Error al insertar producto:", err);
        return res.status(500).json({ error: "Error al insertar producto" });
      }

      // Registrar en bitácora
      logBitacora(
        conexion,
        {
          id_objeto: ID_OBJETO_PRODUCTOS,
          id_usuario: user.id_usuario,
          accion: "POST",
          descripcion: `Se creó el producto id=${result.insertId} (${nombre_producto})`,
          usuario: user.nombre_usuario,
        }
      );

      return res.status(201).json({
        message: "Producto insertado correctamente",
        id: result.insertId
      });
    }
  );
});


// ============================
//  PUT /api/productos/:id
// ============================
app.put('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima } = req.body;
  const id = req.params.id;
  const user = req.user;

  const campos = [];
  const valores = [];

  if (nombre_producto !== undefined) {
    campos.push("nombre_producto = ?");
    valores.push(nombre_producto.trim());
  }
  if (cantidad_minima !== undefined) {
    campos.push("cantidad_minima = ?");
    valores.push(Number(cantidad_minima));
  }
  if (cantidad_maxima !== undefined) {
    campos.push("cantidad_maxima = ?");
    valores.push(Number(cantidad_maxima));
  }

  if (campos.length === 0) {
    return res.status(400).json({ error: "Nada que actualizar" });
  }

  const sql = `UPDATE tbl_productos SET ${campos.join(", ")} WHERE id_producto = ?`;
  valores.push(id);

  conexion.query(sql, valores, (err, result) => {
    if (err) {
      console.error("Error al actualizar producto:", err);
      return res.status(500).json({ error: "Error al actualizar producto" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Registrar en bitácora
    logBitacora(
      conexion,
      {
        id_objeto: ID_OBJETO_PRODUCTOS,
        id_usuario: user.id_usuario,
        accion: "PUT",
        descripcion: `Se actualizó producto id=${id}`,
        usuario: user.nombre_usuario,
      }
    );

    return res.json({ message: "Producto actualizado correctamente" });
  });
});


// ============================
//  DELETE /api/productos/:id
// ============================
app.delete('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const id = req.params.id;
  const user = req.user;

  conexion.query("DELETE FROM tbl_productos WHERE id_producto = ?", [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar producto:", err);
      return res.status(500).json({ error: "Error al eliminar producto" });
    }

    // Registrar en bitácora
    logBitacora(
      conexion,
      {
        id_objeto: ID_OBJETO_PRODUCTOS,
        id_usuario: user.id_usuario,
        accion: "DELETE",
        descripcion: `Se eliminó producto id=${id}`,
        usuario: user.nombre_usuario,
      }
    );

    return res.json({ message: "Producto eliminado correctamente" });
  });
});

//tabla kardex 
//Get listado kardex

app.get('/api/kardex', (req, res) => {
  const query = "SELECT * FROM tbl_kardex";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar kardex:", err);
      res.status(500).json({ error: "Error al listar kardex" });
      return;
    }
    res.json(rows);
  });
});

//Get por el ID
app.get('/api/kardex/:id', (req, res) => {
  const query = "SELECT * FROM tbl_kardex WHERE id_cardex = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener el kardex:", err);
      res.status(500).json({ error: "Error al obtener kardex" });
      return;
    }
    res.json(rows[0]);
  });
});

//Post para kardex
app.post('/api/kardex', (req, res) => {
  const { id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento } = req.body;
  const query = "INSERT INTO tbl_kardex ( id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento) VALUES (?, ?, ?, ?, ?)";
  conexion.query(query, [ id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento], (err, result) => {
    if (err) {
      console.error("Error al insertar al kardex:", err);
      res.status(500).json({ error: "Error al insertar al kardex" });
      return;
    }
    res.json({ message: "Kardex insertado correctamente", id: result.insertId });
  });
});

//Actualizar el kardex
app.put('/api/kardex/:id', (req, res) => {
  const {  id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento } = req.body;
  const query = "UPDATE tbl_kardex SET  id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento = ?, ?, ?, ?, ? WHERE id_cardex = ?";
  conexion.query(query, [id_usuario, id_producto, cantidad, fecha_hora, tipo_movimiento, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar kardex:", err);
      res.status(500).json({ error: "Error al actualizar kardex" });
      return;
    }
    res.json({ message: "Kardex actualizado correctamente" });
  });
});

//Eliminar kardex
app.delete('/api/kardex/:id', (req, res) => {
  const query = "DELETE FROM tbl_kardex WHERE id_cardex = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar kardex:", err);
      res.status(500).json({ error: "Error al eliminar kardex" });
      return;
    }
    res.json({ message: "Kardex eliminado correctamente" });
  });
});

// ====== CRUD PARA tl_salida_productos ======
// Listar todas las salidas de productos
app.get('/api/salidas_productos', (req, res) => {
  const query = "SELECT * FROM tbl_salida_productos";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar salidas de productos:", err);
      res.status(500).json({ error: "Error al listar salidas de productos" });
      return;
    }
    res.json(rows);
  });
});

// Obtener una salida por ID
app.get('/api/salidas_productos/:id', (req, res) => {
  const query = "SELECT * FROM tbl_salida_productos WHERE id_salida_producto = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener salida de producto:", err);
      res.status(500).json({ error: "Error al obtener salida de producto" });
      return;
    }
    res.json(rows[0]);
  });
});

// Insertar una nueva salida de producto (fecha automática)
app.post('/api/salidas_productos', (req, res) => {
  const { id_usuario } = req.body;
  const query = `
    INSERT INTO tbl_salida_productos (id_usuario, fecha_salida)
    VALUES (?, NOW())
  `;
  conexion.query(query, [id_usuario], (err, result) => {
    if (err) {
      console.error("Error al insertar salida de producto:", err);
      res.status(500).json({ error: "Error al insertar salida de producto" });
      return;
    }
    res.json({ message: "Salida de producto insertada correctamente", id: result.insertId });
  });
});

// Actualizar una salida de producto
app.put('/api/salidas_productos/:id', (req, res) => {
  const { id_usuario } = req.body;
  const query = `
    UPDATE tbl_salida_productos
    SET id_usuario = ?, fecha_salida = NOW()
    WHERE id_salida_producto = ?
  `;
  conexion.query(query, [id_usuario, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar salida de producto:", err);
      res.status(500).json({ error: "Error al actualizar salida de producto" });
      return;
    }
    res.json({ message: "Salida de producto actualizada correctamente" });
  });
});

// Eliminar una salida de producto
app.delete('/api/salidas_productos/:id', (req, res) => {
  const query = "DELETE FROM tbl_salida_productos WHERE id_salida_producto = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar salida de producto:", err);
      res.status(500).json({ error: "Error al eliminar salida de producto" });
      return;
    }
    res.json({ message: "Salida de producto eliminada correctamente" });
  });
});

//Get tl_inventario
// Rutas de inventario 
// ====== CRUD PARA tl_inventario ======

app.get('/api/inventario', (req, res) => {
  const query = "SELECT * FROM tbl_inventario";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar el inventario:", err);
      res.status(500).json({ error: "Error al listar el inventario" });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/inventario/:id', (req, res) => {
  const query = "SELECT * FROM tbl_inventario WHERE id_inventario = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener el inventario:", err);
      res.status(500).json({ error: "Error al obtener el inventario" });
      return;
    }
    res.json(rows[0]);
  });
});

app.post('/api/inventario', (req, res) => {
  const { estado } = req.body;
  const query = "INSERT INTO tbl_inventario (estado) VALUES (?)";
  conexion.query(query, [estado], (err, result) => {
    if (err) {
      console.error("Error al insertar el inventario:", err);
      res.status(500).json({ error: "Error al insertar el inventario" });
      return;
    }
    res.json({ message: "Invetario insertado correctamente", id: result.insertId });
  });
});

app.put('/api/inventario/:id', (req, res) => {
  const { estado } = req.body;
  const query = "UPDATE tbl_inventario SET estado = ? WHERE id_inventario = ?";
  conexion.query(query, [estado, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar el inventario:", err);
      res.status(500).json({ error: "Error al actualizar el inventario" });
      return;
    }
    res.json({ message: "Inventario actualizado correctamente" });
  });
});

app.delete('/api/inventario/:id', (req, res) => {
  const query = "DELETE FROM tbl_inventario WHERE id_inventario = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar el Inventario:", err);
      res.status(500).json({ error: "Error al eliminar el Inventario" });
      return;
    }
    res.json({ message: "Inventario eliminado correctamente" });
  });
});

// =============== CONFIGURACIÓN BITÁCORA ===============
const ID_OBJETO_PRODUCTOS = 6;


// =============== INSERTAR PRODUCTO (SP_InsertarProducto) ===============
app.post('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima, descripcion } = req.body;
  const user = req.user;

  if (!nombre_producto) {
    return res.status(400).json({ error: "El nombre del producto es obligatorio" });
  }

  const query = "CALL SP_InsertarProducto(?, ?, ?, ?)";
  const values = [nombre_producto, cantidad_minima, cantidad_maxima, descripcion];

  conexion.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al insertar producto con SP:", err);
      return res.status(500).json({ error: err.message || "Error al insertar producto" });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PRODUCTOS,
      id_usuario: user.id_usuario,
      accion: "POST",
      descripcion: `SP_InsertarProducto: Se creó el producto "${nombre_producto}"`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Producto insertado correctamente mediante SP" });
  });
});


// =============== ACTUALIZAR PRODUCTO (SP_ActualizarProducto) ===============
app.put('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima, descripcion } = req.body;
  const id_producto = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_ActualizarProducto(?, ?, ?, ?, ?)";
  const values = [id_producto, nombre_producto, cantidad_minima, cantidad_maxima, descripcion];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar producto con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar producto" });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PRODUCTOS,
      id_usuario: user.id_usuario,
      accion: "PUT",
      descripcion: `SP_ActualizarProducto: Se actualizó producto ID=${id_producto}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Producto actualizado correctamente mediante SP" });
  });
});


// =============== ELIMINAR PRODUCTO (SP_EliminarProducto) ===============
app.delete('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const id_producto = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_EliminarProducto(?)";

  conexion.query(query, [id_producto], (err) => {
    if (err) {
      console.error("Error al eliminar producto con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar producto" });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PRODUCTOS,
      id_usuario: user.id_usuario,
      accion: "DELETE",
      descripcion: `SP_EliminarProducto: Se eliminó producto ID=${id_producto}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Producto eliminado correctamente mediante SP" });
  });
});


// =============== MOSTRAR PRODUCTOS (SP_MostrarProductos) ===============
app.get('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, (req, res) => {
  const user = req.user;
  const query = "CALL SP_MostrarProductos()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar productos con SP:", err);
      return res.status(500).json({ error: "Error al listar productos" });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PRODUCTOS,
      id_usuario: user.id_usuario,
      accion: "GET",
      descripcion: `SP_MostrarProductos: Se consultó listado de productos`,
      usuario: user.nombre_usuario
    });

    res.json(results[0]);  // SP retorna arrays internos
  });
});


// ==========================
//  CONFIGURACIÓN BITÁCORA
// ==========================
const ID_OBJETO_PROVEEDOR = 2;


// ==========================
//  INSERTAR PROVEEDOR (SP)
// ==========================
app.post('/api/proveedor', verificarToken, (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  const user = req.user;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre del proveedor es obligatorio" });
  }

  const query = "CALL SP_InsertarProveedor(?, ?, ?)";
  const values = [nombre, telefono, direccion];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al insertar proveedor:", err);
      return res.status(500).json({ error: err.message });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PROVEEDOR,
      id_usuario: user.id_usuario,
      accion: "POST",
      descripcion: `SP_InsertarProveedor: Se creó proveedor "${nombre}"`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Proveedor insertado correctamente mediante SP" });
  });
});


// ==========================
//  ACTUALIZAR PROVEEDOR (SP)
// ==========================
app.put('/api/proveedor/:id', verificarToken, (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  const id_proveedor = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_ActualizarProveedor(?, ?, ?, ?)";
  const values = [id_proveedor, nombre, telefono, direccion];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar proveedor:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PROVEEDOR,
      id_usuario: user.id_usuario,
      accion: "PUT",
      descripcion: `SP_ActualizarProveedor: Se actualizó proveedor ID=${id_proveedor}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Proveedor actualizado correctamente mediante SP" });
  });
});


// ==========================
//  ELIMINAR PROVEEDOR (SP)
// ==========================
app.delete('/api/proveedor/:id', verificarToken, (req, res) => {
  const id_proveedor = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_EliminarProveedor(?)";

  conexion.query(query, [id_proveedor], (err) => {
    if (err) {
      console.error("Error al eliminar proveedor:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PROVEEDOR,
      id_usuario: user.id_usuario,
      accion: "DELETE",
      descripcion: `SP_EliminarProveedor: Se eliminó proveedor ID=${id_proveedor}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Proveedor eliminado correctamente mediante SP" });
  });
});


// ==========================
//  MOSTRAR PROVEEDORES (SP)
// ==========================
app.get('/api/proveedor', verificarToken, (req, res) => {
  const user = req.user;
  const query = "CALL SP_MostrarProveedores()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar proveedores:", err);
      return res.status(500).json({ error: "Error al listar proveedores" });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_PROVEEDOR,
      id_usuario: user.id_usuario,
      accion: "GET",
      descripcion: `SP_MostrarProveedores: Se consultó listado de proveedores`,
      usuario: user.nombre_usuario
    });

    res.json(results[0]);
  });
});

// ==========================
//  CONFIGURACIÓN BITÁCORA
// ==========================
const ID_OBJETO_INVENTARIO = 5;

// ==========================
//  INSERTAR INVENTARIO (SP)
// ==========================
app.post('/api/inventario', verificarToken, (req, res) => {
  const { id_producto, cantidad } = req.body;
  const user = req.user;

  if (!id_producto) {
    return res.status(400).json({ error: "El producto es obligatorio" });
  }

  const query = "CALL SP_InsertarInventario(?, ?)";
  const values = [id_producto, cantidad];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al insertar inventario:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_INVENTARIO,
      id_usuario: user.id_usuario,
      accion: "POST",
      descripcion: `SP_InsertarInventario: Se agregó inventario del producto ID=${id_producto}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Inventario insertado correctamente mediante SP" });
  });
});


// ==========================
//  ACTUALIZAR INVENTARIO (SP)
// ==========================
app.put('/api/inventario/:id', verificarToken, (req, res) => {
  const { cantidad } = req.body;
  const id_inventario = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_ActualizarInventario(?, ?)";
  const values = [id_inventario, cantidad];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar inventario:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_INVENTARIO,
      id_usuario: user.id_usuario,
      accion: "PUT",
      descripcion: `SP_ActualizarInventario: Se actualizó inventario ID=${id_inventario}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Inventario actualizado correctamente mediante SP" });
  });
});


// ==========================
//  ELIMINAR INVENTARIO (SP)
// ==========================
app.delete('/api/inventario/:id', verificarToken, (req, res) => {
  const id_inventario = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_EliminarInventario(?)";

  conexion.query(query, [id_inventario], (err) => {
    if (err) {
      console.error("Error al eliminar inventario:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_INVENTARIO,
      id_usuario: user.id_usuario,
      accion: "DELETE",
      descripcion: `SP_EliminarInventario: Se eliminó inventario ID=${id_inventario}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Inventario eliminado correctamente mediante SP" });
  });
});


// ==========================
//  MOSTRAR INVENTARIO (SP)
// ==========================
app.get('/api/inventario', verificarToken, (req, res) => {
  const user = req.user;
  const query = "CALL SP_MostrarInventario()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar inventario:", err);
      return res.status(500).json({ error: "Error al listar inventario" });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_INVENTARIO,
      id_usuario: user.id_usuario,
      accion: "GET",
      descripcion: `SP_MostrarInventario: Se consultó inventario`,
      usuario: user.nombre_usuario
    });

    res.json(results[0]);
  });
});


// =============================
//  BITÁCORA - CONFIG
// =============================
const ID_OBJETO_KARDEX = 7;
const ID_OBJETO_DETALLE_COMPRA = 8;


// =============================
//  INSERTAR KARDEX (SP)
// =============================
app.post('/api/kardex', verificarToken, (req, res) => {
  const { 
    id_producto, cantidad, tipo_movimiento, estado, descripcion, id_proveedor, monto_total
  } = req.body;

  const user = req.user;

  if (!id_producto || !cantidad || !tipo_movimiento) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const query = "CALL SP_InsertarKardex(?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [
    user.id_usuario,
    id_producto,
    cantidad,
    tipo_movimiento,
    estado || 'Pendiente',
    descripcion,
    id_proveedor || null,
    monto_total || null
  ];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al insertar kardex:", err);
      return res.status(500).json({ error: err.message });
    }

    // BITÁCORA
    logBitacora(conexion, {
      id_objeto: ID_OBJETO_KARDEX,
      id_usuario: user.id_usuario,
      accion: "POST",
      descripcion: `SP_InsertarKardex: Movimiento de ${tipo_movimiento} para producto ID=${id_producto}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Kardex insertado correctamente mediante SP" });
  });
});


// =============================
//  ACTUALIZAR KARDEX (SP)
// =============================
app.put('/api/kardex/:id', verificarToken, (req, res) => {
  const { estado } = req.body;
  const id_kardex = parseInt(req.params.id);
  const user = req.user;

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio" });
  }

  const query = "CALL SP_ActualizarKardex(?, ?)";
  const values = [id_kardex, estado];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar kardex:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_KARDEX,
      id_usuario: user.id_usuario,
      accion: "PUT",
      descripcion: `SP_ActualizarKardex: Cambio de estado a "${estado}" del kardex ID=${id_kardex}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Kardex actualizado correctamente mediante SP" });
  });
});


// =============================
//  ELIMINAR KARDEX (SP)
// =============================
app.delete('/api/kardex/:id', verificarToken, (req, res) => {
  const id_kardex = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_EliminarKardex(?)";

  conexion.query(query, [id_kardex], (err) => {
    if (err) {
      console.error("Error al eliminar kardex:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_KARDEX,
      id_usuario: user.id_usuario,
      accion: "DELETE",
      descripcion: `SP_EliminarKardex: Se eliminó kardex ID=${id_kardex}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Kardex eliminado correctamente mediante SP" });
  });
});


// =============================
//  MOSTRAR KARDEX (SP)
// =============================
app.get('/api/kardex', verificarToken, (req, res) => {
  const user = req.user;

  const query = "CALL SP_MostrarKardex()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar kardex:", err);
      return res.status(500).json({ error: "Error al listar kardex" });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_KARDEX,
      id_usuario: user.id_usuario,
      accion: "GET",
      descripcion: "SP_MostrarKardex: Consulta del kardex general",
      usuario: user.nombre_usuario
    });

    res.json(results[0]);
  });
});

// =============================
//  INSERTAR DETALLE DE COMPRA (SP)
// =============================
app.post('/api/detalle_compra', verificarToken, (req, res) => {
  const { id_kardex, id_proveedor, monto_total } = req.body;
  const user = req.user;

  if (!id_kardex || !id_proveedor || !monto_total) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const query = "CALL SP_InsertarDetalleCompra(?, ?, ?)";
  const values = [id_kardex, id_proveedor, monto_total];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al insertar detalle compra:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_DETALLE_COMPRA,
      id_usuario: user.id_usuario,
      accion: "POST",
      descripcion: `SP_InsertarDetalleCompra: Kardex=${id_kardex}, Proveedor=${id_proveedor}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Detalle de compra insertado correctamente mediante SP" });
  });
});


// =============================
//  ACTUALIZAR DETALLE DE COMPRA (SP)
// =============================
app.put('/api/detalle_compra/:id', verificarToken, (req, res) => {
  const { monto_total } = req.body;
  const id_detalle = parseInt(req.params.id);
  const user = req.user;

  if (!monto_total) {
    return res.status(400).json({ error: "El monto total es obligatorio" });
  }

  const query = "CALL SP_ActualizarDetalleCompra(?, ?)";
  const values = [id_detalle, monto_total];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar detalle compra:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_DETALLE_COMPRA,
      id_usuario: user.id_usuario,
      accion: "PUT",
      descripcion: `SP_ActualizarDetalleCompra: ID=${id_detalle}, nuevo monto=${monto_total}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Detalle de compra actualizado correctamente mediante SP" });
  });
});


// =============================
//  ELIMINAR DETALLE DE COMPRA (SP)
// =============================
app.delete('/api/detalle_compra/:id', verificarToken, (req, res) => {
  const id_detalle = parseInt(req.params.id);
  const user = req.user;

  const query = "CALL SP_EliminarDetalleCompra(?)";

  conexion.query(query, [id_detalle], (err) => {
    if (err) {
      console.error("Error al eliminar detalle compra:", err);
      return res.status(500).json({ error: err.message });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_DETALLE_COMPRA,
      id_usuario: user.id_usuario,
      accion: "DELETE",
      descripcion: `SP_EliminarDetalleCompra: Se eliminó detalle_compra ID=${id_detalle}`,
      usuario: user.nombre_usuario
    });

    res.json({ mensaje: "Detalle de compra eliminado correctamente mediante SP" });
  });
});


// =============================
//  MOSTRAR DETALLE DE COMPRA (SP)
// =============================
app.get('/api/detalle_compra', verificarToken, (req, res) => {
  const user = req.user;

  const query = "CALL SP_MostrarDetalleCompra()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar detalle compra:", err);
      return res.status(500).json({ error: "Error al listar detalle compra" });
    }

    logBitacora(conexion, {
      id_objeto: ID_OBJETO_DETALLE_COMPRA,
      id_usuario: user.id_usuario,
      accion: "GET",
      descripcion: "SP_MostrarDetalleCompra: Consulta de detalle de compra",
      usuario: user.nombre_usuario
    });

    res.json(results[0]);
  });
});

// ===== 404 =====
app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));
