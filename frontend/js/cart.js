document.addEventListener("DOMContentLoaded", () => {
    const cartContainer = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");
    const clearCartBtn = document.getElementById("clear-cart");
    const buyNowBtn = document.getElementById("buy-now");
    const paymentSection = document.getElementById("payment-section");
    const payWithCardBtn = document.getElementById("pay-with-card");
    const cardPaymentForm = document.getElementById("card-payment-form");
    const cartCountElement = document.getElementById("cuenta__Cart"); // Icono del carrito
// Envio US
    const shippingInput = document.getElementById("shipping-zipcode");
    const calculateShippingBtn = document.getElementById("calculate-shipping");
    const shippingCostElement = document.getElementById("shipping-cost")?.querySelector("span");
// Envio Intercacional
    const shippingCountryInput = document.getElementById("shipping-country");
    const shippingStateInput = document.getElementById("shipping-state");
    const shippingNoteElement = document.getElementById("shipping-note");
// Sección de envío
    const shippingSection = document.querySelector(".shipping-section");
// Mensaje de procesando
    const processingMessage = document.getElementById("processing-message");

    const internationalShippingCheckbox = document.getElementById("international-shipping");
    const internationalFields = document.querySelectorAll(".international-field");
    
    const TAX_RATE = 0.07; // % de impuesto

    let shippingCost = 0; // Variable para almacenar el costo de envío

    if (!cartContainer) {
        console.error("Error: No se encontró el contenedor 'cart-items'");
        return;
    }


    // Mostrar u ocultar campos internacionales según el checkbox
    internationalShippingCheckbox.addEventListener("change", async () => {
        const isInternational = internationalShippingCheckbox.checked;
        internationalFields.forEach(field => {
            field.style.display = isInternational ? "block" : "none";
        });

        // Limpiar campos y costo cuando se cambia la opción
        shippingCountryInput.value = "";
        shippingStateInput.value = "";
        shippingCost = 0; // Reiniciar el costo de envío
        shippingCostElement.textContent = "USD $0.00";
        shippingNoteElement.textContent = "Por favor, calcula el costo de envío.";
        shippingNoteElement.style.display = "block";
    renderCart(); // Actualizar el resumen
    });

    // Verificar si el pago fue exitoso antes de limpiar cart
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('payment_success')) {
        localStorage.removeItem("productp");
        cart = [];
        renderCart();
        // Mostrar mensaje de éxito
        alert('¡Pago completado con éxito!');
        // Eliminar el parámetro de la URL
        history.replaceState(null, '', window.location.pathname);
    }

    let cart = JSON.parse(localStorage.getItem("productp")) || [];

    // inicio costo de envio

// Evento para calcular costo de envío con FedEx

// antes de validacion de Pais y codigos pais 
calculateShippingBtn.addEventListener("click", async () => {
    console.log("Botón Calcular Envío clicado");
    const isInternational = internationalShippingCheckbox.checked;
    const country = isInternational ? shippingCountryInput.value.trim().toUpperCase() : "US";
    const location = shippingInput.value.trim();
    const state = isInternational ? shippingStateInput.value.trim().toUpperCase() : undefined;

    if (!country || !location) {
        shippingCostElement.textContent = "USD $0.00";
        shippingNoteElement.style.display = "none";
        shippingCost = 0; // Reiniciar el costo de envío
        shippingNoteElement.textContent = "Por favor, calcula el costo de envío.";
        shippingNoteElement.style.display = "block";
        renderCart(); // Actualizar el resumen
        alert("Por favor, ingresa el país y el código postal.");
        return;
    }

    if (cart.length === 0) {
        shippingCostElement.textContent = "USD $0.00";
        shippingNoteElement.style.display = "none";
        shippingCost = 0; // Reiniciar el costo de envío
        renderCart(); // Actualizar el resumen
        alert("El carrito está vacío.");
        return;
    }

    // Mostrar el mensaje de "Procesando..."
    processingMessage.style.display = "block";
    shippingCostElement.textContent = "USD $0.00"; // Limpiar mientras se procesa
    shippingNoteElement.style.display = "none"; // Ocultar la nota mientras se procesa

    try {
        const response = await fetch("https://www.myth-toys-lover.com/calculate-shipping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                destination: location,
                country: country,
                state: state || undefined,
                items: cart.map(item => ({
                    weight: item.weight || 1,
                    height: item.height || 5,
                    length: item.length || 10,
                    width: item.width || 8,
                    quantity: item.quantity,
                    price: parseFloat(item.price) / item.quantity // Precio por unidad para customsValue
                })),
                origin: "33166"
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData.details) || errorData.error || "Error en el servidor");
        }

        const data = await response.json();
        console.log("Costo de envío recibido:", data);
        shippingCost = data.shippingCost; // Almacenar el costo de envío
        shippingCostElement.textContent = `USD $${data.shippingCost.toFixed(2)}`;

        // Mostrar advertencia para envíos internacionales
        if (country !== "US") {
            //shippingNoteElement.textContent = "Nota: El costo no incluye aranceles, impuestos ni tarifas de importación.";
            shippingNoteElement.style.display = "block";
        } else {
            shippingNoteElement.style.display = "none";
        }
        renderCart(); // Actualizar el resumen con el nuevo costo de envío
    } catch (error) {
        console.error("No se pudo calcular el costo de envío en:", error.message);
        shippingCostElement.textContent = "Validar";
        shippingNoteElement.style.display = "none";
        shippingCost = 0; // Reiniciar el costo de envío en caso de error
        renderCart(); // Actualizar el resumen
        alert(` ❌ Validar datos,  Pais ${country},  o zipcode ${location}.`);
        console.log("No se pudo calcular el costo de envío:", error.message);
    } finally {
        // Ocultar el mensaje de "Procesando..." después de recibir la respuesta o en caso de error
        processingMessage.style.display = "none";
    }
});

    // fin coso de envio

    function renderCart() {
        cartContainer.innerHTML = "";
    let totalQuantity = 0;
    let totalPrice = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = `<p class="empty-cart">El carrito está vacío.</p>`;
        cartCountElement.textContent = "0";
        paymentSection.style.display = "none";
        cartSummary.style.display = "none";
        buyNowBtn.disabled = true; // Deshabilitar el botón si el carrito está vacío
        shippingSection.style.display = "none"; // Ocultar la sección de envío
        return;
    }

    cart.forEach((item, index) => {
        totalQuantity += item.quantity;
        totalPrice += parseFloat(item.price);

            const cartItem = document.createElement("div");
            cartItem.classList.add("cart-row");
            cartItem.innerHTML = `
                <div class="cart-image">
                    <img Width="50" Height="40" src="${item.image}" alt="${item.productName}" class="cart-img">
                </div>
                <div class="cart-product">
                    <h2>${item.productName}</h2>
                </div>
                
                <div class="cart-quantity">
                    <button data-index="${index}" class="quantity-button decrease">-</button>
                    <span id="quantity-${index}" class="quantity-value">${item.quantity}</span>
                    <button data-index="${index}" class="quantity-button increase">+</button>
                </div>
                <div class="cart-price">
                    <p>USD $<span>${(parseFloat(item.price)).toFixed(2)}</span></p>
                </div>
            `;
            cartContainer.appendChild(cartItem);
        });

        const taxAmount = totalPrice * TAX_RATE;
        const totalWithTax = totalPrice + taxAmount;
        const totalWithTaxAndShipping = totalPrice + taxAmount + shippingCost; // Incluir el costo de envío en el total

        cartSummary.innerHTML = `
            <h2 class="cart-summary__title">Detalle de la Orden </h2>
            <hr>
            <div id="cart-summary-content">
                <p><strong># Articulos:</strong> <span id="total-items">${totalQuantity}</span></p>
                <p><strong>Impuestos:</strong> USD $<span id="tax-amount">${taxAmount.toFixed(2)}</span></p> 
                <p><strong>Costo de Envío:</strong> USD $<span id="shipping-amount">${shippingCost.toFixed(2)}</span></p>        
               <!-- <p><strong>Precio antes de envio total:</strong> USD $<span id="total-price">${totalWithTax.toFixed(2)}</span></p> -->
                <p><strong>Precio total:</strong> USD $<span id="total-price">${totalWithTaxAndShipping.toFixed(2)}</span></p>

            </div>
        `;

        cartSummary.style.display = "block"; // Asegurar que sea visible
        cartCountElement.textContent = totalQuantity;
        // Habilitar o deshabilitar el botón de pago según el costo de envío
        buyNowBtn.disabled = shippingCost === 0;
        shippingSection.style.display = "block"; //Mostrar la sección de envío

        if (cart.length === 0) {
            cartSummary.style.display = "none";
            paymentSection.style.display = "none";
        }

        // Agregar eventos a los botones dinámicamente después de renderizar el carrito
        document.querySelectorAll(".increase").forEach(btn => {
            btn.addEventListener("click", increaseQuantity);
        });

        document.querySelectorAll(".decrease").forEach(btn => {
            btn.addEventListener("click", decreaseQuantity);
        });
    }

    function increaseQuantity(event) {
        const index = event.target.getAttribute("data-index");
        cart[index].quantity++;
        cart[index].price = (cart[index].quantity * parseFloat(cart[index].price / (cart[index].quantity - 1))).toFixed(2); 
        shippingCost = 0; // Reiniciar el costo de envío
        shippingCostElement.textContent = "USD $0.00"; // Limpiar el costo de envío mostrado
        shippingNoteElement.textContent = "Por favor, calcula el costo de envío nuevamente.";
        shippingNoteElement.style.display = "block"; // Ocultar la nota de envío
        //alert("El costo de envío ha  cambiado. Por favor, calcula el costo de envío nuevamente."); // Notificar al usuario
        updateCart();
    }

    function decreaseQuantity(event) {
        const index = event.target.getAttribute("data-index");
        if (cart[index].quantity > 1) {
            cart[index].quantity--;
            cart[index].price = (cart[index].quantity * parseFloat(cart[index].price / (cart[index].quantity + 1))).toFixed(2);
        } else {
            cart.splice(index, 1); // Eliminar producto si la cantidad es 0
            // Limpiar el resumen del carrito completamente
            cartSummary.innerHTML = "";
            cartSummary.style.display = "none";
        }
        shippingCost = 0; // Reiniciar el costo de envío
        shippingCostElement.textContent = "USD $0.00"; // Limpiar el costo de envío mostrado
        shippingNoteElement.textContent = "Por favor, calcula el costo de envío nuevamente.";
        shippingNoteElement.style.display = "block"; // Ocultar la nota de envío
        //alert("El costo de envío ha  cambiado. Por favor, calcula el costo de envío nuevamente."); // Notificar al usuario
        updateCart();
    }

    function updateCart() {
        localStorage.setItem("productp", JSON.stringify(cart));
        renderCart();
    }

    clearCartBtn.addEventListener("click", async () => {
        if (cart.length === 0) {
            return;
        }
        if (!confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
            return;
        }
        localStorage.removeItem("productp");
        cart = [];
        shippingCost = 0; // Reiniciar el costo de envío
        shippingCostElement.textContent = "USD $0.00"; // Reiniciar el costo de envío en la sección de envío
        shippingNoteElement.style.display ="none" //Ocultarnota de envio
        // Limpiar el resumen del carrito completamente
        cartSummary.innerHTML = "";
        cartSummary.style.display = "none";
        shippingSection.style.display = "none"; // Ocultar la sección de envío
        renderCart();
    });

    buyNowBtn.addEventListener("click", async () => {
        if (cart.length === 0) {
            alert("Tu carrito está vacío.");
            cartSummary.innerHTML = "";
            cartSummary.style.display = "none";
            return;
        }
        if (shippingCost === 0) {
            alert("Por favor, calcula el costo de envío antes de proceder con el pago.");
            return;
        }
    
        try {
            console.log("🛒 Preparando datos para Stripe:", cart);

            const totalPrice = cart.reduce((total, item) => total + parseFloat(item.price), 0);
            const taxAmount = totalPrice * TAX_RATE;
            //const totalWithTax = totalPrice + taxAmount;
            const totalWithTaxAndShipping = totalPrice + taxAmount + shippingCost; // Incluir el costo de envío
            
            // 1. Guardar copia del carrito para mostrar en success.html
            const orderData = {
                items: [...cart], // Copia del carrito actual
                //total: cart.reduce((total, item) => total + parseFloat(item.price), 0).toFixed(2), old
                total: totalWithTaxAndShipping.toFixed(2),
                tax: taxAmount.toFixed(2), //new linea
                shipping: shippingCost.toFixed(2), // Incluir el costo de envío en los datos de la orden
                date: new Date().toISOString()
            };
            sessionStorage.setItem('orderData', JSON.stringify(orderData));
            
            // 2. Preparar items para Stripe
            const itemsForStripe = cart.map(item => ({
                name: item.productName,
                price: Math.round((parseFloat(item.price) / item.quantity) * 100), // en centavos
                quantity: item.quantity
            }));

            itemsForStripe.push({
                name: `Impuestos `,
                //name: `Impuestos (${(TAX_RATE * 100).toFixed(0)}%)`,
                price: Math.round(taxAmount * 100),
                quantity: 1
            });
            if (shippingCost > 0) {
                itemsForStripe.push({
                    name: `Costo de Envío`,
                    price: Math.round(shippingCost * 100),
                    quantity: 1
                });
            }
    
            const response = await fetch("https://www.myth-toys-lover.com/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    items: itemsForStripe
                })
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                console.error("❌ Error del servidor:", data);
                throw new Error(data.error || "Error al procesar el pago");
            }
    
            if (!data.url) {
                throw new Error("No se recibió URL de checkout");
            }
    
            console.log("🔗 Redirigiendo a:", data.url);
            // 3. Limpiar el carrito justo antes de redirigir
            localStorage.removeItem("productp");
            // 4. Redirigir a Stripe
            window.location.href = data.url;
    
        } catch (error) {
            console.error("🔥 Error completo:", error);
            alert(`Error al procesar el pago: ${error.message}`);
            sessionStorage.removeItem('orderData');
        }
    });

    payWithCardBtn.addEventListener("click", () => {
        cardPaymentForm.style.display = "block"; 
    });

    paypal.Buttons({
        createOrder: (data, actions) => {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: cart.reduce((acc, item) => acc + parseFloat(item.price), 0).toFixed(2)
                    }
                }]
            });
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(details => {
                alert(`Pago completado por ${details.payer.name.given_name}`);
                localStorage.removeItem("productp");
                cart = [];
                renderCart();
            });
        }
    }).render("#paypal-button-container");

    renderCart();
});
