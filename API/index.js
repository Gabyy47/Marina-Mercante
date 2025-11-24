// ===== Dependencias =====
var Express = require("express");
var bodyParser = require("body-parser"); 
var cors = require("cors");
const mysql = require('mysql2');
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
var speakeasy = require("speakeasy");
var QRCode = require("qrcode"); 

//Importar ruta para conexión de BD
const DB_CONFIG = require("./dbConfig");

//Importar rutas para backup
const backupRoutes = require("./backupRoutes"); 

// ===== Inicio de Express.js =====
var app = Express();

// ===== CONFIGURACIÓN Y ENVÍO DE CORREOS =====
require('dotenv').config({
  path: __dirname + '/.env',
});
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

const conexion = mysql.createConnection(DB_CONFIG);
// o createPool(DB_CONFIG) si usas pool

conexion.connect((err) => {
  if (err) {
    console.error("Error de conexión a BD:", err);
  } else {
    console.log("Conectado a BD");
  }
});


// ====== Helper de permisos por rol/objeto ======
function autorizarPermiso(nombreObjeto, accion) {
  // accion: 'insertar' | 'actualizar' | 'eliminar' | 'consultar'
  const mapCol = {
    insertar: "puede_insertar",
    actualizar: "puede_actualizar",
    eliminar: "puede_eliminar",
    consultar: "puede_consultar",
  };

  const col = mapCol[accion];
  if (!col) {
    throw new Error(`Acción de permiso desconocida: ${accion}`);
  }

  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }

    const idRol = user.id_rol;
    if (!idRol) {
      return res.status(403).json({ mensaje: "Rol no definido en el token" });
    }

    // IMPORTANTE: nombreObjeto debe coincidir EXACTO con la columna nombre_objeto de tbl_objeto
    const sql = `
      SELECT p.${col} AS permitido
      FROM tbl_permiso p
      INNER JOIN tbl_objeto o ON o.id_objeto = p.id_objeto
      WHERE p.id_rol = ?
        AND o.nombre_objeto = ?
        AND p.${col} = 1
      LIMIT 1
    `;

    conexion.query(sql, [idRol, nombreObjeto], (err, rows) => {
      if (err) {
        console.error("Error consultando permisos:", err);
        return res.status(500).json({ mensaje: "Error verificando permisos" });
      }

      if (!rows || rows.length === 0) {
        return res.status(403).json({
          mensaje: `No tiene permiso para ${accion} en ${nombreObjeto}`,
        });
      }

      // Tiene permiso
      next();
    });
  };
}

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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
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

// === usar las rutas de backup 
app.use("/api", backupRoutes); 

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

// 1. Listar objetos
app.get("/api/objetos", verificarToken, autorizarRoles("Administrador"), (req, res) => {
  const sql = "SELECT id_objeto, nombre_objeto FROM tbl_objeto WHERE estado = 'ACTIVO'";
  conexion.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al listar objetos" });
    res.json(rows);
  });
});

// 2. Listar permisos de un rol
app.get("/api/seguridad/permisos", verificarToken, autorizarRoles("Administrador"), (req, res) => {
  const id_rol = req.query.id_rol;
  const sql = `
    SELECT id_permiso, id_rol, id_objeto,
           puede_insertar, puede_eliminar, puede_actualizar, puede_consultar
    FROM tbl_permiso
    WHERE id_rol = ?
  `;
  conexion.query(sql, [id_rol], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al listar permisos" });
    res.json(rows);
  });
});

// 3. Guardar permisos de un rol (sobreescribe todo)
app.post("/api/seguridad/permisos/guardar", verificarToken, autorizarRoles("Administrador"), (req, res) => {
  const { id_rol, permisos } = req.body;

  if (!id_rol || !Array.isArray(permisos)) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  // Borramos los permisos actuales del rol y metemos los nuevos
  const deleteSql = "DELETE FROM tbl_permiso WHERE id_rol = ?";
  conexion.query(deleteSql, [id_rol], (err) => {
    if (err) return res.status(500).json({ mensaje: "Error al limpiar permisos" });

    if (permisos.length === 0) {
      return res.json({ mensaje: "Permisos actualizados (lista vacía)" });
    }

    const insertSql = `
      INSERT INTO tbl_permiso
        (id_rol, id_objeto, puede_insertar, puede_eliminar, puede_actualizar, puede_consultar)
      VALUES ?
    `;

    const values = permisos.map((p) => [
      id_rol,
      p.id_objeto,
      p.puede_insertar,
      p.puede_eliminar,
      p.puede_actualizar,
      p.puede_consultar,
    ]);

    conexion.query(insertSql, [values], (err2) => {
      if (err2) return res.status(500).json({ mensaje: "Error al guardar permisos" });
      res.json({ mensaje: "Permisos actualizados correctamente" });
    });
  });
});

// =========================================
// PARÁMETROS DE SEGURIDAD - LISTAR TODOS
// Solo Administrador
// GET /api/seguridad/parametros
// =========================================
app.get(
  "/api/seguridad/parametros",
  verificarToken,
  autorizarRoles("Administrador"),
  (req, res) => {
    const sql = `
      SELECT 
        id_parametro,
        codigo,
        nombre,
        valor,
        descripcion,
        estado
      FROM tbl_parametro_seguridad
      WHERE estado = 'ACTIVO'
      ORDER BY id_parametro
    `;

    conexion.query(sql, (err, rows) => {
      if (err) {
        console.error("Error al listar parámetros de seguridad:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al listar parámetros de seguridad" });
      }
      return res.json(rows);
    });
  }
);

// =========================================
// OBTENER UN PARÁMETRO POR CÓDIGO
// GET /api/seguridad/parametros/:codigo
// =========================================
app.get(
  "/api/seguridad/parametros/:codigo",
  verificarToken,
  autorizarRoles("Administrador"),
  (req, res) => {
    const { codigo } = req.params;

    const sql = `
      SELECT 
        id_parametro,
        codigo,
        nombre,
        valor,
        descripcion,
        estado
      FROM tbl_parametro_seguridad
      WHERE codigo = ?
      LIMIT 1
    `;

    conexion.query(sql, [codigo], (err, rows) => {
      if (err) {
        console.error("Error al obtener parámetro de seguridad:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al obtener parámetro de seguridad" });
      }

      if (rows.length === 0) {
        return res.status(404).json({ mensaje: "Parámetro no encontrado" });
      }

      return res.json(rows[0]);
    });
  }
);

// =========================================
// ACTUALIZAR PARÁMETRO POR CÓDIGO
// PUT /api/seguridad/parametros/:codigo
// body: { valor: "nuevoValor" }
// =========================================
app.put(
  "/api/seguridad/parametros/:codigo",
  verificarToken,
  autorizarRoles("Administrador"),
  (req, res) => {
    const { codigo } = req.params;
    const { valor } = req.body;

    if (valor === undefined || valor === null || valor === "") {
      return res
        .status(400)
        .json({ mensaje: "El valor del parámetro es obligatorio" });
    }

    const sql = `
      UPDATE tbl_parametro_seguridad
      SET valor = ?
      WHERE codigo = ?
    `;

    conexion.query(sql, [valor, codigo], (err, result) => {
      if (err) {
        console.error("Error al actualizar parámetro de seguridad:", err);
        return res
          .status(500)
          .json({ mensaje: "Error al actualizar parámetro de seguridad" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Parámetro no encontrado" });
      }

      return res.json({ mensaje: "Parámetro actualizado correctamente" });
    });
  }
);


// ====== CRUD PARA tbl_rol ======

// Listar roles
app.get("/api/roles", verificarToken, autorizarRoles("Administrador"),async (req, res) => {
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
// Listar todos los usuarios con nombre del rol
app.get("/api/usuario", async (req, res) => {
  const { id_usuario } = req.query;

  try {
    const [rows] = await conexion.promise().query(`
      SELECT 
        u.*, 
        r.nombre AS rol_nombre
      FROM tbl_usuario u
      LEFT JOIN tbl_rol r ON u.id_rol = r.id_rol
      ORDER BY u.id_usuario DESC
    `);

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



// === helpers 

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

// ===== ENVIAR CÓDIGO DE VERIFICACIÓN =====
app.post('/api/enviar', (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ mensaje: 'correo es requerido' });
  }

  // Buscar usuario
  const qUser = `
    SELECT id_usuario, nombre, is_verified 
    FROM tbl_usuario 
    WHERE correo = ? 
    LIMIT 1
  `;

  conexion.query(qUser, [correo], (err, rows) => {
    if (err) {
      return handleDatabaseError(err, res, 'Error al buscar usuario:');
    }

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const u = rows[0];

    // Si ya está verificado -> no reenviar código
    if (u.is_verified) {
      return res.json({ mensaje: 'El correo ya está verificado.' });
    }

    // Marcar tokens anteriores como usados (por seguridad)
    const qMarkUsed = `
      UPDATE verificar_email_tokens 
      SET used = 1 
      WHERE id_usuario = ?
    `;

    conexion.query(qMarkUsed, [u.id_usuario], (err2) => {
      if (err2) {
        return handleDatabaseError(err2, res, 'Error al invalidar tokens anteriores:');
      }

      // Generar nuevo código y expiración
      const code = gen6Code();
      const code_hash = hashCode(code);
      const expires_at = new Date(Date.now() + 15 * 60 * 1000);

      // Guardar nuevo token
      const qTok = `
        INSERT INTO verificar_email_tokens
          (id_usuario, token_hash, expires_at, created_at, used)
        VALUES (?, ?, ?, NOW(), 0)
      `;

      conexion.query(qTok, [u.id_usuario, code_hash, expires_at], async (err3) => {
        if (err3) {
          return handleDatabaseError(err3, res, 'Error al crear el nuevo token:');
        }

        // ENVIAR EL CORREO 
        try {
          await SendVerifyMail({
            to: correo,
            name: u.nombre,
            code
          });

          console.log(`Código enviado a ${correo}: ${code}`);

          return res.json({
            mensaje: 'Se envió un código de verificación al correo proporcionado.'
          });

        } catch (e) {
          console.error(' Error enviando correo:', e);
          return res.status(500).json({
            mensaje: 'No se pudo enviar el código al correo.'
          });
        }
      });
    });
  });
});

// ===== Insertar nuevo usuario (rol opcional; por defecto sin rol) =====
app.post("/api/usuario", verificarToken, autorizarRoles("Administrador"),  (req, res) => {
  const {         
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

// ===== REENVIAR CÓDIGO DE VERIFICACIÓN =====
app.post("/api/reenviar", (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ mensaje: "correo es requerido" });
  }

  const qUser = `
    SELECT id_usuario, nombre, is_verified
    FROM tbl_usuario
    WHERE correo = ?
    LIMIT 1
  `;

  conexion.query(qUser, [correo], (err, rows) => {
    if (err) {
      return handleDatabaseError(err, res, "Error al buscar usuario:");
    }

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const u = rows[0];

    // Si ya está verificado, no tiene sentido reenviar
    if (u.is_verified) {
      return res.json({ mensaje: "El correo ya está verificado." });
    }

    // Marcar tokens anteriores como usados (por seguridad)
    const qMarkUsed = `
      UPDATE verificar_email_tokens
      SET used = 1
      WHERE id_usuario = ?
    `;

    conexion.query(qMarkUsed, [u.id_usuario], (err2) => {
      if (err2) {
        return handleDatabaseError(
          err2,
          res,
          "Error al invalidar tokens anteriores:"
        );
      }

      // Generar nuevo código y expiración
      const code = gen6Code();
      const code_hash = hashCode(code);
      const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      // Guardar nuevo token (used = 0)
      const qTok = `
        INSERT INTO verificar_email_tokens
          (id_usuario, token_hash, expires_at, created_at, used)
        VALUES (?, ?, ?, NOW(), 0)
      `;

      conexion.query(
        qTok,
        [u.id_usuario, code_hash, expires_at],
        async (err3) => {
          if (err3) {
            return handleDatabaseError(
              err3,
              res,
              "Error al crear nuevo token:"
            );
          }

          // Enviar correo 
          try {
            await SendVerifyMail({
              to: correo,
              name: u.nombre,
              code,
            });

            console.log(`Nuevo código reenviado a ${correo}: ${code}`);

            return res.json({
              mensaje: "Se envió un nuevo código de verificación al correo proporcionado.",
            });
          } catch (e) {
            console.error("Error enviando correo:", e);
            return res.status(500).json({
              mensaje: "No se pudo enviar el código al correo.",
            });
          }
        }
      );
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


// =======================================================
// =================== Visualización =====================
// =======================================================
app.get('/api/visualizaciones', (req, res) => {
  const query = "SELECT * FROM tbl_visualizacion";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar visualizaciones:", err);
      return res.status(500).json({ error: "Error al listar visualizaciones" });
    }
    res.json(rows);
  });
});

app.get('/api/visualizaciones/:id', (req, res) => {
  const query = "SELECT * FROM tbl_visualizacion WHERE id_visualizacion = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener visualización:", err);
      return res.status(500).json({ error: "Error al obtener visualización" });
    }
    res.json(rows[0] || null);
  });
});

app.post('/api/visualizaciones', (req, res) => {
  const { id_usuario, id_ticket, ventanilla } = req.body;
  const query = `
    INSERT INTO tbl_visualizacion (id_usuario, id_ticket, ventanilla)
    VALUES (?, ?, ?)
  `;
  conexion.query(query, [id_usuario, id_ticket, ventanilla], (err, result) => {
    if (err) {
      console.error("Error al insertar visualización:", err);
      return res.status(500).json({ error: "Error al insertar visualización" });
    }
    res.json({ message: "Visualización insertada correctamente", id: result.insertId });
  });
});

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
      return res.status(500).json({ error: "Error al actualizar visualización" });
    }
    res.json({ message: "Visualización actualizada correctamente" });
  });
});

app.delete('/api/visualizaciones/:id', (req, res) => {
  const query = "DELETE FROM tbl_visualizacion WHERE id_visualizacion = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar visualización:", err);
      return res.status(500).json({ error: "Error al eliminar visualización" });
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


// ====== CRUD PARA tbl_inventario ======

app.get('/api/inventario', (req, res) => {
  const query = `
    SELECT 
      i.id_inventario,
      i.id_producto,
      p.nombre_producto,
      i.cantidad as cantidad_actual,          
      i.cantidad_minima as stock_minimo,      
      i.cantidad_maxima as stock_maximo       
    FROM tbl_inventario i
    JOIN tbl_productos p ON i.id_producto = p.id_producto
  `;

  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar el inventario:", err);
      return res.status(500).json({ error: "Error al listar el inventario" });
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
app.post('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Productos", "insertar"), (req, res) => {
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
app.put('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Productos", "actualizar"), (req, res) => {
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
app.delete('/api/productos/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Productos", "eliminar"), (req, res) => {
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
app.get('/api/productos', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Productos", "consultar"), (req, res) => {
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
app.post('/api/proveedor', verificarToken, SOLO_ALMACEN_O_ADMIN,  autorizarPermiso("Proveedores", "insertar"), (req, res) => {
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
app.put('/api/proveedor/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Proveedores", "actualizar"), (req, res) => {
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
app.delete('/api/proveedor/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Proveedores", "eliminar"), (req, res) => {
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
app.get('/api/proveedor', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Proveedores", "consultar"), (req, res) => {
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
app.post('/api/inventario', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Inventario", "insertar"), (req, res) => {
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
app.put('/api/inventario/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Inventario", "actualizar"), (req, res) => {
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
app.delete('/api/inventario/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Inventario", "eliminar"), (req, res) => {
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
app.get('/api/inventario', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Inventario", "consultar"), (req, res) => {
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
app.post('/api/kardex', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Kardex", "insertar"), (req, res) => {
  const { 
    id_producto, cantidad, tipo_movimiento, estado, descripcion, id_proveedor, monto_total
  } = req.body;

  const user = req.user;

  if (!id_producto || !cantidad || !tipo_movimiento) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const query = "CALL SP_InsertarKardex(?, ?, ?, ?, ?, ?)";
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
app.put('/api/kardex/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Kardex", "actualizar"), (req, res) => {
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
app.delete('/api/kardex/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Kardex", "eliminar"),(req, res) => {
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
app.get('/api/kardex', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Kardex", "consultar"), (req, res) => {
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
app.post('/api/detalle_compra', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Detalle de compra", "insertar"),(req, res) => {
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
app.put('/api/detalle_compra/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Detalle de compra", "actualizar"), (req, res) => {
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
app.delete('/api/detalle_compra/:id', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Detalle de compra", "eliminar"), (req, res) => {
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
app.get('/api/detalle_compra', verificarToken, SOLO_ALMACEN_O_ADMIN, autorizarPermiso("Detalle de compra", "consultar"), (req, res) => {
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



// =======================================================
// ============ Estados de Ticket (CRUD) =================
// =======================================================
app.get('/api/estado_ticket', (req, res) => {
  const query = "SELECT * FROM tbl_estado_ticket";
  conexion.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: "ERROR EN LISTADO DE ESTADOS DE TICKET" });
    res.json(rows);
  });
});

app.get('/api/estado_ticket/:id', (req, res) => {
  const query = "SELECT * FROM tbl_estado_ticket WHERE id_estado_ticket = ?";
  conexion.query(query, [Number(req.params.id)], (err, rows) => {
    if (err) return res.status(500).json({ error: "ERROR EN LISTADO DE ESTADO DE TICKET" });
    res.json(rows[0] || null);
  });
});

app.post('/api/estado_ticket', (req, res) => {
  const query = "INSERT INTO tbl_estado_ticket (estado) VALUES (?)";
  conexion.query(query, [req.body.estado], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "INSERT EXITOSO!", id: r.insertId });
  });
});

app.put('/api/estado_ticket/:id', (req, res) => {
  const query = "UPDATE tbl_estado_ticket SET estado = ? WHERE id_estado_ticket = ?";
  conexion.query(query, [req.body.estado, Number(req.params.id)], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "UPDATE EXITOSO!" });
  });
});

app.delete('/api/estado_ticket/:id', (req, res) => {
  const query = "DELETE FROM tbl_estado_ticket WHERE id_estado_ticket = ?";
  conexion.query(query, [Number(req.params.id)], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "DELETE EXITOSO!" });
  });
});

// =======================================================
// ============== Tipo Ticket (CRUD) =====================
// =======================================================
app.get("/api/tipo_ticket", (req, res) => {
  const sql = "SELECT id_tipo_ticket, tipo_ticket, prefijo FROM tbl_tipo_ticket WHERE estado='ACTIVO'";
  conexion.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener tipos de ticket" });
    res.json(rows);
  });
});

app.get('/api/tipo_ticket/:id', (request, response) => {
  const query = "SELECT * FROM tbl_tipo_ticket WHERE id_tipo_ticket= ?";
  const values = [parseInt(request.params.id)];
  conexion.query(query, values, (err, rows) => {
    if (err) return handleDatabaseError(err, response, "Error en listado de tipo ticket:");
    registrarBitacora("Tipo Ticket", "GET");
    logger.info("Listado de tipo ticket - OK");
    response.json(rows);
  });
});

app.post('/api/tipo_ticket', (request, response) => {
  try {
    const { tipo_ticket , estado, prefijo } = request.body;
    const query = `
      INSERT INTO tbl_tipo_ticket (tipo_ticket , estado, prefijo) 
      VALUES (?, ?, ?)
    `;
    const values = [tipo_ticket , estado, prefijo];
    conexion.query(query, values, (err) => {
      if (err) return handleDatabaseError(err, response, "Error en inserción de tipo ticket:");
      registrarBitacora("Tipo ticket", "POST");
      logger.info("INSERT de tipo ticket - OK");
      response.json("INSERT EXITOSO!");
    });
  } catch (error) {
    console.error(error);
    response.status(400).json({ error: "Error al analizar el cuerpo de la solicitud JSON" });
  }
});

app.put('/api/tipo_ticket', (request, response) => {
  try {
    const { id_tipo_ticket, tipo_ticket, estado, prefijo } = request.body;
    if (!id_tipo_ticket) {
      return response.status(400).json({ error: "id_tipo_ticket es requerido" });
    }
    const query = `
      UPDATE tbl_tipo_ticket 
      SET tipo_ticket = ?, estado = ?, prefijo = ?
      WHERE id_tipo_ticket = ?
    `;
    const values = [tipo_ticket, estado, prefijo, id_tipo_ticket];
    conexion.query(query, values, (err) => {
      if (err) return handleDatabaseError(err, response, "Error en actualización de tipo ticket:");
      registrarBitacora("Tipo ticket", "PUT");
      logger.info("ACTUALIZACIÓN de tipo ticket - OK");
      response.json("UPDATE EXITOSO!");
    });
  } catch (error) {
    console.error(error);
    response.status(400).json({ error: "Error al analizar el cuerpo de la solicitud JSON" });
  }
});

app.delete('/api/tipo_ticket/:id', (request, response) => {
  const query = "DELETE FROM tbl_tipo_ticket WHERE id_tipo_ticket = ?";
  const values = [parseInt(request.params.id)];
  conexion.query(query, values, (err) => {
    if (err) return handleDatabaseError(err, response, "Error en eliminación de tipo ticket:");
    registrarBitacora("tipo ticket", "DELETE");
    logger.info("DELETE de tipo ticket - OK");
    response.json("DELETE EXITOSO!");
  });
});

// =======================================================
// ===== Helpers de Tickets: estados y secuencias ========
// =======================================================
// Busca id_estado_ticket por su nombre (EN_COLA, EN_ATENCION, ATENDIDO, CANCELADO)
function getEstadoIdByName(nombre, cb) {
  const sql = "SELECT id_estado_ticket FROM tbl_estado_ticket WHERE UPPER(estado)=UPPER(?) LIMIT 1";
  conexion.query(sql, [nombre], (err, rows) => {
    if (err) return cb(err);
    if (!rows.length) return cb(new Error("Estado no encontrado: " + nombre));
    cb(null, rows[0].id_estado_ticket);
  });
}

// Genera NO_ticket usando el prefijo del tipo de ticket + consecutivo diario
function generarNoTicket(id_tipo_ticket, cb) {
  // 1) obtener prefijo
  const qPref = "SELECT prefijo FROM tbl_tipo_ticket WHERE id_tipo_ticket=? LIMIT 1";
  conexion.query(qPref, [id_tipo_ticket], (e1, r1) => {
    if (e1) return cb(e1);
    if (!r1.length) return cb(new Error("Tipo ticket no encontrado"));

    const prefijo = (r1[0].prefijo || "").toString().trim() || "N";
    // 2) calcular consecutivo del día
    const qCons = `
      SELECT COUNT(*) AS cnt
      FROM tbl_ticket
      WHERE id_tipo_ticket=? AND DATE(creado_en)=CURDATE()
    `;
    conexion.query(qCons, [id_tipo_ticket], (e2, r2) => {
      if (e2) return cb(e2);
      const consecutivo = (r2[0].cnt || 0) + 1;
      const numero = String(consecutivo).padStart(3, "0");  // N001, P007, etc.
      cb(null, `${prefijo}${numero}`);
    });
  });
}

// ========= NUEVO: obtener/crear id_tramite a partir del texto =========
function obtenerIdTramite(nombreTramite, cb) {
  if (!nombreTramite) return cb(null, null);
  const limpio = nombreTramite.toString().trim();
  if (!limpio) return cb(null, null);

  const qSel = "SELECT id_tramite FROM tbl_tramite WHERE nombre_tramite = ? LIMIT 1";
  conexion.query(qSel, [limpio], (err, rows) => {
    if (err) return cb(err);
    if (rows.length) return cb(null, rows[0].id_tramite);

    const qIns = "INSERT INTO tbl_tramite (nombre_tramite) VALUES (?)";
    conexion.query(qIns, [limpio], (err2, r2) => {
      if (err2) return cb(err2);
      cb(null, r2.insertId);
    });
  });
}

// Valida y parsea :id en rutas con parámetro
function requireIdParam(req, res, next) {
  const raw = req.params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }
  req.id = id;
  next();
}

// =======================================================
// ============== Trámites (CRUD catálogo) ===============
// =======================================================
// Tabla: tbl_tramite (id_tramite, nombre_tramite, descripcion, activo, creado_en)

app.get("/api/tramites", (req, res) => {
  const { from, to } = req.query;
  const params = [];
  let filtroFecha = "";

  if (from && to) {
    filtroFecha = "AND DATE(t.creado_en) BETWEEN ? AND ?";
    params.push(from, to);
  }

  const sql = `
    SELECT 
      tr.id_tramite,
      tr.nombre_tramite,
      tr.descripcion,
      tr.activo,
      tr.creado_en,
      COUNT(t.id_ticket) AS total_personas
    FROM tbl_tramite tr
    LEFT JOIN tbl_ticket t 
      ON t.id_tramite = tr.id_tramite
      ${filtroFecha}
    GROUP BY 
      tr.id_tramite,
      tr.nombre_tramite,
      tr.descripcion,
      tr.activo,
      tr.creado_en
    ORDER BY tr.nombre_tramite ASC
  `;

  conexion.query(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ mensaje: "Error al obtener trámites" });
    }
    res.json(rows);
  });
});




app.get("/api/tramites/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }
  const sql = `
    SELECT id_tramite, nombre_tramite, descripcion, activo, creado_en
    FROM tbl_tramite
    WHERE id_tramite = ?
    LIMIT 1
  `;
  conexion.query(sql, [id], (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener trámite");
    if (!rows.length) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json(rows[0]);
  });
});

app.post("/api/tramites", (req, res) => {
  let { nombre_tramite, descripcion } = req.body;
  if (!nombre_tramite || !nombre_tramite.toString().trim()) {
    return res.status(400).json({ mensaje: "El nombre del trámite es requerido" });
  }
  nombre_tramite = nombre_tramite.toString().trim();
  descripcion = (descripcion ?? "").toString().trim() || null;

  const sql = `
    INSERT INTO tbl_tramite (nombre_tramite, descripcion, activo)
    VALUES (?, ?, 1)
  `;
  conexion.query(sql, [nombre_tramite, descripcion], (err, r) => {
    if (err) return handleDatabaseError(err, res, "Error al crear trámite");
    res.status(201).json({
      mensaje: "Trámite creado correctamente",
      id_tramite: r.insertId,
      nombre_tramite,
      descripcion,
    });
  });
});

app.put("/api/tramites/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  let { nombre_tramite, descripcion, activo } = req.body;
  if (!nombre_tramite || !nombre_tramite.toString().trim()) {
    return res.status(400).json({ mensaje: "El nombre del trámite es requerido" });
  }
  nombre_tramite = nombre_tramite.toString().trim();
  descripcion = (descripcion ?? "").toString().trim() || null;
  activo = activo ? 1 : 0;

  const sql = `
    UPDATE tbl_tramite
    SET nombre_tramite = ?, descripcion = ?, activo = ?
    WHERE id_tramite = ?
  `;
  conexion.query(sql, [nombre_tramite, descripcion, activo, id], (err, r) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar trámite");
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite actualizado correctamente" });
  });
});

app.delete("/api/tramites/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM tbl_tramite WHERE id_tramite = ?";

  conexion.query(sql, [id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar trámite", error: err });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite eliminado correctamente" });
  });
});


app.patch("/api/tramites/:id/desactivar", (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE tbl_tramite
    SET activo = 0
    WHERE id_tramite = ?
  `;

  conexion.query(sql, [id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al desactivar trámite" });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite desactivado" });
  });
});

app.patch("/api/tramites/:id/activar", (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE tbl_tramite
    SET activo = 1
    WHERE id_tramite = ?
  `;

  conexion.query(sql, [id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al activar trámite" });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite activado" });
  });
});


// =======================================================
// ============ SISTEMA DE LLAMADO DE TICKETS ============
// (Orden correcto evita colisiones con :id)             //
// =======================================================

// ---------- (1) RUTAS FIJAS (van primero) --------------
app.get("/api/tickets/cola", (req, res) => {
  const sql = `
    SELECT 
      t.id_ticket,
      t.NO_ticket,
      tr.nombre_tramite AS tramite,
      t.creado_en,
      tt.tipo_ticket AS tipo
    FROM tbl_ticket t
    JOIN tbl_estado_ticket et ON et.id_estado_ticket = t.id_estado_ticket
    JOIN tbl_tipo_ticket tt   ON tt.id_tipo_ticket   = t.id_tipo_ticket
    LEFT JOIN tbl_tramite tr  ON tr.id_tramite       = t.id_tramite
    WHERE et.estado = 'EN_COLA'
      ORDER BY 
    TIMESTAMPDIFF(MINUTE, t.creado_en, NOW()) DESC,
    CASE 
      WHEN tt.tipo_ticket = 'PREFERENCIAL' THEN 0
      ELSE 1
    END,
    t.creado_en ASC

  `;
  conexion.query(sql, (err, rows) => {
    if (err) {
      console.error("[/tickets/cola] SQL error:", err);
      return res.status(500).json({ mensaje: "Error al listar cola" });
    }
    res.json(rows);
  });
});

app.get("/api/tickets/en-atencion", (req, res) => {
  const sql = `
    SELECT 
      t.id_ticket,
      t.NO_ticket,
      tr.nombre_tramite AS tramite,
      t.creado_en,
      v.ventanilla,
      t.llamado_en,
      tt.tipo_ticket AS tipo
    FROM tbl_ticket t
    JOIN tbl_estado_ticket et ON et.id_estado_ticket = t.id_estado_ticket
    LEFT JOIN tbl_visualizacion v ON v.id_ticket = t.id_ticket
    JOIN tbl_tipo_ticket tt ON tt.id_tipo_ticket = t.id_tipo_ticket
    LEFT JOIN tbl_tramite tr ON tr.id_tramite = t.id_tramite
    WHERE et.estado = 'EN_ATENCION'
    ORDER BY t.llamado_en DESC, t.llamado_veces DESC, t.id_ticket DESC
    LIMIT 1
  `;

  conexion.query(sql, (err, rows) => {
    if (err) {
      console.error("[/tickets/en-atencion] SQL error:", err);
      return res.status(500).json({ mensaje: "Error al leer en atención" });
    }
    res.json(rows[0] || null);
  });
});


// Llamar siguiente
// Llamar siguiente (protegid@ y asigna operador)
app.post("/api/tickets/siguiente", verificarToken, (req, res) => {
  const { ventanilla = "A1" } = req.body;
  const idOperador = req.user?.id_usuario || null;

  const qEstados = `
    SELECT estado, id_estado_ticket
    FROM tbl_estado_ticket
    WHERE estado IN ('EN_COLA','EN_ATENCION')
  `;
  conexion.query(qEstados, (e0, est) => {
    if (e0) return res.status(500).json({ mensaje: "Error leyendo estados" });
    const idEnCola = est.find(r => r.estado === 'EN_COLA')?.id_estado_ticket;
    const idEnAtencion = est.find(r => r.estado === 'EN_ATENCION')?.id_estado_ticket;
    if (!idEnCola || !idEnAtencion) {
      return res.status(500).json({ mensaje: "Faltan estados EN_COLA / EN_ATENCION" });
    }

        const qFind = `
      SELECT 
        t.id_ticket, 
        t.NO_ticket, 
        tr.nombre_tramite AS tramite, 
        t.creado_en, 
        t.id_tipo_ticket,
        tt.tipo_ticket AS tipo
      FROM tbl_ticket t
      JOIN tbl_tipo_ticket tt ON tt.id_tipo_ticket = t.id_tipo_ticket
      LEFT JOIN tbl_tramite tr ON tr.id_tramite = t.id_tramite
      WHERE t.id_estado_ticket = ?
      ORDER BY 
        TIMESTAMPDIFF(MINUTE, t.creado_en, NOW()) DESC,  -- más tiempo esperando primero
        CASE                                             -- si empatan, preferencial primero
          WHEN tt.tipo_ticket = 'PREFERENCIAL' THEN 0
          ELSE 1
        END,
        t.creado_en ASC
      LIMIT 1
    `;

    conexion.query(qFind, [idEnCola], (e1, r1) => {
      if (e1) return res.status(500).json({ mensaje: "Error buscando siguiente ticket" });
      if (!r1.length) return res.status(404).json({ mensaje: "No hay tickets en cola" });

      const tk = r1[0];
      const qUpd = `
        UPDATE tbl_ticket
        SET llamado_veces = COALESCE(llamado_veces,0) + 1,
            llamado_en     = NOW(),
            id_estado_ticket = ?,
            id_usuario     = IFNULL(id_usuario, ?)  -- <--- asigna operador
        WHERE id_ticket = ?
      `;
      conexion.query(qUpd, [idEnAtencion, idOperador, tk.id_ticket], (e2) => {
        if (e2) return res.status(500).json({ mensaje: "Error al actualizar ticket" });

        // Registrar/actualizar visualización
        const qVis = `
          INSERT INTO tbl_visualizacion (id_ticket, ventanilla)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE ventanilla = VALUES(ventanilla)
        `;
        conexion.query(qVis, [tk.id_ticket, ventanilla], (e3) => {
          if (e3) {
            console.error("[visualizacion] error:", e3);
            return res.status(500).json({ mensaje: "Error registrando visualización" });
          }
          res.json({ mensaje: "Ticket llamado", ticket: { ...tk, ventanilla } });
        });
      });
    });
  });
});


// Saltar (cancela el actual y llama el siguiente)
app.post("/api/tickets/saltar", (req, res) => {
  const { ventanilla = "A1" } = req.body;

  const qEstadoCancel = `
    SELECT id_estado_ticket 
    FROM tbl_estado_ticket 
    WHERE estado='CANCELADO' 
    LIMIT 1
  `;
  conexion.query(qEstadoCancel, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error obteniendo estado CANCELADO" });
    const id_estado_cancelado = rows[0]?.id_estado_ticket;
    if (!id_estado_cancelado) return res.status(500).json({ mensaje: "Falta estado CANCELADO" });

    const qUpd = `
      UPDATE tbl_ticket
      SET id_estado_ticket = ?
      WHERE id_estado_ticket = (SELECT id_estado_ticket FROM tbl_estado_ticket WHERE estado='EN_ATENCION' LIMIT 1)
      ORDER BY creado_en DESC
      LIMIT 1
    `;
    conexion.query(qUpd, [id_estado_cancelado], (e2) => {
      if (e2) return res.status(500).json({ mensaje: "Error al cancelar ticket actual" });

      const qFind = `
  SELECT 
    t.id_ticket, 
    t.NO_ticket, 
    tr.nombre_tramite AS tramite, 
    t.creado_en,
    tt.tipo_ticket AS tipo
  FROM tbl_ticket t
  JOIN tbl_estado_ticket et ON et.id_estado_ticket = t.id_estado_ticket
  JOIN tbl_tipo_ticket tt   ON tt.id_tipo_ticket   = t.id_tipo_ticket
  LEFT JOIN tbl_tramite tr  ON tr.id_tramite       = t.id_tramite
  WHERE et.estado = 'EN_COLA'
  ORDER BY (tt.tipo_ticket = 'PREFERENCIAL') DESC, t.creado_en ASC
  LIMIT 1
`;

      conexion.query(qFind, (e3, rowsNext) => {
        if (e3) return res.status(500).json({ mensaje: "Error buscando siguiente ticket" });
        if (rowsNext.length === 0) return res.status(404).json({ mensaje: "No hay más tickets en cola" });

        const tk = rowsNext[0];
        const qEstadoAt = `
          SELECT id_estado_ticket 
          FROM tbl_estado_ticket 
          WHERE estado='EN_ATENCION' 
          LIMIT 1
        `;
        conexion.query(qEstadoAt, (e4, est2) => {
          if (e4) return res.status(500).json({ mensaje: "Error leyendo estado EN_ATENCION" });
          const id_estado_atencion = est2[0]?.id_estado_ticket;
          if (!id_estado_atencion) return res.status(500).json({ mensaje: "Falta estado EN_ATENCION" });

          const qUpd2 = `
            UPDATE tbl_ticket
            SET llamado_veces = llamado_veces + 1,
                llamado_en = NOW(),
                id_estado_ticket = ?
            WHERE id_ticket = ?
          `;
          conexion.query(qUpd2, [id_estado_atencion, tk.id_ticket], (e5) => {
            if (e5) return res.status(500).json({ mensaje: "Error al actualizar ticket siguiente" });

            const qVis = `
              INSERT INTO tbl_visualizacion (id_ticket, ventanilla)
              VALUES (?, ?)
              ON DUPLICATE KEY UPDATE 
                ventanilla = VALUES(ventanilla)
            `;
            conexion.query(qVis, [tk.id_ticket, ventanilla], (e6) => {
              if (e6) {
                console.error("[visualizacion] error:", e6);
                return res.status(500).json({ mensaje: "Error registrando visualización" });
              }

              res.json({
                mensaje: "Ticket actual cancelado, siguiente llamado",
                ticket: {
                  id_ticket: tk.id_ticket,
                  no_ticket: tk.NO_ticket,
                  tramite: tk.tramite,
                  tipo: tk.tipo,
                  ventanilla,
                },
              });
            });
          });
        });
      });
    });
  });
});

// ---------- (2) CRUD sin ID ---------------------------
app.post("/api/tickets", (req, res) => {
  const { id_tipo_ticket, id_tramite, nota = null, tramite = null } = req.body;
  if (!id_tipo_ticket) {
    return res.status(400).json({ mensaje: "id_tipo_ticket es requerido" });
  }

  // Prioridad: si viene id_tramite lo usamos; si no, intentamos con texto "tramite"
  const usarTextoTramite = !id_tramite && tramite;

  const continuarConInsert = (idTramiteFinal) => {
    getEstadoIdByName("EN_COLA", (e0, idEnCola) => {
      if (e0) return handleDatabaseError(e0, res, "Estado EN_COLA no encontrado");

      generarNoTicket(id_tipo_ticket, (e1, NO_ticket) => {
        if (e1) return handleDatabaseError(e1, res, "Error generando NO_ticket");

        const q = `
          INSERT INTO tbl_ticket
            (id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket, id_tramite, creado_en, llamado_veces, nota)
          VALUES
            (NULL, ?, ?, ?, ?, NOW(), 0, ?)
        `;
        conexion.query(
          q,
          [idEnCola, id_tipo_ticket, NO_ticket, idTramiteFinal, nota],
          (e2, r2) => {
            if (e2) {
              if (e2.code === "ER_DUP_ENTRY") {
                return res.status(409).json({ mensaje: "Colisión de número, intente de nuevo" });
              }
              return handleDatabaseError(e2, res, "Error al crear ticket");
            }
            res.status(201).json({ id_ticket: r2.insertId, NO_ticket });
          }
        );
      });
    });
  };

  if (id_tramite) {
    // viene el id_tramite directo del frontend
    return continuarConInsert(Number(id_tramite));
  }

  if (usarTextoTramite) {
    // kiosko o algún cliente que mande texto
    return obtenerIdTramite(tramite, (err, idT) => {
      if (err) return handleDatabaseError(err, res, "Error resolviendo trámite");
      continuarConInsert(idT);
    });
  }

  // sin trámite (opcional)
  continuarConInsert(null);
});

// Listado con filtros/paginación
app.get("/api/tickets", (req, res) => {
  const { from, to, empleado_id, estado, q, page = 1, pageSize = 20 } = req.query;
  const off = (Number(page) - 1) * Number(pageSize);

  const params = [];
  let where = "1=1";
  if (from && to) { where += " AND DATE(t.creado_en) BETWEEN ? AND ?"; params.push(from, to); }
  if (empleado_id) { where += " AND t.id_usuario = ?"; params.push(Number(empleado_id)); }
  if (estado) { where += " AND UPPER(es.estado)=UPPER(?)"; params.push(estado); }
  if (q) { where += " AND (t.NO_ticket LIKE CONCAT('%', ?, '%'))"; params.push(q); }

  const sel = `
    SELECT
      t.id_ticket,
      t.NO_ticket,
      t.creado_en,
      t.llamado_en,
      t.llamado_veces,
      t.iniciado_en,
      t.finalizado_en,
      t.nota,
      t.id_tramite,
      tr.nombre_tramite,
      es.estado,
      tt.tipo_ticket,
      tt.prefijo,
      t.id_usuario,
      CONCAT(u.nombre, ' ', u.apellido) AS empleado
    FROM tbl_ticket t
    JOIN tbl_estado_ticket es ON es.id_estado_ticket = t.id_estado_ticket
    JOIN tbl_tipo_ticket   tt ON tt.id_tipo_ticket   = t.id_tipo_ticket
    LEFT JOIN tbl_tramite  tr ON tr.id_tramite      = t.id_tramite
    LEFT JOIN tbl_usuario   u ON u.id_usuario        = t.id_usuario
    WHERE ${where}
    ORDER BY t.creado_en DESC
    LIMIT ? OFFSET ?
  `;
  const cnt = `
    SELECT COUNT(*) AS total
    FROM tbl_ticket t
    JOIN tbl_estado_ticket es ON es.id_estado_ticket = t.id_estado_ticket
    JOIN tbl_tipo_ticket   tt ON tt.id_tipo_ticket   = t.id_tipo_ticket
    LEFT JOIN tbl_tramite  tr ON tr.id_tramite      = t.id_tramite
    LEFT JOIN tbl_usuario   u ON u.id_usuario        = t.id_usuario
    WHERE ${where}
  `;

  conexion.query(sel, [...params, Number(pageSize), off], (e1, rows) => {
    if (e1) return handleDatabaseError(e1, res, "Error listando tickets");
    conexion.query(cnt, params, (e2, r2) => {
      if (e2) return handleDatabaseError(e2, res, "Error contando tickets");
      res.json({ data: rows, page: Number(page), pageSize: Number(pageSize), total: r2[0].total });
    });
  });
});


// ---------- (3) RUTAS con ID (regex numérica) ----------
// ---------- (3) RUTAS con ID (regex numérica) ----------
app.get("/api/tickets/:id", requireIdParam, (req, res) => {
  const id = req.id;
  const sql = `
    SELECT
      t.*,
      es.estado,
      tt.tipo_ticket,
      tt.prefijo,
      tr.nombre_tramite,
      u.nombre_usuario AS usuario
    FROM tbl_ticket t
    JOIN tbl_estado_ticket es ON es.id_estado_ticket = t.id_estado_ticket
    JOIN tbl_tipo_ticket tt    ON tt.id_tipo_ticket = t.id_tipo_ticket
    LEFT JOIN tbl_tramite tr   ON tr.id_tramite     = t.id_tramite
    LEFT JOIN tbl_usuario u    ON u.id_usuario      = t.id_usuario
    WHERE t.id_ticket = ? LIMIT 1
  `;
  conexion.query(sql, [id], (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener ticket");
    if (!rows.length) {
      return res.status(404).json({ mensaje: "No encontrado" });
    }
    res.json(rows[0]);
  });
});

// Actualizar (nota / reasignar)
app.put("/api/tickets/:id", requireIdParam, (req, res) => {
  const id = req.id;
  const { nota = null, id_usuario = null } = req.body;
  conexion.query(
    "UPDATE tbl_ticket SET nota = ?, id_usuario = ? WHERE id_ticket = ?",
    [nota, id_usuario, id],
    (err, r) => {
      if (err) return handleDatabaseError(err, res, "Error al actualizar ticket");
      if (!r.affectedRows) {
        return res.status(404).json({ mensaje: "No encontrado" });
      }
      res.json({ ok: true });
    }
  );
});


// LLAMAR → EN_ATENCION + asigna operador
app.patch("/api/tickets/:id/llamar", requireIdParam, verificarToken, (req, res) => {
  const id = req.id;
  const idOperador = req.user?.id_usuario || null; // ← del JWT

  getEstadoIdByName("EN_ATENCION", (e0, idAt) => {
    if (e0) return handleDatabaseError(e0, res, "Falta estado EN_ATENCION");

    const q = `
      UPDATE tbl_ticket
      SET id_estado_ticket=?,
          id_usuario=IFNULL(id_usuario, ?),
          llamado_en=IFNULL(llamado_en, NOW()),
          llamado_veces = COALESCE(llamado_veces,0)+1
      WHERE id_ticket=?
    `;
    conexion.query(q, [idAt, idOperador, id], (err, r) => {
      if (err) return handleDatabaseError(err, res, "Error al llamar");
      if (!r.affectedRows) return res.status(404).json({ mensaje: "No encontrado" });
      res.json({ ok: true });
    });
  });
});


// INICIAR
app.patch("/api/tickets/:id/iniciar", requireIdParam, verificarToken, (req, res) => {
  const id = req.id;
  const idOperador = req.user?.id_usuario || null;

  const sql = `
    UPDATE tbl_ticket
    SET iniciado_en = IFNULL(iniciado_en, NOW()),
        id_usuario  = IFNULL(id_usuario, ?)
    WHERE id_ticket = ?
  `;
  conexion.query(sql, [idOperador, id], (err, r) => {
    if (err) return handleDatabaseError(err, res, "Error al iniciar");
    if (!r.affectedRows) return res.status(404).json({ mensaje: "No encontrado" });
    res.json({ ok: true });
  });
});


// FINALIZAR (PATCH canónico)
app.patch("/api/tickets/:id/finalizar", requireIdParam, verificarToken, (req, res) => {
  const id = req.id;
  const sql = `
    UPDATE tbl_ticket
    SET id_estado_ticket = (SELECT id_estado_ticket FROM tbl_estado_ticket WHERE estado='ATENDIDO' LIMIT 1),
        finalizado_en    = IFNULL(finalizado_en, NOW()),
        iniciado_en      = IFNULL(iniciado_en, llamado_en)
    WHERE id_ticket = ?
  `;
  conexion.query(sql, [id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al finalizar ticket" });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Ticket no encontrado" });
    res.json({ mensaje: "Ticket finalizado" });
  });
});

// ========== CANCELAR TICKET (reutilizable) ==========
function cancelarTicketSQL(id_ticket, done) {
  // 1) marcar CANCELADO y congelar tiempos
  const sql1 = `
    UPDATE tbl_ticket
    SET 
      id_estado_ticket = (
        SELECT id_estado_ticket 
        FROM tbl_estado_ticket 
        WHERE estado='CANCELADO' 
        LIMIT 1
      ),
      -- si nunca se inició, usa el llamado_en como mejor estimación;
      -- si tampoco hay llamado_en, usa NOW()
      iniciado_en = COALESCE(iniciado_en, llamado_en, NOW()),
      finalizado_en = COALESCE(finalizado_en, NOW())
    WHERE id_ticket = ?
  `;
  conexion.query(sql1, [id_ticket], (err1, r1) => {
    if (err1) return done(err1);
    if (!r1.affectedRows) return done({ notFound: true });

    // 2) limpiar cualquier visualización activa para ese ticket
    const sql2 = `DELETE FROM tbl_visualizacion WHERE id_ticket = ?`;
    conexion.query(sql2, [id_ticket], (err2) => {
      if (err2) return done(err2);
      return done(null, { ok: true });
    });
  });
}

// PATCH canónico
app.patch("/api/tickets/:id/cancelar", requireIdParam, (req, res) => {
  const id = req.id;
  cancelarTicketSQL(id, (err, result) => {
    if (err && err.notFound) return res.status(404).json({ mensaje: "Ticket no encontrado" });
    if (err) {
      console.error("Error al cancelar ticket:", err);
      return res.status(500).json({ mensaje: "Error al cancelar ticket" });
    }
    res.json({ mensaje: "Ticket cancelado correctamente" });
  });
});

// POST alias (por compatibilidad con tu panel)
app.post("/api/tickets/:id/cancelar", requireIdParam, (req, res) => {
  const id = req.id;
  cancelarTicketSQL(id, (err, result) => {
    if (err && err.notFound) return res.status(404).json({ mensaje: "Ticket no encontrado" });
    if (err) {
      console.error("Error al cancelar ticket (POST):", err);
      return res.status(500).json({ mensaje: "Error al cancelar ticket" });
    }
    res.json({ mensaje: "Ticket cancelado correctamente" });
  });
});

// REPETIR LLAMADO
app.post("/api/tickets/:id/repetir", requireIdParam, (req, res) => {
  const id = req.id;
  const { ventanilla = "A1" } = req.body;
  const sql = `
    UPDATE tbl_ticket
    SET llamado_veces = llamado_veces + 1, llamado_en = NOW()
    WHERE id_ticket = ?
  `;
  conexion.query(sql, [id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al marcar repetición" });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Ticket no encontrado" });

    const qVis = `
      INSERT INTO tbl_visualizacion (id_ticket, ventanilla)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE ventanilla = VALUES(ventanilla)
    `;
    conexion.query(qVis, [id, ventanilla], (e2) => {
      if (e2) {
        console.error("[visualizacion] error:", e2);
        return res.status(500).json({ mensaje: "Error registrando visualización" });
      }
      res.json({ mensaje: "Repetido", ventanilla });
    });
  });
});

// DELETE lógico → CANCELADO
// DELETE físico → elimina fila del ticket
app.delete("/api/tickets/:id", requireIdParam, (req, res) => {
  const id = req.id;

  const sql = "DELETE FROM tbl_ticket WHERE id_ticket = ?";
  conexion.query(sql, [id], (err, r) => {
    if (err) {
      console.error("Error al eliminar ticket:", err);
      return res.status(500).json({ mensaje: "Error al eliminar ticket" });
    }
    if (!r.affectedRows) {
      return res.status(404).json({ mensaje: "Ticket no encontrado" });
    }
    res.json({ mensaje: "Ticket eliminado correctamente" });
  });
});

// Obtener trámites activos
app.get("/api/tramites", (req, res) => {
  conexion.query(
    "SELECT id_tramite, nombre_tramite FROM tbl_tramite WHERE activo = 1 ORDER BY nombre_tramite",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Error al cargar trámites" });
      res.json(rows);
    }
  );
});

app.get("/api/tramites/:id", (req, res) => {
  const sql = `
    SELECT id_tramite, nombre_tramite, descripcion, activo, creado_en
    FROM tbl_tramite
    WHERE id_tramite = ?
    LIMIT 1
  `;
  conexion.query(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: "Error al obtener trámite", error: err });
    if (!rows.length) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json(rows[0]);
  });
});

// Crear un nuevo trámite
app.post("/api/tramites", (req, res) => {
  const { nombre_tramite, descripcion } = req.body;

  if (!nombre_tramite)
    return res.status(400).json({ mensaje: "El nombre del trámite es obligatorio" });

  const sql = `
    INSERT INTO tbl_tramite (nombre_tramite, descripcion, activo, creado_en)
    VALUES (?, ?, 1, NOW())
  `;
  conexion.query(sql, [nombre_tramite, descripcion], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al crear trámite", error: err });

    res.status(201).json({
      mensaje: "Trámite creado correctamente",
      id_tramite: r.insertId,
    });
  });
});

// Actualizar un trámite
app.put("/api/tramites/:id", (req, res) => {
  const { nombre_tramite, descripcion, activo } = req.body;

  if (!nombre_tramite)
    return res.status(400).json({ mensaje: "El nombre del trámite es obligatorio" });

  const sql = `
    UPDATE tbl_tramite
    SET nombre_tramite = ?, descripcion = ?, activo = ?
    WHERE id_tramite = ?
  `;
  conexion.query(sql, [nombre_tramite, descripcion, activo ? 1 : 0, req.params.id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al actualizar trámite", error: err });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite actualizado correctamente" });
  });
});

// Desactivar trámite (DELETE lógico)
app.delete("/api/tramites/:id", (req, res) => {
  const sql = `
    UPDATE tbl_tramite
    SET activo = 0
    WHERE id_tramite = ?
  `;
  conexion.query(sql, [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ mensaje: "Error al eliminar trámite", error: err });
    if (!r.affectedRows) return res.status(404).json({ mensaje: "Trámite no encontrado" });
    res.json({ mensaje: "Trámite eliminado (desactivado)" });
  });
});

// =======================================================
// ================= MONITOR DEL PANEL ===================
// =======================================================
app.get("/api/monitor/estado", (req, res) => {
  const qActual = `
  SELECT 
    v.id_visualizacion,
    t.NO_ticket AS no_ticket,
    tr.nombre_tramite AS tramite,
    tt.tipo_ticket AS tipo,
    v.ventanilla,
    t.llamado_en
  FROM tbl_visualizacion v
  JOIN tbl_ticket t       ON t.id_ticket = v.id_ticket
  JOIN tbl_tipo_ticket tt ON tt.id_tipo_ticket = t.id_tipo_ticket
  LEFT JOIN tbl_tramite tr ON tr.id_tramite = t.id_tramite
  ORDER BY 
    t.llamado_en DESC,
    v.id_visualizacion DESC
  LIMIT 1
`;
  conexion.query(qActual, (e1, rAct) => {
    if (e1) {
      console.error("[/monitor/estado] actual:", e1);
      return res.status(500).json({ mensaje: "Error actual" });
    }
    const actual = rAct[0] || null;

    const qHist = `
  SELECT 
    v.id_visualizacion,
    t.NO_ticket AS no_ticket,
    tr.nombre_tramite AS tramite,
    tt.tipo_ticket AS tipo,
    v.ventanilla,
    t.llamado_en
  FROM tbl_visualizacion v
  JOIN tbl_ticket t       ON t.id_ticket = v.id_ticket
  JOIN tbl_tipo_ticket tt ON tt.id_tipo_ticket = t.id_tipo_ticket
  LEFT JOIN tbl_tramite tr ON tr.id_tramite = t.id_tramite
  ORDER BY 
    t.llamado_en DESC,
    v.id_visualizacion DESC
  LIMIT 10 OFFSET 1
`;
    conexion.query(qHist, (e2, rHist) => {
      if (e2) {
        console.error("[/monitor/estado] historial:", e2);
        return res.status(500).json({ mensaje: "Error historial" });
      }
      res.json({ actual, historial: rHist });
    });
  });
});

// =======================================================
// ================== KIOSKO: TOMAR ======================
// =======================================================
function pad3(n) { return String(n).padStart(3, "0"); }

app.post("/api/kiosko/tomar", (req, res) => {
  const { id_tipo_ticket, id_tramite, tramite } = req.body;

  if (!id_tipo_ticket) {
    return res.status(400).json({ mensaje: "Faltan datos: id_tipo_ticket" });
  }

  // Ahora la prioridad es usar id_tramite que viene del kiosko;
  // si no viene, opcionalmente puede resolver por texto "tramite"
  const resolverIdTramite = (cb) => {
    if (id_tramite) return cb(null, Number(id_tramite));
    if (tramite) return obtenerIdTramite(tramite, cb);
    return cb(null, null); // sin trámite
  };

  const qTipo = `
    SELECT prefijo
    FROM tbl_tipo_ticket
    WHERE id_tipo_ticket = ? AND estado = 'ACTIVO'
    LIMIT 1
  `;
  conexion.query(qTipo, [id_tipo_ticket], (eTipo, rTipo) => {
    if (eTipo) return handleDatabaseError(eTipo, res, "Error leyendo tipo de ticket");
    if (!rTipo.length)
      return res.status(404).json({ mensaje: "Tipo de ticket inexistente o INACTIVO" });

    const prefijo = (rTipo[0].prefijo || "GN").trim().toUpperCase();

    const qSeq = `
      INSERT INTO tbl_ticket_seq (prefijo, fecha, consecutivo)
      VALUES (?, CURDATE(), 1)
      ON DUPLICATE KEY UPDATE consecutivo = consecutivo + 1
    `;
    conexion.query(qSeq, [prefijo], (eSeq) => {
      if (eSeq) return handleDatabaseError(eSeq, res, "Error actualizando secuencia");

      const qGet = `
        SELECT consecutivo
        FROM tbl_ticket_seq
        WHERE prefijo = ? AND fecha = CURDATE()
        LIMIT 1
      `;
      conexion.query(qGet, [prefijo], (eGet, rGet) => {
        if (eGet) return handleDatabaseError(eGet, res, "Error leyendo secuencia");
        const consecutivo = rGet[0]?.consecutivo || 1;
        const NO_ticket = `${prefijo}${pad3(consecutivo)}`;

        const qEstado = `
          SELECT id_estado_ticket
          FROM tbl_estado_ticket
          WHERE estado = 'EN_COLA'
          LIMIT 1
        `;
        conexion.query(qEstado, (eEst, rEst) => {
          if (eEst) return handleDatabaseError(eEst, res, "Error leyendo estado EN_COLA");
          const id_estado_ticket = rEst[0]?.id_estado_ticket;
          if (!id_estado_ticket)
            return res.status(500).json({ mensaje: "No existe estado EN_COLA" });

          resolverIdTramite((errT, idTramiteFinal) => {
            if (errT) return handleDatabaseError(errT, res, "Error resolviendo trámite");

            const qIns = `
              INSERT INTO tbl_ticket
                (id_cliente, id_estado_ticket, id_tipo_ticket, NO_ticket, id_tramite, creado_en, llamado_veces)
              VALUES
                (NULL, ?, ?, ?, ?, NOW(), 0)
            `;
            const vals = [id_estado_ticket, id_tipo_ticket, NO_ticket, idTramiteFinal];

            conexion.query(qIns, vals, (eIns, rIns) => {
              if (eIns) {
                if (eIns.code === "ER_DUP_ENTRY") {
                  return res
                    .status(409)
                    .json({ mensaje: "Colisión de número, intente de nuevo" });
                }
                return handleDatabaseError(eIns, res, "Error al crear ticket");
              }

              // Generar fecha/hora para mandarla al kiosko
              const ahora = new Date();
              const pad = (n) => String(n).padStart(2, "0");
              const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(
                ahora.getDate()
              )}`;
              const hora = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(
                ahora.getSeconds()
              )}`;

              res.status(201).json({
                mensaje: "Ticket generado",
                id_ticket: rIns.insertId,
                no_ticket: NO_ticket,
                fecha,
                hora,
              });
            });
          });
        });
      });
    });
  });
});

app.get("/api/historial_kardex", (req, res) => {
    const sql = "SELECT * FROM tbl_kardex ORDER BY fecha_hora DESC";

    conexion.query(sql, (err, results) => {
        if (err) {
            console.error("Error al obtener historial kardex:", err);
            return res.status(500).json({ mensaje: "Error al obtener historial" });
        }
        res.json(results);
    });
});

// ===== CRUD PARA tbl_tipo_ticket =====

// Listar todos los tipos de ticket
// LISTAR TODOS LOS TIPOS DE TICKET
// LISTAR TODOS LOS TIPOS DE TICKET (ACTIVOS E INACTIVOS)
app.get("/api/tipo_ticket", async (req, res) => {
  try {
    const [rows] = await conexion.promise().query(`
      SELECT 
        id_tipo_ticket,
        tipo_ticket,
        prefijo,
        estado
      FROM tbl_tipo_ticket
      ORDER BY id_tipo_ticket DESC
    `);

    res.json(rows);          
  } catch (err) {
    handleDatabaseError(err, res, "Error en listado de tipo_ticket:");
  }
});



// Obtener un tipo_ticket por ID
// LISTAR
app.get("/api/tipo_ticket", async (req, res) => {
  try {
    const [rows] = await conexion.promise().query(
      "SELECT * FROM tbl_tipo_ticket ORDER BY id_tipo_ticket DESC"
    );
    res.json(rows);
  } catch (err) {
    handleDatabaseError(err, res, "Error en listado de tipo_ticket:");
  }
});

// INSERTAR
app.post("/api/tipo_ticket", async (req, res) => {
  const { tipo_ticket, prefijo, estado } = req.body;

  if (!tipo_ticket || !prefijo) {
    return res
      .status(400)
      .json({ error: "tipo_ticket y prefijo son obligatorios." });
  }

  const query = `
    INSERT INTO tbl_tipo_ticket (tipo_ticket, estado, prefijo)
    VALUES (?, ?, ?)
  `;
  const values = [tipo_ticket, estado || "ACTIVO", prefijo];

  try {
    const [result] = await conexion.promise().query(query, values);
    res.json({
      mensaje: "Tipo de ticket agregado correctamente",
      id: result.insertId,
    });
  } catch (err) {
    handleDatabaseError(err, res, "Error al insertar tipo_ticket:");
  }
});

// ACTUALIZAR
app.put("/api/tipo_ticket/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { tipo_ticket, prefijo, estado } = req.body;

  if (!tipo_ticket || !prefijo) {
    return res
      .status(400)
      .json({ error: "tipo_ticket y prefijo son obligatorios." });
  }

  const query = `
    UPDATE tbl_tipo_ticket
    SET tipo_ticket = ?, estado = ?, prefijo = ?
    WHERE id_tipo_ticket = ?
  `;
  const values = [tipo_ticket, estado || "ACTIVO", prefijo, id];

  try {
    const [result] = await conexion.promise().query(query, values);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ mensaje: "Tipo de ticket no encontrado" });
    }

    res.json({ mensaje: "Tipo de ticket actualizado correctamente" });
  } catch (err) {
    handleDatabaseError(err, res, "Error al actualizar tipo_ticket:");
  }
});


// Eliminar tipo_ticket
app.delete("/api/tipo_ticket/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { id_usuario: id_admin } = req.body || {};

  try {
    const [result] = await conexion
      .promise()
      .query("DELETE FROM tbl_tipo_ticket WHERE id_tipo_ticket = ?", [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ mensaje: "Tipo de ticket no encontrado" });
    }

    if (id_admin) {
      await conexion.promise().query("CALL event_bitacora(?, ?, ?, ?)", [
        id_admin,
        3,
        "DELETE",
        `Se eliminó el tipo_ticket con ID ${id}`,
      ]);
    }

    res.json({ mensaje: "Tipo de ticket eliminado correctamente" });
  } catch (err) {
    handleDatabaseError(err, res, "Error al eliminar tipo_ticket:");
  }
});


// ===== 404 =====
app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));