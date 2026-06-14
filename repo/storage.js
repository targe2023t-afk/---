// ==================== STORAGE MANAGER - نظام العهد والجهات ====================

const DB_NAME = 'InventoryDB';
const DB_VERSION = 3;
let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains('images')) {
                database.createObjectStore('images', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('consumed')) {
                database.createObjectStore('consumed', { keyPath: 'id' });
            }
        };
    });
}

// ==================== LOCAL STORAGE FUNCTIONS ====================

const Storage = {
    // الجهات (8 جهات قابلة للتعديل)
    getEntities() {
        const saved = localStorage.getItem('entities');
        if (saved) return JSON.parse(saved);

        const defaults = [
            { id: 'main', name: 'المخزن الرئيسي', type: 'main', editable: false },
            { id: 'entity1', name: 'جهة 1', type: 'entity', editable: true },
            { id: 'entity2', name: 'جهة 2', type: 'entity', editable: true },
            { id: 'entity3', name: 'جهة 3', type: 'entity', editable: true },
            { id: 'entity4', name: 'جهة 4', type: 'entity', editable: true },
            { id: 'entity5', name: 'جهة 5', type: 'entity', editable: true },
            { id: 'entity6', name: 'جهة 6', type: 'entity', editable: true },
            { id: 'entity7', name: 'جهة 7', type: 'entity', editable: true },
            { id: 'entity8', name: 'جهة 8', type: 'entity', editable: true }
        ];
        localStorage.setItem('entities', JSON.stringify(defaults));
        return defaults;
    },

    saveEntities(entities) {
        localStorage.setItem('entities', JSON.stringify(entities));
    },

    updateEntityName(id, newName) {
        const entities = this.getEntities();
        const entity = entities.find(e => e.id === id);
        if (entity && entity.editable) {
            entity.name = newName;
            this.saveEntities(entities);

            // تحديث الأسماء في الحركات السابقة
            const movements = this.getMovements();
            movements.forEach(m => {
                if (m.toWarehouse === id) m.toWarehouseName = newName;
                if (m.fromWarehouse === id) m.fromWarehouseName = newName;
            });
            localStorage.setItem('movements', JSON.stringify(movements));

            // تحديث الأسماء في المستهلكة
            const consumed = this.getConsumed();
            consumed.forEach(c => {
                if (c.warehouseId === id) c.warehouseName = newName;
            });
            localStorage.setItem('consumed', JSON.stringify(consumed));

            return true;
        }
        return false;
    },

    // الأقسام (قابلة للإضافة والتعديل والحذف)
    getCategories() {
        return JSON.parse(localStorage.getItem('categories') || JSON.stringify([
            { id: 'cat1', name: 'إلكترونيات' },
            { id: 'cat2', name: 'إكسسوارات' },
            { id: 'cat3', name: 'أثاث مكتبي' }
        ]));
    },

    saveCategories(categories) {
        localStorage.setItem('categories', JSON.stringify(categories));
    },

    addCategory(name) {
        const categories = this.getCategories();
        const newCat = { id: 'cat_' + Date.now(), name };
        categories.push(newCat);
        this.saveCategories(categories);
        return newCat;
    },

    updateCategory(id, newName) {
        const categories = this.getCategories();
        const cat = categories.find(c => c.id === id);
        if (cat) {
            cat.name = newName;
            this.saveCategories(categories);

            // تحديث الأصناف المرتبطة
            const products = this.getProducts();
            products.forEach(p => {
                if (p.categoryId === id) {
                    p.category = newName;
                }
            });
            localStorage.setItem('products', JSON.stringify(products));
            return true;
        }
        return false;
    },

    deleteCategory(id) {
        const categories = this.getCategories().filter(c => c.id !== id);
        this.saveCategories(categories);
    },

    // الأصناف
    getProducts() {
        return JSON.parse(localStorage.getItem('products') || '[]');
    },

    saveProduct(product) {
        const products = this.getProducts();
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index >= 0) products[index] = product;
            else products.push(product);
        } else {
            product.id = Date.now().toString();
            products.push(product);
        }
        localStorage.setItem('products', JSON.stringify(products));
        return product;
    },

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        localStorage.setItem('products', JSON.stringify(products));
    },

    // الحركات
    getMovements() {
        return JSON.parse(localStorage.getItem('movements') || '[]');
    },

    saveMovement(movement) {
        const movements = this.getMovements();
        movement.id = Date.now().toString();
        movement.createdAt = new Date().toISOString();
        movements.unshift(movement);
        localStorage.setItem('movements', JSON.stringify(movements));
        this.updateStock(movement);
        return movement;
    },

    deleteMovement(id) {
        const movements = this.getMovements().filter(m => m.id !== id);
        localStorage.setItem('movements', JSON.stringify(movements));
    },

    // تحديث المخزون
    updateStock(movement) {
        const products = this.getProducts();
        const product = products.find(p => p.id === movement.productId);
        if (!product) return;

        if (!product.entityStock) {
            product.entityStock = {};
        }

        const quantity = parseInt(movement.quantity);
        const fromEntity = movement.fromWarehouse || 'main';
        const toEntity = movement.toWarehouse || 'main';

        switch(movement.type) {
            case 'in':
                product.stock = (product.stock || 0) + quantity;
                break;
            case 'out':
                product.stock = (product.stock || 0) - quantity;
                break;
            case 'transfer':
                product.stock = (product.stock || 0) - quantity;
                product.entityStock[toEntity] = (product.entityStock[toEntity] || 0) + quantity;
                break;
            case 'return':
                product.entityStock[fromEntity] = (product.entityStock[fromEntity] || 0) - quantity;
                product.stock = (product.stock || 0) + quantity;
                break;
            case 'consume':
                product.entityStock[fromEntity] = (product.entityStock[fromEntity] || 0) - quantity;
                this.saveConsumed(movement);
                break;
        }

        localStorage.setItem('products', JSON.stringify(products));
    },

    // تسجيل المستهلكة (المزادات)
    saveConsumed(movement) {
        const consumed = this.getConsumed();
        const item = {
            id: Date.now().toString(),
            productId: movement.productId,
            productName: movement.productName,
            quantity: movement.quantity,
            warehouseId: movement.fromWarehouse,
            warehouseName: movement.fromWarehouseName,
            date: movement.date,
            reference: movement.reference,
            notes: movement.notes,
            auctionPrice: movement.auctionPrice || null,
            createdAt: new Date().toISOString()
        };
        consumed.unshift(item);
        localStorage.setItem('consumed', JSON.stringify(consumed));
        return item;
    },

    getConsumed() {
        return JSON.parse(localStorage.getItem('consumed') || '[]');
    },

    // الإعدادات
    getSettings() {
        return JSON.parse(localStorage.getItem('settings') || '{"lowStockThreshold": 10}');
    },

    saveSettings(settings) {
        localStorage.setItem('settings', JSON.stringify(settings));
    },

    // إحصائيات
    getStats() {
        const products = this.getProducts();
        const movements = this.getMovements();
        const consumed = this.getConsumed();
        const today = new Date().toDateString();

        let totalEntityStock = 0;
        products.forEach(p => {
            if (p.entityStock) {
                Object.values(p.entityStock).forEach(stock => {
                    totalEntityStock += stock;
                });
            }
        });

        return {
            totalProducts: products.length,
            mainStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
            entityStock: totalEntityStock,
            totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0) + totalEntityStock,
            lowStock: products.filter(p => (p.stock || 0) <= this.getSettings().lowStockThreshold).length,
            todayMovements: movements.filter(m => new Date(m.date).toDateString() === today).length,
            totalMovements: movements.length,
            totalConsumed: consumed.length,
            totalAuctionValue: consumed.reduce((sum, c) => sum + (parseFloat(c.auctionPrice) * c.quantity || 0), 0)
        };
    },

    getEntityStats(entityId) {
        const products = this.getProducts();
        const movements = this.getMovements().filter(m => 
            m.toWarehouse === entityId || m.fromWarehouse === entityId
        );
        const consumed = this.getConsumed().filter(c => c.warehouseId === entityId);

        let totalStock = 0;
        const productList = [];

        products.forEach(p => {
            const stock = p.entityStock?.[entityId] || 0;
            if (stock > 0) {
                totalStock += stock;
                productList.push({ name: p.name, stock, code: p.code });
            }
        });

        return {
            totalStock,
            productCount: productList.length,
            products: productList,
            movementsCount: movements.length,
            consumedCount: consumed.length,
            consumedValue: consumed.reduce((sum, c) => sum + (parseFloat(c.auctionPrice) * c.quantity || 0), 0)
        };
    }
};

// ==================== IMAGE STORAGE ====================

const ImageStorage = {
    async saveImage(id, imageData) {
        if (!db) await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.put({ id, data: imageData });
            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    },

    async getImage(id) {
        if (!db) await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ? request.result.data : null);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteImage(id) {
        if (!db) await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

// ==================== DEMO DATA ====================

function initDemoData() {
  function initDemoData() {
    // بيانات الديمو متعطلة - نظام فاضي
    return;
}
        ];
        localStorage.setItem('products', JSON.stringify(demoProducts));
    }

    if (Storage.getMovements().length === 0) {
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

        const demoMovements = [
            {
                id: '1', type: 'in', productId: '1', productName: 'لابتوب Dell',
                quantity: 10, date: today.toISOString().split('T')[0],
                reference: 'INV-2024-001', notes: 'استلام من المورد الرئيسي',
                fromWarehouse: null, toWarehouse: 'main',
                invoice1Id: null, invoice2Id: null, createdAt: today.toISOString()
            },
            {
                id: '2', type: 'transfer', productId: '1', productName: 'لابتوب Dell',
                quantity: 3, date: yesterday.toISOString().split('T')[0],
                reference: 'TRF-2024-001', notes: 'توزيع عهدة على جهة 1',
                fromWarehouse: 'main', toWarehouse: 'entity1', toWarehouseName: 'جهة 1',
                invoice1Id: null, invoice2Id: null, createdAt: yesterday.toISOString()
            },
            {
                id: '3', type: 'transfer', productId: '2', productName: 'ماوس لاسلكي',
                quantity: 10, date: yesterday.toISOString().split('T')[0],
                reference: 'TRF-2024-002', notes: 'توزيع عهدة على جهة 1',
                fromWarehouse: 'main', toWarehouse: 'entity1', toWarehouseName: 'جهة 1',
                invoice1Id: null, invoice2Id: null, createdAt: yesterday.toISOString()
            },
            {
                id: '4', type: 'consume', productId: '2', productName: 'ماوس لاسلكي',
                quantity: 2, date: today.toISOString().split('T')[0],
                reference: 'AUC-2024-001', notes: 'استهلاك في مزاد جهة 1',
                fromWarehouse: 'entity1', fromWarehouseName: 'جهة 1',
                auctionPrice: 150, invoice1Id: null, invoice2Id: null, createdAt: today.toISOString()
            }
        ];
        localStorage.setItem('movements', JSON.stringify(demoMovements));
    }

    if (Storage.getConsumed().length === 0) {
        const today = new Date();
        const demoConsumed = [
            {
                id: '1', productId: '2', productName: 'ماوس لاسلكي',
                quantity: 2, warehouseId: 'entity1', warehouseName: 'جهة 1',
                date: today.toISOString().split('T')[0],
                reference: 'AUC-2024-001', notes: 'مزاد علني',
                auctionPrice: 150, createdAt: today.toISOString()
            }
        ];
        localStorage.setItem('consumed', JSON.stringify(demoConsumed));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    openDB().then(() => {
        console.log('✅ قاعدة البيانات جاهزة');
        initDemoData();
    }).catch(err => {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err);
    });
});
