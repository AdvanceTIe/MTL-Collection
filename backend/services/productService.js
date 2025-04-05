const fs = require('fs');
const path = require('path');
const Product = require('../models/Product'); // Modelo para la BD
const useDatabase = process.env.USE_DATABASE === 'true';

const getProducts = async () => {
    if (useDatabase) {
        return await Product.find(); // Consulta en la BD
    } else {
        const data = fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf-8');
        return JSON.parse(data);
    }
};

module.exports = { getProducts };
