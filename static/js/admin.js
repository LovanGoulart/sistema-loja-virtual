// ============================================
// ADMIN PRO - Sistema Administrativo
// JavaScript Principal
// ============================================

// Data Store - Armazena todos os dados da loja
let storeData = {
    products: [],
    appearance: {
        logo: null,
        banner: null,
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        theme: 'modern'
    },
    payment: {
        pix: { key: '', name: '', city: '', qrCode: null },
        card: { link: '', active: true },
        boleto: { instructions: '', active: false }
    },
    contact: {
        whatsapp: '',
        whatsappMessage: 'Olá! Vi seu site e tenho interesse em:',
        instagram: '',
        facebook: '',
        email: '',
        phone: '',
        address: '',
        businessHours: ''
    },
    settings: {
        storeName: '',
        slug: '',
        description: '',
        favicon: null,
        analyticsId: '',
        isOpen: true
    }
};


// ============================================
// FORMATACAO BRASILEIRA
// ============================================

function formatCurrency(input) {
    let value = input.value.replace(/\D/g, '');
    value = (parseInt(value) / 100).toFixed(2);
    input.value = value;
}

function formatCurrencyDisplay(value) {
    return 'R$ ' + parseFloat(value).toFixed(2).replace('.', ',');
}

function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);

    if (value.length > 7) {
        value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
    } else if (value.length > 2) {
        value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
    } else if (value.length > 0) {
        value = `(${value}`;
    }

    input.value = value;
}

function formatPhoneDisplay(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return value;
}

let editingProductId = null;
let productImages = {};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateStats();
    setupEventListeners();
});

function setupEventListeners() {
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Fechar sidebar ao clicar fora em mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

// ============================================
// NAVEGAÇÃO
// ============================================
function showSection(sectionId) {
    // Update sidebar
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const navLinks = document.querySelectorAll('.nav-link');
    const sectionMap = { dashboard: 0, products: 1, appearance: 2, payment: 3, contact: 4, settings: 5 };
    const idx = sectionMap[sectionId];
    if (idx !== undefined && navLinks[idx]) {
        navLinks[idx].classList.add('active');
    }

    // Update content
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Update title
    const titles = {
        dashboard: ['Dashboard', 'Visão geral da sua loja'],
        products: ['Produtos', 'Gerencie seus produtos'],
        appearance: ['Aparência', 'Personalize o visual'],
        payment: ['Pagamento', 'Configure métodos de pagamento'],
        contact: ['Contato', 'Informações de contato'],
        settings: ['Configurações', 'Ajustes gerais']
    };

    document.getElementById('pageTitle').textContent = titles[sectionId][0];
    document.getElementById('pageSubtitle').textContent = titles[sectionId][1];

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('active');
    }

    if (sectionId === 'products') renderProducts();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Logout agora é feito via link direto para /logout

// ============================================
// UPLOAD DE IMAGENS
// ============================================
function handleImageUpload(input, type) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(type + 'Preview');
            const upload = document.getElementById(type + 'Upload');

            preview.src = e.target.result;
            upload.classList.add('has-image');

            if (type === 'pix') {
                storeData.payment.pix.qrCode = e.target.result;
            } else if (type === 'favicon') {
                storeData.settings.favicon = e.target.result;
            } else {
                storeData.appearance[type] = e.target.result;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeImage(type) {
    const preview = document.getElementById(type + 'Preview');
    const upload = document.getElementById(type + 'Upload');
    const input = document.getElementById(type + 'Input');

    preview.src = '';
    upload.classList.remove('has-image');
    input.value = '';

    if (type === 'pix') {
        storeData.payment.pix.qrCode = null;
    } else if (type === 'favicon') {
        storeData.settings.favicon = null;
    } else {
        storeData.appearance[type] = null;
    }
}

// ============================================
// IMAGENS DO PRODUTO
// ============================================
function handleProductImage(input, num) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('productPreview' + num);
            const upload = document.getElementById('productImage' + num);

            preview.src = e.target.result;
            upload.classList.add('has-image');
            productImages[num] = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeProductImage(num) {
    const preview = document.getElementById('productPreview' + num);
    const upload = document.getElementById('productImage' + num);
    const input = document.getElementById('productImg' + num);

    preview.src = '';
    upload.classList.remove('has-image');
    input.value = '';
    delete productImages[num];
}

// ============================================
// GERENCIAMENTO DE PRODUTOS
// ============================================
function openProductModal(productId = null) {
    editingProductId = productId;
    document.getElementById('modalTitle').textContent = productId ? 'Editar Produto' : 'Novo Produto';

    if (productId) {
        const product = storeData.products.find(p => p.id === productId);
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productPromo').value = product.promo || '';
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productDesc').value = product.description || '';

        // Reset images
        [1, 2, 3].forEach(num => removeProductImage(num));
        product.images.forEach((img, idx) => {
            if (img) {
                const num = idx + 1;
                document.getElementById('productPreview' + num).src = img;
                document.getElementById('productImage' + num).classList.add('has-image');
                productImages[num] = img;
            }
        });

        const toggle = document.getElementById('productActive');
        if (product.active) toggle.classList.add('active');
        else toggle.classList.remove('active');
    } else {
        // Clear form
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productPromo').value = '';
        document.getElementById('productStock').value = '10';
        document.getElementById('productDesc').value = '';
        [1, 2, 3].forEach(num => removeProductImage(num));
        productImages = {};
        document.getElementById('productActive').classList.add('active');
    }

    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);

    if (!name) {
        showToast('Preencha o nome do produto!', 'error');
        return;
    }

    if (!price || price <= 0) {
        showToast('Preencha um preço válido!', 'error');
        return;
    }

    const product = {
        id: editingProductId || Date.now(),
        name: name,
        price: price,
        promo: parseFloat(document.getElementById('productPromo').value) || null,
        stock: parseInt(document.getElementById('productStock').value) || 0,
        description: document.getElementById('productDesc').value,
        images: [productImages[1], productImages[2], productImages[3]].filter(Boolean),
        active: document.getElementById('productActive').classList.contains('active'),
        createdAt: editingProductId ? storeData.products.find(p => p.id === editingProductId).createdAt : new Date().toISOString()
    };

    if (editingProductId) {
        const index = storeData.products.findIndex(p => p.id === editingProductId);
        storeData.products[index] = product;
        showToast('Produto atualizado com sucesso!');
    } else {
        storeData.products.push(product);
        showToast('Produto adicionado com sucesso!');
    }

    saveData();
    closeProductModal();
    renderProducts();
    updateStats();
}

function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        storeData.products = storeData.products.filter(p => p.id !== productId);
        saveData();
        renderProducts();
        updateStats();
        showToast('Produto removido com sucesso!');
    }
}

function renderProducts() {
    const container = document.getElementById('productsList');
    const emptyState = document.getElementById('emptyProducts');

    if (storeData.products.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = storeData.products.map(product => `
        <div class="product-card">
            <img src="${product.images[0] || 'https://via.placeholder.com/400x300?text=Sem+Imagem'}" class="product-image" alt="${product.name}">
            <div class="product-info">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <h3 class="product-name">${product.name}</h3>
                    ${product.active ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-warning">Inativo</span>'}
                </div>
                <div class="product-price">
                    ${product.promo ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 0.875rem; margin-right: 0.5rem;">R$ ${product.price.toFixed(2).replace('.', ',')}</span>` : ''}
                    R$ ${(product.promo || product.price).toFixed(2).replace('.', ',')}
                </div>
                <p style="color: var(--gray); font-size: 0.875rem; margin-bottom: 1rem;">${product.stock} em estoque</p>
                <div class="product-actions">
                    <button class="btn btn-primary btn-sm" onclick="openProductModal(${product.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// APARÊNCIA
// ============================================
function updateColorPreview(value, type) {
    document.getElementById(type + 'ColorValue').textContent = value;
}

function selectTheme(element, theme) {
    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    storeData.appearance.theme = theme;
}

function saveAppearance() {
    storeData.appearance.primaryColor = document.getElementById('primaryColor').value;
    storeData.appearance.secondaryColor = document.getElementById('secondaryColor').value;
    saveData();
    showToast('Aparência salva com sucesso!');
}

// ============================================
// PAGAMENTO
// ============================================
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
}

function toggleSwitch(element) {
    element.classList.toggle('active');
}

function savePayment() {
    storeData.payment.pix = {
        key: document.getElementById('pixKey').value,
        name: document.getElementById('pixName').value,
        city: document.getElementById('pixCity').value,
        qrCode: storeData.payment.pix.qrCode
    };
    storeData.payment.card = {
        link: document.getElementById('paymentLink').value,
        active: document.getElementById('cardToggle').classList.contains('active')
    };
    storeData.payment.boleto = {
        instructions: document.getElementById('boletoInstructions').value,
        active: document.getElementById('boletoToggle').classList.contains('active')
    };
    saveData();
    showToast('Configurações de pagamento salvas!');
}

// ============================================
// CONTATO
// ============================================
function saveContact() {
    storeData.contact = {
        whatsapp: document.getElementById('whatsapp').value,
        whatsappMessage: document.getElementById('whatsappMessage').value,
        instagram: document.getElementById('instagram').value,
        facebook: document.getElementById('facebook').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        businessHours: document.getElementById('businessHours').value
    };
    saveData();
    showToast('Informações de contato salvas!');
}

// ============================================
// CONFIGURAÇÕES
// ============================================
function saveSettings() {
    const storeName = document.getElementById('storeName').value.trim();

    if (!storeName) {
        showToast('Preencha o nome da loja!', 'error');
        return;
    }

    storeData.settings = {
        storeName: storeName,
        slug: document.getElementById('storeSlug').value,
        description: document.getElementById('storeDescription').value,
        favicon: storeData.settings.favicon,
        analyticsId: document.getElementById('analyticsId').value,
        isOpen: document.getElementById('storeToggle').classList.contains('active')
    };
    saveData();
    showToast('Configurações salvas com sucesso!');
}

async function resetAllData() {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados da loja. Esta ação não pode ser desfeita. Deseja continuar?')) {
        try {
            await fetch('/api/reset', { method: 'POST' });
            showToast('Dados resetados! Recarregando...');
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            showToast('Erro ao resetar dados', 'error');
        }
    }
}

// ============================================
// PRÉ-VISUALIZAÇÃO
// ============================================
function openPreview() {
    document.getElementById('previewFrame').src = '/loja';
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
}

function generateStoreHtml() {
    const products = storeData.products.filter(p => p.active);
    const primaryColor = storeData.appearance.primaryColor;
    const secondaryColor = storeData.appearance.secondaryColor;

    const productsHtml = products.length > 0 ? products.map(p => `
        <div class="product-item">
            <img src="${p.images[0] || 'https://via.placeholder.com/400x300?text=Sem+Imagem'}" alt="${p.name}">
            <div class="product-details">
                <h3>${p.name}</h3>
                <p>${p.description || ''}</p>
                <div class="product-footer">
                    <span class="price">R$ ${(p.promo || p.price).toFixed(2)}</span>
                    <a href="https://wa.me/55${storeData.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(storeData.contact.whatsappMessage + ' ' + p.name)}" 
                       class="buy-btn" target="_blank">
                        <i class="fab fa-whatsapp"></i> Comprar
                    </a>
                </div>
            </div>
        </div>
    `).join('') : '<p class="no-products">Nenhum produto disponível no momento.</p>';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${storeData.settings.storeName || 'Minha Loja'}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        body { background: #f8fafc; }

        .header { 
            background: ${primaryColor}; 
            color: white; 
            padding: 1rem 2rem; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .header h1 { font-size: 1.5rem; }

        .header .contact-info {
            display: flex;
            gap: 1rem;
            align-items: center;
            font-size: 0.875rem;
        }

        .banner { 
            width: 100%; 
            height: 400px; 
            object-fit: cover; 
            ${storeData.appearance.banner ? '' : `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});`}
        }

        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 2rem; 
        }

        .section-title {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            color: #1f2937;
        }

        .products-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
            gap: 2rem; 
            margin-top: 2rem; 
        }

        .product-item {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }

        .product-item:hover {
            transform: translateY(-5px);
        }

        .product-item img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }

        .product-details {
            padding: 1.5rem;
        }

        .product-details h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }

        .product-details p {
            color: #6b7280;
            margin-bottom: 1rem;
            font-size: 0.875rem;
        }

        .product-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .price {
            font-size: 1.5rem;
            font-weight: bold;
            color: ${primaryColor};
        }

        .buy-btn {
            background: ${primaryColor};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s;
        }

        .buy-btn:hover {
            background: ${secondaryColor};
            transform: scale(1.05);
        }

        .no-products {
            text-align: center;
            color: #6b7280;
            grid-column: 1/-1;
            padding: 3rem;
        }

        .footer { 
            background: #1f2937; 
            color: white; 
            padding: 2rem; 
            margin-top: 4rem; 
            text-align: center; 
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
        }

        .footer h3 {
            margin-bottom: 1rem;
        }

        .footer p {
            color: #9ca3af;
            margin-bottom: 0.5rem;
        }

        .social-links {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 1rem;
        }

        .social-links a {
            color: white;
            font-size: 1.5rem;
            transition: color 0.3s;
        }

        .social-links a:hover {
            color: ${primaryColor};
        }

        .whatsapp-float { 
            position: fixed; 
            bottom: 2rem; 
            right: 2rem; 
            background: #25d366; 
            color: white; 
            width: 60px; 
            height: 60px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 2rem; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
            cursor: pointer; 
            transition: all 0.3s;
            text-decoration: none;
            z-index: 1000;
        }

        .whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }

        @media (max-width: 768px) {
            .header { flex-direction: column; text-align: center; }
            .products-grid { grid-template-columns: 1fr; }
            .banner { height: 250px; }
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>${storeData.settings.storeName || 'Minha Loja'}</h1>
        <div class="contact-info">
            ${storeData.contact.whatsapp ? `<span><i class="fab fa-whatsapp"></i> ${storeData.contact.whatsapp}</span>` : ''}
            ${storeData.contact.email ? `<span><i class="fas fa-envelope"></i> ${storeData.contact.email}</span>` : ''}
        </div>
    </header>

    ${storeData.appearance.banner ? `<img src="${storeData.appearance.banner}" class="banner" alt="Banner">` : '<div class="banner"></div>'}

    <div class="container">
        <h2 class="section-title">Nossos Produtos</h2>
        <div class="products-grid">
            ${productsHtml}
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <h3>${storeData.settings.storeName || 'Minha Loja'}</h3>
            ${storeData.contact.address ? `<p><i class="fas fa-map-marker-alt"></i> ${storeData.contact.address}</p>` : ''}
            ${storeData.contact.businessHours ? `<p><i class="fas fa-clock"></i> ${storeData.contact.businessHours}</p>` : ''}
            <div class="social-links">
                ${storeData.contact.instagram ? `<a href="https://instagram.com/${storeData.contact.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                ${storeData.contact.facebook ? `<a href="${storeData.contact.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>` : ''}
                ${storeData.contact.email ? `<a href="mailto:${storeData.contact.email}"><i class="fas fa-envelope"></i></a>` : ''}
            </div>
            <p style="margin-top: 1rem; font-size: 0.875rem;">© ${new Date().getFullYear()} ${storeData.settings.storeName || 'Minha Loja'}. Todos os direitos reservados.</p>
        </div>
    </footer>

    ${storeData.contact.whatsapp ? `
    <a href="https://wa.me/55${storeData.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(storeData.contact.whatsappMessage)}" 
       class="whatsapp-float" target="_blank">
        <i class="fab fa-whatsapp"></i>
    </a>
    ` : ''}
</body>
</html>`;
}

// ============================================
// ESTATÍSTICAS
// ============================================
function updateStats() {
    const activeProducts = storeData.products.filter(p => p.active).length;
    document.getElementById('statProducts').textContent = activeProducts;

    const totalSales = storeData.products.reduce((acc, p) => acc + (p.price * (p.stock < 10 ? 10 - p.stock : 0)), 0);
    document.getElementById('statSales').textContent = 'R$ ' + totalSales.toFixed(2);

    const status = storeData.settings.isOpen ? 'Online' : 'Fechada';
    document.getElementById('statStatus').textContent = status;
}

// ============================================
// LOCAL STORAGE
// ============================================
async function saveData() {
    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storeData)
        });
        const result = await response.json();
        if (result.success) {
            showToast(result.message);
            return true;
        } else {
            showToast(result.message, 'error');
            return false;
        }
    } catch (e) {
        console.warn('Erro ao salvar no servidor:', e);
        showToast('Erro ao salvar no servidor', 'error');
        return false;
    }
}

async function saveDataToServer() {
    return await saveData();
}

async function loadData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            storeData = { ...storeData, ...data };

            // Restore form values
            if (storeData.settings.storeName) document.getElementById('storeName').value = storeData.settings.storeName;
            if (storeData.settings.slug) document.getElementById('storeSlug').value = storeData.settings.slug;
            if (storeData.settings.description) document.getElementById('storeDescription').value = storeData.settings.description;
            if (storeData.settings.analyticsId) document.getElementById('analyticsId').value = storeData.settings.analyticsId;

            if (storeData.appearance.primaryColor) {
                document.getElementById('primaryColor').value = storeData.appearance.primaryColor;
                document.getElementById('primaryColorValue').textContent = storeData.appearance.primaryColor;
            }
            if (storeData.appearance.secondaryColor) {
                document.getElementById('secondaryColor').value = storeData.appearance.secondaryColor;
                document.getElementById('secondaryColorValue').textContent = storeData.appearance.secondaryColor;
            }

            if (storeData.contact.whatsapp) document.getElementById('whatsapp').value = formatPhoneDisplay(storeData.contact.whatsapp);
            if (storeData.contact.whatsappMessage) document.getElementById('whatsappMessage').value = storeData.contact.whatsappMessage;
            if (storeData.contact.instagram) document.getElementById('instagram').value = storeData.contact.instagram;
            if (storeData.contact.facebook) document.getElementById('facebook').value = storeData.contact.facebook;
            if (storeData.contact.email) document.getElementById('email').value = storeData.contact.email;
            if (storeData.contact.phone) document.getElementById('phone').value = formatPhoneDisplay(storeData.contact.phone);
            if (storeData.contact.address) document.getElementById('address').value = storeData.contact.address;
            if (storeData.contact.businessHours) document.getElementById('businessHours').value = storeData.contact.businessHours;

            if (storeData.payment.pix.key) document.getElementById('pixKey').value = storeData.payment.pix.key;
            if (storeData.payment.pix.name) document.getElementById('pixName').value = storeData.payment.pix.name;
            if (storeData.payment.pix.city) document.getElementById('pixCity').value = storeData.payment.pix.city;
            if (storeData.payment.card.link) document.getElementById('paymentLink').value = storeData.payment.card.link;
            if (storeData.payment.boleto.instructions) document.getElementById('boletoInstructions').value = storeData.payment.boleto.instructions;

            // Restore toggles
            if (!storeData.payment.card.active) document.getElementById('cardToggle').classList.remove('active');
            if (storeData.payment.boleto.active) document.getElementById('boletoToggle').classList.add('active');
            if (!storeData.settings.isOpen) document.getElementById('storeToggle').classList.remove('active');

            // Restore images
            if (storeData.appearance.logo) {
                document.getElementById('logoPreview').src = storeData.appearance.logo;
                document.getElementById('logoUpload').classList.add('has-image');
            }
            if (storeData.appearance.banner) {
                document.getElementById('bannerPreview').src = storeData.appearance.banner;
                document.getElementById('bannerUpload').classList.add('has-image');
            }
            if (storeData.payment.pix.qrCode) {
                document.getElementById('pixPreview').src = storeData.payment.pix.qrCode;
                document.getElementById('pixUpload').classList.add('has-image');
            }
            if (storeData.settings.favicon) {
                document.getElementById('faviconPreview').src = storeData.settings.favicon;
                document.getElementById('faviconUpload').classList.add('has-image');
            }

            // Restore theme
            document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
            const themeMap = { 'modern': 0, 'classic': 1, 'minimal': 2 };
            const themeIndex = themeMap[storeData.appearance.theme] || 0;
            document.querySelectorAll('.theme-option')[themeIndex]?.classList.add('active');
        }
    } catch (e) {
        console.warn('Erro ao carregar do servidor:', e);
        showToast('Erro ao carregar dados do servidor', 'error');
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check-circle';

    toast.innerHTML = `
        <i class="fas ${icon}" style="font-size: 1.25rem;"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.4s ease reverse';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
