const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Xử lý SSL certificate
let sslConfig = {};

if (process.env.DB_SSL_CA_BASE64) {
  // Render: cert được lưu dạng Base64 trong env var
  const certBuffer = Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64');
  sslConfig = { ca: certBuffer };
} else if (process.env.DB_SSL_CA) {
  // Local: đọc file ca.pem
  const caPath = path.resolve(__dirname, process.env.DB_SSL_CA);
  if (fs.existsSync(caPath)) {
    sslConfig = { ca: fs.readFileSync(caPath) };
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: Object.keys(sslConfig).length > 0 ? sslConfig : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    console.log('✅ Kết nối MySQL Aiven thành công!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối MySQL:', err.message);
  });

module.exports = pool;
