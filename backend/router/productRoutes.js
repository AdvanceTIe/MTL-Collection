const express = require('express');
const { getProducts } = require('../services/productService');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const products = await getProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener productos' });
    }
});

module.exports = router;
