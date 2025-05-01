document.addEventListener("DOMContentLoaded", function () {
    const API_PRODUCTS = "https://api.escuelajs.co/api/v1/products";
    const API_CATEGORIES = "https://api.escuelajs.co/api/v1/categories";
    const DEFAULT_IMAGE = "https://dummyimage.com/200x200/cccccc/000000&text=Sin+Imagen";
    const carrito = {};
    let usuarioActual = null;
    let offset = 0;
    const limit = 8;
    let loading = false;
    let noMoreProducts = false;
    let ordenActual = "asc";
    let categoriaActualId = null;
    let categoriaOffset = 0;
    let cargandoCategoria = false;
    let finCategoria = false;
    let vistaActual = "productos"; // Nueva variable para rastrear la vista actual

    function actualizarMenu() {
        const loginLink = document.getElementById("login-link");
        const registerLink = document.getElementById("register-link");
        const logoutLink = document.getElementById("logout-link");

        if (usuarioActual) {
            loginLink.style.display = "none";
            registerLink.style.display = "none";
            logoutLink.style.display = "inline";
        } else {
            loginLink.style.display = "inline";
            registerLink.style.display = "inline";
            logoutLink.style.display = "none";
        }
    }

    function ordenarProductos(orden) {
        ordenActual = orden;
        
        document.getElementById("ordenar-asc").classList.toggle("activo", orden === "asc");
        document.getElementById("ordenar-desc").classList.toggle("activo", orden === "desc");
        
        const grid = document.querySelector(".grid");
        grid.innerHTML = '';
        
        // Reiniciar parámetros de carga
        offset = 0;
        categoriaOffset = 0;
        noMoreProducts = false;
        finCategoria = false;
        
        if (categoriaActualId !== null) {
            cargarMasProductosCategoria();
        } else {
            cargarProductosScroll();
        }
    }

    function cargarProductosScroll() {
        if (loading || noMoreProducts) return;
    
        loading = true;
        const grid = document.querySelector(".grid") || crearGrid();
        
        // Mostrar indicador de carga
        // Solo mostrar preloader mientras carga
        let preloader = document.createElement("div");
        preloader.id = "scroll-preloader";
        preloader.textContent = "Cargando...";
        preloader.style.opacity = "0.7";
        preloader.style.padding = "10px";
        preloader.style.textAlign = "center";
        grid.appendChild(preloader);
    
        fetch(`${API_PRODUCTS}?offset=${offset}&limit=${limit}`)
            .then(res => res.json())
            .then(productos => {
                // Eliminar el preloader inmediatamente
                const preloaderElement = document.getElementById("scroll-preloader");
                if (preloaderElement) preloaderElement.remove();
                
                if (productos.length === 0) {
                    noMoreProducts = true;
                    return;
                }
                
                productos.sort((a, b) => {
                    const valorA = String(a.title).toLowerCase();
                    const valorB = String(b.title).toLowerCase();
                    
                    if (ordenActual === "asc") {
                        return valorA.localeCompare(valorB);
                    } else {
                        return valorB.localeCompare(valorA);
                    }
                });
    
                renderProductos(productos);
                offset += limit;
            })
            .catch((error) => {
                console.error("Error al cargar productos:", error);
                const preloaderElement = document.getElementById("scroll-preloader");
                if (preloaderElement) {
                    preloaderElement.textContent = "Error al cargar más productos.";
                }
            })
            .finally(() => loading = false);
    }
    
    function crearGrid() {
        const appElement = document.getElementById("app");
        appElement.innerHTML = `
            <div class="controles-ordenamiento">
                <button id="ordenar-asc" ${ordenActual === "asc" ? "class='activo'" : ""}>Ordenar ↑ (A-Z)</button>
                <button id="ordenar-desc" ${ordenActual === "desc" ? "class='activo'" : ""}>Ordenar ↓ (Z-A)</button>
            </div>
            <div class="grid"></div>
        `;
        
        document.getElementById("ordenar-asc").addEventListener("click", function() {
            ordenarProductos("asc");
        });
        
        document.getElementById("ordenar-desc").addEventListener("click", function() {
            ordenarProductos("desc");
        });
        
        return document.querySelector(".grid");
    }

    window.addEventListener("scroll", () => {
        const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
        
        if (nearBottom) {
            // Solo cargar productos adicionales si estamos en la vista de productos o categoría
            if (vistaActual === "productos" && !noMoreProducts && categoriaActualId === null) {
                cargarProductosScroll();
            }
    
            if (vistaActual === "productos" && categoriaActualId !== null && !finCategoria) {
                cargarMasProductosCategoria();
            }
        }
    });

    document.querySelectorAll(".menu a").forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const target = this.getAttribute("href");
    
            if (target === "#productos") {
                vistaActual = "productos";
                categoriaActualId = null;
                offset = 0;
                noMoreProducts = false;
                cargarContenidoScroll();
            } else if (target === "#categorias") {
                vistaActual = "categorias";
                categoriaActualId = null;
                cargarCategorias();
            } else if (target === "#carrito") {
                vistaActual = "carrito";
                mostrarCarrito();
            }
        });
    });
    
    function cargarCategorias() {
        const appElement = document.getElementById("app");
        appElement.innerHTML = '<div id="preloader" style="text-align: center; padding: 20px;">Cargando...</div>';
        
        fetch(API_CATEGORIES)
            .then(res => res.json())
            .then(categorias => {
                appElement.innerHTML = `
                    <h2>Selecciona una categoría</h2>
                    <div class="categorias-opciones"></div>
                `;
                
                const categoriasContainer = document.querySelector(".categorias-opciones");
                categorias.forEach(categoria => {
                    const categoriaElement = document.createElement("div");
                    categoriaElement.classList.add("categoria-opcion");
                    
                    categoriaElement.innerHTML = `
                        <img src="${categoria.image || DEFAULT_IMAGE}" alt="${categoria.name}" />
                        <h3>${categoria.name}</h3>
                    `;
                    
                    categoriaElement.addEventListener("click", function() {
                        mostrarProductosPorCategoria(categoria.id, categoria.name);
                    });
                    
                    categoriasContainer.appendChild(categoriaElement);
                });
            })
            .catch(() => {
                appElement.innerHTML = "<p>Error al cargar las categorías.</p>";
            });
    }
    
    function cargarContenidoScroll() {
        const appElement = document.getElementById("app");
        appElement.innerHTML = `
            <div class="controles-ordenamiento">
                <button id="ordenar-asc" ${ordenActual === "asc" ? "class='activo'" : ""}>Ordenar ↑ (A-Z)</button>
                <button id="ordenar-desc" ${ordenActual === "desc" ? "class='activo'" : ""}>Ordenar ↓ (Z-A)</button>
            </div>
            <div class="grid"></div>
        `;
        
        document.getElementById("ordenar-asc").addEventListener("click", function() {
            ordenarProductos("asc");
        });
        
        document.getElementById("ordenar-desc").addEventListener("click", function() {
            ordenarProductos("desc");
        });
        
        cargarProductosScroll();
    }
        
    function renderProductos(productos) {
        const grid = document.querySelector(".grid");
        productos.forEach(producto => {
            const productoElement = document.createElement("div");
            productoElement.classList.add("producto");

            productoElement.innerHTML = `
                <img src="${(Array.isArray(producto.images) && producto.images.length > 0) ? producto.images[0] : DEFAULT_IMAGE}" alt="${producto.title}" />
                <h3>${producto.title}</h3>
                <p>${producto.price}€</p>
                <button>Añadir al carrito</button>
            `;

            const button = productoElement.querySelector("button");
            button.addEventListener("click", function (e) {
                e.stopPropagation();
                agregarAlCarrito(producto.id, producto.title, producto.price);
            });

            productoElement.addEventListener("click", function () {
                mostrarModalProducto(producto);
            });

            grid.appendChild(productoElement);
        });
    }

    function mostrarModalProducto(producto) {
        const modal = document.getElementById("modal");
        const modalContent = document.getElementById("modal-content");

        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <img src="${(Array.isArray(producto.images) && producto.images.length > 0) ? producto.images[0] : DEFAULT_IMAGE}" alt="${producto.title}" style="max-width: 100%; border-radius: 12px;">
            <h2>${producto.title}</h2>
            <p>${producto.description}</p>
            <p><strong>Precio:</strong> ${producto.price}€</p>
            <button id="add-to-cart-btn">Añadir al carrito</button>
        `;

        modal.style.display = "block";

        modalContent.querySelector(".close").addEventListener("click", function () {
            modal.style.display = "none";
        });

        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });

        document.getElementById("add-to-cart-btn").addEventListener("click", function (e) {
            e.stopPropagation();
            agregarAlCarrito(producto.id, producto.title, producto.price);
            modal.style.display = "none";
        });
    }
    
    function mostrarProductosPorCategoria(categoriaId, categoriaName) {
        vistaActual = "productos";
        categoriaActualId = categoriaId;
        categoriaOffset = 0;
        finCategoria = false;
    
        const appElement = document.getElementById("app");
        appElement.innerHTML = `
            <h2>Productos de la categoría: ${categoriaName}</h2>
            <div class="controles-ordenamiento">
                <button id="ordenar-asc" ${ordenActual === "asc" ? "class='activo'" : ""}>Ordenar ↑ (A-Z)</button>
                <button id="ordenar-desc" ${ordenActual === "desc" ? "class='activo'" : ""}>Ordenar ↓ (Z-A)</button>
            </div>
            <div class="grid"></div>
        `;
        
        document.getElementById("ordenar-asc").addEventListener("click", function() {
            ordenarProductos("asc");
        });
        
        document.getElementById("ordenar-desc").addEventListener("click", function() {
            ordenarProductos("desc");
        });
    
        cargarMasProductosCategoria();
    }
    
    function cargarMasProductosCategoria() {
        if (cargandoCategoria || finCategoria || categoriaActualId === null) return;
        cargandoCategoria = true;
    
        // Mostrar indicador temporal de carga
        const grid = document.querySelector(".grid");
        const preloader = document.createElement("div");
        preloader.id = "scroll-preloader";
        preloader.textContent = "Cargando...";
        preloader.style.opacity = "0.7";
        preloader.style.padding = "10px";
        preloader.style.textAlign = "center";
        grid.appendChild(preloader);
    
        fetch(`${API_PRODUCTS}?categoryId=${categoriaActualId}&offset=${categoriaOffset}&limit=${limit}`)
            .then(response => response.json())
            .then(productos => {
                // Eliminar inmediatamente el indicador
                const preloaderElement = document.getElementById("scroll-preloader");
                if (preloaderElement) preloaderElement.remove();
                
                if (productos.length === 0) {
                    finCategoria = true;
                    return;
                }
                
                productos.sort((a, b) => {
                    const valorA = String(a.title).toLowerCase();
                    const valorB = String(b.title).toLowerCase();
                    
                    if (ordenActual === "asc") {
                        return valorA.localeCompare(valorB);
                    } else {
                        return valorB.localeCompare(valorA);
                    }
                });
    
                renderProductos(productos);
                categoriaOffset += limit;
            })
            .catch((error) => {
                console.error("Error al cargar productos por categoría:", error);
                const preloaderElement = document.getElementById("scroll-preloader");
                if (preloaderElement) {
                    preloaderElement.textContent = "Error al cargar productos de esta categoría.";
                }
            })
            .finally(() => {
                cargandoCategoria = false;
            });
    }

    function mostrarModalUsuario(contenidoHTML) {
        const modal = document.getElementById("user-modal");
        const content = document.getElementById("user-modal-content");
        content.innerHTML = contenidoHTML;
        modal.style.display = "flex";

        modal.addEventListener("click", e => {
            if (e.target === modal) modal.style.display = "none";
        });
    }

    // Lista de usuarios disponibles para facilitar el login
    let usuariosDisponibles = [];
    
    // Cargar usuarios disponibles al inicio
    function cargarUsuariosDisponibles() {
        fetch("https://api.escuelajs.co/api/v1/users")
            .then(res => res.json())
            .then(users => {
                usuariosDisponibles = users;
                console.log("Usuarios disponibles cargados:", usuariosDisponibles.length);
            })
            .catch(error => {
                console.error("Error al cargar usuarios:", error);
            });
    }
    
    // Llamar a la función para cargar usuarios al iniciar
    cargarUsuariosDisponibles();

    document.getElementById("login-link").addEventListener("click", function () {
        mostrarModalUsuario(`
            <h2>Iniciar sesión</h2>
            <form id="login-form">
                <input type="email" placeholder="Email" required><br>
                <input type="password" placeholder="Contraseña" required><br>
                <button type="submit">Entrar</button>
            </form>
            <div id="usuarios-disponibles">
                <h4>Usuarios disponibles en la API:</h4>
                <div id="lista-usuarios">Cargando usuarios...</div>
            </div>
        `);

        // Mostrar usuarios disponibles para facilitar el login
        const mostrarListaUsuarios = () => {
            const listaUsuariosDiv = document.getElementById("lista-usuarios");
            if (listaUsuariosDiv) {
                if (usuariosDisponibles.length > 0) {
                    listaUsuariosDiv.innerHTML = "";
                    // Mostrar solo los primeros 5 usuarios para no sobrecargar la UI
                    usuariosDisponibles.slice(0, 5).forEach(user => {
                        const userItem = document.createElement("div");
                        userItem.classList.add("user-item");
                        
                        userItem.innerHTML = `
                            <div class="user-name">${user.name}</div>
                            <div class="user-email">Email: ${user.email}</div>
                        `;
                        
                        userItem.addEventListener("click", () => {
                            document.querySelector("#login-form input[type=email]").value = user.email;
                            document.querySelector("#login-form input[type=password]").value = "anypassword"; // La API no verifica contraseñas
                        });
                        
                        listaUsuariosDiv.appendChild(userItem);
                    });
                } else {
                    listaUsuariosDiv.innerHTML = "No se pudieron cargar los usuarios. Intente más tarde.";
                }
            }
        };

        // Llamar a la función una sola vez
        setTimeout(mostrarListaUsuarios, 500);

        // Crear un nuevo form listener cada vez
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
            // Eliminar cualquier listener previo antes de agregar uno nuevo
            const nuevoLoginForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(nuevoLoginForm, loginForm);
            
            nuevoLoginForm.addEventListener("submit", function (e) {
                e.preventDefault();
                const email = this.querySelector("input[type=email]").value;
                const password = this.querySelector("input[type=password]").value;

                // Si ya tenemos los usuarios cargados, buscamos directamente
                if (usuariosDisponibles.length > 0) {
                    const user = usuariosDisponibles.find(u => u.email === email);
                    if (user) {
                        usuarioActual = user;
                        alert(`Bienvenido, ${user.name}`);
                        document.getElementById("user-modal").style.display = "none";
                        actualizarMenu();
                    } else {
                        alert("Usuario no encontrado. Por favor usa uno de los usuarios disponibles en la API.");
                    }
                } else {
                    // Si no tenemos usuarios cargados, hacemos la petición
                    fetch("https://api.escuelajs.co/api/v1/users")
                        .then(res => res.json())
                        .then(users => {
                            usuariosDisponibles = users; // Actualizamos la lista
                            const user = users.find(u => u.email === email);
                            if (user) {
                                usuarioActual = user;
                                alert(`Bienvenido, ${user.name}`);
                                document.getElementById("user-modal").style.display = "none";
                                actualizarMenu();
                            } else {
                                alert("Usuario no encontrado. Por favor usa uno de los usuarios disponibles en la API.");
                            }
                        })
                        .catch(error => {
                            console.error("Error al verificar el usuario:", error);
                            alert("Error al verificar el usuario. Intente más tarde.");
                        });
                }
            });
        }
    });

    document.getElementById("register-link").addEventListener("click", function () {
        mostrarModalUsuario(`
            <h2>Registrarse</h2>
            <form id="register-form">
                <input type="text" placeholder="Nombre" required><br>
                <input type="email" placeholder="Email" required><br>
                <input type="password" placeholder="Contraseña" required><br>
                <p style="color: #888; font-size: 0.9em;">Nota: El registro es simulado. Deberás iniciar sesión con un usuario existente en la API.</p>
                <button type="submit">Registrarse</button>
            </form>
        `);

        document.getElementById("register-form").addEventListener("submit", function (e) {
            e.preventDefault();
            const name = this.querySelector("input[type=text]").value;
            const email = this.querySelector("input[type=email]").value;
            const password = this.querySelector("input[type=password]").value;

            // Mostrar indicador de carga
            const submitButton = this.querySelector("button[type=submit]");
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Procesando...";

            fetch("https://api.escuelajs.co/api/v1/users", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    avatar: "https://i.pravatar.cc/150?u=" + email
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .then(res => res.json())
                .then(data => {
                    // Verificar si la respuesta contiene un id (simulación exitosa)
                    if (data && data.id) {
                        // Simular que guardamos el usuario localmente (aunque no se podrá usar para login)
                        const nuevoUsuario = {
                            id: data.id,
                            name: name,
                            email: email,
                            avatar: data.avatar || `https://i.pravatar.cc/150?u=${email}`
                        };
                        
                        // Mostrar mensaje de éxito
                        alert(`Usuario "${name}" registrado correctamente (simulación).\n\nRecuerda que la API no guarda realmente el usuario, por lo que deberás iniciar sesión con uno de los usuarios existentes.`);
                        
                        // Cerrar el modal y mostrar el formulario de login
                        document.getElementById("user-modal").style.display = "none";
                        setTimeout(() => {
                            document.getElementById("login-link").click();
                        }, 500);
                    } else {
                        alert("Error al registrar el usuario. Por favor, inténtalo de nuevo.");
                    }
                })
                .catch(error => {
                    console.error("Error en el registro:", error);
                    alert("Error en el registro. Por favor, inténtalo de nuevo más tarde.");
                })
                .finally(() => {
                    // Restaurar el botón
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                });
        });
    });

    document.getElementById("logout-link").addEventListener("click", function (e) {
        e.preventDefault();
        usuarioActual = null;
        alert("Sesión cerrada.");
        actualizarMenu();
    });

    function mostrarCarrito() {
        const appElement = document.getElementById("app");
        appElement.innerHTML = `
            <div class="carrito">
                <h2>Tu Carrito</h2>
                <div class="carrito-items"></div>
                <div class="carrito-total"></div>
                <div class="carrito-acciones">
                    <button id="vaciar-carrito">Vaciar Carrito</button>
                    <button id="comprar-carrito">Comprar</button>
                </div>
            </div>
        `;

        const carritoItems = document.querySelector(".carrito-items");
        const carritoTotal = document.querySelector(".carrito-total");
        const vaciarBtn = document.getElementById("vaciar-carrito");
        const comprarBtn = document.getElementById("comprar-carrito");

        let total = 0;

        if (Object.keys(carrito).length === 0) {
            carritoItems.innerHTML = "<p class='carrito-vacio'>No hay productos en el carrito.</p>";
            carritoTotal.innerHTML = "";
            document.querySelector(".carrito-acciones").style.display = "none";
            return;
        }

        for (let id in carrito) {
            const item = carrito[id];
            total += item.precio * item.cantidad;

            const itemDiv = document.createElement("div");
            itemDiv.classList.add("carrito-item");
            itemDiv.innerHTML = `
                <span>${item.nombre}</span>
                <div>
                    <button class="decrementar" data-id="${id}">-</button>
                    <span>${item.cantidad}</span>
                    <button class="incrementar" data-id="${id}">+</button>
                </div>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
            `;
            carritoItems.appendChild(itemDiv);
        }

        carritoTotal.innerHTML = `<hr><p><strong>Total: $${total.toFixed(2)}</strong></p>`;

        vaciarBtn.addEventListener("click", function () {
            for (let id in carrito) delete carrito[id];
            mostrarCarrito();
        });

        comprarBtn.addEventListener("click", function () {
            alert("¡Gracias por tu compra! 🛒");
            for (let id in carrito) delete carrito[id];
            mostrarCarrito();
        });

        document.querySelectorAll(".incrementar").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.dataset.id;
                carrito[id].cantidad++;
                mostrarCarrito();
            });
        });

        document.querySelectorAll(".decrementar").forEach(btn => {
            btn.addEventListener("click", function () {
                const id = this.dataset.id;
                if (carrito[id].cantidad > 1) {
                    carrito[id].cantidad--;
                } else {
                    delete carrito[id];
                }
                mostrarCarrito();
            });
        });
    }

    window.agregarAlCarrito = function (id, nombre, precio) {
        if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
        carrito[id].cantidad++;
        alert(`${nombre} añadido al carrito.`);
    };

    cargarContenidoScroll();
    actualizarMenu();
});

function abrirModal() {
    document.getElementById("modal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
    document.body.style.overflow = "";
}

window.addEventListener("DOMContentLoaded", function() {
    const closeButton = document.querySelector(".close");
    if (closeButton) {
        closeButton.addEventListener("click", cerrarModal);
    }
    
    const modal = document.getElementById("modal");
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === document.getElementById("modal")) {
                cerrarModal();
            }
        });
    }
});