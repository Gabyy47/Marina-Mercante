// API/backupRoutes.js
const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const DB_CONFIG = require("./dbConfig");
const { verificarToken, autorizarRoles } = require("./middlewares/auth");

// Datos de conexión que usaremos para mysqldump/mysql
const DB_HOST = DB_CONFIG.host;
const DB_USER = DB_CONFIG.user;
const DB_PASSWORD = DB_CONFIG.password || "";
const DB_NAME = DB_CONFIG.database;

// Ruta donde se guardarán los .sql
const BACKUP_DIR = path.join(__dirname, "backups");
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Ruta del binario de MySQL en tu máquina
const MYSQL_BIN_PATH =
  process.env.MYSQL_BIN_PATH ||
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\';

// Configuración de multer para RESTORE (subir archivo .sql)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BACKUP_DIR),
  filename: (req, file, cb) =>
    cb(null, `restore_${Date.now()}_${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith(".sql")) {
      return cb(new Error("Solo se permiten archivos .sql"));
    }
    cb(null, true);
  },
});

// Crear router de Express
const router = express.Router();

/* =======================
   GET /api/backup
   Generar y descargar backup
======================= */
router.get(
  "/backup",
  verificarToken,
  autorizarRoles("Administrador"),
  (req, res) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `backup_${DB_NAME}_${timestamp}.sql`;
      const backupPath = path.join(BACKUP_DIR, fileName);

      // Asegúrate de que MYSQL_BIN_PATH apunta a tu carpeta bin de MySQL
      const mysqldumpExe = `"${path.join(MYSQL_BIN_PATH, "mysqldump")}"`;

      let command = `${mysqldumpExe} -h ${DB_HOST} -u ${DB_USER}`;
      if (DB_PASSWORD) {
        command += ` -p${DB_PASSWORD}`;
      }
      command += ` ${DB_NAME} > "${backupPath}"`;

      console.log("[BACKUP cmd]", command);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("Error generando backup:", error);
          console.error("stderr:", stderr);
          return res
            .status(500)
            .json({ mensaje: "Error al generar el backup" });
        }

        console.log("✅ Backup generado:", backupPath);

        // Enviamos el .sql al frontend
        return res.download(backupPath, fileName, (err) => {
          if (err) {
            console.error("Error enviando archivo:", err);
          }
        });
      });
    } catch (e) {
      console.error("Error inesperado en /backup:", e);
      return res.status(500).json({ mensaje: "Error inesperado en backup" });
    }
  }
);

/* =======================
   POST /api/restore
   Restaurar desde un backup .sql
======================= */
router.post(
  "/restore",
  verificarToken,
  autorizarRoles("Administrador"),
  upload.single("backupFile"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ mensaje: "No se recibió archivo .sql" });
    }

    const filePath = req.file.path;
    console.log("[RESTORE file]", filePath);

    const mysqlExe = `"${path.join(MYSQL_BIN_PATH, "mysql")}"`;

    let command = `${mysqlExe} -h ${DB_HOST} -u ${DB_USER}`;
    if (DB_PASSWORD) {
      command += ` -p${DB_PASSWORD}`;
    }
    command += ` ${DB_NAME} < "${filePath}"`;

    console.log("[RESTORE cmd]", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error restaurando backup:", error);
        console.error(stderr);
        return res
          .status(500)
          .json({ mensaje: "Error al restaurar el backup" });
      }

      return res.json({
        mensaje: "Base de datos restaurada correctamente desde el backup.",
      });
    });
  }
);

// Exportar el router
module.exports = router;
