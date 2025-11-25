// src/BackupRestore.jsx
import { useState } from "react";
import api from "./api"; // tu instancia de axios con baseURL

const BackupRestore = () => {
  const [backupFile, setBackupFile] = useState(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [activeTab, setActiveTab] = useState("backup"); // "backup" | "restore"

  const handleGenerarBackup = async () => {
    try {
      setMensaje("");
      setLoadingBackup(true);

      const response = await api.get("/backup", {
        responseType: "blob",
      });

      // Crear descarga del archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      let fileName = "backup.sql";
      const cd = response.headers["content-disposition"];
      if (cd) {
        const match = cd.match(/filename="?(.+)"?/);
        if (match && match[1]) fileName = match[1];
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMensaje("Backup generado y descargado correctamente.");
    } catch (err) {
      console.error(err);
      setMensaje("Error al generar el backup.");
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleFileChange = (e) => {
    setBackupFile(e.target.files[0] || null);
  };

  const handleRestaurarBackup = async () => {
    if (!backupFile) {
      setMensaje("Selecciona primero un archivo .sql para restaurar.");
      return;
    }

    const confirmar = window.confirm(
      "⚠ Esto reemplazará los datos actuales de la base de datos. ¿Seguro que quieres continuar?"
    );
    if (!confirmar) return;

    try {
      setMensaje("");
      setLoadingRestore(true);

      const formData = new FormData();
      formData.append("backupFile", backupFile);

      const { data } = await api.post("/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMensaje(data.mensaje || "Base de datos restaurada correctamente.");
    } catch (err) {
      console.error(err);
      setMensaje("Error al restaurar el backup.");
    } finally {
      setLoadingRestore(false);
    }
  };

  return (
    <div className="backup-page" style={{ padding: "20px" }}>
      <h2>Gestión de Base de Datos</h2>

      {/* Tabs Backup / Restore */}
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={() => setActiveTab("backup")}
          style={{
            padding: "8px 16px",
            marginRight: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            backgroundColor: activeTab === "backup" ? "#007bff" : "#f5f5f5",
            color: activeTab === "backup" ? "#fff" : "#000",
          }}
        >
          Backup
        </button>
        <button
          onClick={() => setActiveTab("restore")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            backgroundColor: activeTab === "restore" ? "#007bff" : "#f5f5f5",
            color: activeTab === "restore" ? "#fff" : "#000",
          }}
        >
          Restore
        </button>
      </div>

      {activeTab === "backup" && (
        <div>
          <p>
            Desde aquí puedes generar un respaldo completo de la base de datos
            del sistema.
          </p>
          <button onClick={handleGenerarBackup} disabled={loadingBackup}>
            {loadingBackup ? "Generando backup..." : "Generar y descargar backup"}
          </button>
        </div>
      )}

      {activeTab === "restore" && (
        <div>
          <p>
            Selecciona un archivo <strong>.sql</strong> previamente generado
            para restaurar la base de datos.
          </p>
          <input type="file" accept=".sql" onChange={handleFileChange} />
          <br />
          <button
            onClick={handleRestaurarBackup}
            disabled={loadingRestore || !backupFile}
            style={{ marginTop: "10px" }}
          >
            {loadingRestore ? "Restaurando..." : "Restaurar desde backup"}
          </button>
          <p style={{ marginTop: "10px", color: "red" }}>
            ⚠ Esta operación sobrescribirá los datos actuales.
          </p>
        </div>
      )}

      {mensaje && (
        <p style={{ marginTop: "20px", fontWeight: "bold" }}>{mensaje}</p>
      )}
    </div>
  );
};

export default BackupRestore;
