// ============================================
// LOJA ONLINE - JavaScript Publico (Python/Flask)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadStoreData();
    renderStore();
    recordView();
});

async function loadStoreData() {
    try {
        const response = await fetch('/api/store');
        if (response.ok) {
            window.storeData = await response.json();
        } else {
            window.storeData = {
                products: [],
                appearance: { primaryColor: '#6366f1', secondaryColor: '#ec4899', theme: 'modern' },
                contact: { whatsapp: '', whatsappMessage: 'Ola! Tenho interesse em:', instagram: '', facebook: '', email: '', phone: '', address: '', businessHours: '' },
                settings: { storeName: 'Minha Loja', description: 'Sua loja online de confianca', isOpen: true }
            };
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        window.storeData = {};
    }
}

// ============================================
// REGISTRAR VISUALIZACAO
// ============================================
async function recordView() {
    try {
        // Usar sessionStorage para não contar múltiplas views do mesmo usuário na mesma sessão
        if (!sessionStorage.getItem('viewRecorded')) {
            await fetch('/api/stats/view', { method: 'POST' });
            sessionStorage.setItem('viewRecorded', 'true');
        }
    } catch (e) {
        console.warn('Erro ao registrar visualização:', e);
    }
}

// ============================================
// FORMATACAO BRASILEIRA
// ============================================

function formatCurrency(value) {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',');
}

function formatPhone(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return value;
}

function renderStore() {
    const data = window.storeData || {};

    // Aplicar cores do tema
    if (data.appearance) {
        const root = document.documentElement;
        if (data.appearance.primaryColor) root.style.setProperty('--primary', data.appearance.primaryColor);
        if (data.appearance.secondaryColor) root.style.setProperty('--secondary', data.appearance.secondaryColor);
    }

    // Aplicar tema visual
    applyTheme(data.appearance?.theme || 'modern');

    // Nome da loja
    const storeName = data.settings?.storeName || 'Minha Loja';
    document.getElementById('storeName').textContent = storeName;
    document.getElementById('footerStoreName').textContent = storeName;
    document.getElementById('footerBrand').textContent = storeName;
    document.title = storeName;

    // Descricao
    if (data.settings?.description) {
        document.getElementById('footerDescription').textContent = data.settings.description;
    }

    // Logo
    if (data.appearance?.logo) {
        const logoContainer = document.getElementById('logoContainer');
        logoContainer.innerHTML = `<img src="${data.appearance.logo}" alt="${storeName}" style="max-height: 60px;">`;
    }

    // Banner
    if (data.appearance?.banner) {
        document.getElementById('bannerPlaceholder').style.display = 'none';
        const bannerImage = document.getElementById('bannerImage');
        bannerImage.src = data.appearance.banner;
        bannerImage.style.display = 'block';
    }

    // Contato no header
    const headerContact = document.getElementById('headerContact');
    let headerHtml = '';
    if (data.contact?.whatsapp) {
        headerHtml += `<a href="https://wa.me/55${data.contact.whatsapp.replace(/\D/g, '')}" target="_blank"><i class="fab fa-whatsapp"></i> ${formatPhone(data.contact.whatsapp)}</a>`;
    }
    if (data.contact?.email) {
        headerHtml += `<a href="mailto:${data.contact.email}"><i class="fas fa-envelope"></i> ${data.contact.email}</a>`;
    }
    if (data.contact?.phone) {
        headerHtml += `<a href="tel:${data.contact.phone.replace(/\D/g, '')}"><i class="fas fa-phone"></i> ${formatPhone(data.contact.phone)}</a>`;
    }
    headerContact.innerHTML = headerHtml;

    // Produtos - filtrar apenas disponíveis e ativos
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const products = data.products?.filter(p => p.active !== false && p.status !== 'vendido') || [];

    if (products.length === 0) {
        productsGrid.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        productsGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        productsGrid.innerHTML = products.map(product => {
            const hasPromo = product.promo && product.promo < product.price;
            const displayPrice = hasPromo ? product.promo : product.price;
            let whatsappLink = '#';
            if (data.contact?.whatsapp) {
                const message = encodeURIComponent(
                    (data.contact.whatsappMessage || 'Ola! Tenho interesse em:') + ' ' + product.name
                );
                whatsappLink = `https://wa.me/55${data.contact.whatsapp.replace(/\D/g, '')}?text=${message}`;
            }

            // Badge de status
            let statusBadge = '';
            if (product.status === 'reservado') {
                statusBadge = `<div style="position: absolute; top: 0.75rem; left: 0.75rem; background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; z-index: 10;">RESERVADO</div>`;
            }

            return `
                <div class="product-card" id="product-${product.id}" onclick="openProductModal(${product.id})" style="position: relative;">
                    ${statusBadge}
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/400x300?text=Sem+Imagem'}" 
                         class="product-image" 
                         alt="${product.name}">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        ${product.description ? `<p class="product-description">${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}</p>` : ''}
                        <div class="product-footer">
                            <div class="product-price">
                                ${hasPromo ? `<span class="price-original">${formatCurrency(product.price)}</span>` : ''}
                                <span class="price-current">${formatCurrency(displayPrice)}</span>
                            </div>
                            <span class="view-more-btn">
                                <i class="fas fa-eye"></i> Ver Mais
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Footer - Contato
    const footerContact = document.getElementById('footerContact');
    let footerContactHtml = '';
    if (data.contact?.address) footerContactHtml += `<p><i class="fas fa-map-marker-alt"></i> ${data.contact.address}</p>`;
    if (data.contact?.businessHours) footerContactHtml += `<p><i class="fas fa-clock"></i> ${data.contact.businessHours}</p>`;
    if (data.contact?.phone) footerContactHtml += `<p><i class="fas fa-phone"></i> ${formatPhone(data.contact.phone)}</p>`;
    if (data.contact?.email) footerContactHtml += `<p><i class="fas fa-envelope"></i> ${data.contact.email}</p>`;
    footerContact.innerHTML = footerContactHtml;

    // Footer - Redes Sociais
    const socialLinks = document.getElementById('socialLinks');
    let socialHtml = '';
    if (data.contact?.instagram) {
        socialHtml += `<a href="https://instagram.com/${data.contact.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
    }
    if (data.contact?.facebook) {
        socialHtml += `<a href="${data.contact.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>`;
    }
    if (data.contact?.whatsapp) {
        socialHtml += `<a href="https://wa.me/55${data.contact.whatsapp.replace(/\D/g, '')}" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
    }
    if (data.contact?.email) {
        socialHtml += `<a href="mailto:${data.contact.email}" title="E-mail"><i class="fas fa-envelope"></i></a>`;
    }
    socialLinks.innerHTML = socialHtml;

    // WhatsApp Float
    const whatsappFloat = document.getElementById('whatsappFloat');
    if (data.contact?.whatsapp) {
        const message = encodeURIComponent(data.contact.whatsappMessage || 'Ola! Tenho interesse em seus produtos.');
        whatsappFloat.href = `https://wa.me/55${data.contact.whatsapp.replace(/\D/g, '')}?text=${message}`;
        whatsappFloat.style.display = 'flex';
    }

    // Ano atual
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

function applyTheme(theme) {
    const body = document.body;
    const productsGrid = document.getElementById('productsGrid');
    const header = document.getElementById('header');

    // Remover classes de tema anteriores
    body.classList.remove('theme-modern', 'theme-classic', 'theme-minimal');
    if (productsGrid) productsGrid.classList.remove('theme-modern', 'theme-classic', 'theme-minimal');

    // Aplicar novo tema
    body.classList.add(`theme-${theme}`);
    if (productsGrid) productsGrid.classList.add(`theme-${theme}`);

    // Aplicar estilos especificos do tema
    const themeStyles = document.getElementById('themeStyles');
    if (themeStyles) themeStyles.remove();

    const style = document.createElement('style');
    style.id = 'themeStyles';

    if (theme === 'classic') {
        style.textContent = `
            .products-grid { grid-template-columns: 1fr; max-width: 800px; margin: 0 auto; }
            .product-card { display: flex; flex-direction: row; border-radius: 0; border: 1px solid #e5e7eb; box-shadow: none; }
            .product-card:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .product-image { width: 250px; height: 200px; border-radius: 0; }
            .product-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .product-footer { margin-top: auto; }
            .section-title::after { border-radius: 0; }
            .header { border-bottom: 3px solid var(--primary); }
            .banner-section { border-bottom: 3px solid var(--secondary); }
            .footer { border-top: 3px solid var(--primary); }
            .social-links a { border-radius: 0; }
            .buy-button { border-radius: 0; }
        `;
    } else if (theme === 'minimal') {
        style.textContent = `
            .products-grid { gap: 1rem; }
            .product-card { border: none; box-shadow: none; border-bottom: 1px solid #e5e7eb; border-radius: 0; }
            .product-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .product-image { height: 200px; border-radius: 0; }
            .section-title { font-weight: 300; letter-spacing: 2px; text-transform: uppercase; font-size: 1.25rem; }
            .section-title::after { width: 30px; height: 2px; }
            .product-title { font-weight: 400; font-size: 1.1rem; }
            .price-current { font-weight: 400; }
            .buy-button { border-radius: 0; background: transparent; color: var(--primary); border: 2px solid var(--primary); font-weight: 400; }
            .buy-button:hover { background: var(--primary); color: white; }
            .header { box-shadow: none; border-bottom: 1px solid rgba(255,255,255,0.2); }
            .footer { border-top: 1px solid #374151; }
            .social-links a { border-radius: 0; background: transparent; border: 1px solid #4b5563; }
            .social-links a:hover { background: var(--primary); border-color: var(--primary); }
            .whatsapp-float { border-radius: 0; }
        `;
    } else {
        // Moderno (padrao) - ja esta no CSS base
        style.textContent = '';
    }

    if (style.textContent) {
        document.head.appendChild(style);
    }
}


// ============================================
// MODAL DE PRODUTO - Ver Mais
// ============================================

function openProductModal(productId) {
    const data = window.storeData || {};
    const product = data.products?.find(p => p.id === productId);
    if (!product) return;

    // Não abrir modal se produto estiver vendido
    if (product.status === 'vendido') {
        return;
    }

    document.getElementById('modalTitle').textContent = product.name;

    const hasPromo = product.promo && product.promo < product.price;
    const displayPrice = hasPromo ? product.promo : product.price;

    let priceHtml = '';
    if (hasPromo) {
        priceHtml += `<span class="original">${formatCurrency(product.price)}</span>`;
    }
    priceHtml += `${formatCurrency(displayPrice)}`;
    document.getElementById('modalPrice').innerHTML = priceHtml;

    document.getElementById('modalDesc').textContent = product.description || 'Sem descrição disponível.';
    document.getElementById('modalStock').innerHTML = `<i class="fas fa-check-circle"></i> ${product.stock} unidades em estoque`;

    // Mostrar status no modal
    if (product.status === 'reservado') {
        document.getElementById('modalStock').innerHTML = `<i class="fas fa-clock" style="color: #f59e0b;"></i> <span style="color: #f59e0b; font-weight: 600;">PRODUTO RESERVADO</span>`;
    }

    // Imagens
    const mainImg = document.getElementById('modalMainImage');
    const thumbsContainer = document.getElementById('modalThumbs');

    const images = product.images?.filter(img => img) || [];
    if (images.length === 0) {
        images.push('https://via.placeholder.com/400x300?text=Sem+Imagem');
    }

    mainImg.src = images[0];

    thumbsContainer.innerHTML = images.map((img, idx) => 
        `<img src="${img}" class="${idx === 0 ? 'active' : ''}" onclick="changeModalImage('${img}', this)" alt="">`
    ).join('');

    // Botao comprar
    const buyBtn = document.getElementById('modalBuyBtn');
    if (data.contact?.whatsapp && product.status !== 'reservado') {
        const message = encodeURIComponent(
            (data.contact.whatsappMessage || 'Ola! Tenho interesse em:') + ' ' + product.name
        );
        buyBtn.href = `https://wa.me/55${data.contact.whatsapp.replace(/\D/g, '')}?text=${message}`;
        buyBtn.style.display = 'inline-flex';
        buyBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Comprar pelo WhatsApp';
    } else if (product.status === 'reservado') {
        buyBtn.style.display = 'inline-flex';
        buyBtn.href = '#';
        buyBtn.style.background = '#9ca3af';
        buyBtn.style.cursor = 'not-allowed';
        buyBtn.innerHTML = '<i class="fas fa-clock"></i> Produto Reservado';
        buyBtn.onclick = (e) => e.preventDefault();
    } else {
        buyBtn.style.display = 'none';
    }

    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';

    // Resetar botão de compra
    const buyBtn = document.getElementById('modalBuyBtn');
    buyBtn.style.background = '';
    buyBtn.style.cursor = '';
    buyBtn.onclick = null;
}

function changeModalImage(src, thumb) {
    document.getElementById('modalMainImage').src = src;
    document.querySelectorAll('.product-modal-thumbs img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}
