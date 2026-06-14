// ==================== APP CONTROLLER - نظام العهد والجهات ====================

let currentPage = 'dashboard';
let currentInvoice1 = null;
let currentInvoice2 = null;

// ==================== NAVIGATION ====================

function navigateTo(page) {
    currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    loadPage(page);
    closeModal();
}

function loadPage(page) {
    const content = document.getElementById('main-content');

    switch(page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'products':
            content.innerHTML = renderProducts();
            break;
        case 'movements':
            content.innerHTML = renderMovements();
            break;
        case 'entities':
            content.innerHTML = renderEntities();
            break;
        case 'reports':
            content.innerHTML = renderReports();
            break;
        case 'settings':
            content.innerHTML = renderSettings();
            break;
    }

    addFabButton(page);
}

// ==================== DASHBOARD PAGE ====================

function renderDashboard() {
    const stats = Storage.getStats();
    const entities = Storage.getEntities().filter(e => e.type === 'entity');

    return `
        <div class="page-header">
            <h1>لوحة التحكم</h1>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-boxes"></i></div>
                <div class="stat-value">${stats.totalProducts}</div>
                <div class="stat-label">الأصناف</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-warehouse"></i></div>
                <div class="stat-value">${stats.mainStock}</div>
                <div class="stat-label">المخزن الرئيسي</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i class="fas fa-hand-holding"></i></div>
                <div class="stat-value">${stats.entityStock}</div>
                <div class="stat-label">العهدة في الجهات</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-gavel"></i></div>
                <div class="stat-value">${stats.totalConsumed}</div>
                <div class="stat-label">مزادات</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title"><i class="fas fa-hand-holding"></i> توزيع العهدة في الجهات</div>
            <div class="entity-mini-list">
                ${entities.map(e => {
                    const eStats = Storage.getEntityStats(e.id);
                    return `
                        <div class="entity-mini-item" onclick="navigateTo('entities')">
                            <div class="entity-mini-info">
                                <h4>${e.name}</h4>
                                <p>${eStats.productCount} صنف | ${eStats.totalStock} وحدة</p>
                            </div>
                            <span class="entity-mini-badge">${eStats.consumedCount} مزاد</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="card">
            <div class="card-title"><i class="fas fa-clock"></i> آخر الحركات</div>
            ${renderRecentMovements()}
        </div>

        <div class="card">
            <div class="card-title"><i class="fas fa-arrow-down"></i> أصناف منخفضة في الرئيسي</div>
            ${renderLowStockProducts()}
        </div>
    `;
}

function renderRecentMovements() {
    const movements = Storage.getMovements().slice(0, 5);

    if (movements.length === 0) {
        return '<div class="empty-state"><p>لا توجد حركات حتى الآن</p></div>';
    }

    return movements.map(m => {
        let typeLabel = '';
        let badgeClass = '';
        let icon = '';

        switch(m.type) {
            case 'in': typeLabel = 'استلام'; badgeClass = 'badge-in'; icon = 'fa-arrow-down'; break;
            case 'out': typeLabel = 'صرف'; badgeClass = 'badge-out'; icon = 'fa-arrow-up'; break;
            case 'transfer': typeLabel = 'توزيع عهدة'; badgeClass = 'badge-transfer'; icon = 'fa-exchange-alt'; break;
            case 'return': typeLabel = 'إرجاع عهدة'; badgeClass = 'badge-return'; icon = 'fa-undo'; break;
            case 'consume': typeLabel = 'استهلاك (مزاد)'; badgeClass = 'badge-consume'; icon = 'fa-gavel'; break;
        }

        return `
            <div class="list-item" onclick="showMovementDetails('${m.id}')">
                <div class="list-item-info">
                    <h4>${m.productName}</h4>
                    <p>${m.date} | ${m.reference}</p>
                    ${m.toWarehouseName ? `<p style="font-size:0.75rem;color:var(--primary)"><i class="fas fa-hand-holding"></i> ${m.toWarehouseName}</p>` : ''}
                    ${m.fromWarehouseName ? `<p style="font-size:0.75rem;color:var(--danger)"><i class="fas fa-hand-holding"></i> ${m.fromWarehouseName}</p>` : ''}
                </div>
                <span class="list-item-badge ${badgeClass}">
                    <i class="fas ${icon}"></i> ${m.quantity}
                </span>
            </div>
        `;
    }).join('');
}

function renderLowStockProducts() {
    const threshold = Storage.getSettings().lowStockThreshold;
    const products = Storage.getProducts().filter(p => (p.stock || 0) <= threshold);

    if (products.length === 0) {
        return '<div class="empty-state"><p>جميع الأصناف بمخزون جيد</p></div>';
    }

    return products.map(p => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${p.name}</h4>
                <p>${p.code} | ${p.category}</p>
            </div>
            <span class="list-item-badge badge-out">${p.stock || 0}</span>
        </div>
    `).join('');
}

// ==================== PRODUCTS PAGE (الأصناف) ====================

function renderProducts() {
    const products = Storage.getProducts();
    const categories = Storage.getCategories();

    return `
        <div class="page-header">
            <h1>الأصناف</h1>
        </div>

        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="product-search" placeholder="ابحث عن صنف..." oninput="filterProducts()">
        </div>

        <div class="filter-chips">
            <button class="chip active" onclick="filterByCategory('all')">الكل</button>
            ${categories.map(c => `
                <button class="chip" onclick="filterByCategory('${c.id}')">${c.name}</button>
            `).join('')}
        </div>

        <div id="products-list">
            ${renderProductsList(products)}
        </div>
    `;
}

function renderProductsList(products) {
    if (products.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-boxes"></i>
                <h3>لا توجد أصناف</h3>
                <p>اضغط على الزر + لإضافة صنف جديد</p>
            </div>
        `;
    }

    return products.map(p => {
        const isLow = (p.stock || 0) <= Storage.getSettings().lowStockThreshold;
        let entityStock = 0;
        if (p.entityStock) {
            Object.values(p.entityStock).forEach(s => entityStock += s);
        }

        return `
            <div class="product-card" onclick="showProductDetails('${p.id}')">
                <div class="product-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <p>${p.code} | ${p.category}</p>
                    <p style="font-size:0.75rem;color:var(--primary);margin-top:2px">
                        <i class="fas fa-hand-holding"></i> عهدة في الجهات: ${entityStock}
                    </p>
                </div>
                <div class="product-stock">
                    <div class="stock-value ${isLow ? 'stock-low' : 'stock-normal'}">${p.stock || 0}</div>
                    <div class="stock-label">الرئيسي</div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts() {
    const search = document.getElementById('product-search').value.toLowerCase();
    const products = Storage.getProducts().filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.code.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
    document.getElementById('products-list').innerHTML = renderProductsList(products);
}

function filterByCategory(categoryId) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');

    let products = Storage.getProducts();
    if (categoryId !== 'all') {
        products = products.filter(p => p.categoryId === categoryId);
    }
    document.getElementById('products-list').innerHTML = renderProductsList(products);
}

function showProductDetails(productId) {
    const product = Storage.getProducts().find(p => p.id === productId);
    if (!product) return;

    const entities = Storage.getEntities().filter(e => e.type === 'entity');
    let entityStockHtml = '';

    entities.forEach(e => {
        const stock = product.entityStock?.[e.id] || 0;
        if (stock > 0) {
            entityStockHtml += `
                <div class="report-row">
                    <span class="label"><i class="fas fa-hand-holding"></i> ${e.name}</span>
                    <span class="value">${stock} وحدة</span>
                </div>
            `;
        }
    });

    if (!entityStockHtml) {
        entityStockHtml = '<p style="color:var(--gray);text-align:center;padding:10px;">لا توجد عهدة في الجهات</p>';
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="max-height:80vh;">
            <div class="modal-header">
                <h3>${product.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div style="padding:20px;">
                <div class="report-section" style="margin-bottom:16px;">
                    <h3><i class="fas fa-info-circle"></i> معلومات الصنف</h3>
                    <div class="report-row">
                        <span class="label">الكود</span>
                        <span class="value">${product.code}</span>
                    </div>
                    <div class="report-row">
                        <span class="label">القسم</span>
                        <span class="value">${product.category}</span>
                    </div>
                    <div class="report-row">
                        <span class="label">السعر</span>
                        <span class="value">${product.unitPrice} ر.س</span>
                    </div>
                    <div class="report-row">
                        <span class="label">المخزون الرئيسي</span>
                        <span class="value ${(product.stock || 0) <= product.minStock ? 'stock-low' : 'stock-normal'}">${product.stock || 0}</span>
                    </div>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-hand-holding"></i> توزيع العهدة</h3>
                    ${entityStockHtml}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==================== MOVEMENTS PAGE ====================

function renderMovements() {
    const movements = Storage.getMovements();

    return `
        <div class="page-header">
            <h1>حركات المخزون</h1>
        </div>

        <div class="filter-tabs">
            <button class="filter-tab active" onclick="filterMovements('all')">الكل</button>
            <button class="filter-tab" onclick="filterMovements('in')">استلام</button>
            <button class="filter-tab" onclick="filterMovements('transfer')">توزيع</button>
            <button class="filter-tab" onclick="filterMovements('consume')">مزادات</button>
        </div>

        <div id="movements-list">
            ${renderMovementsList(movements)}
        </div>
    `;
}

function renderMovementsList(movements) {
    if (movements.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h3>لا توجد حركات</h3>
                <p>اضغط على الزر + لتسجيل حركة جديدة</p>
            </div>
        `;
    }

    return movements.map(m => {
        let typeLabel = '';
        let badgeClass = '';
        let typeIcon = '';
        let entityInfo = '';

        switch(m.type) {
            case 'in': 
                typeLabel = 'استلام'; badgeClass = 'badge-in'; typeIcon = 'fa-arrow-down';
                break;
            case 'out': 
                typeLabel = 'صرف'; badgeClass = 'badge-out'; typeIcon = 'fa-arrow-up';
                break;
            case 'transfer': 
                typeLabel = 'توزيع عهدة'; badgeClass = 'badge-transfer'; typeIcon = 'fa-exchange-alt';
                entityInfo = `<p style="font-size:0.8rem;color:var(--primary);margin-top:4px">
                    <i class="fas fa-arrow-left"></i> ${m.toWarehouseName}
                </p>`;
                break;
            case 'return': 
                typeLabel = 'إرجاع عهدة'; badgeClass = 'badge-return'; typeIcon = 'fa-undo';
                entityInfo = `<p style="font-size:0.8rem;color:var(--warning);margin-top:4px">
                    <i class="fas fa-arrow-right"></i> من ${m.fromWarehouseName}
                </p>`;
                break;
            case 'consume': 
                typeLabel = 'استهلاك (مزاد)'; badgeClass = 'badge-consume'; typeIcon = 'fa-gavel';
                entityInfo = `<p style="font-size:0.8rem;color:var(--danger);margin-top:4px">
                    <i class="fas fa-hand-holding"></i> ${m.fromWarehouseName}
                    ${m.auctionPrice ? `| <i class="fas fa-tag"></i> ${m.auctionPrice} ر.س` : ''}
                </p>`;
                break;
        }

        return `
            <div class="movement-item">
                <div class="movement-header">
                    <div>
                        <h4>${m.productName}</h4>
                        ${entityInfo}
                    </div>
                    <span class="list-item-badge ${badgeClass}">
                        <i class="fas ${typeIcon}"></i> ${m.quantity}
                    </span>
                </div>
                <div class="movement-details">
                    <div class="movement-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${m.date}</span>
                    </div>
                    <div class="movement-detail">
                        <i class="fas fa-hashtag"></i>
                        <span>${m.reference}</span>
                    </div>
                    <div class="movement-detail">
                        <i class="fas fa-box"></i>
                        <span>${typeLabel}</span>
                    </div>
                    <div class="movement-detail">
                        <i class="fas fa-clock"></i>
                        <span>${formatDate(m.createdAt)}</span>
                    </div>
                </div>
                ${m.notes ? `<p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 12px;"><i class="fas fa-sticky-note"></i> ${m.notes}</p>` : ''}
                <div class="movement-images">
                    <div class="movement-image" onclick="viewInvoiceImage('${m.invoice1Id}', 'فاتورة 1 - التاريخ: ${m.date}')">
                        ${m.invoice1Id ? 
                            `<img src="" data-image-id="${m.invoice1Id}" alt="فاتورة 1">` :
                            `<div class="no-image"><span>لا توجد صورة</span></div>`
                        }
                        <div class="movement-image-label">📎 فاتورة 1 (التاريخ)</div>
                    </div>
                    <div class="movement-image" onclick="viewInvoiceImage('${m.invoice2Id}', 'فاتورة 2 - الرقم: ${m.reference}')">
                        ${m.invoice2Id ? 
                            `<img src="" data-image-id="${m.invoice2Id}" alt="فاتورة 2">` :
                            `<div class="no-image"><span>لا توجد صورة</span></div>`
                        }
                        <div class="movement-image-label">📎 فاتورة 2 (الرقم المرجعي)</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterMovements(type) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    let movements = Storage.getMovements();
    if (type !== 'all') {
        movements = movements.filter(m => m.type === type);
    }

    document.getElementById('movements-list').innerHTML = renderMovementsList(movements);
    loadMovementImages();
}

async function loadMovementImages() {
    const images = document.querySelectorAll('img[data-image-id]');
    for (const img of images) {
        const imageId = img.dataset.imageId;
        if (imageId) {
            try {
                const imageData = await ImageStorage.getImage(imageId);
                if (imageData) img.src = imageData;
            } catch (e) {
                console.error('خطأ في تحميل الصورة:', e);
            }
        }
    }
}

// ==================== ENTITIES PAGE (الجهات) ====================

function renderEntities() {
    const entities = Storage.getEntities().filter(e => e.type === 'entity');

    return `
        <div class="page-header">
            <h1>الجهات</h1>
            <button class="btn btn-primary" onclick="openEntityEditModal()" style="padding:8px 16px;font-size:0.875rem;">
                <i class="fas fa-edit"></i> تعديل الأسماء
            </button>
        </div>

        <div class="entities-grid">
            ${entities.map(e => {
                const stats = Storage.getEntityStats(e.id);
                return `
                    <div class="entity-card" onclick="showEntityDetails('${e.id}')">
                        <div class="entity-icon">
                            <i class="fas fa-hand-holding"></i>
                        </div>
                        <div class="entity-info">
                            <h4>${e.name}</h4>
                            <p>${stats.productCount} صنف | ${stats.totalStock} وحدة</p>
                        </div>
                        <div class="entity-stats">
                            <div class="entity-stat">
                                <span class="stat-num">${stats.movementsCount}</span>
                                <span class="stat-label">حركة</span>
                            </div>
                            <div class="entity-stat">
                                <span class="stat-num">${stats.consumedCount}</span>
                                <span class="stat-label">مزاد</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function openEntityEditModal() {
    const entities = Storage.getEntities().filter(e => e.editable);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'entity-edit-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-height:80vh;">
            <div class="modal-header">
                <h3>تعديل أسماء الجهات</h3>
                <button class="close-btn" onclick="document.getElementById('entity-edit-modal').remove()">&times;</button>
            </div>
            <div style="padding:20px;">
                ${entities.map(e => `
                    <div class="form-group">
                        <label>${e.id.replace('entity', 'جهة ')}</label>
                        <div style="display:flex;gap:8px;">
                            <input type="text" id="entity-name-${e.id}" value="${e.name}" style="flex:1;">
                            <button class="btn btn-primary" onclick="saveEntityName('${e.id}')" style="width:auto;padding:8px 16px;">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function saveEntityName(entityId) {
    const newName = document.getElementById(`entity-name-${entityId}`).value.trim();
    if (!newName) {
        showToast('الرجاء إدخال اسم', 'error');
        return;
    }

    if (Storage.updateEntityName(entityId, newName)) {
        showToast('تم تحديث الاسم بنجاح', 'success');
        loadPage('entities');
    } else {
        showToast('لا يمكن تعديل هذا الاسم', 'error');
    }
}

function showEntityDetails(entityId) {
    const entity = Storage.getEntities().find(e => e.id === entityId);
    const stats = Storage.getEntityStats(entityId);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal-content" style="max-height:85vh;">
            <div class="modal-header">
                <h3>${entity.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div style="padding:20px;">
                <div class="stats-grid" style="margin-bottom:20px;">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-boxes"></i></div>
                        <div class="stat-value">${stats.productCount}</div>
                        <div class="stat-label">أصناف</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon green"><i class="fas fa-cubes"></i></div>
                        <div class="stat-value">${stats.totalStock}</div>
                        <div class="stat-label">إجمالي العهدة</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon orange"><i class="fas fa-gavel"></i></div>
                        <div class="stat-value">${stats.consumedCount}</div>
                        <div class="stat-label">مزادات</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon purple"><i class="fas fa-money-bill"></i></div>
                        <div class="stat-value">${stats.consumedValue}</div>
                        <div class="stat-label">قيمة المزادات</div>
                    </div>
                </div>

                <div class="report-section">
                    <h3><i class="fas fa-boxes"></i> الأصناف بالعهدة</h3>
                    ${stats.products.length > 0 ? stats.products.map(p => `
                        <div class="report-row">
                            <span class="label">${p.name} (${p.code})</span>
                            <span class="value">${p.stock} وحدة</span>
                        </div>
                    `).join('') : '<p style="color:var(--gray);text-align:center;padding:10px;">لا توجد عهدة في هذه الجهة</p>'}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==================== SETTINGS PAGE (الأقسام) ====================

function renderSettings() {
    const categories = Storage.getCategories();

    return `
        <div class="page-header">
            <h1>الإعدادات</h1>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-tags"></i> الأقسام</h3>
            <p style="color:var(--gray);font-size:0.875rem;margin-bottom:12px;">يمكنك إضافة أو تعديل أو حذف الأقسام</p>

            <div class="categories-list">
                ${categories.map(c => `
                    <div class="category-item">
                        <span class="category-name">${c.name}</span>
                        <div class="category-actions">
                            <button class="btn-icon" onclick="editCategory('${c.id}', '${c.name}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger" onclick="deleteCategory('${c.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="form-group" style="margin-top:16px;">
                <label>إضافة قسم جديد</label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="new-category-name" placeholder="اسم القسم الجديد" style="flex:1;">
                    <button class="btn btn-primary" onclick="addNewCategory()" style="width:auto;padding:8px 16px;">
                        <i class="fas fa-plus"></i> إضافة
                    </button>
                </div>
            </div>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-cog"></i> إعدادات المخزون</h3>
            <div class="form-group">
                <label>الحد الأدنى للتنبيه</label>
                <input type="number" id="low-stock-threshold" value="${Storage.getSettings().lowStockThreshold}" min="1">
            </div>
            <button class="btn btn-primary" onclick="saveSettings()" style="width:100%;">
                <i class="fas fa-save"></i> حفظ الإعدادات
            </button>
        </div>
    `;
}

function addNewCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) {
        showToast('الرجاء إدخال اسم القسم', 'error');
        return;
    }

    Storage.addCategory(name);
    showToast('تم إضافة القسم بنجاح', 'success');
    loadPage('settings');
}

function editCategory(id, currentName) {
    const newName = prompt('تعديل اسم القسم:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
        if (Storage.updateCategory(id, newName.trim())) {
            showToast('تم تحديث القسم بنجاح', 'success');
            loadPage('settings');
        }
    }
}

function deleteCategory(id) {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
        Storage.deleteCategory(id);
        showToast('تم حذف القسم', 'success');
        loadPage('settings');
    }
}

function saveSettings() {
    const threshold = parseInt(document.getElementById('low-stock-threshold').value) || 10;
    Storage.saveSettings({ lowStockThreshold: threshold });
    showToast('تم حفظ الإعدادات', 'success');
}

// ==================== REPORTS PAGE ====================

function renderReports() {
    const stats = Storage.getStats();
    const products = Storage.getProducts();
    const consumed = Storage.getConsumed();
    const entities = Storage.getEntities().filter(e => e.type === 'entity');

    const movements = Storage.getMovements();
    const totalIn = movements.filter(m => m.type === 'in').reduce((sum, m) => sum + parseInt(m.quantity), 0);
    const totalOut = movements.filter(m => m.type === 'out').reduce((sum, m) => sum + parseInt(m.quantity), 0);
    const totalTransfer = movements.filter(m => m.type === 'transfer').reduce((sum, m) => sum + parseInt(m.quantity), 0);
    const totalConsume = movements.filter(m => m.type === 'consume').reduce((sum, m) => sum + parseInt(m.quantity), 0);

    return `
        <div class="page-header">
            <h1>التقارير</h1>
        </div>

        <!-- قسم تصدير الجرد -->
        <div class="card" style="background: linear-gradient(135deg, #1a5490 0%, #2e75b6 100%); color: white;">
            <div class="card-title" style="color: white;">
                <i class="fas fa-file-excel"></i> تصدير محضر جرد
            </div>
            <p style="font-size: 0.875rem; margin-bottom: 12px; opacity: 0.9;">
                تصدير تقرير جرد كامل مقسم حسب الأقسام - يمكن طباعته أو حفظه PDF
            </p>
            <div style="display: flex; gap: 10px;">
                <button class="btn" onclick="ExcelExport.exportInventoryReport()" style="background: white; color: #1a5490; flex: 1;">
                    <i class="fas fa-file-invoice"></i> تصدير تقرير الجرد
                </button>
                <button class="btn" onclick="ExcelExport.exportJSON()" style="background: rgba(255,255,255,0.2); color: white; flex: 1;">
                    <i class="fas fa-download"></i> نسخة احتياطية JSON
                </button>
            </div>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-chart-bar"></i> ملخص المخزون</h3>
            <div class="report-row">
                <span class="label">إجمالي الأصناف</span>
                <span class="value">${stats.totalProducts}</span>
            </div>
            <div class="report-row">
                <span class="label">المخزن الرئيسي</span>
                <span class="value">${stats.mainStock} وحدة</span>
            </div>
            <div class="report-row">
                <span class="label">العهدة في الجهات</span>
                <span class="value">${stats.entityStock} وحدة</span>
            </div>
            <div class="report-row">
                <span class="label">أصناف منخفضة</span>
                <span class="value" style="color: var(--danger);">${stats.lowStock}</span>
            </div>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-exchange-alt"></i> ملخص الحركات</h3>
            <div class="report-row">
                <span class="label">استلام للرئيسي</span>
                <span class="value" style="color: var(--success);">+${totalIn}</span>
            </div>
            <div class="report-row">
                <span class="label">صرف من الرئيسي</span>
                <span class="value" style="color: var(--danger);">-${totalOut}</span>
            </div>
            <div class="report-row">
                <span class="label">توزيع عهدة للجهات</span>
                <span class="value" style="color: var(--primary);">${totalTransfer}</span>
            </div>
            <div class="report-row">
                <span class="label">استهلاك (مزادات)</span>
                <span class="value" style="color: var(--warning);">${totalConsume}</span>
            </div>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-hand-holding"></i> توزيع العهدة في الجهات</h3>
            ${entities.map(e => {
                const eStats = Storage.getEntityStats(e.id);
                return `
                    <div class="report-row">
                        <span class="label"><i class="fas fa-hand-holding"></i> ${e.name}</span>
                        <span class="value">${eStats.totalStock} وحدة (${eStats.productCount} صنف)</span>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="report-section">
            <h3><i class="fas fa-gavel"></i> المزادات (العهدة المستهلكة)</h3>
            ${consumed.length > 0 ? consumed.slice(0, 10).map(c => `
                <div class="report-row">
                    <span class="label">
                        ${c.productName} <br>
                        <small style="color:var(--gray)">${c.warehouseName} | ${c.date}</small>
                    </span>
                    <span class="value">
                        ${c.quantity} وحدة
                        ${c.auctionPrice ? `<br><small style="color:var(--success)">${c.auctionPrice * c.quantity} ر.س</small>` : ''}
                    </span>
                </div>
            `).join('') : '<p style="color:var(--gray);text-align:center;padding:10px;">لا توجد مزادات مسجلة</p>'}

            ${consumed.length > 0 ? `
                <div class="report-row" style="border-top:2px solid var(--primary);margin-top:10px;padding-top:10px;">
                    <span class="label" style="font-weight:bold">إجمالي قيمة المزادات</span>
                    <span class="value" style="color:var(--success);font-weight:bold">${stats.totalAuctionValue} ر.س</span>
                </div>
            ` : ''}
        </div>

        <div class="report-section">
            <h3><i class="fas fa-tags"></i> الأصناف حسب القسم</h3>
            ${renderCategoryBreakdown(products)}
        </div>
    `;
}

function renderCategoryBreakdown(products) {
    const categories = {};
    products.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });

    return Object.entries(categories).map(([cat, count]) => `
        <div class="report-row">
            <span class="label">${cat}</span>
            <span class="value">${count} صنف</span>
        </div>
    `).join('');
}

// ==================== MODAL & FORM ====================

function openMovementModal() {
    currentInvoice1 = null;
    currentInvoice2 = null;

    const productSelect = document.getElementById('movement-product');
    const typeSelect = document.getElementById('movement-type');

    productSelect.innerHTML = '<option value="">اختر الصنف</option>';
    Storage.getProducts().forEach(p => {
        productSelect.innerHTML += `<option value="${p.id}">${p.name} (الرئيسي: ${p.stock || 0})</option>`;
    });

    document.getElementById('movement-form').reset();
    resetImageUploads();

    typeSelect.addEventListener('change', updateFormFields);

    document.getElementById('movement-date').value = new Date().toISOString().split('T')[0];

    document.getElementById('movement-modal').classList.add('active');
}

function updateFormFields() {
    const type = document.getElementById('movement-type').value;
    const warehouseSection = document.getElementById('warehouse-section');
    const auctionSection = document.getElementById('auction-section');
    const toWarehouse = document.getElementById('movement-to-warehouse');
    const fromWarehouse = document.getElementById('movement-from-warehouse');

    const entities = Storage.getEntities().filter(e => e.type === 'entity');

    warehouseSection.style.display = 'none';
    auctionSection.style.display = 'none';
    toWarehouse.innerHTML = '<option value="">اختر الجهة</option>';
    fromWarehouse.innerHTML = '<option value="">اختر الجهة</option>';

    entities.forEach(e => {
        toWarehouse.innerHTML += `<option value="${e.id}">${e.name}</option>`;
        fromWarehouse.innerHTML += `<option value="${e.id}">${e.name}</option>`;
    });

    switch(type) {
        case 'transfer':
            warehouseSection.style.display = 'block';
            document.getElementById('to-warehouse-group').style.display = 'block';
            document.getElementById('from-warehouse-group').style.display = 'none';
            document.getElementById('warehouse-label').textContent = 'توزيع إلى';
            break;
        case 'return':
            warehouseSection.style.display = 'block';
            document.getElementById('to-warehouse-group').style.display = 'none';
            document.getElementById('from-warehouse-group').style.display = 'block';
            document.getElementById('warehouse-label').textContent = 'إرجاع من';
            break;
        case 'consume':
            warehouseSection.style.display = 'block';
            document.getElementById('to-warehouse-group').style.display = 'none';
            document.getElementById('from-warehouse-group').style.display = 'block';
            auctionSection.style.display = 'block';
            document.getElementById('warehouse-label').textContent = 'استهلاك من';
            break;
    }
}

function closeModal() {
    document.getElementById('movement-modal').classList.remove('active');
}

// ==================== IMAGE HANDLING ====================

document.addEventListener('DOMContentLoaded', () => {
    const invoice1Input = document.getElementById('invoice-1');
    const invoice2Input = document.getElementById('invoice-2');

    if (invoice1Input) {
        invoice1Input.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                currentInvoice1 = await ImageStorage.fileToBase64(e.target.files[0]);
                showImagePreview(1, currentInvoice1);
            }
        });
    }

    if (invoice2Input) {
        invoice2Input.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                currentInvoice2 = await ImageStorage.fileToBase64(e.target.files[0]);
                showImagePreview(2, currentInvoice2);
            }
        });
    }
});

function showImagePreview(num, imageData) {
    const preview = document.getElementById(`preview-${num}`);
    const placeholder = document.querySelector(`#upload-${num} .upload-placeholder`);
    const removeBtn = document.getElementById(`remove-${num}`);

    preview.src = imageData;
    preview.hidden = false;
    placeholder.hidden = true;
    removeBtn.hidden = false;
}

function removeImage(num) {
    const preview = document.getElementById(`preview-${num}`);
    const placeholder = document.querySelector(`#upload-${num} .upload-placeholder`);
    const removeBtn = document.getElementById(`remove-${num}`);
    const input = document.getElementById(`invoice-${num}`);

    preview.src = '';
    preview.hidden = true;
    placeholder.hidden = false;
    removeBtn.hidden = true;
    input.value = '';

    if (num === 1) currentInvoice1 = null;
    if (num === 2) currentInvoice2 = null;
}

function resetImageUploads() {
    removeImage(1);
    removeImage(2);
}

// ==================== FORM SUBMISSION ====================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('movement-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const type = document.getElementById('movement-type').value;
            const productId = document.getElementById('movement-product').value;
            const quantity = parseInt(document.getElementById('movement-quantity').value);
            const date = document.getElementById('movement-date').value;
            const reference = document.getElementById('movement-reference').value;
            const notes = document.getElementById('movement-notes').value;

            if (!type || !productId || !quantity || !date || !reference) {
                showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
                return;
            }

            const product = Storage.getProducts().find(p => p.id === productId);
            const entities = Storage.getEntities();

            let toWarehouse = null;
            let toWarehouseName = null;
            let fromWarehouse = null;
            let fromWarehouseName = null;
            let auctionPrice = null;

            if (type === 'transfer') {
                toWarehouse = document.getElementById('movement-to-warehouse').value;
                if (!toWarehouse) {
                    showToast('الرجاء اختيار الجهة', 'error');
                    return;
                }
                toWarehouseName = entities.find(w => w.id === toWarehouse)?.name;

                if ((product.stock || 0) < quantity) {
                    showToast('الكمية غير متوفرة في المخزن الرئيسي', 'error');
                    return;
                }
            } else if (type === 'return') {
                fromWarehouse = document.getElementById('movement-from-warehouse').value;
                if (!fromWarehouse) {
                    showToast('الرجاء اختيار الجهة', 'error');
                    return;
                }
                fromWarehouseName = entities.find(w => w.id === fromWarehouse)?.name;

                const entityStock = product.entityStock?.[fromWarehouse] || 0;
                if (entityStock < quantity) {
                    showToast('الكمية غير متوفرة في الجهة', 'error');
                    return;
                }
            } else if (type === 'consume') {
                fromWarehouse = document.getElementById('movement-from-warehouse').value;
                if (!fromWarehouse) {
                    showToast('الرجاء اختيار الجهة', 'error');
                    return;
                }
                fromWarehouseName = entities.find(w => w.id === fromWarehouse)?.name;

                const entityStock = product.entityStock?.[fromWarehouse] || 0;
                if (entityStock < quantity) {
                    showToast('الكمية غير متوفرة في الجهة', 'error');
                    return;
                }

                auctionPrice = document.getElementById('movement-auction-price').value;
            } else if (type === 'out') {
                if ((product.stock || 0) < quantity) {
                    showToast('الكمية غير متوفرة في المخزن الرئيسي', 'error');
                    return;
                }
            }

            let invoice1Id = null;
            let invoice2Id = null;

            if (currentInvoice1) {
                invoice1Id = 'img_' + Date.now() + '_1';
                await ImageStorage.saveImage(invoice1Id, currentInvoice1);
            }

            if (currentInvoice2) {
                invoice2Id = 'img_' + Date.now() + '_2';
                await ImageStorage.saveImage(invoice2Id, currentInvoice2);
            }

            const movement = {
                type,
                productId,
                productName: product.name,
                quantity,
                date,
                reference,
                notes,
                toWarehouse,
                toWarehouseName,
                fromWarehouse,
                fromWarehouseName,
                auctionPrice,
                invoice1Id,
                invoice2Id
            };

            Storage.saveMovement(movement);

            showToast('تم تسجيل الحركة بنجاح', 'success');
            closeModal();
            loadPage(currentPage);
        });
    }
});

// ==================== IMAGE VIEWER ====================

async function viewInvoiceImage(imageId, caption) {
    if (!imageId) {
        showToast('لا توجد صورة مرفقة', 'warning');
        return;
    }

    try {
        const imageData = await ImageStorage.getImage(imageId);
        if (imageData) {
            document.getElementById('viewer-img').src = imageData;
            document.getElementById('viewer-caption').textContent = caption;
            document.getElementById('image-viewer').classList.add('active');
        } else {
            showToast('لم يتم العثور على الصورة', 'error');
        }
    } catch (e) {
        showToast('خطأ في تحميل الصورة', 'error');
    }
}

function closeImageViewer() {
    document.getElementById('image-viewer').classList.remove('active');
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ==================== FAB BUTTON ====================

function addFabButton(page) {
    const existingFab = document.querySelector('.btn-fab');
    if (existingFab) existingFab.remove();

    if (page === 'movements') {
        const fab = document.createElement('button');
        fab.className = 'btn-fab';
        fab.innerHTML = '<i class="fas fa-plus"></i>';
        fab.onclick = openMovementModal;
        document.body.appendChild(fab);
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 500);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    loadPage('dashboard');
});

function showMovementDetails(movementId) {
    showToast('تفاصيل الحركة: ' + movementId, 'info');
}

function getProductStock(productId) {
    const product = Storage.getProducts().find(p => p.id === productId);
    return product ? (product.stock || 0) : 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}
