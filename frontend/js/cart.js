document.addEventListener("DOMContentLoaded", () => {
    const cartContainer = document.getElementById("cart-items");
    const cartSummary = document.getElementById("cart-summary");
    const clearCartBtn = document.getElementById("clear-cart");
    const buyNowBtn = document.getElementById("buy-now");
    const paymentSection = document.getElementById("payment-section");
    const payWithCardBtn = document.getElementById("pay-with-card");
    const cardPaymentForm = document.getElementById("card-payment-form");
    const cartCountElement = document.getElementById("cuenta__Cart"); // Icono del carrito

    if (!cartContainer) {
        console.error("Error: No se encontró el contenedor 'cart-items'");
        return;
    }

    // Verificar si viene de un pago exitoso
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

    function renderCart() {
        cartContainer.innerHTML = "";
        let totalQuantity = 0;
        let totalPrice = 0;

        if (cart.length === 0) {
            cartContainer.innerHTML = `<p class="empty-cart">El carrito está vacío.</p>`;
            cartCountElement.textContent = "0";
            paymentSection.style.display = "none";
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

        cartSummary.innerHTML = `
            <h2 class="cart-summary__title">Detalle de la Orden </h2>
            <hr>
            <div id="cart-summary-content">
                <p><strong>Total elementos:</strong> <span id="total-items">${totalQuantity}</span></p>
                <p><strong>Precio total:</strong> USD $<span id="total-price">${totalPrice.toFixed(2)}</span></p>
            </div>
        `;

        cartSummary.style.display = "block"; // Asegurar que sea visible
        cartCountElement.textContent = totalQuantity;

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
        // Limpiar el resumen del carrito completamente
        cartSummary.innerHTML = "";
        cartSummary.style.display = "none";
        renderCart();
    });

    buyNowBtn.addEventListener("click", async () => {
        if (cart.length === 0) {
            alert("Tu carrito está vacío.");
            cartSummary.innerHTML = "";
            cartSummary.style.display = "none";
            return;
        }
    
        try {
            console.log("🛒 Preparando datos para Stripe:", cart);
            
            // 1. Guardar copia del carrito para mostrar en success.html
            const orderData = {
                items: [...cart], // Copia del carrito actual
                total: cart.reduce((total, item) => total + parseFloat(item.price), 0).toFixed(2),
                date: new Date().toISOString()
            };
            sessionStorage.setItem('orderData', JSON.stringify(orderData));
            
            // 2. Preparar items para Stripe
            const itemsForStripe = cart.map(item => ({
                name: item.productName,
                price: Math.round((parseFloat(item.price) / item.quantity) * 100), // en centavos
                quantity: item.quantity
            }));
    
            const response = await fetch("https://myth-toys-lover-a31a385f199b.herokuapp.com/api/create-checkout-session", {
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
