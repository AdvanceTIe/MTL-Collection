document.addEventListener('DOMContentLoaded', function() {

    const searchInput = document.querySelector(".search__box input");
    const container = document.getElementById('products-section');
    let productsData = [];
    // Cargar productos desde el JSON
  fetch('/backend/data/products.json')
        .then(response => response.json())
        .then(products => {
            products.forEach((product, index) => createProductCard(product, index));
            productsData = products; // Guardamos los productos originales
            renderProducts(productsData); // Renderizamos todos los productos
        })
        .catch(
           error => console.error("Error al cargar los productos:", error)
          );


   // Cargar productos desde la API del backend
   



// Función para renderizar los productos
function renderProducts(filteredProducts) {
    container.innerHTML = ""; // Limpiar productos antes de renderizar

    if (filteredProducts.length === 0) {
        container.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    filteredProducts.forEach((product, index) => createProductCard(product, index));
}

// Función para filtrar productos por categoría
searchInput.addEventListener("input", function () {
    const searchValue = searchInput.value.trim().toLowerCase();
    const filteredProducts = productsData.filter(product => 
        product.category.toLowerCase().includes(searchValue)
    );
    renderProducts(filteredProducts);
});

function createProductCard(product, index) {
    console.log("Creando tarjeta para:", product); // Depuración
    const container = document.getElementById('products-section');

    const productCard = document.createElement('div');
    productCard.classList.add('product-card');

    productCard.innerHTML = `
        <div class="carousel" id="carousel-${index}">
            ${product.images.map((src, idx) => `<img src="${src}" alt="Imagen ${idx + 1}" class="carousel-img-${index} ${idx === 0 ? 'active' : ''}">`).join('')}
        </div>
        <h2>${product.name}</h2>
        <p class="description">${product.description}</p>
        <div class="price-options">
            ${product.options.map((option, idx) => `
                <label>                   
                    <input type="radio" name="price-${index}" value="${option.price}" data-label="${option.label}" ${idx === 0 ? 'checked' :''}> ${option.label} <span>: USD $</span>${option.price.toFixed(2)}
                </label>
            `).join('')}
        </div>
        <div class="quantity">
            <label for="quantity-${index}">Cantidad:</label>
            <input type="number" id="quantity-${index}" name="quantity" min="1" value="1">
            <a class="intagram" href="${product.video}" target="_blank"> video
                <i class="fa-brands fa-instagram"></i></a>
        </div>
         <div class="button-container">     
            <button class="buy-button" id="buy-button-${index}">Agregar: $${product.options[0].price.toFixed(2)}</button>
        </div>
        `;
 // Añadir la tarjeta al contenedor
    container.appendChild(productCard);

    // Carrusel de imágenes
    let currentImgIndex = 0;
    const images = document.querySelectorAll(`.carousel-img-${index}`);
    images[currentImgIndex].style.display = 'block';

    setInterval(function() {
        images[currentImgIndex].style.display = 'none';
        currentImgIndex = (currentImgIndex + 1) % images.length;
        images[currentImgIndex].style.display = 'block';
    }, 3000);

    // Actualizar el botón de agregar al carrito con el valor * cantidad seleccionado
    const priceOptions = document.querySelectorAll(`input[name="price-${index}"]`);
    const quantityInput = document.getElementById(`quantity-${index}`);
    priceOptions.forEach(option => {
        option.addEventListener('change', updateAddToCartButton);
    });
    quantityInput.addEventListener('input', updateAddToCartButton);

    function updateAddToCartButton() {
        const selectedPrice = parseFloat(document.querySelector(`input[name="price-${index}"]:checked`).value);
        const quantity = parseInt(quantityInput.value);
        const addButton = document.getElementById(`buy-button-${index}`);
        addButton.textContent = `Agregar: $${(selectedPrice * quantity).toFixed(2)}`;
    }

    document.getElementById(`buy-button-${index}`).addEventListener('click', function() {
        const selectedPrice = parseFloat(document.querySelector(`input[name="price-${index}"]:checked`).value);
        // Obtener la etiqueta de la opción seleccionada (label)
        const selectedOptionLabel = document.querySelector(`input[name="price-${index}"]:checked`).dataset.label;
        //const productName = product.name;
        const quantity = parseInt(quantityInput.value);
        const imageUrl = product.images[0]; // Usar la primera imagen del array
        //const productDescription = product.description;
        // Llamar a la función addToCart con todos los parámetros
        //addToCart(product.name, selectedOptionLabel, selectedPrice, quantity);
        addToCart(product.name, selectedOptionLabel, selectedPrice, quantity, imageUrl);
    });

    // Crear el modal para la imagen ampliada
const modal = document.createElement('div');
modal.classList.add('image-modal');
modal.innerHTML = `
    <div class="modal-content">
        <span class="close-modal">&times;</span>
        <img class="modal-img" src="" alt="Imagen ampliada">
        <div class="nav-buttons">
            <button class="nav-btn prev-btn">&#10094;</button>
            <button class="nav-btn next-btn">&#10095;</button>
        </div>
    </div>
`;
document.body.appendChild(modal);
// Elementos dentro del modal

const modalImg = modal.querySelector('.modal-img');
const closeModal = modal.querySelector('.close-modal');
const prevBtn = modal.querySelector('.prev-btn');
const nextBtn = modal.querySelector('.next-btn');

// Índice actual de la imagen en el carrusel
let currentImageIndex = 0;
// Lista de imágenes del producto actual
let currentProductImages = [];

// Evento para abrir la imagen en grande al hacer click
// Seleccionar todas las imágenes del carrusel con una clase dinámica basada en 'index'

const carouselImages = document.querySelectorAll(`.carousel-img-${index}`);
carouselImages.forEach((img, imgIndex) => {
    img.addEventListener('click', function () {
        // Guardar el índice de la imagen clickeada
        currentImageIndex = imgIndex;
        // Obtener todas las imágenes del producto actual
        currentProductImages = [...carouselImages].map(img => img.src);
        // Mostrar la imagen en el modal
        modalImg.src = currentProductImages[currentImageIndex];
        modal.style.display = "flex";
        updateNavigation();
    });
});

// Cambiar imagen en la modal
function changeImage(direction) {
    currentImageIndex = (currentImageIndex + direction + currentProductImages.length) % currentProductImages.length;
    modalImg.src = currentProductImages[currentImageIndex];
}

// Botones de navegación // Evento para los botones de navegación
prevBtn.addEventListener('click', () => changeImage(-1));
nextBtn.addEventListener('click', () => changeImage(1));

// Soporte Swipe táctil en móviles
let startX = 0;
modalImg.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
});

modalImg.addEventListener("touchend", (e) => {
    let endX = e.changedTouches[0].clientX;
    if (startX > endX + 50) {
        // Swipe izquierda -> siguiente imagen
        changeImage(1); // Swipe izquierda
    } else if (startX < endX - 50) {
        // Swipe derecha -> imagen anterior
        changeImage(-1); // Swipe derecha
    }
});

// Cerrar el modal al hacer clic en la "X"
closeModal.addEventListener('click', function () {
    modal.style.display = "none";
});

// Función para mostrar/ocultar flechas si solo hay una imagen
function updateNavigation() {
    prevBtn.style.display = currentProductImages.length > 1 ? 'block' : 'none';
    nextBtn.style.display = currentProductImages.length > 1 ? 'block' : 'none';
}

}

function addToCart(productName, selectedOptionLabel, price, quantity, imageUrl) {
    // Calcular el valor total del producto
    const total = (price * quantity).toFixed(2);
    const newProduct = {
        productName: productName,
        selectedOption: selectedOptionLabel,
        quantity: quantity,
        price: total,
        image: imageUrl // Guardar la imagen principal
    };
    // Obtener el carrito desde localStorage
    let memory = localStorage.getItem('productp');

    // Si no existe, inicializar un arreglo vacío
    if (memory === null) {
        memory = [];
    } else {
        memory = JSON.parse(memory);
    }
    // Buscar si el producto ya existe en el carrito
    let existingProduct = memory.find(item => item.productName === productName && item.selectedOption === selectedOptionLabel);

    if (existingProduct) {
        // Si el producto ya existe, actualizar su cantidad y valor total
        existingProduct.quantity += quantity;
        existingProduct.price = (existingProduct.quantity * price).toFixed(2);
    } else {
        // Agregar el nuevo producto al carrito
        memory.push(newProduct);
    }

    // Guardar el carrito actualizado en localStorage
    localStorage.setItem('productp', JSON.stringify(memory));
    console.log('Producto agregado al carrito:', newProduct);

    updateCartNum();
}

function getToCartItems () {
    // Obtener el carrito del localStorage
    let memory = localStorage.getItem('productp');
    // Si no hay carrito, inicializar como un arreglo vacío
    if (memory === null) {
        console.log('El carrito está vacío');
        return [];
    } else {
        // Convertir el JSON de vuelta a un arreglo
        memory = JSON.parse(memory);
        console.log('Productos en el carrito:', camemoryrt);
        return memory;
    }
}

function calculateCartTotal() {
    let memory = getCartItems();
    let total = 0;
    // Sumar los precios de cada producto multiplicados por la cantidad
    memory.forEach(item => {
        total += item.price;
    });
    console.log('Total del carrito:', total);
    return total;
}

//const cuentaCartElement = document.getElementById('cuenta__Cart');

function updateCartNum () {
    let stateCta = JSON.parse(localStorage.getItem('productp')) || [];
    let CantItem = stateCta.reduce ((sum, item) => sum +item.quantity, 0);
    document.getElementById ('cuenta__Cart').textContent = CantItem;

}
updateCartNum();

});