import mysql from 'mysql2/promise';

const { HOST, USER1, PASSWORD, DATABASE } = process.env;
//console.log(HOST + '' + USER1+ '' + PASSWORD + '' + DATABASE)
// Create a connection pool
const pool = mysql.createPool({
  host: HOST,
  user: USER1,
  password: PASSWORD,
  database: DATABASE,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Export the pool to be used in other modules
// Export the pool to be used in other modules
export default pool;