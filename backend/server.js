require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path'); // Añadido aquí
const fs = require('fs');
const axios = require('axios');


const UPS_API_KEY = process.env.UPS_API_KEY;
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_SECRET_KEY = process.env.FEDEX_SECRET_KEY;
const FEDEX_ACCOUNT_NUMBER = process.env.FEDEX_ACCOUNT_NUMBER;

const app = express();

// Configurar CORS correctamente
app.use(cors({
   // origin: ['http://localhost:3000', 'http://127.0.0.1:5500'], // Permitir ambos orígenes
    origin: '*',
    methods: ['GET,POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Servir archivos estáticos desde 'frontend'
//app.use(express.static(path.join(__dirname, '../')));

// Servir archivos estáticos desde 'frontend' como raíz
app.use('/', express.static(path.join(__dirname, '../frontend')));


console.log("Clave Stripe:", process.env.STRIPE_SECRET_KEY ? "Cargada correctamente" : "No encontrada");

// Ruta de direccion a la pagina principal 
app.get('/', (req, res) => {
    //res.send('Servidor de pagos funcionando correctamente.');
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

        // Validar y formatear los items correctamente
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
                    unit_amount: Math.round(parseFloat(item.price)), // Asegurar que es número unit_amount: Math.round(parseFloat(item.price) * 100),
                },
                quantity: parseInt(item.quantity), // Asegurar que es número
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
        const { session_id } = req.query; // Recibe el session_id desde la URL
        console.log("Consulta id recibida stipe:", req.query);

        if (!session_id) {
            console.error("❌ Falta session_id");
            return res.status(400).json({ error: "Falta session_id en la consulta." });
        }
        // Obtener detalles de la sesión de Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log("✅ Datos de TX obtenidos:", session);

        res.json({
            //id: session.id,
            //transaction_id: session.payment_intent, payment_intent: session.payment_intent,
            //created: session.created,
            created: session.created,
            transaction_id: session.created,
            amount_total: session.amount_total / 100, // Convertir centavos a dólares
            currency: session.currency,
            payment_status: session.payment_status,
            payment_status: session.status,
            customer_name: session.customer_details?.name || "No disponible",
            customer_email: session.customer_details?.email || "No disponible"
        });
    } catch (error) {
        console.error("Error al obtener detalles del pago:", error);
        res.status(500).json({ error: "Error al obtener la información de pago." });
    }
});
// Iniciar el servidor

//Endpoint para calcular costo de envío

 //const shippingCost = 15.00; // Costo ficticio para pruebas
    //res.json({ shippingCost });

// Calcualo inter USA
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

        // Crear requestedPackageLineItems teniendo en cuenta la cantidad de cada ítem
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
