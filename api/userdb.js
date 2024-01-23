import db from './mysqlconn.js';

// Example controller
async function userExists(username, mex = false) {
  //const { username } = req.params;

  try {
    // Check if the user exists in the usuarios table
    if (mex) {
      const [rows, fields] = await db.execute('SELECT * FROM usuarios_smssender_mex WHERE usuario = ?', [username]);
      return rows.length > 0;
    }
    const [rows, fields] = await db.execute('SELECT * FROM usuarios_smssender WHERE usuario = ?', [username]);
    return rows.length > 0;

  } catch (error) {
    // Log the error or handle it appropriately
    console.error('Error checking user existence:', error);
    throw new Error('An error occurred while checking user existence.');
  }
}

async function insertUser(username, mex = false) {
  try {
    // Assuming db is a properly instantiated and connected database connection
    if(mex){
      const [result, fields] = await db.execute('CALL sp_newUserSMSsenderMex(?, ?)', [username, username]);
      return result.affectedRows > 0;
    }
    const [result, fields] = await db.execute('CALL sp_newUserSMSsender(?, ?)', [username, username]);
    return result.affectedRows > 0;

  } catch (error) {
    // Log the error or handle it appropriately
    console.error('Error calling stored procedure:', error);
    throw new Error('An error occurred while inserting the user.');
  }
}



/* async function insertUser(username) {
    try {
      // Assuming db is a properly instantiated and connected database connection
      const [result, fields] = await db.execute('INSERT INTO usuarios_smssender (usuario, contraseña) VALUES (?, ?)', [username, username]);
  
      // Check if the insert was successful
       return result.affectedRows > 0
    } catch (error) {
      // Log the error or handle it appropriately
      console.error('Error inserting user:', error);
      throw new Error('An error occurred while inserting user.');
    }
  } */



export { userExists, insertUser }