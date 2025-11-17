// ===== Dependencias =====
var Express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var mysql = require("mysql2");
var jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
var speakeasy = require("speakeasy");
var QRCode = require("qrcode"); // si luego quieres enrolar 2FA con QR

// Logger opcional
let logger;
try {
  logger = require("./logger");
} catch {
  logger = console;
}

// ===== Conexión a la base de datos =====
var conexion = mysql.createConnection({
  host: "localhost",
  port: "3306",
  user: "root",
  password: "",
  database: "marina_mercante",
  charset: "utf8mb4", //  importante para ñ y acentos
  authPlugins: {
    mysql_native_password: () => () => Buffer.from("1984"),
  },
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

// ===== Listener y conexión a MySQL =====
const PORT = 49146;
const SECRET_KEY = "1984";

app.listen(PORT, () => {
  conexion.connect((err) => {
    if (err) {
      logger.error("Error al conectar a la BD: " + err.message);
      throw err;
    }
    logger.info(`Conexión a la BD con éxito! API en http://localhost:${PORT}`);
  });
});

// ===== Utilidades =====
function handleDatabaseError(err, res, message) {
  console.error("x " + message, err);
  res.status(500).json({ error: err.message || "Error de servidor" });
}

// JWT middleware
const verificarToken = (req, res, next) => {
  const token =
    req.cookies.token || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ mensaje: "Acceso denegado" });

  try {
    const verificado = jwt.verify(token, SECRET_KEY);
    req.usuario = verificado;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: "Token inválido" });
  }
};

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
    usuario: req.usuario,
  });
});

// ====== CRUD PARA tbl_rol ======
// Listar roles
app.get("/api/roles", (req, res) => {
  const q = "SELECT id_rol, nombre, descripcion FROM tbl_rol ORDER BY nombre ASC";
  conexion.query(q, (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error al listar roles:");
    res.json(rows);
  });
});

// Obtener rol por ID
app.get("/api/roles/:id", (req, res) => {
  const q = "SELECT id_rol, nombre, descripcion FROM tbl_rol WHERE id_rol = ? LIMIT 1";
  conexion.query(q, [parseInt(req.params.id)], (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error al obtener rol:");
    if (rows.length === 0) return res.status(404).json({ mensaje: "Rol no encontrado" });
    res.json(rows[0]);
  });
});

// Crear rol
app.post("/api/roles", (req, res) => {
  let { nombre, descripcion } = req.body;
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El nombre del rol es requerido" });
  }
  nombre = nombre.trim().toUpperCase();
  descripcion = (descripcion ?? "").toString().trim();

  const q = "INSERT INTO tbl_rol (nombre, descripcion) VALUES (?, ?)";
  conexion.query(q, [nombre, descripcion], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ mensaje: "Ya existe un rol con ese nombre" });
      }
      return handleDatabaseError(err, res, "Error al crear rol:");
    }
    res.status(201).json({
      mensaje: "Rol creado correctamente",
      id_rol: result.insertId,
      nombre,
      descripcion
    });
  });
});

// Actualizar rol
app.put("/api/roles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let { nombre, descripcion } = req.body;

  if (!id) return res.status(400).json({ mensaje: "ID inválido" });
  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El nombre del rol es requerido" });
  }
  nombre = nombre.trim().toUpperCase();
  descripcion = (descripcion ?? "").toString().trim();

  const q = "UPDATE tbl_rol SET nombre = ?, descripcion = ? WHERE id_rol = ?";
  conexion.query(q, [nombre, descripcion, id], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ mensaje: "Ya existe un rol con ese nombre" });
      }
      return handleDatabaseError(err, res, "Error al actualizar rol:");
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Rol no encontrado" });
    }
    res.json({ mensaje: "Rol actualizado correctamente" });
  });
});

// Eliminar rol
app.delete("/api/roles/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "ID inválido" });

  const q = "DELETE FROM tbl_rol WHERE id_rol = ?";
  conexion.query(q, [id], (err, result) => {
    if (err) {
      // Si el rol está asignado a usuarios y la FK es RESTRICT, devolver 409
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({
          mensaje: "No se puede eliminar: el rol está asignado a uno o más usuarios"
        });
      }
      return handleDatabaseError(err, res, "Error al eliminar rol:");
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Rol no encontrado" });
    }
    res.json({ mensaje: "Rol eliminado correctamente" });
  });
});

// ===== LOGIN (permitir a todo usuario con rol asignado distinto de "SIN ROL") =====
app.post("/api/login", (req, res) => {
  console.log("Ruta /api/login llamada");
  const { nombre_usuario, contraseña } = req.body;

  if (!nombre_usuario || !contraseña) {
    return res.status(400).json({ mensaje: "Faltan campos obligatorios." });
  }

  const query = `
    SELECT 
      u.id_usuario, 
      u.nombre_usuario, 
      u.contraseña,
      u.id_rol,
      r.nombre AS rol_nombre
    FROM tbl_usuario u
    LEFT JOIN tbl_rol r ON r.id_rol = u.id_rol
    WHERE UPPER(u.nombre_usuario) = UPPER(?) AND u.contraseña = ?
    LIMIT 1
  `;

  conexion.query(query, [nombre_usuario, contraseña], (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error en inicio de sesión:");
    if (rows.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas." });
    }

    const usuario = rows[0];
    const rolNombre = (usuario.rol_nombre || "").trim().toUpperCase();

    // Sin rol asignado o rol "SIN ROL" => bloquear
    if (!usuario.id_rol || !usuario.rol_nombre || rolNombre === "SIN ROL") {
      return res.status(403).json({
        mensaje:
          "No tiene un rol asignado. Comuníquese con el Administrador para que le asigne un rol.",
      });
    }

    // Si tiene cualquier rol válido => permitir
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        id_rol: usuario.id_rol,
        rol_nombre: usuario.rol_nombre,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true en producción con HTTPS
      sameSite: "lax",
      maxAge: 3600000,
    });

    res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        id_rol: usuario.id_rol,
        rol_nombre: usuario.rol_nombre,
      },
    });
  });
});


// ===== LOGOUT =====
app.get("/api/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ mensaje: "Sesión cerrada" });
});

// ===== Recuperar contraseña (verifica TOTP) =====
app.post("/api/recuperar-contrasena", async (req, res) => {
  const { nombre_usuario, codigo } = req.body;

  if (!nombre_usuario || !codigo) {
    return res.status(400).json({ mensaje: "Faltan datos." });
  }

  try {
    // conflicto resuelto: usamos nombre_usuario correctamente
    const query =
      "SELECT secreto_google_auth FROM tbl_usuario WHERE nombre_usuario = ? LIMIT 1";

    conexion.query(query, [nombre_usuario], async (err, rows) => {
      if (err)
        return handleDatabaseError(
          err,
          res,
          "Error al obtener el secreto del usuario:"
        );
      if (rows.length === 0)
        return res.status(404).json({ mensaje: "Usuario no encontrado" });

      const secreto = rows[0].secreto_google_auth;

      const verificado = speakeasy.totp.verify({
        secret: secreto,
        encoding: "base32",
        token: codigo,
        window: 1, // tolerancia 30s
      });

      if (verificado) {
        res.json({
          mensaje:
            "Código válido. Puedes proceder a restablecer la contraseña.",
        });
      } else {
        res.status(400).json({ mensaje: "Código inválido" });
      }
    });
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    res.status(500).json({ mensaje: "Error del servidor" });
  }
});

// ===== Verificar si un usuario existe =====
app.post("/api/verificar-usuario", (req, res) => {
  const { nombre_usuario } = req.body;

  if (!nombre_usuario)
    return res.status(400).json({ mensaje: "nombre_usuario es requerido" });

  const query = "SELECT 1 FROM tbl_usuario WHERE nombre_usuario = ? LIMIT 1";
  conexion.query(query, [nombre_usuario], (err, rows) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "Error al verificar el usuario" });
    res.json({ existe: rows.length > 0 });
  });
});

// ===== Listar todos los usuarios =====
app.get("/api/usuario", (req, res) => {
  const query = "SELECT * FROM tbl_usuario ORDER BY id_usuario DESC";
  conexion.query(query, (err, rows) => {
    if (err) return handleDatabaseError(err, res, "Error en listado de usuario:");
    res.json(rows);
  });
});

// ===== Obtener usuario por ID =====
app.get("/api/usuario/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const query = "SELECT * FROM tbl_usuario WHERE id_usuario = ? LIMIT 1";
  conexion.query(query, [id], (err, rows) => {
    if (err)
      return handleDatabaseError(err, res, "Error al obtener usuario por ID:");
    if (rows.length === 0)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json(rows[0]);
  });
});

// ===== Leer una cookie específica (debug) =====
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

// ===== Insertar nuevo usuario (rol opcional; por defecto sin rol) =====
app.post("/api/usuario", (req, res) => {
  const {
    id_rol,          // opcional: admin puede pasarlo; si no, NULL
    nombre,
    apellido,
    correo,
    nombre_usuario,
    contraseña,
  } = req.body;

  if (!nombre || !apellido || !correo || !nombre_usuario || !contraseña) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const query = `
    INSERT INTO tbl_usuario (id_rol, nombre, apellido, correo, nombre_usuario, contraseña)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [
    id_rol ?? null,
    nombre,
    apellido,
    correo,
    nombre_usuario,
    contraseña,
  ];

  conexion.query(query, values, (err) => {
    if (err) return handleDatabaseError(err, res, "Error al insertar usuario:");
    res.json({ mensaje: "Usuario agregado correctamente" });
  });
});


// ===== Actualizar usuario =====
app.put("/api/usuario", (req, res) => {
  const { id_usuario, id_rol, nombre, apellido, correo, nombre_usuario } = req.body;

  if (!id_usuario)
    return res.status(400).json({ error: "id_usuario es requerido" });

  const query = `
    UPDATE tbl_usuario
    SET id_rol = ?, nombre = ?, apellido = ?, correo = ?, nombre_usuario = ?
    WHERE id_usuario = ?
  `;
  const values = [id_rol ?? null, nombre, apellido, correo, nombre_usuario, id_usuario];

  conexion.query(query, values, (err) => {
    if (err) return handleDatabaseError(err, res, "Error al actualizar usuario:");
    res.json({ mensaje: "Usuario actualizado correctamente" });
  });
});


// ===== Eliminar usuario =====
app.delete("/api/usuario/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const query = "DELETE FROM tbl_usuario WHERE id_usuario = ?";
  conexion.query(query, [id], (err) => {
    if (err)
      return handleDatabaseError(err, res, "Error al eliminar usuario:");
    res.json({ mensaje: "Usuario eliminado correctamente" });
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


//Post insert de productos
app.post('/api/estado_ticket', (request, response) => {
    var query = "INSERT INTO marina_mercante.tl_estado_ticket (estado) VALUES (?)";
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
            return response.status(500).json({ error: err.message }); // Mejor manejo de errores
        }
        registrarBitacora("productos", "DELETE", request.body);
        response.json("DELETE EXITOSO!");
        console.log("DELETE de estado ticket - OK");
    });
});

// ====== CRUD PARA tl_proveedor ======  
app.get('/api/proveedor', (req, res) => {  
  const query = "SELECT * FROM tl_proveedor";  
  conexion.query(query, (err, rows) => {  
    if (err) {  
      console.error("Error al listar proveedor:", err);  
      res.status(500).json({ error: "Error al listar proveedor" });  
      return;  
    }  
    res.json(rows);  
  });  
});  
  
app.get('/api/proveedor/:id', (req, res) => {  
  const query = "SELECT * FROM tl_proveedor WHERE id_proveedor = ?";  
  conexion.query(query, [req.params.id], (err, rows) => {  
    if (err) {  
      console.error("Error al obtener proveedor:", err);  
      res.status(500).json({ error: "Error al obtener proveedor" });  
      return;  
    }  
    res.json(rows[0]);  
  });  
});  
  
app.post('/api/proveedor', (req, res) => {  
  const { nombre, telefono, direccion } = req.body;  
  const query = "INSERT INTO tbl_proveedor (nombre, telefono, direccion) VALUES (?, ?, ?)";  
  conexion.query(query, [nombre, telefono, direccion], (err, result) => {  
    if (err) {  
      console.error("Error al insertar proveedor:", err);  
      res.status(500).json({ error: "Error al insertar proveedor" });  
      return;  
    }  
    res.json({ message: "Proveedor insertado correctamente", id: result.insertId });  
  });  
});  
  
app.put('/api/proveedor/:id', (req, res) => {  
  const { nombre, telefono, direccion } = req.body;  
  const query = "UPDATE tbl_proveedor SET nombre = ?, telefono = ?, direccion = ? WHERE id_proveedor = ?";  
  conexion.query(query, [nombre, telefono, direccion, req.params.id], (err) => {  
    if (err) {  
      console.error("Error al actualizar proveedor:", err);  
      res.status(500).json({ error: "Error al actualizar proveedor" });  
      return;  
    }  
    res.json({ message: "Proveedor actualizado correctamente" });  
  });  
});  
  
app.delete('/api/proveedor/:id', (req, res) => {  
  const query = "DELETE FROM tl_proveedor WHERE id_proveedor = ?";  
  conexion.query(query, [req.params.id], (err) => {  
    if (err) {  
      console.error("Error al eliminar proveedor:", err);  
      res.status(500).json({ error: "Error al eliminar proveedor" });  
      return;  
    }  
    res.json({ message: "Proveedor eliminado correctamente" });  
  });  
});  

// ====== CRUD PARA tl_compra ======  
app.get('/api/compra', (req, res) => {  
  const query = "SELECT * FROM tl_compra";  
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

// ====== CRUD PARA tl_bitacora ======

// Listar todas las bitácoras
app.get('/api/bitacoras', (req, res) => {
  const query = "SELECT * FROM tbl_bitacora";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar bitácoras:", err);
      res.status(500).json({ error: "Error al listar bitácoras" });
      return;
    }
    res.json(rows);
  });
});

// Obtener una bitácora por ID
app.get('/api/bitacoras/:id', (req, res) => {
  const query = "SELECT * FROM tbl_bitacora WHERE id_bitacora = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener bitácora:", err);
      res.status(500).json({ error: "Error al obtener bitácora" });
      return;
    }
    res.json(rows[0]);
  });
});

// Insertar una nueva bitácora (fecha se genera automáticamente)
app.post('/api/bitacoras', (req, res) => {
  const { id_usuario, accion } = req.body;
  const query = `
    INSERT INTO tbl_bitacora (id_usuario, accion, fecha)
    VALUES (?, ?, NOW())
  `;
  conexion.query(query, [id_usuario, accion], (err, result) => {
    if (err) {
      console.error("Error al insertar bitácora:", err);
      res.status(500).json({ error: "Error al insertar bitácora" });
      return;
    }
    res.json({ message: "Bitácora insertada correctamente", id: result.insertId });
  });
});

// Actualizar una bitácora
app.put('/api/bitacoras/:id', (req, res) => {
  const { id_usuario, accion } = req.body;
  const query = `
    UPDATE tbl_bitacora
    SET id_usuario = ?, accion = ?, fecha = NOW()
    WHERE id_bitacora = ?
  `;
  conexion.query(query, [id_usuario, accion, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar bitácora:", err);
      res.status(500).json({ error: "Error al actualizar bitácora" });
      return;
    }
    res.json({ message: "Bitácora actualizada correctamente" });
  });
});

// Eliminar una bitácora
app.delete('/api/bitacoras/:id', (req, res) => {
  const query = "DELETE FROM tbl_bitacora WHERE id_bitacora = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar bitácora:", err);
      res.status(500).json({ error: "Error al eliminar bitácora" });
      return;
    }
    res.json({ message: "Bitácora eliminada correctamente" });
  });
});

// ====== CRUD PARA tl_productos ======

// Listar todos los productos
app.get('/api/productos', (req, res) => {
  const query = "SELECT * FROM tbl_productos";
  conexion.query(query, (err, rows) => {
    if (err) {
      console.error("Error al listar productos:", err);
      res.status(500).json({ error: "Error al listar productos" });
      return;
    }
    res.json(rows);
  });
});

// Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
  const query = "SELECT * FROM tbl_productos WHERE id_producto = ?";
  conexion.query(query, [req.params.id], (err, rows) => {
    if (err) {
      console.error("Error al obtener producto:", err);
      res.status(500).json({ error: "Error al obtener producto" });
      return;
    }
    res.json(rows[0]);
  });
});

// Insertar un nuevo producto
app.post('/api/productos', (req, res) => {
  const { cantidad_minima, cantidad_maxima } = req.body;
  const query = `
    INSERT INTO tbl_productos (cantidad_minima, cantidad_maxima)
    VALUES (?, ?)
  `;
  conexion.query(query, [cantidad_minima, cantidad_maxima], (err, result) => {
    if (err) {
      console.error("Error al insertar producto:", err);
      res.status(500).json({ error: "Error al insertar producto" });
      return;
    }
    res.json({ message: "Producto insertado correctamente", id: result.insertId });
  });
});

// Actualizar un producto
app.put('/api/productos/:id', (req, res) => {
  const { cantidad_minima, cantidad_maxima } = req.body;
  const query = `
    UPDATE tbl_productos
    SET cantidad_minima = ?, cantidad_maxima = ?
    WHERE id_producto = ?
  `;
  conexion.query(query, [cantidad_minima, cantidad_maxima, req.params.id], (err) => {
    if (err) {
      console.error("Error al actualizar producto:", err);
      res.status(500).json({ error: "Error al actualizar producto" });
      return;
    }
    res.json({ message: "Producto actualizado correctamente" });
  });
});

// Eliminar un producto
app.delete('/api/productos/:id', (req, res) => {
  const query = "DELETE FROM tbl_productos WHERE id_producto = ?";
  conexion.query(query, [req.params.id], (err) => {
    if (err) {
      console.error("Error al eliminar producto:", err);
      res.status(500).json({ error: "Error al eliminar producto" });
      return;
    }
    res.json({ message: "Producto eliminado correctamente" });
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

// ====== PROCEDIMIENTOS ALMACENADOS - PRODUCTOS ======

// Insertar producto usando SP
app.post('/api/productos', (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima, descripcion } = req.body;
  
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
    registrarBitacora("productos", "INSERT (SP)");
    logger.info("INSERT de producto con SP - OK");
    res.json({ mensaje: "Producto insertado correctamente mediante SP" });
  });
});

// Actualizar producto usando SP
app.put('/api/productos/:id', (req, res) => {
  const { nombre_producto, cantidad_minima, cantidad_maxima, descripcion } = req.body;
  const id_producto = parseInt(req.params.id);

  const query = "CALL SP_ActualizarProducto(?, ?, ?, ?, ?)";
  const values = [id_producto, nombre_producto, cantidad_minima, cantidad_maxima, descripcion];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar producto con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar producto" });
    }
    registrarBitacora("productos", "UPDATE (SP)");
    logger.info("UPDATE de producto con SP - OK");
    res.json({ mensaje: "Producto actualizado correctamente mediante SP" });
  });
});

// Eliminar producto usando SP
app.delete('/api/productos/:id', (req, res) => {
  const id_producto = parseInt(req.params.id);
  const query = "CALL SP_EliminarProducto(?)";

  conexion.query(query, [id_producto], (err) => {
    if (err) {
      console.error("Error al eliminar producto con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar producto" });
    }
    registrarBitacora("productos", "DELETE (SP)");
    logger.info("DELETE de producto con SP - OK");
    res.json({ mensaje: "Producto eliminado correctamente mediante SP" });
  });
});

// Mostrar todos los productos usando SP
app.get('/api/productos', (req, res) => {
  const query = "CALL SP_MostrarProductos()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar productos con SP:", err);
      return res.status(500).json({ error: "Error al listar productos" });
    }
    registrarBitacora("productos", "GET (SP)");
    logger.info("Listado de productos con SP - OK");
    res.json(results[0]); // Los SP devuelven un array de arrays
  });
});

// ====== PROCEDIMIENTOS ALMACENADOS - PROVEEDORES ======

// Insertar proveedor usando SP
app.post('/api/proveedor', (req, res) => {
  const { nombre, telefono, direccion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre del proveedor es obligatorio" });
  }

  const query = "CALL SP_InsertarProveedor(?, ?, ?)";
  const values = [nombre, telefono, direccion];

  conexion.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al insertar proveedor con SP:", err);
      return res.status(500).json({ error: err.message || "Error al insertar proveedor" });
    }
    registrarBitacora("proveedor", "INSERT (SP)");
    logger.info("INSERT de proveedor con SP - OK");
    res.json({ mensaje: "Proveedor insertado correctamente mediante SP" });
  });
});

// Actualizar proveedor usando SP
app.put('/api/proveedor/:id', (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  const id_proveedor = parseInt(req.params.id);

  const query = "CALL SP_ActualizarProveedor(?, ?, ?, ?)";
  const values = [id_proveedor, nombre, telefono, direccion];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar proveedor con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar proveedor" });
    }
    registrarBitacora("proveedor", "UPDATE (SP)");
    logger.info("UPDATE de proveedor con SP - OK");
    res.json({ mensaje: "Proveedor actualizado correctamente mediante SP" });
  });
});

// Eliminar proveedor usando SP
app.delete('/api/proveedor/:id', (req, res) => {
  const id_proveedor = parseInt(req.params.id);
  const query = "CALL SP_EliminarProveedor(?)";

  conexion.query(query, [id_proveedor], (err) => {
    if (err) {
      console.error("Error al eliminar proveedor con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar proveedor" });
    }
    registrarBitacora("proveedor", "DELETE (SP)");
    logger.info("DELETE de proveedor con SP - OK");
    res.json({ mensaje: "Proveedor eliminado correctamente mediante SP" });
  });
});

// Mostrar todos los proveedores usando SP
app.get('/api/proveedor', (req, res) => {
  const query = "CALL SP_MostrarProveedores()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar proveedores con SP:", err);
      return res.status(500).json({ error: "Error al listar proveedores" });
    }
    registrarBitacora("proveedor", "GET (SP)");
    logger.info("Listado de proveedores con SP - OK");
    res.json(results[0]);
  });
});

// ====== PROCEDIMIENTOS ALMACENADOS - INVENTARIO ======

// Insertar inventario usando SP
app.post('/api/inventario', (req, res) => {
  const { id_producto, cantidad } = req.body;

  if (!id_producto) {
    return res.status(400).json({ error: "El producto es obligatorio" });
  }

  const query = "CALL SP_InsertarInventario(?, ?)";
  const values = [id_producto, cantidad];

  conexion.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al insertar inventario con SP:", err);
      return res.status(500).json({ error: err.message || "Error al insertar inventario" });
    }
    registrarBitacora("inventario", "INSERT (SP)");
    logger.info("INSERT de inventario con SP - OK");
    res.json({ mensaje: "Inventario insertado correctamente mediante SP" });
  });
});

// Actualizar inventario usando SP
app.put('/api/inventario/:id', (req, res) => {
  const { cantidad } = req.body;
  const id_inventario = parseInt(req.params.id);

  const query = "CALL SP_ActualizarInventario(?, ?)";
  const values = [id_inventario, cantidad];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar inventario con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar inventario" });
    }
    registrarBitacora("inventario", "UPDATE (SP)");
    logger.info("UPDATE de inventario con SP - OK");
    res.json({ mensaje: "Inventario actualizado correctamente mediante SP" });
  });
});

// Eliminar inventario usando SP
app.delete('/api/inventario/:id', (req, res) => {
  const id_inventario = parseInt(req.params.id);
  const query = "CALL SP_EliminarInventario(?)";

  conexion.query(query, [id_inventario], (err) => {
    if (err) {
      console.error("Error al eliminar inventario con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar inventario" });
    }
    registrarBitacora("inventario", "DELETE (SP)");
    logger.info("DELETE de inventario con SP - OK");
    res.json({ mensaje: "Inventario eliminado correctamente mediante SP" });
  });
});

// Mostrar inventario usando SP (con JOIN)
app.get('/api/inventario', (req, res) => {
  const query = "CALL SP_MostrarInventario()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar inventario con SP:", err);
      return res.status(500).json({ error: "Error al listar inventario" });
    }
    registrarBitacora("inventario", "GET (SP)");
    logger.info("Listado de inventario con SP - OK");
    res.json(results[0]);
  });
});

// ====== PROCEDIMIENTOS ALMACENADOS - KARDEX ======

// Insertar kardex usando SP (con validaciones y detalle de compra)
app.post('/api/kardex', (req, res) => {
  const { 
    id_usuario, 
    id_producto, 
    cantidad, 
    tipo_movimiento, 
    estado, 
    descripcion,
    id_proveedor,
    monto_total
  } = req.body;

  if (!id_usuario || !id_producto || !cantidad || !tipo_movimiento) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const query = "CALL SP_InsertarKardex(?, ?, ?, ?, ?, ?, ?, ?)";
  const values = [
    id_usuario, 
    id_producto, 
    cantidad, 
    tipo_movimiento, 
    estado || 'Pendiente', 
    descripcion,
    id_proveedor || null,
    monto_total || null
  ];

  conexion.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al insertar kardex con SP:", err);
      return res.status(500).json({ error: err.message || "Error al insertar kardex" });
    }
    registrarBitacora("kardex", "INSERT (SP)");
    logger.info("INSERT de kardex con SP - OK");
    res.json({ mensaje: "Kardex insertado correctamente mediante SP" });
  });
});

// Actualizar kardex usando SP
app.put('/api/kardex/:id', (req, res) => {
  const { estado } = req.body;
  const id_kardex = parseInt(req.params.id);

  if (!estado) {
    return res.status(400).json({ error: "El estado es obligatorio" });
  }

  const query = "CALL SP_ActualizarKardex(?, ?)";
  const values = [id_kardex, estado];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar kardex con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar kardex" });
    }
    registrarBitacora("kardex", "UPDATE (SP)");
    logger.info("UPDATE de kardex con SP - OK");
    res.json({ mensaje: "Kardex actualizado correctamente mediante SP" });
  });
});

// Eliminar kardex usando SP
app.delete('/api/kardex/:id', (req, res) => {
  const id_kardex = parseInt(req.params.id);
  const query = "CALL SP_EliminarKardex(?)";

  conexion.query(query, [id_kardex], (err) => {
    if (err) {
      console.error("Error al eliminar kardex con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar kardex" });
    }
    registrarBitacora("kardex", "DELETE (SP)");
    logger.info("DELETE de kardex con SP - OK");
    res.json({ mensaje: "Kardex eliminado correctamente mediante SP" });
  });
});

// Mostrar kardex usando SP
app.get('/api/kardex', (req, res) => {
  const query = "CALL SP_MostrarKardex()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar kardex con SP:", err);
      return res.status(500).json({ error: "Error al listar kardex" });
    }
    registrarBitacora("kardex", "GET (SP)");
    logger.info("Listado de kardex con SP - OK");
    res.json(results[0]);
  });
});

// ====== PROCEDIMIENTOS ALMACENADOS - DETALLE COMPRA ======

// Insertar detalle de compra usando SP
app.post('/api/detalle_compra', (req, res) => {
  const { id_kardex, id_proveedor, monto_total } = req.body;

  if (!id_kardex || !id_proveedor || !monto_total) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const query = "CALL SP_InsertarDetalleCompra(?, ?, ?)";
  const values = [id_kardex, id_proveedor, monto_total];

  conexion.query(query, values, (err, result) => {
    if (err) {
      console.error("Error al insertar detalle de compra con SP:", err);
      return res.status(500).json({ error: err.message || "Error al insertar detalle de compra" });
    }
    registrarBitacora("detalle_compra", "INSERT (SP)");
    logger.info("INSERT de detalle de compra con SP - OK");
    res.json({ mensaje: "Detalle de compra insertado correctamente mediante SP" });
  });
});

// Actualizar detalle de compra usando SP
app.put('/api/detalle_compra/:id', (req, res) => {
  const { monto_total } = req.body;
  const id_detalle_compra = parseInt(req.params.id);

  if (!monto_total) {
    return res.status(400).json({ error: "El monto total es obligatorio" });
  }

  const query = "CALL SP_ActualizarDetalleCompra(?, ?)";
  const values = [id_detalle_compra, monto_total];

  conexion.query(query, values, (err) => {
    if (err) {
      console.error("Error al actualizar detalle de compra con SP:", err);
      return res.status(500).json({ error: err.message || "Error al actualizar detalle de compra" });
    }
    registrarBitacora("detalle_compra", "UPDATE (SP)");
    logger.info("UPDATE de detalle de compra con SP - OK");
    res.json({ mensaje: "Detalle de compra actualizado correctamente mediante SP" });
  });
});

// Eliminar detalle de compra usando SP
app.delete('/api/detalle_compra/:id', (req, res) => {
  const id_detalle_compra = parseInt(req.params.id);
  const query = "CALL SP_EliminarDetalleCompra(?)";

  conexion.query(query, [id_detalle_compra], (err) => {
    if (err) {
      console.error("Error al eliminar detalle de compra con SP:", err);
      return res.status(500).json({ error: err.message || "Error al eliminar detalle de compra" });
    }
    registrarBitacora("detalle_compra", "DELETE (SP)");
    logger.info("DELETE de detalle de compra con SP - OK");
    res.json({ mensaje: "Detalle de compra eliminado correctamente mediante SP" });
  });
});

// Mostrar detalle de compra usando SP (con JOINs)
app.get('/api/detalle_compra', (req, res) => {
  const query = "CALL SP_MostrarDetalleCompra()";

  conexion.query(query, (err, results) => {
    if (err) {
      console.error("Error al listar detalle de compra con SP:", err);
      return res.status(500).json({ error: "Error al listar detalle de compra" });
    }
    registrarBitacora("detalle_compra", "GET (SP)");
    logger.info("Listado de detalle de compra con SP - OK");
    res.json(results[0]);
  });
});

// ===== 404 =====
app.use((req, res) => res.status(404).json({ mensaje: "Ruta no encontrada" }));
