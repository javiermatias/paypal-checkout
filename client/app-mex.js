let inputValue = document.getElementById('nombreLic').value;

window.paypal
  .Buttons({
    async createOrder() {
      inputValue = document.getElementById('nombreLic').value;
      if (!inputValue || inputValue.trim() === '') {
        // Throw an error or handle the empty value as needed
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Tienes que colocar un nombre de licencia por favor.",
          footer: '<a href="https://api.whatsapp.com/send?phone=5493517418987&text=¡Hola%20SMS%20Sender!%20deseo%20hablar%20con%20un%20representante%20de%20Soporte%20por%20un%20error%20del%20metodo%20de%20pago">Contacta a soporte haciendo click aquí</a>'
        });
        throw new Error('El nombre de la licencia no tiene que estar vacia');
      }
     
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // use the "body" param to optionally pass additional order information
          // like product ids and quantities
          body: JSON.stringify({
            cart: [
              {
                id: "Licencia SMS SENDER",
                quantity: "1",
                price: "65",
                licencia: inputValue,
                mex:true
              },
            ],
          }),
        });

        const orderData = await response.json();

        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.log(error);
        console.log(error.Error);
        errorMessage(`${JSON.parse(error.message).error}`);
      }
    },
    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            licencia: inputValue,
            mex:true
          })
        });

        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message

        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`,
          );
        /*   console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2),
          ); */
        }
      } catch (error) {
        console.error(error);
        errorMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      }
    },
  })
  .render("#paypal-button-container");

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  Swal.fire({
    title: "<strong><u>Gracias por tu compra!</u></strong>",
    icon: "success",
    html: `
      Los datos de la licencia son:<br><br>
      <strong>USER:</strong> <strong>${inputValue}</strong> <br>
      <strong>PASSWORD:</strong>  <strong>${inputValue}</strong> <br><br>
      <strong>PARA ACTIVAR EL PROGRAMA:</strong><br> 
      Dentro del programa dirigete arriba a la derecha, 
      alli veras unas llaves, haz click alli y coloca alli tus credenciales.
      Cualquier duda que tengas no dudes en contactarnos.
      <a href="https://wa.me/5493517418987">Contacta a soporte</a>
    `,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: `
      <i class="fa fa-thumbs-up"></i> OK
    `,
    confirmButtonAriaLabel: "Thumbs up, great!",
    
  });
}
//errorMessage('Error')
function errorMessage(message) {
  Swal.fire({
    icon: "error",
    title: "Hubo un error al procesar el pago.",
    text: message,
    footer: '<a href="https://api.whatsapp.com/send?phone=5493517418987&text=¡Hola%20SMS%20Sender!%20deseo%20hablar%20con%20un%20representante%20de%20Soporte%20por%20un%20error%20del%20metodo%20de%20pago">Contacta a soporte haciendo click aquí</a>'
  });
}
