// API/dbConfig.js

const url = new URL(process.env.MYSQL_PUBLIC_URL);
const DB_CONFIG = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.replace("/", ""),
  port: url.port
};

module.exports = DB_CONFIG;
