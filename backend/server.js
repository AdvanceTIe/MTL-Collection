require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const UPS_API_KEY = process.env.UPS_API_KEY;
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_SECRET_KEY = process.env.FEDEX_SECRET_KEY;
const FEDEX_ACCOUNT_NUMBER = process.env.FEDEX_ACCOUNT_NUMBER;

const app = express();

// Configuración de Nodemailer con Zoho Mail
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.ZOHO_MAIL_ACCOUNT,
        pass: process.env.ZOHO_MAIL_PASSWORD
    }
});

console.log("Clave Stripe:", process.env.STRIPE_SECRET_KEY ? "Cargada correctamente" : "No encontrada");

// Webhook de Stripe (debe ir ANTES de cualquier middleware que pueda alterar el cuerpo)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('Webhook recibido en /webhook:', req.headers['stripe-signature']);
    console.log('Tipo de req.body:', typeof req.body, Buffer.isBuffer(req.body) ? 'Es Buffer' : 'No es Buffer');
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log('Evento recibido:', event.type);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar el evento checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Obtener los detalles de la sesión
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const customerEmail = session.customer_email || session.customer_details?.email;
        const totalAmount = session.amount_total / 100;
        const purchaseDate = new Date(session.created * 1000).toLocaleString();
        
        // Generar número de orden
        const orderNumber = `ORD-${session.id.slice(-6).toUpperCase()}`;

        // Obtener dirección de envío
        const shippingAddress = session.shipping_details?.address ? `
            ${session.shipping_details.address.line1}${session.shipping_details.address.line2 ? '<br>' + session.shipping_details.address.line2 : ''}<br>
            ${session.shipping_details.address.city}, ${session.shipping_details.address.state || ''} ${session.shipping_details.address.postal_code}<br>
            ${session.shipping_details.address.country}
        ` : 'No proporcionada';

        // Cargar los productos desde products.json
        const productsPath = path.join(__dirname, 'data', 'products.json');
        let productData;
        try {
            const data = fs.readFileSync(productsPath, 'utf8');
            productData = JSON.parse(data);
        } catch (err) {
            console.error("Error leyendo products.json:", err);
            productData = [];
        }

        // Filtrar los productos reales (excluir "Impuestos" y "Costo de Envío")
        const products = lineItems.data.filter(item => 
            !item.description.includes('Impuestos') && !item.description.includes('Costo de Envío')
        );

        // Mapear los productos comprados con su primera imagen
        const productsWithImages = products.map(item => {
            const productInfo = productData.find(p => p.name === item.description) || {};
            // Obtener la primera imagen y convertirla en URL absoluta
            const imageUrl = productInfo.images && productInfo.images.length > 0 
                ? `https://www.myth-toys-lover.com${productInfo.images[0]}` 
                : 'https://www.myth-toys-lover.com/img/myth-toys-lover.jpg'; // Imagen por defecto si no se encuentra
            return {
                ...item,
                image: imageUrl
            };
        });

        // Calcular el número total de artículos (suma de cantidades de productos reales)
        const totalItems = products.reduce((sum, item) => sum + item.quantity, 0);

        // Calcular el subtotal (suma de los precios de los productos reales)
        const subtotal = products.reduce((sum, item) => sum + (item.amount_total / 100), 0);

        // Generar la lista de productos comprados con imágenes
        const itemsHtml = productsWithImages.map(item => `
            <div style="display: flex; align-items: center; margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #e0e0e0;">
                <img src="${item.image}" alt="${item.description}" style="width: 60px; height: 60px; object-fit: contain; margin-right: 15px; border-radius: 5px;">
                <div style="flex: 1;">
                    <strong style="font-size: 16px; color: #333;">${item.description}</strong><br>
                    <span style="color: #555;">Cantidad: ${item.quantity}</span>   
                    <span style="color: #555;">Precio: $${(item.amount_total / 100).toFixed(2)}</span>
                </div>
            </div>
        `).join('');

        // Obtener impuestos y costo de envío desde los line_items
        let taxAmount = 0;
        let shippingCost = 0;
        lineItems.data.forEach(item => {
            if (item.description.includes('Impuestos')) {
                taxAmount = item.amount_total / 100;
            }
            if (item.description.includes('Costo de Envío')) {
                shippingCost = item.amount_total / 100;
            }
        });

        // Generar el contenido HTML del correo
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center;">
                    <img src="https://www.myth-toys-lover.com/img/myth-toys-lover.jpg" alt="Myth Toys Lover" style="width: 120px; margin-bottom: 20px;">
                </div>
                <h2 style="color: #003153; text-align: center;">¡Gracias por tu compra en Myth Toys Lover!</h2>
                <p>Hola <strong> ${session.customer_details?.name ? ' ' + session.customer_details.name : ''} </strong> ,</p>
                <p>Hemos recibido tu pago con éxito. A continuacion se relaciona el detalle de los productos:</p>
                <h3 style="color: #555;">Detalles de la Compra</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>Número de Orden:</strong> ${orderNumber}</li>
                    <li><strong>Fecha del Pago:</strong> ${purchaseDate}</li>
                    <li><strong>ID de Transacción:</strong> ${session.created}</li>
                    <li><strong>Estado del Pago:</strong> ${session.status}</li>
                    <li><strong>Moneda:</strong> ${session.currency}</li>
                    <li>
                        <strong>Productos:</strong><br>
                        ${itemsHtml}
                        <div style="margin-top: 10px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
                            <strong style="color: #333;"># Artículos:</strong> ${totalItems}<br>
                            <strong style="color: #333;">Subtotal:</strong> USD $${subtotal.toFixed(2)}<br>
                        </div>
                    </li>
                    <li><strong>Impuestos:</strong> USD $${taxAmount.toFixed(2)}</li>
                    <li><strong>Costo de Envío:</strong> USD $${shippingCost.toFixed(2)}</li>
                    <li><strong>Valor Total:</strong> USD $${totalAmount.toFixed(2)}</li>
                    <li><strong>Dirección de Envío:</strong><br>${shippingAddress}</li>
                </ul>
                <!--<p>Gracias por confiar en nosotros. Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:support@myth-toys-lover.com" style="color: #007bff;">support@myth-toys-lover.com</a>.</p> -->
                <p>Gracias por confiar en nosotros. Si tienes alguna pregunta, no dudes en contactarnos en 
                <a href="https://wa.me/17868342456?text=Bienvenido a Myth toys lover, !Inicia un chat para ayuarte!!" class="WhatsApp__link" target="_blank" style="color: #28a745;">WhatsApp</a>.</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="https://www.myth-toys-lover.com/Product.html" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Seguir Comprando</a>
                </div>
                <p style="color: #777; font-size: 12px; text-align: center; margin-top: 20px;">Myth Toys Lover - (Adavance Group) - Todos los derechos reservados © 2025</p>
            </div>
        `;

        // Configurar las opciones del correo
        const mailOptions = {
            from: process.env.ZOHO_MAIL_ACCOUNT,
            to: customerEmail,
            subject: `Confirmación de Compra #${orderNumber} - Myth Toys Lover`,
            html: emailHtml
        };

        // Función para enviar correo con reintentos
        const sendEmailWithRetry = async (options, retries = 3, delay = 5000) => {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    await transporter.sendMail(options);
                    console.log(`Correo de confirmación enviado a ${customerEmail} (Intento ${attempt})`);
                    return true;
                } catch (error) {
                    console.error(`Error al enviar correo (Intento ${attempt}/${retries}):`, error);
                    if (attempt === retries) {
                        const adminMailOptions = {
                            from: process.env.ZOHO_MAIL_ACCOUNT,
                            to: process.env.ZOHO_MAIL_ACCOUNT,
                            subject: 'Error al Enviar Correo de Confirmación',
                            text: `No se pudo enviar el correo de confirmación a ${customerEmail} después de ${retries} intentos. Error: ${error.message}`
                        };
                        try {
                            await transporter.sendMail(adminMailOptions);
                            console.log('Notificación enviada al administrador');
                        } catch (adminError) {
                            console.error('Error al enviar notificación al administrador:', adminError);
                        }
                        return false;
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        };

        // Enviar el correo con reintentos
        await sendEmailWithRetry(mailOptions);
    }

    res.status(200).end();
});

// Configurar CORS después del webhook
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Servir archivos estáticos desde 'frontend'
app.use('/', express.static(path.join(__dirname, '../frontend')));

// Middleware para parsear JSON (después del webhook)
app.use(express.json());

// Ruta de dirección a la página principal 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Ruta para obtener productos
app.get('/products', (req, res) => {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    fs.readFile(productsPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error leyendo products.json:", err);
            return res.status(500).json({ error: "Error al cargar productos" });
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint de Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    console.log("📩 Recibiendo datos en el backend:", JSON.stringify(req.body, null, 2));
    try {
        const { items } = req.body;
        
        if (!items || items.length === 0) {
            console.error("❌ No hay productos en la orden");
            return res.status(400).json({ error: "No hay productos en la orden." });
        }

        const lineItems = items.map(item => {
            if (!item.name || !item.price || !item.quantity) {
                throw new Error("Faltan campos requeridos en los items");
            }
     
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.round(parseFloat(item.price)),
                },
                quantity: parseInt(item.quantity),
            };
        });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel.html?session_id={CHECKOUT_SESSION_ID}`,
        });

        console.log("✅ Sesión creada en Stripe:", session.id);
        res.json({ url: session.url });

    } catch (error) {
        console.error("❌ Error en Stripe:", error.message);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Nueva ruta para obtener detalles del pago
app.get('/payment-details', async (req, res) => {
    try {
        const { session_id } = req.query;
        console.log("Consulta id recibida stripe:", req.query);

        if (!session_id) {
            console.error("❌ Falta session_id");
            return res.status(400).json({ error: "Falta session_id en la consulta." });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log("✅ Datos de TX obtenidos:", session);

        res.json({
            //id: session.id,
            //created: session.created,
            created: session.created,
            transaction_id: session.created,
            amount_total: session.amount_total / 100, // Convertir centavos a dólares
            currency: session.currency,
            //payment_status: session.payment_status,
            payment_status1:`ORD-${session.id.slice(-6).toUpperCase()}`,
            payment_status: session.status,
            customer_name: session.customer_details?.name || "No disponible",
            customer_email: session.customer_details?.email || "No disponible"
        });
    } catch (error) {
        console.error("Error al obtener detalles del pago:", error);
        res.status(500).json({ error: "Error al obtener la información de pago." });
    }
});

// Endpoint para calcular costo de envío
app.post('/calculate-shipping', async (req, res) => {
    const { destination, country, state, items, origin } = req.body;

    console.log("Datos recibidos:", { destination, country, state, items, origin });
    console.log("Credenciales FedEx:", {
        apiKey: process.env.FEDEX_API_KEY,
        secretKey: process.env.FEDEX_SECRET_KEY,
        accountNumber: process.env.FEDEX_ACCOUNT_NUMBER
    });

    try {
        const tokenResponse = await axios.post('https://apis-sandbox.fedex.com/oauth/token', {
            grant_type: 'client_credentials',
            client_id: process.env.FEDEX_API_KEY,
            client_secret: process.env.FEDEX_SECRET_KEY
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        console.log("Token:", accessToken);

        const requestedPackageLineItems = [];
        items.forEach(item => {
            const quantity = item.quantity || 1;
            for (let i = 0; i < quantity; i++) {
                requestedPackageLineItems.push({
                    weight: { units: 'LB', value: item.weight || 1 },
                    dimensions: {
                        length: item.length || 10,
                        width: item.width || 8,
                        height: item.height || 5,
                        units: 'IN'
                    }
                });
            }
        });

        const isInternational = country !== "US";
        const serviceType = isInternational ? "INTERNATIONAL_ECONOMY" : "FEDEX_GROUND";

        const zipToState = {
            "33166": "FL",
            "90210": "CA",
            "33018": "FL"
        };
        const originState = zipToState[origin] || "FL";

        const shipmentDetails = {
            shipper: {
                address: {
                    postalCode: origin,
                    countryCode: "US",
                    stateOrProvinceCode: originState
                }
            },
            recipient: {
                address: {
                    postalCode: destination,
                    countryCode: country || "US",
                    stateOrProvinceCode: state || undefined
                }
            },
            pickupType: "DROPOFF_AT_FEDEX_LOCATION",
            rateRequestType: ["ACCOUNT"],
            requestedPackageLineItems: requestedPackageLineItems,
            serviceType: serviceType
        };

        if (isInternational) {
            const totalCustomsValue = items.reduce((sum, item) => sum + (item.price || 100) * (item.quantity || 1), 0);
            const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            shipmentDetails.customsClearanceDetail = {
                dutiesPayment: {
                    paymentType: "SENDER"
                },
                customsValue: {
                    amount: totalCustomsValue,
                    currency: "USD"
                },
                commodities: [
                    {
                        description: "General Merchandise",
                        countryOfManufacture: "US",
                        quantity: totalQuantity,
                        quantityUnits: "EA",
                        unitPrice: {
                            amount: totalCustomsValue / totalQuantity,
                            currency: "USD"
                        },
                        customsValue: {
                            amount: totalCustomsValue,
                            currency: "USD"
                        }
                    }
                ]
            };
        }

        const fedexResponse = await axios.post('https://apis-sandbox.fedex.com/rate/v1/rates/quotes', {
            accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
            requestedShipment: shipmentDetails
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-locale': 'en_US'
            }
        });

        console.log("Respuesta completa de FedEx:", JSON.stringify(fedexResponse.data, null, 2));
        const rateDetails = fedexResponse.data.output.rateReplyDetails[0].ratedShipmentDetails[0];
        const shippingCost = parseFloat(rateDetails.totalNetFedExCharge || rateDetails.totalNetCharge);
        if (isNaN(shippingCost)) {
            throw new Error("No se encontró un costo válido en la respuesta de FedEx");
        }
        res.json({ shippingCost });
    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error("Error con FedEx API:", JSON.stringify(errorDetails, null, 2));
        res.status(500).json({ error: "No se pudo calcular el costo de envío", details: errorDetails });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
