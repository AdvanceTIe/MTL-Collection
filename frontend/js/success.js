document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    // Mostrar productos comprados desde sessionStorage
    const orderData = JSON.parse(sessionStorage.getItem('orderData'));
    if (orderData) {
        // Crear sección para mostrar productos comprados
        const purchasedSection = document.createElement('section');
        purchasedSection.className = 'purchased-items';
        purchasedSection.innerHTML = `
            <h2><i class="fas fa-box-open"></i> Productos Comprados</h2>
            <div id="purchased-items-list"></div>
        `;

        // Insertar después de payment-details
        const paymentDetails = document.getElementById('payment-details');
        paymentDetails.parentNode.insertBefore(purchasedSection, paymentDetails.nextSibling);

        // Llenar la lista de productos
        const itemsList = document.getElementById('purchased-items-list');
        orderData.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'purchased-item';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.productName}" width="40">
                <div class="item-details">
                    <h3>${item.productName}</h3>
                    <p>Cantidad: ${item.quantity} <span>Precio: $ </span> ${(parseFloat(item.price) / item.quantity).toFixed(2)}</p>
                    
                </div>
            `;
            itemsList.appendChild(itemElement);
        });

        //<p>Precio: USD $${(parseFloat(item.price) / item.quantity).toFixed(2)}</p>

        // Limpiar sessionStorage después de mostrar
        sessionStorage.removeItem('orderData');
    }

    // Resto del código para detalles de Stripe
    if (!sessionId) {
        document.getElementById("payment-details").innerHTML = "<p>Error: No se encontró información de pago.</p>";
        return;
    }

    try {
        const response = await fetch(`https://www.myth-toys-lover.com/payment-details?session_id=${sessionId}`);
        const data = await response.json();

        console.log("Datos recibidos del backend:", data);

        if (data.error) {
            document.getElementById("payment-details").innerHTML = `<p>Error: ${data.error}</p>`;
        } else {
            if (typeof data.created === "number" && !isNaN(data.created)) {
                console.log("✅ Timestamp recibido:", data.created);
                const timestamp = Number(data.created) * 1000;
                const date = new Date(timestamp);
                const formattedDate = new Intl.DateTimeFormat("es-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }).format(date);
                document.getElementById("created").textContent = formattedDate;
            } else {
                console.warn("⚠️ data.created no es válido:", data.created);
                document.getElementById("created").textContent = "Fecha no disponible";
            }
            
            document.getElementById("transaction_id").textContent = data.created;
            document.getElementById("total-amount").textContent = data.amount_total ? `$${(data.amount_total).toFixed(2)}` : "N/A";
            document.getElementById("currency").textContent = data.currency ? data.currency.toUpperCase() : "N/A";
            document.getElementById("payment-status").textContent = data.payment_status || "N/A";
            document.getElementById("customer-name").textContent = data.customer_name || "N/A";
            document.getElementById("customer-email").textContent = data.customer_email || "N/A";
        }
    } catch (error) {
        console.error("Error al obtener detalles del pago:", error);
        document.getElementById("payment-details").innerHTML = "<p>Error al cargar la información del pago.</p>";
    }
});
