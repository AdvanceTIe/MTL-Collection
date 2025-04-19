document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector(".search__box input");
    const container = document.getElementById('products-section');
    let productsData = [];

    // Cargar productos desde la API del backend
    fetch('/products')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(products => {
            console.log("Productos recibidos:", products);
            productsData = products;

            // Leer el parámetro de búsqueda de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchTermFromURL = urlParams.get('search');

            // Filtrar productos con stock !== 3 antes de renderizar
            let filteredProducts = productsData.filter(product => product.stock !== 3);

            if (searchTermFromURL && searchInput) {
                // Si hay un término de búsqueda en la URL, lo aplicamos al campo y filtramos
                searchInput.value = decodeURIComponent(searchTermFromURL);
                filteredProducts = filteredProducts.filter(product => 
                    product.category.toLowerCase().includes(searchTermFromURL.toLowerCase()) ||
                    product.name.toLowerCase().includes(searchTermFromURL.toLowerCase())
                );
                // Marcar enlace activo si coincide con el término de la URL
                updateActiveLink(searchTermFromURL);
                // Mostrar botón de limpiar filtro
                const clearFilterBtn = document.getElementById('clear-filter');
                if (clearFilterBtn) {
                    clearFilterBtn.style.display = 'block';
                }
            }

            renderProducts(filteredProducts);
        })
        .catch(error => console.error("Error al cargar los productos:", error));

    // Función para renderizar los productos
    function renderProducts(filteredProducts) {
        container.innerHTML = "";
        if (filteredProducts.length === 0) {
            container.innerHTML = "<p>No se encontraron productos.</p>";
            return;
        }
        filteredProducts.forEach((product, index) => createProductCard(product, index));
    }

    // Función para filtrar productos (reutilizable para el campo de búsqueda y los enlaces del menú)
    function filterProductsByTerm(searchValue) {
        const filteredProducts = productsData
            .filter(product => product.stock !== 3) // No mostrar productos con stock 3
            .filter(product => 
                product.category.toLowerCase().includes(searchValue.toLowerCase()) ||
                product.name.toLowerCase().includes(searchValue.toLowerCase())
            );
        renderProducts(filteredProducts);
        // Actualizar la URL con el término de búsqueda
        if (searchValue) {
            window.history.pushState({}, '', `/product.html?search=${encodeURIComponent(searchValue)}`);
            // Mostrar botón de limpiar filtro
            const clearFilterBtn = document.getElementById('clear-filter');
            if (clearFilterBtn) {
                clearFilterBtn.style.display = 'block';
            }
        } else {
            window.history.pushState({}, '', '/product.html');
            // Ocultar botón de limpiar filtro
            const clearFilterBtn = document.getElementById('clear-filter');
            if (clearFilterBtn) {
                clearFilterBtn.style.display = 'none';
            }
        }
        // Actualizar enlace activo
        updateActiveLink(searchValue);
    }

    // Función para actualizar el enlace activo
    function updateActiveLink(searchValue) {
        const saintSeiyaLink = document.getElementById('filter-saint-seiya');
        const gundamLink = document.getElementById('filter-gundam');
        
        // Quitar clase active de todos los enlaces
        if (saintSeiyaLink) saintSeiyaLink.classList.remove('active');
        if (gundamLink) gundamLink.classList.remove('active');

        // Añadir clase active al enlace correspondiente
        if (searchValue.toLowerCase() === 'saint seiya' && saintSeiyaLink) {
            saintSeiyaLink.classList.add('active');
        } else if (searchValue.toLowerCase() === 'bandai' && gundamLink) {
            gundamLink.classList.add('active');
        }
    }

    // Escuchar cambios en el campo de búsqueda en tiempo real
    if (searchInput) {
        let debounceTimeout;

        searchInput.addEventListener("input", function () {
            const searchValue = searchInput.value.trim().toLowerCase();

            // Si estamos en product.html, filtramos directamente (sin debounce)
            if (window.location.pathname.includes('product.html')) {
                filterProductsByTerm(searchValue);
            } else {
                // Si estamos en otra página (como cart.html), usamos debounce para redirigir
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    if (searchValue) {
                        window.location.href = `/product.html?search=${encodeURIComponent(searchValue)}`;
                    } else {
                        window.location.href = `/product.html`;
                    }
                }, 500); // Esperar 500ms antes de redirigir
            }
        });
    }

    // Manejar clic en el ícono de lupa
/*
const searchIcon = document.querySelector('.search__icon');
if (searchIcon && searchInput) {
    searchIcon.addEventListener('click', function() {
        const searchValue = searchInput.value.trim();
        if (searchValue) {
            // Si hay texto, aplicar el filtro
            filterProductsByTerm(searchValue);
        } else {
            // Si está vacío, enfocar el campo de búsqueda
            searchInput.focus();
        }
    });
}
*/

const searchIcon = document.querySelector('.search__icon');
if (searchIcon && searchInput) {
    searchIcon.addEventListener('click', function() {
        const searchValue = searchInput.value.trim();
        if (searchValue) {
            if (window.location.pathname.includes('product.html')) {
                // En product.html, aplicar filtro inmediato
                filterProductsByTerm(searchValue);
            } else {
                // En otras páginas, redirigir de inmediato sin debounce
                window.location.href = `/product.html?search=${encodeURIComponent(searchValue)}`;
            }
        } else {
            // Si está vacío, enfocar el campo
            searchInput.focus();
        }
    });
}

// Ajustar el evento input para mantener el debounce en otras páginas
if (searchInput) {
    let debounceTimeout;
    searchInput.addEventListener("input", function () {
        const searchValue = searchInput.value.trim().toLowerCase();
        if (window.location.pathname.includes('product.html')) {
            filterProductsByTerm(searchValue);
        } else {
            // Solo aplicar debounce si no se usó el ícono
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                if (searchValue) {
                    window.location.href = `/product.html?search=${encodeURIComponent(searchValue)}`;
                } else {
                    window.location.href = `/product.html`;
                }
            }, 1000);
        }
    });
}

// Manejar clics en los enlaces del menú
    const saintSeiyaLink = document.getElementById('filter-saint-seiya');
    const gundamLink = document.getElementById('filter-gundam');

    if (saintSeiyaLink) {
        saintSeiyaLink.addEventListener('click', function(e) {
            e.preventDefault(); // Evitar que el enlace recargue la página
            const searchTerm = 'Saint Seiya';
            if (searchInput) {
                searchInput.value = searchTerm; // Mostrar el término en el campo de búsqueda
            }
            filterProductsByTerm(searchTerm);
        });
    }

    if (gundamLink) {
        gundamLink.addEventListener('click', function(e) {
            e.preventDefault(); // Evitar que el enlace recargue la página
            const searchTerm = 'Bandai'; // Buscar "Bandai" en lugar de "Gundam"
            if (searchInput) {
                searchInput.value = searchTerm; // Mostrar el término en el campo de búsqueda
            }
            filterProductsByTerm(searchTerm);
        });
    }

    // Manejar clic en el botón de limpiar filtro
    const clearFilterBtn = document.getElementById('clear-filter');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = ''; // Limpiar el campo de búsqueda
            }
            filterProductsByTerm(''); // Mostrar todos los productos
        });
    }

    function createProductCard(product, index) {
        console.log("Creando tarjeta para:", product);
        const container = document.getElementById('products-section');
    
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
    
        // Añadir clase especial si stock es 1 para mostrar la bandera
        if (product.stock === 1) {
            productCard.classList.add('low-stock');
        }
    
        // Determinar si el botón debe estar desactivado y su contenido
        const isLowStock = product.stock === 1;
        const buttonContent = isLowStock
            ? `<a href="https://wa.me/17868342456?text=Bienvenido a Myth toys lover, quiero infromacion sobre ${encodeURIComponent(product.name)}"  target="_blank" class="contact-chat">Contactar por Chat</a>`
            : `Agregar: $${product.options[0].price.toFixed(2)}`;
    
        productCard.innerHTML = `
            ${product.stock === 1 ? '<div class="stock-flag">Bajo Inventario</div>' : ''}
            <div class="carousel" id="carousel-${index}">
                ${product.images.map((src, idx) => `<img src="${src}" alt="Imagen ${idx + 1}" class="carousel-img-${index} ${idx === 0 ? 'active' : ''}">`).join('')}
            </div>
            <h2>${product.name}</h2>
            <p class="description">${product.description}</p>
            <div class="price-options">
                ${product.options.map((option, idx) => `
                    <label>                   
                        <input type="radio" name="price-${index}" value="${option.price}" data-label="${option.label}" ${idx === 0 ? 'checked' : ''} ${isLowStock ? 'disabled' : ''}> ${option.label} <span>: USD $</span>${option.price.toFixed(2)}
                    </label>
                `).join('')}
            </div>
            <div class="quantity">
                <label for="quantity-${index}">Cantidad:</label>
                <input type="number" id="quantity-${index}" name="quantity" min="1" value="1" ${isLowStock ? 'disabled' : ''}>
                <a class="instagram" href="${product.video}" target="_blank">Video
                    <i class="fa-brands fa-instagram"></i>
                </a>
            </div>
            <div class="button-container">     
                <button class="buy-button" id="buy-button-${index}" ${isLowStock ? 'disabled' : ''}>${buttonContent}</button>
            </div>
        `;
    
        // Añadir la tarjeta al contenedor
        container.appendChild(productCard);
    
        // Carrusel de imágenes
        let currentImgIndex = 0;
        const images = document.querySelectorAll(`.carousel-img-${index}`);
        if (images.length > 0) {
            images[currentImgIndex].style.display = 'block';
    
            setInterval(function() {
                images[currentImgIndex].style.display = 'none';
                currentImgIndex = (currentImgIndex + 1) % images.length;
                images[currentImgIndex].style.display = 'block';
            }, 3000);
        }
    
        // Si el producto no está en bajo inventario, habilitar la lógica del botón "Agregar"
        if (!isLowStock) {
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
                const selectedOptionLabel = document.querySelector(`input[name="price-${index}"]:checked`).dataset.label;
                const quantity = parseInt(quantityInput.value);
                const imageUrl = product.images[0];
                addToCart(product.name, selectedOptionLabel, selectedPrice, quantity, imageUrl);
            });
        }
    
        // Asegurar que el enlace "Contactar por Chat" no sea afectado por otros eventos
        if (isLowStock) {
            const chatLink = document.querySelector(`#buy-button-${index} .contact-chat`);
            if (chatLink) {
                chatLink.addEventListener('click', function(e) {
                    // Evitar que otros eventos (como el del botón) interfieran
                    e.stopPropagation();
                });
            }
        }
    
        // Crear el modal para la imagen ampliada
        const modal = document.createElement('div');
        modal.classList.add('image-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">×</span>
                <img class="modal-img" src="" alt="Imagen ampliada">
                <div class="nav-buttons">
                    <button class="nav-btn prev-btn">❮</button>
                    <button class="nav-btn next-btn">❯</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    
        const modalImg = modal.querySelector('.modal-img');
        const closeModal = modal.querySelector('.close-modal');
        const prevBtn = modal.querySelector('.prev-btn');
        const nextBtn = modal.querySelector('.next-btn');
    
        let currentImageIndex = 0;
        let currentProductImages = [];
    
        const carouselImages = document.querySelectorAll(`.carousel-img-${index}`);
        carouselImages.forEach((img, imgIndex) => {
            img.addEventListener('click', function () {
                currentImageIndex = imgIndex;
                currentProductImages = [...carouselImages].map(img => img.src);
                modalImg.src = currentProductImages[currentImageIndex];
                modal.style.display = "flex";
                updateNavigation();
            });
        });
    
        function changeImage(direction) {
            currentImageIndex = (currentImageIndex + direction + currentProductImages.length) % currentProductImages.length;
            modalImg.src = currentProductImages[currentImageIndex];
        }
    
        prevBtn.addEventListener('click', () => changeImage(-1));
        nextBtn.addEventListener('click', () => changeImage(1));
    
        let startX = 0;
        modalImg.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        });
    
        modalImg.addEventListener("touchend", (e) => {
            let endX = e.changedTouches[0].clientX;
            if (startX > endX + 50) {
                changeImage(1);
            } else if (startX < endX - 50) {
                changeImage(-1);
            }
        });
    
        closeModal.addEventListener('click', function () {
            modal.style.display = "none";
        });
    
        function updateNavigation() {
            prevBtn.style.display = currentProductImages.length > 1 ? 'block' : 'none';
            nextBtn.style.display = currentProductImages.length > 1 ? 'block' : 'none';
        }
    }

    function addToCart(productName, selectedOptionLabel, price, quantity, imageUrl) {
        const total = (price * quantity).toFixed(2);
        const newProduct = {
            productName: productName,
            selectedOption: selectedOptionLabel,
            quantity: quantity,
            price: total,
            image: imageUrl
        };
        let memory = localStorage.getItem('productp');
        if (memory === null) {
            memory = [];
        } else {
            memory = JSON.parse(memory);
        }
        let existingProduct = memory.find(item => item.productName === productName && item.selectedOption === selectedOptionLabel);
        if (existingProduct) {
            existingProduct.quantity += quantity;
            existingProduct.price = (existingProduct.quantity * price).toFixed(2);
        } else {
            memory.push(newProduct);
        }
        localStorage.setItem('productp', JSON.stringify(memory));
        console.log('Producto agregado al carrito:', newProduct);
        updateCartNum();
    }

    function getCartItems() {
        let memory = localStorage.getItem('productp');
        if (memory === null) {
            console.log('El carrito está vacío');
            return [];
        } else {
            memory = JSON.parse(memory);
            console.log('Productos en el carrito:', memory);
            return memory;
        }
    }

    function calculateCartTotal() {
        let memory = getCartItems();
        let total = 0;
        memory.forEach(item => {
            total += item.price;
        });
        console.log('Total del carrito:', total);
        return total;
    }

    function updateCartNum() {
        let stateCta = JSON.parse(localStorage.getItem('productp')) || [];
        let CantItem = stateCta.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cuenta__Cart').textContent = CantItem;
    }

    updateCartNum();
});
