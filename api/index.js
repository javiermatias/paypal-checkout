import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";
import {userExists, insertUser, newClient } from './userdb.js';
// Import necessary modules
import { fileURLToPath } from 'url';

//s
// Get the current file's URL (ESM-specific)
const __filenameNew = fileURLToPath(import.meta.url);

// Calculate the directory name
const __dirnameNew = path.dirname(__filenameNew);

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_URL, PORT = 8888, TOKEN } = process.env;
const base = PAYPAL_URL;
const app = express();

// host static files
app.use(express.static("client"));

// parse post params sent in body in json format
app.use(express.json());

/**
 * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 * @see https://developer.paypal.com/api/rest/authentication/
 */
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (cart) => {
  // use the cart information passed from the front-end to calculate the purchase unit details
  console.log(
    "shopping cart information passed from the frontend createOrder() callback:",
    cart,
  );
  const _user = cart[0].licencia;
  const mex = cart[0].mex ?? false;
  let _userExists = await userExists(_user, mex);
  if(_userExists) {
    throw new Error("USER_EXISTS");
  } 
  

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
   const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "65",
        },
      },
    ],
  };
  if (mex) {payload.purchase_units[0].amount.value = 42} 

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID, licencia, mex) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse1(response, licencia, mex);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
     return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

async function handleResponse1(response, _user, mex) {
  try {
    const jsonResponse = await response.json();
    //create here insert user
    let _insertUser = await insertUser(_user, mex);
    if(!_insertUser) {
      throw new Error("INSERT_FAIL");
    } 
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

app.post("/api/orders", async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { cart } = req.body;
    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error.message);
    if(error.message === 'USER_EXISTS'){
      res.status(500).json({ error: "Hubo un error al procesar la orden. El usuario ya existe. Por favor coloque otro usuario" });
    }else{
      res.status(500).json({ error: "Hubo un error al procesar la solicitud. Intente nuevamente o comuniquese con los administradores" });
    }
    
  }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { licencia } = req.body;
    const { mex } = req.body ?? { mex: false };
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID, licencia, mex);
    // console.log(jsonResponse);
    console.log(jsonResponse.payer.email_address);

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

// serve index.html
app.get("/", async(req, res) => {

  console.log(__dirnameNew)
  const rootDirectory = path.join(__dirnameNew, '..'); // Go one directory back from __dirnameNew
  const filePath = 'client/checkout.html'; // Relative path from the root directory

  res.sendFile(filePath, { root: rootDirectory });
  //res.sendFile('checkout.html', { root: path.join(__dirnameNew, '.../client') });
  //res.sendFile(path.resolve("./client/checkout.html"));
});

app.get('/paypal', (req, res) => {
  res.send('PayPal endpoint is working!');
});

app.get("/sender-mex", async(req, res) => {

  res.sendFile(path.resolve("./client/checkout-mex.html"));
});

///////////////////////////SMS SENDER//////////////////////////

app.post("/api/registrar", async(req, res) => {
  try {

    const { nombre, apellido, email, programa, usuario, token } = req.body;
    if (!nombre || !apellido || !email || !programa || !usuario || !token) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (token !== TOKEN) {
      return res.status(403).json({ error: 'Invalid request' });
    }
         //create here insert user
    let _insertUser = await newClient({ nombre, apellido, email, programa, usuario });
    if(!_insertUser) {
      return res.status(500).json({ error: 'Failed to insert user' });
    } 
          // Respond with success
    return res.status(201).json({ message: 'User registered successfully1s' });
    
  } catch (err) {
    console.error('Error during user registration:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
});


//////////////////////////////////////////////////////////////


app.listen(PORT, () => {  
  console.log(`Node server listening at http://localhost:${PORT}/`);
});