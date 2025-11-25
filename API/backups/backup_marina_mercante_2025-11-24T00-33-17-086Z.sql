-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: marina_mercante
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `tbl_bitacora`
--

DROP TABLE IF EXISTS `tbl_bitacora`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_bitacora` (
  `id_bitacora` int NOT NULL AUTO_INCREMENT,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` int DEFAULT NULL,
  `id_objeto` int DEFAULT NULL,
  `usuario` varchar(100) NOT NULL,
  `accion` varchar(100) NOT NULL DEFAULT 'REGISTRO_USUARIO',
  `descripcion` text,
  PRIMARY KEY (`id_bitacora`),
  KEY `indx_id_bitacora` (`id_bitacora`),
  KEY `FK_bitacora_objeto` (`id_objeto`),
  CONSTRAINT `FK_bitacora_objeto` FOREIGN KEY (`id_objeto`) REFERENCES `tbl_objeto` (`id_objeto`)
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_bitacora`
--

LOCK TABLES `tbl_bitacora` WRITE;
/*!40000 ALTER TABLE `tbl_bitacora` DISABLE KEYS */;
INSERT INTO `tbl_bitacora` VALUES (1,'2025-10-21 11:19:41',NULL,NULL,'root@localhost','Se agregó el cargo: mantenimiento',NULL),(2,'2025-10-21 11:19:43',NULL,NULL,'root@localhost','Se agregó el cargo: Atencion_tickets',NULL),(3,'2025-10-21 11:19:44',NULL,NULL,'root@localhost','Se agregó el cargo: Guarda_almacen',NULL),(4,'2025-10-21 11:19:44',NULL,NULL,'root@localhost','Se agregó el cargo: Auxiliar_de_almacen',NULL),(5,'2025-10-21 11:27:09',NULL,NULL,'root@localhost','Se actualizó el cargo: Atencion tickets',NULL),(6,'2025-10-21 11:27:32',NULL,NULL,'root@localhost','Se actualizó el cargo: Guarda almacen',NULL),(7,'2025-10-21 11:28:10',NULL,NULL,'root@localhost','Se actualizó el cargo: Auxiliar de almacen',NULL),(8,'2025-10-21 12:19:11',NULL,NULL,'root@localhost','Se agregó el usuario: Gabriela con el cargo: 1 y correo: gabybanegas120@gmail.com',NULL),(9,'2025-10-21 13:33:20',NULL,NULL,'root@localhost','Se agregó el usuario: Gabriela con el cargo: 2 y correo: gabybanegas380@gmail.com',NULL),(10,'2025-10-30 16:49:10',NULL,NULL,'root@localhost','Se eliminó el cargo: mantenimiento',NULL),(11,'2025-10-30 16:49:13',NULL,NULL,'root@localhost','Se eliminó el cargo: Atencion tickets',NULL),(12,'2025-10-30 16:49:14',NULL,NULL,'root@localhost','Se eliminó el cargo: Guarda almacen',NULL),(13,'2025-10-30 16:49:14',NULL,NULL,'root@localhost','Se eliminó el cargo: Auxiliar de almacen',NULL),(14,'2025-11-08 18:05:43',1,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(15,'2025-11-11 17:26:42',6,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(16,'2025-11-11 17:58:44',6,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(17,'2025-11-12 17:34:09',6,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(18,'2025-11-12 17:48:50',1,2,'GABY','GET','Se consultó la lista de proveedores'),(19,'2025-11-12 17:56:44',1,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(20,'2025-11-13 16:34:46',6,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(21,'2025-11-13 16:50:35',6,1,'BANEGAS4','LOGIN','El usuario BANEGAS4 inició sesión.'),(22,'2025-11-13 16:50:44',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(23,'2025-11-13 16:50:47',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(24,'2025-11-13 16:51:10',6,2,'BANEGAS4','PUT','Se actualizó proveedor id=2 (La fortaleza)'),(25,'2025-11-13 16:51:57',6,2,'BANEGAS4','DELETE','Se eliminó proveedor id=4'),(26,'2025-11-13 16:53:54',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(27,'2025-11-13 16:53:54',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(28,'2025-11-13 16:54:57',6,2,'BANEGAS4','POST','Se creó proveedor id=6 (MK)'),(29,'2025-11-13 16:57:24',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(30,'2025-11-13 16:57:24',6,2,'BANEGAS4','GET','Se consultó la lista de proveedores'),(31,'2025-11-13 17:00:01',6,2,'BANEGAS4','POST','Se creó proveedor id=7 (El Porvenir)'),(32,'2025-11-13 17:00:32',6,2,'BANEGAS4','PUT','Se actualizó proveedor id=5 (La bodega)'),(33,'2025-11-13 17:00:49',6,2,'BANEGAS4','DELETE','Se eliminó proveedor id=5'),(34,'2025-11-20 18:08:34',12,1,'JESS11','LOGIN','El usuario JESS11 inició sesión.'),(35,'2025-11-20 18:08:40',12,6,'JESS11','GET','Se consultó la lista de productos'),(36,'2025-11-20 18:08:42',12,6,'JESS11','GET','Se consultó la lista de productos'),(37,'2025-11-20 18:08:49',12,6,'JESS11','GET','Se consultó la lista de productos'),(38,'2025-11-20 18:08:49',12,6,'JESS11','GET','Se consultó la lista de productos'),(39,'2025-11-20 18:08:57',12,6,'JESS11','GET','Se consultó la lista de productos'),(40,'2025-11-20 18:08:57',12,6,'JESS11','GET','Se consultó la lista de productos'),(41,'2025-11-20 18:08:59',12,6,'JESS11','GET','Se consultó la lista de productos'),(42,'2025-11-20 18:08:59',12,6,'JESS11','GET','Se consultó la lista de productos'),(43,'2025-11-20 18:09:04',12,6,'JESS11','GET','Se consultó la lista de productos'),(44,'2025-11-20 18:09:04',12,6,'JESS11','GET','Se consultó la lista de productos'),(45,'2025-11-20 18:09:06',12,6,'JESS11','GET','Se consultó la lista de productos'),(46,'2025-11-20 18:09:06',12,6,'JESS11','GET','Se consultó la lista de productos'),(47,'2025-11-20 18:09:08',12,6,'JESS11','GET','Se consultó la lista de productos'),(48,'2025-11-20 18:09:08',12,6,'JESS11','GET','Se consultó la lista de productos'),(49,'2025-11-20 18:14:54',12,6,'JESS11','GET','Se consultó la lista de productos'),(50,'2025-11-20 18:14:54',12,6,'JESS11','GET','Se consultó la lista de productos'),(51,'2025-11-20 18:30:55',12,6,'JESS11','GET','Se consultó la lista de productos'),(52,'2025-11-20 18:30:55',12,6,'JESS11','GET','Se consultó la lista de productos'),(53,'2025-11-20 18:31:01',12,6,'JESS11','GET','Se consultó la lista de productos'),(54,'2025-11-20 18:31:01',12,6,'JESS11','GET','Se consultó la lista de productos'),(55,'2025-11-20 18:31:01',12,6,'JESS11','GET','Se consultó la lista de productos'),(56,'2025-11-20 18:31:18',12,6,'JESS11','GET','Se consultó la lista de productos'),(57,'2025-11-20 18:31:18',12,6,'JESS11','GET','Se consultó la lista de productos'),(58,'2025-11-20 18:33:41',12,6,'JESS11','GET','Se consultó la lista de productos'),(59,'2025-11-20 18:33:42',12,6,'JESS11','GET','Se consultó la lista de productos'),(60,'2025-11-20 18:34:33',12,1,'JESS11','LOGIN','El usuario JESS11 inició sesión.'),(61,'2025-11-20 18:34:34',12,6,'JESS11','GET','Se consultó la lista de productos'),(62,'2025-11-20 18:34:35',12,6,'JESS11','GET','Se consultó la lista de productos'),(63,'2025-11-20 18:35:55',12,6,'JESS11','GET','Se consultó la lista de productos'),(64,'2025-11-20 18:35:55',12,6,'JESS11','GET','Se consultó la lista de productos'),(65,'2025-11-20 18:36:06',12,6,'JESS11','GET','Se consultó la lista de productos'),(66,'2025-11-20 18:36:06',12,6,'JESS11','GET','Se consultó la lista de productos'),(67,'2025-11-20 18:36:08',12,6,'JESS11','GET','Se consultó la lista de productos'),(68,'2025-11-20 18:36:08',12,6,'JESS11','GET','Se consultó la lista de productos'),(69,'2025-11-20 18:36:12',12,6,'JESS11','GET','Se consultó la lista de productos'),(70,'2025-11-20 18:36:12',12,6,'JESS11','GET','Se consultó la lista de productos'),(71,'2025-11-20 18:36:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(72,'2025-11-20 18:36:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(73,'2025-11-20 18:36:24',12,6,'JESS11','GET','Se consultó la lista de productos'),(74,'2025-11-20 18:36:24',12,6,'JESS11','GET','Se consultó la lista de productos'),(75,'2025-11-20 18:38:39',12,2,'JESS11','POST','SP_InsertarProveedor: Se creó proveedor \"La Sula\"'),(76,'2025-11-20 18:40:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(77,'2025-11-20 18:40:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(78,'2025-11-20 18:49:23',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(79,'2025-11-20 18:49:23',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(80,'2025-11-20 18:51:53',12,6,'JESS11','GET','Se consultó la lista de productos'),(81,'2025-11-20 18:51:53',12,6,'JESS11','GET','Se consultó la lista de productos'),(82,'2025-11-20 18:51:54',12,6,'JESS11','GET','Se consultó la lista de productos'),(83,'2025-11-20 18:51:54',12,6,'JESS11','GET','Se consultó la lista de productos'),(84,'2025-11-20 18:52:05',12,6,'JESS11','GET','Se consultó la lista de productos'),(85,'2025-11-20 18:52:05',12,6,'JESS11','GET','Se consultó la lista de productos'),(86,'2025-11-20 18:52:13',12,6,'JESS11','GET','Se consultó la lista de productos'),(87,'2025-11-20 18:52:13',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(88,'2025-11-20 18:52:13',12,6,'JESS11','GET','Se consultó la lista de productos'),(89,'2025-11-20 18:52:14',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(90,'2025-11-20 18:56:46',12,6,'JESS11','GET','Se consultó la lista de productos'),(91,'2025-11-20 18:56:47',12,6,'JESS11','GET','Se consultó la lista de productos'),(92,'2025-11-20 18:56:48',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(93,'2025-11-20 18:56:48',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(94,'2025-11-20 18:57:07',12,2,'JESS11','PUT','SP_ActualizarProveedor: Se actualizó proveedor ID=8'),(95,'2025-11-20 18:57:07',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(96,'2025-11-20 18:57:08',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(97,'2025-11-20 18:57:37',12,2,'JESS11','DELETE','SP_EliminarProveedor: Se eliminó proveedor ID=2'),(98,'2025-11-20 18:57:37',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(99,'2025-11-20 18:57:37',12,2,'JESS11','GET','SP_MostrarProveedores: Se consultó listado de proveedores'),(100,'2025-11-20 18:58:10',12,6,'JESS11','GET','Se consultó la lista de productos'),(101,'2025-11-20 18:58:10',12,6,'JESS11','GET','Se consultó la lista de productos'),(102,'2025-11-20 19:09:15',12,6,'JESS11','GET','Se consultó la lista de productos'),(103,'2025-11-20 19:09:17',12,6,'JESS11','GET','Se consultó la lista de productos'),(104,'2025-11-20 19:09:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(105,'2025-11-20 19:09:23',12,6,'JESS11','GET','Se consultó la lista de productos'),(106,'2025-11-20 19:12:12',12,6,'JESS11','GET','Se consultó la lista de productos'),(107,'2025-11-20 19:12:12',12,6,'JESS11','GET','Se consultó la lista de productos'),(108,'2025-11-21 01:16:20',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(109,'2025-11-21 20:32:01',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(110,'2025-11-21 21:21:52',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(111,'2025-11-21 23:36:17',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(112,'2025-11-22 00:12:56',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(113,'2025-11-22 00:36:34',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(114,'2025-11-23 17:50:14',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.'),(115,'2025-11-23 18:17:49',14,1,'GABYMURILLO','LOGIN','El usuario GABYMURILLO inició sesión.');
/*!40000 ALTER TABLE `tbl_bitacora` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tgr_log_tbl_bitacora` BEFORE DELETE ON `tbl_bitacora` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'No se permite eliminar registros de la bitácora manualmente.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_cargo`
--

DROP TABLE IF EXISTS `tbl_cargo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_cargo` (
  `id_cargo` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(50) NOT NULL,
  PRIMARY KEY (`id_cargo`),
  KEY `indx_id_cargo` (`id_cargo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_cargo`
--

LOCK TABLES `tbl_cargo` WRITE;
/*!40000 ALTER TABLE `tbl_cargo` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_cargo` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cargo_ins_bitacora` AFTER INSERT ON `tbl_cargo` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó el cargo: ', NEW.descripcion),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cargo_act_bitacora` AFTER UPDATE ON `tbl_cargo` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó el cargo: ', NEW.descripcion),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cargo_elim_bitacora` AFTER DELETE ON `tbl_cargo` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó el cargo: ', OLD.descripcion),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_cliente`
--

DROP TABLE IF EXISTS `tbl_cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_cliente` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `identidad` decimal(13,0) NOT NULL,
  PRIMARY KEY (`id_cliente`),
  KEY `indx_id_cliente` (`id_cliente`),
  KEY `indx_identidad` (`identidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_cliente`
--

LOCK TABLES `tbl_cliente` WRITE;
/*!40000 ALTER TABLE `tbl_cliente` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_cliente` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cliente_ins_bitacora` AFTER INSERT ON `tbl_cliente` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó el cliente: ', NEW.nombre, 'con la identidad: ',NEW.identidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cliente_act_bitacora` AFTER UPDATE ON `tbl_cliente` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó el cliente: ', NEW.nombre, 'con la identidad: ',NEW.identidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `cliente_elim_bitacora` AFTER DELETE ON `tbl_cliente` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó el cliente: ', OLD.nombre, 'con la identidad: ',OLD.identidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_compra`
--

DROP TABLE IF EXISTS `tbl_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_compra` (
  `id_compra` int NOT NULL AUTO_INCREMENT,
  `id_proveedor` int DEFAULT NULL,
  `monto_total` decimal(10,0) NOT NULL,
  `fecha_hora_compra` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado_compra` enum('pendiente','realizada','cancelada') DEFAULT NULL,
  PRIMARY KEY (`id_compra`),
  KEY `indx_id_compra` (`id_compra`),
  KEY `FK_compra_proveedor` (`id_proveedor`),
  CONSTRAINT `FK_compra_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `tbl_proveedor` (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_compra`
--

LOCK TABLES `tbl_compra` WRITE;
/*!40000 ALTER TABLE `tbl_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_compra` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `ins_bitacora` AFTER INSERT ON `tbl_compra` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó la compra: ', NEW.monto_total),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `act_bitacora` AFTER UPDATE ON `tbl_compra` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó la compra: ', NEW.monto_total),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `elim_bitacora` AFTER DELETE ON `tbl_compra` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó la compra: ', OLD.monto_total),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_detalle_compra`
--

DROP TABLE IF EXISTS `tbl_detalle_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_detalle_compra` (
  `id_detalle_compra` int NOT NULL AUTO_INCREMENT,
  `id_kardex` int DEFAULT NULL,
  `id_proveedor` int DEFAULT NULL,
  `monto_total` decimal(10,0) DEFAULT NULL,
  PRIMARY KEY (`id_detalle_compra`),
  KEY `indx_id_detalle_compra` (`id_detalle_compra`),
  KEY `tbl_proveedor_ibfk_4` (`id_proveedor`),
  KEY `tbl_kardex_ibfk_3` (`id_kardex`),
  CONSTRAINT `tbl_detalle_compra_ibfk_1` FOREIGN KEY (`id_kardex`) REFERENCES `tbl_compra` (`id_compra`),
  CONSTRAINT `tbl_detalle_compra_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `tbl_productos` (`id_producto`),
  CONSTRAINT `tbl_kardex_ibfk_3` FOREIGN KEY (`id_kardex`) REFERENCES `tbl_kardex` (`id_kardex`),
  CONSTRAINT `tbl_proveedor_ibfk_4` FOREIGN KEY (`id_proveedor`) REFERENCES `tbl_proveedor` (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_detalle_compra`
--

LOCK TABLES `tbl_detalle_compra` WRITE;
/*!40000 ALTER TABLE `tbl_detalle_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_detalle_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_detalle_salida_producto`
--

DROP TABLE IF EXISTS `tbl_detalle_salida_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_detalle_salida_producto` (
  `id_detalle_salida` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  `cantidad` decimal(6,0) NOT NULL,
  `estado` enum('pendiente','completo','cancelado') DEFAULT NULL,
  `fecha_salida_producto` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_detalle_salida`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_producto` (`id_producto`),
  KEY `indx_id_detalle_salida` (`id_detalle_salida`),
  CONSTRAINT `tbl_detalle_salida_producto_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `tbl_usuario` (`id_usuario`),
  CONSTRAINT `tbl_detalle_salida_producto_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `tbl_productos` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_detalle_salida_producto`
--

LOCK TABLES `tbl_detalle_salida_producto` WRITE;
/*!40000 ALTER TABLE `tbl_detalle_salida_producto` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_detalle_salida_producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_estado_ticket`
--

DROP TABLE IF EXISTS `tbl_estado_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_estado_ticket` (
  `id_estado_ticket` int NOT NULL AUTO_INCREMENT,
  `estado` enum('pendiente','atendido','cancelado') DEFAULT NULL,
  PRIMARY KEY (`id_estado_ticket`),
  KEY `indx_id_estado_ticket` (`id_estado_ticket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_estado_ticket`
--

LOCK TABLES `tbl_estado_ticket` WRITE;
/*!40000 ALTER TABLE `tbl_estado_ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_estado_ticket` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `estado_ins_bitacora` AFTER INSERT ON `tbl_estado_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó el estado: ', NEW.estado),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `estado_act_bitacora` AFTER UPDATE ON `tbl_estado_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó el estado: ', NEW.estado),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `estado_elim_bitacora` AFTER DELETE ON `tbl_estado_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó el estado: ', OLD.estado),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_inventario`
--

DROP TABLE IF EXISTS `tbl_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_inventario` (
  `id_inventario` int NOT NULL AUTO_INCREMENT,
  `id_producto` int DEFAULT NULL,
  `cantidad` decimal(6,0) NOT NULL,
  PRIMARY KEY (`id_inventario`),
  KEY `indx_id_inventario` (`id_inventario`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `tbl_inventario_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `tbl_productos` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_inventario`
--

LOCK TABLES `tbl_inventario` WRITE;
/*!40000 ALTER TABLE `tbl_inventario` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_inventario` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `inventario_ins_bitacora` AFTER INSERT ON `tbl_inventario` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó en el inventario: ', NEW.id_producto, ' con la cantidad: ',NEW.cantidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `inventario_act_bitacora` AFTER UPDATE ON `tbl_inventario` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó en el inventario: ', NEW.id_producto, ' con la cantidad: ',NEW.cantidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `inventario_elim_bitacora` AFTER DELETE ON `tbl_inventario` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó en el inventario: ', OLD.id_producto, ' con la cantidad: ',OLD.cantidad),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_kardex`
--

DROP TABLE IF EXISTS `tbl_kardex`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_kardex` (
  `id_kardex` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  `cantidad` decimal(6,0) NOT NULL,
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo_movimiento` enum('entrada','salida') DEFAULT NULL,
  `estado` enum('Pendiente','En proceso','Completado','Cancelado') NOT NULL,
  `descripcion` varchar(100) NOT NULL,
  PRIMARY KEY (`id_kardex`),
  KEY `indx_id_cardex` (`id_kardex`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `tbl_kardex_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `tbl_usuario` (`id_usuario`),
  CONSTRAINT `tbl_kardex_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `tbl_productos` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_kardex`
--

LOCK TABLES `tbl_kardex` WRITE;
/*!40000 ALTER TABLE `tbl_kardex` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_kardex` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_objeto`
--

DROP TABLE IF EXISTS `tbl_objeto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_objeto` (
  `id_objeto` int NOT NULL AUTO_INCREMENT,
  `nombre_objeto` varchar(50) DEFAULT NULL,
  `tipo_objeto` varchar(70) DEFAULT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_objeto`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_objeto`
--

LOCK TABLES `tbl_objeto` WRITE;
/*!40000 ALTER TABLE `tbl_objeto` DISABLE KEYS */;
INSERT INTO `tbl_objeto` VALUES (1,'Login / Logout','AUTENTICACIÓN','Módulo de inicio y cierre de sesión de usuarios','ACTIVO'),(2,'Proveedores','MANTENIMIENTO','Gestión de proveedores del sistema','ACTIVO'),(3,'Usuarios','ADMINISTRACIÓN','Gestión de usuarios registrados en el sistema','ACTIVO'),(4,'Roles','ADMINISTRACIÓN','Gestión de roles y permisos asignados a usuarios','ACTIVO'),(5,'Inventario','MANTENIMIENTO','Gestión de existencias de productos','ACTIVO'),(6,'Productos','MANTENIMIENTO','Registro y control de productos disponibles','ACTIVO'),(7,'Kardex','MANTENIMIENTO','Historial de movimientos de productos en inventario','ACTIVO'),(8,'Detalle de Compra','OPERACIONES','Detalle de las compras realizadas a proveedores','ACTIVO'),(9,'Detalle de Salida de Productos','OPERACIONES','Registro de productos entregados o retirados del inventario','ACTIVO'),(10,'Tickets','ATENCIÓN','Módulo de emisión y seguimiento de tickets','ACTIVO'),(11,'Tipo de Ticket','ATENCIÓN','Configuración de los tipos de tickets generados','ACTIVO'),(12,'Estado de Ticket','ATENCIÓN','Control de estados de los tickets (en cola, atendido, etc.)','ACTIVO'),(13,'Visualización','ATENCIÓN','Pantalla de visualización de tickets en monitores','ACTIVO'),(14,'Bitácora','AUDITORÍA','Registro de eventos y acciones del sistema','ACTIVO'),(15,'Verificación de Tokens de Correo','SEGURIDAD','Gestión de tokens de verificación por correo electrónico','ACTIVO'),(16,'Dashboard Principal','VISUALIZACIÓN','Pantalla de inicio y resumen del sistema','ACTIVO');
/*!40000 ALTER TABLE `tbl_objeto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_productos`
--

DROP TABLE IF EXISTS `tbl_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre_producto` varchar(100) NOT NULL,
  `cantidad_minima` int DEFAULT NULL,
  `cantidad_maxima` int DEFAULT NULL,
  `descripcion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  UNIQUE KEY `nombre_producto` (`nombre_producto`),
  KEY `indx_id_producto` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_productos`
--

LOCK TABLES `tbl_productos` WRITE;
/*!40000 ALTER TABLE `tbl_productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_productos` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `producto_ins_bitacora` AFTER INSERT ON `tbl_productos` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se agregó el producto: ', NEW.producto, ' con la cantidad minima: ',NEW.cantidad_minima, ' y la cantidad maxima: ',NEW.cantidad_maxima),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `producto_act_bitacora` AFTER UPDATE ON `tbl_productos` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se actualizó el producto: ', NEW.producto, ' con la cantidad minima: ',NEW.cantidad_minima, ' y la cantidad maxima: ',NEW.cantidad_maxima),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `producto_elim_bitacora` AFTER DELETE ON `tbl_productos` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
    USER(),
        CONCAT('Se eliminó el producto: ', OLD.producto, ' con la cantidad minima: ',OLD.cantidad_minima, ' y la cantidad maxima: ',OLD.cantidad_maxima),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_proveedor`
--

DROP TABLE IF EXISTS `tbl_proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_proveedor` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `telefono` varchar(8) NOT NULL,
  `direccion` varchar(100) NOT NULL,
  PRIMARY KEY (`id_proveedor`),
  KEY `indx_id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_proveedor`
--

LOCK TABLES `tbl_proveedor` WRITE;
/*!40000 ALTER TABLE `tbl_proveedor` DISABLE KEYS */;
INSERT INTO `tbl_proveedor` VALUES (6,'MK','22325028','Boulevard Morazán, junto a Tigo'),(7,'El Porvenir','22282645','Anillo periférico, atrás de Larach'),(8,'Sula','98851820','Anillo períferico');
/*!40000 ALTER TABLE `tbl_proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_rol`
--

DROP TABLE IF EXISTS `tbl_rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_rol` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_rol`
--

LOCK TABLES `tbl_rol` WRITE;
/*!40000 ALTER TABLE `tbl_rol` DISABLE KEYS */;
INSERT INTO `tbl_rol` VALUES (1,'SIN ROL','Rol temporal por migración'),(2,'Mantenimiento','Migrado desde tbl_cargo id=1'),(3,'atención tickets','Migrado desde tbl_cargo id=2'),(4,'Guarda almacen','Migrado desde tbl_cargo id=3'),(5,'auxiliar de almacen','Migrado desde tbl_cargo id=4'),(6,'Administrador','Usuario con todos los permisos del sistema');
/*!40000 ALTER TABLE `tbl_rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_salida_productos`
--

DROP TABLE IF EXISTS `tbl_salida_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_salida_productos` (
  `id_salida_producto` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `fecha_salida` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_salida_producto`),
  KEY `id_usuario` (`id_usuario`),
  KEY `indx_id_salida_producto` (`id_salida_producto`),
  CONSTRAINT `tbl_salida_productos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `tbl_usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_salida_productos`
--

LOCK TABLES `tbl_salida_productos` WRITE;
/*!40000 ALTER TABLE `tbl_salida_productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_salida_productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_ticket`
--

DROP TABLE IF EXISTS `tbl_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_ticket` (
  `id_ticket` int NOT NULL AUTO_INCREMENT,
  `id_cliente` int DEFAULT NULL,
  `id_estado_ticket` int DEFAULT NULL,
  `id_tipo_ticket` int DEFAULT NULL,
  `no_ticket` varchar(5) NOT NULL,
  PRIMARY KEY (`id_ticket`),
  KEY `id_cliente` (`id_cliente`),
  KEY `id_estado_ticket` (`id_estado_ticket`),
  KEY `id_tipo_ticket` (`id_tipo_ticket`),
  KEY `indx_id_ticket` (`id_ticket`),
  CONSTRAINT `tbl_ticket_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `tbl_cliente` (`id_cliente`),
  CONSTRAINT `tbl_ticket_ibfk_2` FOREIGN KEY (`id_estado_ticket`) REFERENCES `tbl_estado_ticket` (`id_estado_ticket`),
  CONSTRAINT `tbl_ticket_ibfk_3` FOREIGN KEY (`id_tipo_ticket`) REFERENCES `tbl_tipo_ticket` (`id_tipo_ticket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_ticket`
--

LOCK TABLES `tbl_ticket` WRITE;
/*!40000 ALTER TABLE `tbl_ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_ticket` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `ticket_ins_bitacora` AFTER INSERT ON `tbl_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se agregó el ticket: ', NEW.id_cliente, ' con ticket: ', NEW.id_tipo_ticket, ' en estado: ', NEW.id_estado_ticket, ' y ticket: ', NEW.no_ticket
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `ticket_act_bitacora` AFTER UPDATE ON `tbl_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se actualizó el ticket: ', NEW.id_cliente, ' con ticket: ', NEW.id_tipo_ticket, ' en estado: ', NEW.id_estado_ticket, ' y ticket: ', NEW.no_ticket
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `ticket_elim_bitacora` AFTER DELETE ON `tbl_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se eliminó el ticket: ', OLD.id_cliente, ' con ticket: ', OLD.id_tipo_ticket, ' en estado: ', OLD.id_estado_ticket, ' y ticket: ', OLD.no_ticket
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_tipo_ticket`
--

DROP TABLE IF EXISTS `tbl_tipo_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_tipo_ticket` (
  `id_tipo_ticket` int NOT NULL AUTO_INCREMENT,
  `tipo_ticket` enum('preferencial','normal') DEFAULT NULL,
  `estado` enum('en espera','atendido','cancelado') DEFAULT NULL,
  `prefijo` varchar(10) NOT NULL DEFAULT 'GN',
  PRIMARY KEY (`id_tipo_ticket`),
  KEY `indx_id_tipo_ticket` (`id_tipo_ticket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_tipo_ticket`
--

LOCK TABLES `tbl_tipo_ticket` WRITE;
/*!40000 ALTER TABLE `tbl_tipo_ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_tipo_ticket` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tipotic_ins_bitacora` AFTER INSERT ON `tbl_tipo_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se agregó un nuevo tipo: ', NEW.tipo_ticket, ' con estado: ', NEW.estado
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tipotic_act_bitacora` AFTER UPDATE ON `tbl_tipo_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se actualizó un nuevo tipo: ', NEW.tipo_ticket, ' con estado: ', NEW.estado
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tipotic_alim_bitacora` AFTER DELETE ON `tbl_tipo_ticket` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se eliminó un nuevo tipo: ', OLD.tipo_ticket, ' con estado: ', OLD.estado
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbl_usuario`
--

DROP TABLE IF EXISTS `tbl_usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `id_rol` int DEFAULT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `correo` varchar(50) NOT NULL,
  `nombre_usuario` varchar(50) NOT NULL,
  `contraseña` varchar(50) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `email_verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reset_code` varchar(10) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `reset_used` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  KEY `indx_id_usuario` (`id_usuario`),
  KEY `indx_correo` (`correo`),
  KEY `fk_usuario_rol` (`id_rol`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `tbl_rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_usuario`
--

LOCK TABLES `tbl_usuario` WRITE;
/*!40000 ALTER TABLE `tbl_usuario` DISABLE KEYS */;
INSERT INTO `tbl_usuario` VALUES (6,2,'Ana','Murillo','gabybanegas47@gmail.com','BANEGAS4','IamGaby4!',1,'2025-11-03 22:02:29','2025-10-26 13:25:32','2025-11-11 15:29:33',NULL,NULL,0),(11,3,'Gaby','Murillo','gabybanegas120@gmail.com','BANEGAS','YosoyBanegas120!',1,'2025-11-02 17:38:26','2025-10-26 20:19:41','2025-11-03 23:35:04',NULL,NULL,0),(12,4,'Jessica','González','jess472011@gmail.com','JESS11','YosoyJess11!',1,NULL,'2025-10-26 20:44:56','2025-11-20 18:04:53',NULL,NULL,0),(14,6,'Gaby','Banegas','gabybanegas367@gmail.com','GABYMURILLO','EsqueGabyM367!',1,'2025-10-26 22:41:43','2025-10-26 21:47:29','2025-11-20 18:07:22',NULL,NULL,0),(15,NULL,'Mike','Shinoda','chestershinnoda7@gmail.com','BENNINGTONC','IamMikeChester7!',0,NULL,'2025-10-26 23:20:53','2025-10-27 16:00:43','643616','2025-10-27 16:10:44',0),(16,NULL,'gabriela','Banegas','gabybanegas789@gmail.com','MURILLO','Gaby789!',0,NULL,'2025-11-02 17:25:29','2025-11-02 17:25:29',NULL,NULL,0),(18,NULL,'Keysi','Banegas','keysiban3gas91@gmail.com','KEY91','Yosoy91!',1,'2025-11-02 21:29:03','2025-11-02 21:24:07','2025-11-02 21:29:03',NULL,NULL,0),(19,NULL,'Nam','Kim','gabybanegas201@gmail.com','KIM20','YosoyNam2!',1,NULL,'2025-11-09 12:34:55','2025-11-09 12:36:41',NULL,NULL,0),(20,NULL,'Kim','Jin','gbanegas067@gmail.com','SEOKJIN','SoyJin67!',1,NULL,'2025-11-11 15:42:21','2025-11-11 15:43:52',NULL,NULL,0),(21,NULL,'Ana','Banegas','anabanegas@unah.hn','ANA','AnaUnah47!',1,NULL,'2025-11-19 14:00:29','2025-11-19 14:03:59',NULL,NULL,0);
/*!40000 ALTER TABLE `tbl_usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tbl_visualizacion`
--

DROP TABLE IF EXISTS `tbl_visualizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_visualizacion` (
  `id_visualizacion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `id_ticket` int DEFAULT NULL,
  `ventanilla` varchar(5) NOT NULL,
  PRIMARY KEY (`id_visualizacion`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_ticket` (`id_ticket`),
  KEY `indx_id_visualizacion` (`id_visualizacion`),
  CONSTRAINT `tbl_visualizacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `tbl_usuario` (`id_usuario`),
  CONSTRAINT `tbl_visualizacion_ibfk_2` FOREIGN KEY (`id_ticket`) REFERENCES `tbl_ticket` (`id_ticket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tbl_visualizacion`
--

LOCK TABLES `tbl_visualizacion` WRITE;
/*!40000 ALTER TABLE `tbl_visualizacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `tbl_visualizacion` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `vis_ins_bitacora` AFTER INSERT ON `tbl_visualizacion` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se agregó a la visualización: ', NEW.id_usuario, ' con el ticket: ', NEW.id_ticket, ' en la ventanilla: ', NEW.ventanilla
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `vis_act_bitacora` AFTER UPDATE ON `tbl_visualizacion` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se modificó a la visualización: ', NEW.id_usuario, ' con el ticket: ', NEW.id_ticket, ' en la ventanilla: ', NEW.ventanilla
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `vis_elim_bitacora` AFTER DELETE ON `tbl_visualizacion` FOR EACH ROW BEGIN
    INSERT INTO tbl_bitacora (usuario, accion, fecha)
    VALUES (
        USER(),
        CONCAT(
            'Se eliminó de la visualización: ', OLD.id_usuario, ' con el ticket: ', OLD.id_ticket, ' en la ventanilla: ', OLD.ventanilla
        ),
        NOW()
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `verificar_email_tokens`
--

DROP TABLE IF EXISTS `verificar_email_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verificar_email_tokens` (
  `id_verificar_email` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_verificar_email`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `verificar_email_tokens_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `tbl_usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verificar_email_tokens`
--

LOCK TABLES `verificar_email_tokens` WRITE;
/*!40000 ALTER TABLE `verificar_email_tokens` DISABLE KEYS */;
INSERT INTO `verificar_email_tokens` VALUES (2,11,'c2cd29b0bd2e2d08e911c0ca758daa01a2224e67d2f201e1ae10eb757d74128b','2025-10-26 20:34:44',0,'2025-10-26 20:19:44'),(3,12,'4421502b719921824926da1938269b4b576edf16935b1c96a274caeb2ff92cd9','2025-10-26 20:59:58',0,'2025-10-26 20:44:57'),(4,14,'7e2bb66d0aef627e34161e49f8837cf6c23360ba2dc0332fd8e0c525c77d1792','2025-10-26 22:02:33',0,'2025-10-26 21:47:33'),(5,15,'1ef5b018ce02ff885e3e0e625d097ca76f96fbe0ec77dfddad58f4bdd8c59684','2025-10-26 23:35:56',0,'2025-10-26 23:20:56'),(9,6,'84ab34f6f226ca12f334f7bd472496cc96805ac6413f4a7f4b3b7b4ba5611ad3','2025-11-01 18:02:40',0,'2025-11-01 17:47:40'),(10,11,'2caa0c5917c399c53144b97fe3b40f3be7667a283674437c634ea67e3dc60b18','2025-11-02 17:33:32',0,'2025-11-02 17:18:32'),(11,11,'f594b4089dc0e908f97ac384257b6fd32d6173b7119f46f87aadb7d1c00d13d4','2025-11-02 17:52:59',1,'2025-11-02 17:37:59'),(12,18,'a1abac6a4237b4031bce975ede4f14e2dda3c45195415e7724b7bda6f3382218','2025-11-02 21:43:01',1,'2025-11-02 21:28:01'),(13,6,'968a7de612bfd245b6446e5e8fb99703a582699f5b82ddaaf5fee674d7724c0c','2025-11-03 22:16:46',1,'2025-11-03 22:01:45'),(14,19,'7450b34dbc53dde6b84f3b12537068f05e12def380b54233490370ab92d7535a','2025-11-09 12:50:50',1,'2025-11-09 12:35:49'),(15,20,'b71a2aa70d06151b70f577224df995e7484703928df4825f52d58d4e14bac846','2025-11-11 15:57:26',1,'2025-11-11 15:42:25'),(16,21,'c5d7cec6d594783b87c345e6ed1376be2a39d713f66f96ec6ea01644d9750fb8','2025-11-19 14:17:32',1,'2025-11-19 14:02:32');
/*!40000 ALTER TABLE `verificar_email_tokens` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-23 18:33:18
