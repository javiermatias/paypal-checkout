import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";
import {userExists, insertUser } from './userdb.js';

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_URL, PORT = 8888 } = process.env;
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

    // Execute a query using the connection pool
    //const [rows, fields] = await db.execute('SELECT * FROM accounts');
    //console.log(rows);
    // Send the result to the client
    //res.json({ users: rows });
    //console.log('Type of rows:', typeof rows);
    //let insUser = await insertUser('manuel151');
    //console.log(insUser);
    res.sendFile(path.resolve("./client/checkout.html"));
});

app.get("/sender-mex", async(req, res) => {

  res.sendFile(path.resolve("./client/checkout-mex.html"));
});



app.listen(PORT, () => {  
  console.log(`Node server listening at http://localhost:${PORT}/`);
});