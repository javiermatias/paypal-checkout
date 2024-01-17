import db from './mysqlconn.js';

// Example controller
async function userExists(username) {
    //const { username } = req.params;

    try {
        // Check if the user exists in the usuarios table
        const [rows, fields] = await db.execute('SELECT * FROM usuarios_smssender WHERE usuario = ?', [username]);
        console.log(rows.length > 0)
        return rows.length > 0; // Simplified the return statement
    } catch (error) {
        // Log the error or handle it appropriately
        console.error('Error checking user existence:', error);
        throw new Error('An error occurred while checking user existence.');
    }
}

async function insertUser(username) {
    try {
      // Assuming db is a properly instantiated and connected database connection
      const [result, fields] = await db.execute('CALL sp_newUserSMSsender(?, ?)', [username, username]);
  
      // Check if the stored procedure execution was successful
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