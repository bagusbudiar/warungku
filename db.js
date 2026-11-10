/**
 * db.js - WarungKu Database & Cloud Sync Module
 * Menyediakan penyimpanan lokal (Offline-First) dan integrasi Cloud Online (Firebase REST).
 */

const DB_KEYS = {
  PRODUCTS: 'warungku_products',
  TRANSACTIONS: 'warungku_transactions',
  KASBON: 'warungku_kasbon',
  SETTINGS: 'warungku_settings',
  CLOUD_CONFIG: 'warungku_cloud_config',
  CATEGORIES: 'warungku_categories'
};

// Data Kategori Default Warung
const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'Semua', icon: '🏪' },
  { id: 'sembako', name: 'Sembako', icon: '🌾' },
  { id: 'minuman', name: 'Minuman', icon: '🥤' },
  { id: 'makanan', name: 'Makanan & Snack', icon: '🍪' },
  { id: 'rokok', name: 'Rokok', icon: '🚬' },
  { id: 'bumbu', name: 'Bumbu Dapur', icon: '🧂' },
  { id: 'kebersihan', name: 'Kebersihan & Mandi', icon: '🧼' },
  { id: 'digital', name: 'Pulsa & Listrik', icon: '⚡' }
];

// Data Produk Starter (Sembako & Kebutuhan Warung Nyata)
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-001',
    barcode: '8992388111015',
    name: 'Beras Ramos Super 5kg',
    category: 'sembako',
    icon: '🌾',
    costPrice: 65000,
    sellPrice: 72000,
    stock: 25,
    minStock: 5,
    unit: 'karung'
  },
  {
    id: 'prod-002',
    barcode: '8999999002234',
    name: 'Minyak Goreng Bimoli 2L',
    category: 'sembako',
    icon: '🌻',
    costPrice: 32000,
    sellPrice: 36000,
    stock: 18,
    minStock: 4,
    unit: 'pouch'
  },
  {
    id: 'prod-003',
    barcode: '8998866200112',
    name: 'Gula Pasir Gulaku 1kg',
    category: 'sembako',
    icon: '🧂',
    costPrice: 15500,
    sellPrice: 18000,
    stock: 30,
    minStock: 5,
    unit: 'kg'
  },
  {
    id: 'prod-004',
    barcode: '8993175537441',
    name: 'Telur Ayam Negeri (1kg)',
    category: 'sembako',
    icon: '🥚',
    costPrice: 26000,
    sellPrice: 29000,
    stock: 4, // Menipis untuk demonstrasi alert stok
    minStock: 5,
    unit: 'kg'
  },
  {
    id: 'prod-005',
    barcode: '8998866100016',
    name: 'Indomie Goreng Spesial',
    category: 'makanan',
    icon: '🍜',
    costPrice: 2800,
    sellPrice: 3500,
    stock: 120,
    minStock: 20,
    unit: 'bungkus'
  },
  {
    id: 'prod-006',
    barcode: '8998866100023',
    name: 'Indomie Kuah Ayam Bawang',
    category: 'makanan',
    icon: '🍜',
    costPrice: 2800,
    sellPrice: 3500,
    stock: 96,
    minStock: 15,
    unit: 'bungkus'
  },
  {
    id: 'prod-007',
    barcode: '8999999511105',
    name: 'Kopi Kapal Api Spesial Mix (Renceng)',
    category: 'minuman',
    icon: '☕',
    costPrice: 13500,
    sellPrice: 16000,
    stock: 15,
    minStock: 3,
    unit: 'renceng'
  },
  {
    id: 'prod-008',
    barcode: '8991389220018',
    name: 'Teh Pucuk Harum 350ml Dingin',
    category: 'minuman',
    icon: '🧃',
    costPrice: 3200,
    sellPrice: 4500,
    stock: 28,
    minStock: 6,
    unit: 'botol'
  },
  {
    id: 'prod-009',
    barcode: '8992753211109',
    name: 'Air Mineral Aqua 600ml',
    category: 'minuman',
    icon: '💧',
    costPrice: 2500,
    sellPrice: 3500,
    stock: 48,
    minStock: 10,
    unit: 'botol'
  },
  {
    id: 'prod-010',
    barcode: '8999999120038',
    name: 'Rokok Sampoerna Mild 16',
    category: 'rokok',
    icon: '🚬',
    costPrice: 31000,
    sellPrice: 34000,
    stock: 20,
    minStock: 5,
    unit: 'bungkus'
  },
  {
    id: 'prod-011',
    barcode: '8992772010103',
    name: 'Sabun Mandi Lifebuoy Total 10',
    category: 'kebersihan',
    icon: '🧼',
    costPrice: 3800,
    sellPrice: 5000,
    stock: 22,
    minStock: 5,
    unit: 'batang'
  },
  {
    id: 'prod-012',
    barcode: '8999999401122',
    name: 'Kecap Manis Bango 520ml',
    category: 'bumbu',
    icon: '🍯',
    costPrice: 21000,
    sellPrice: 24500,
    stock: 14,
    minStock: 3,
    unit: 'pouch'
  },
  {
    id: 'prod-013',
    barcode: '8999999990001',
    name: 'Token Listrik PLN Rp 20.000',
    category: 'digital',
    icon: '⚡',
    costPrice: 20500,
    sellPrice: 22500,
    stock: 999,
    minStock: 0,
    unit: 'transaksi'
  },
  {
    id: 'prod-014',
    barcode: '8999999990002',
    name: 'Pulsa Telkomsel Rp 10.000',
    category: 'digital',
    icon: '📱',
    costPrice: 10500,
    sellPrice: 12000,
    stock: 999,
    minStock: 0,
    unit: 'transaksi'
  }
];

// Pengaturan Profil Warung Default
const DEFAULT_SETTINGS = {
  storeName: 'Warung Berkah Jaya',
  ownerName: 'Pak Haji Ahmad',
  phone: '081234567890',
  address: 'Jl. Melati No. 12, RT 03/RW 04, Kelurahan Bahagia',
  receiptHeader: 'Selamat Datang di Warung Berkah Jaya',
  receiptFooter: 'Terima Kasih Atas Kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar kecuali perjanjian.',
  qrisMerchantName: 'WARUNG BERKAH JAYA',
  qrisNmid: 'ID1020304050607',
  printerPaperSize: '58mm',
  autoPrintReceipt: false
};

// Konfigurasi Cloud Online Default
const DEFAULT_CLOUD_CONFIG = {
  enabled: false,
  provider: 'firebase',
  firebaseDbUrl: '', // Contoh: https://my-warung-default-rtdb.asia-southeast1.firebasedatabase.app
  storeKey: 'warung_berkah_' + Math.random().toString(36).substring(2, 8),
  autoSyncIntervalSec: 60,
  lastSync: null
};

class WarungDB {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    if (!localStorage.getItem(DB_KEYS.PRODUCTS)) {
      this.save(DB_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    }
    if (!localStorage.getItem(DB_KEYS.CATEGORIES)) {
      this.save(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    }
    if (!localStorage.getItem(DB_KEYS.TRANSACTIONS)) {
      this.save(DB_KEYS.TRANSACTIONS, []);
    }
    if (!localStorage.getItem(DB_KEYS.KASBON)) {
      // Starter Kasbon untuk contoh
      const sampleKasbon = [
        {
          id: 'bon-' + Date.now(),
          customerName: 'Bu Siti (Tetangga Depan)',
          customerPhone: '081298765432',
          itemsDescription: 'Beras 5kg (1x), Minyak Bimoli 2L (1x), Gula 1kg (1x)',
          totalDebt: 126000,
          paidAmount: 50000,
          remainingAmount: 76000,
          status: 'PARTIAL', // UNPAID, PARTIAL, PAID
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
          notes: 'Janji dibayar saat gajian suami tgl 25',
          payments: [
            {
              amount: 50000,
              date: new Date(Date.now() - 1 * 86400000).toISOString(),
              method: 'Tunai'
            }
          ]
        }
      ];
      this.save(DB_KEYS.KASBON, sampleKasbon);
    }
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      this.save(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(DB_KEYS.CLOUD_CONFIG)) {
      this.save(DB_KEYS.CLOUD_CONFIG, DEFAULT_CLOUD_CONFIG);
    }
  }

  // Helper Simpan & Ambil LocalStorage
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error saving to storage:', e);
      return false;
    }
  }

  load(key, fallback = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error('Error loading from storage:', e);
      return fallback;
    }
  }

  // --- PRODUK & STOK ---
  getProducts() {
    return this.load(DB_KEYS.PRODUCTS, []);
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  getProductByBarcode(barcode) {
    if (!barcode) return null;
    return this.getProducts().find(p => p.barcode === barcode.trim());
  }

  saveProduct(productData) {
    const products = this.getProducts();
    if (productData.id) {
      const idx = products.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData };
      } else {
        products.push(productData);
      }
    } else {
      productData.id = 'prod-' + Date.now();
      products.push(productData);
    }
    this.save(DB_KEYS.PRODUCTS, products);
    this.triggerCloudSyncDebounced();
    return productData;
  }

  deleteProduct(productId) {
    let products = this.getProducts();
    products = products.filter(p => p.id !== productId);
    this.save(DB_KEYS.PRODUCTS, products);
    this.triggerCloudSyncDebounced();
    return true;
  }

  adjustProductStock(productId, deltaQty) {
    const products = this.getProducts();
    const item = products.find(p => p.id === productId);
    if (item) {
      item.stock = Math.max(0, (item.stock || 0) + deltaQty);
      this.save(DB_KEYS.PRODUCTS, products);
      return item.stock;
    }
    return null;
  }

  // --- KATEGORI ---
  getCategories() {
    return this.load(DB_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  // --- TRANSAKSI PENJUALAN ---
  getTransactions() {
    return this.load(DB_KEYS.TRANSACTIONS, []);
  }

  createTransaction(transactionData) {
    const transactions = this.getTransactions();
    const products = this.getProducts();

    // Hitung profit otomatis & kurangi stok
    let totalProfit = 0;
    const enrichedItems = transactionData.items.map(cartItem => {
      const dbProd = products.find(p => p.id === cartItem.id);
      const costPrice = dbProd ? (dbProd.costPrice || 0) : 0;
      const sellPrice = cartItem.price;
      const profitPerUnit = sellPrice - costPrice;
      const lineProfit = profitPerUnit * cartItem.qty;
      totalProfit += lineProfit;

      // Potong stok jika bukan item pulsa unlimited
      if (dbProd && dbProd.category !== 'digital') {
        dbProd.stock = Math.max(0, (dbProd.stock || 0) - cartItem.qty);
      }

      return {
        ...cartItem,
        costPrice,
        profit: lineProfit
      };
    });

    // Simpan pengurangan stok
    this.save(DB_KEYS.PRODUCTS, products);

    const now = new Date();
    const invoiceNumber = 'INV-' + now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const newTx = {
      id: 'tx-' + Date.now(),
      invoiceNumber: transactionData.invoiceNumber || invoiceNumber,
      createdAt: now.toISOString(),
      items: enrichedItems,
      subtotal: transactionData.subtotal,
      discount: transactionData.discount || 0,
      total: transactionData.total,
      profit: totalProfit - (transactionData.discount || 0),
      paymentMethod: transactionData.paymentMethod || 'TUNAI', // TUNAI, QRIS, KASBON
      cashGiven: transactionData.cashGiven || transactionData.total,
      change: transactionData.change || 0,
      customerName: transactionData.customerName || 'Pembeli Umum',
      customerPhone: transactionData.customerPhone || '',
      cashier: transactionData.cashier || 'Kasir Warung'
    };

    transactions.unshift(newTx);
    this.save(DB_KEYS.TRANSACTIONS, transactions);

    // Jika pembayaran KASBON, catat otomatis ke buku kasbon
    if (transactionData.paymentMethod === 'KASBON') {
      const itemsSummary = enrichedItems.map(i => `${i.name} (${i.qty}x)`).join(', ');
      this.createKasbon({
        customerName: transactionData.customerName || 'Pelanggan Kasbon',
        customerPhone: transactionData.customerPhone || '',
        itemsDescription: itemsSummary,
        totalDebt: newTx.total,
        paidAmount: 0,
        remainingAmount: newTx.total,
        status: 'UNPAID',
        dueDate: transactionData.dueDate || '',
        notes: `Dari transaksi kasir ${newTx.invoiceNumber}`
      });
    }

    this.triggerCloudSyncDebounced();
    return newTx;
  }

  deleteTransaction(transactionId, returnStock = true) {
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return false;

    // Kembalikan stok jika dibatalkan
    if (returnStock && tx.items) {
      const products = this.getProducts();
      tx.items.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        if (p && p.category !== 'digital') {
          p.stock = (p.stock || 0) + item.qty;
        }
      });
      this.save(DB_KEYS.PRODUCTS, products);
    }

    const filtered = transactions.filter(t => t.id !== transactionId);
    this.save(DB_KEYS.TRANSACTIONS, filtered);
    this.triggerCloudSyncDebounced();
    return true;
  }

  // --- BUKU KASBON / HUTANG ---
  getKasbonList() {
    return this.load(DB_KEYS.KASBON, []);
  }

  createKasbon(data) {
    const list = this.getKasbonList();
    const newEntry = {
      id: 'bon-' + Date.now(),
      customerName: data.customerName,
      customerPhone: data.customerPhone || '',
      itemsDescription: data.itemsDescription || '',
      totalDebt: Number(data.totalDebt) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      remainingAmount: (Number(data.totalDebt) || 0) - (Number(data.paidAmount) || 0),
      status: (Number(data.paidAmount) >= Number(data.totalDebt)) ? 'PAID' : (Number(data.paidAmount) > 0 ? 'PARTIAL' : 'UNPAID'),
      createdAt: new Date().toISOString(),
      dueDate: data.dueDate || '',
      notes: data.notes || '',
      payments: data.paidAmount > 0 ? [{
        amount: Number(data.paidAmount),
        date: new Date().toISOString(),
        method: 'Tunai'
      }] : []
    };
    list.unshift(newEntry);
    this.save(DB_KEYS.KASBON, list);
    this.triggerCloudSyncDebounced();
    return newEntry;
  }

  payKasbon(kasbonId, payAmount, method = 'Tunai', notes = '') {
    const list = this.getKasbonList();
    const item = list.find(k => k.id === kasbonId);
    if (!item) return null;

    const amount = Number(payAmount);
    item.paidAmount = (item.paidAmount || 0) + amount;
    item.remainingAmount = Math.max(0, item.totalDebt - item.paidAmount);

    if (item.remainingAmount <= 0) {
      item.status = 'PAID';
    } else {
      item.status = 'PARTIAL';
    }

    if (!item.payments) item.payments = [];
    item.payments.push({
      amount,
      date: new Date().toISOString(),
      method,
      notes
    });

    this.save(DB_KEYS.KASBON, list);
    this.triggerCloudSyncDebounced();
    return item;
  }

  deleteKasbon(kasbonId) {
    let list = this.getKasbonList();
    list = list.filter(k => k.id !== kasbonId);
    this.save(DB_KEYS.KASBON, list);
    this.triggerCloudSyncDebounced();
    return true;
  }

  // --- SETTINGS ---
  getSettings() {
    return this.load(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    this.save(DB_KEYS.SETTINGS, updated);
    this.triggerCloudSyncDebounced();
    return updated;
  }

  // --- CLOUD CONFIG & ONLINE SYNC ---
  getCloudConfig() {
    return this.load(DB_KEYS.CLOUD_CONFIG, DEFAULT_CLOUD_CONFIG);
  }

  saveCloudConfig(config) {
    const current = this.getCloudConfig();
    const updated = { ...current, ...config };
    this.save(DB_KEYS.CLOUD_CONFIG, updated);
    return updated;
  }

  /**
   * Sinkronisasi data ke Cloud Database (Firebase Realtime Database REST API)
   * Menggunakan REST endpoint: `${firebaseDbUrl}/stores/${storeKey}.json`
   */
  async syncToCloud() {
    const config = this.getCloudConfig();
    if (!config.enabled || !config.firebaseDbUrl) {
      return { success: false, reason: 'Cloud sync dinonaktifkan atau URL Firebase belum diisi' };
    }

    // Bersihkan format URL
    let baseUrl = config.firebaseDbUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    const endpoint = `${baseUrl}/stores/${encodeURIComponent(config.storeKey)}.json`;

    const payload = {
      updatedAt: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      transactions: this.getTransactions().slice(0, 500), // Max 500 transaksi terbaru
      kasbon: this.getKasbonList()
    };

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        config.lastSync = new Date().toISOString();
        this.saveCloudConfig(config);
        return { success: true, timestamp: config.lastSync };
      } else {
        throw new Error(`Cloud response error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.warn('Sync failed (mungkin offline atau URL salah):', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Download data dari Cloud Database
   */
  async syncFromCloud() {
    const config = this.getCloudConfig();
    if (!config.enabled || !config.firebaseDbUrl) {
      return { success: false, reason: 'Cloud sync dinonaktifkan' };
    }

    let baseUrl = config.firebaseDbUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    const endpoint = `${baseUrl}/stores/${encodeURIComponent(config.storeKey)}.json`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data) {
        if (data.products && Array.isArray(data.products)) {
          this.save(DB_KEYS.PRODUCTS, data.products);
        }
        if (data.transactions && Array.isArray(data.transactions)) {
          this.save(DB_KEYS.TRANSACTIONS, data.transactions);
        }
        if (data.kasbon && Array.isArray(data.kasbon)) {
          this.save(DB_KEYS.KASBON, data.kasbon);
        }
        if (data.settings && typeof data.settings === 'object') {
          this.save(DB_KEYS.SETTINGS, data.settings);
        }
        config.lastSync = new Date().toISOString();
        this.saveCloudConfig(config);
        return { success: true, timestamp: config.lastSync };
      }
      return { success: false, reason: 'Data toko belum ditemukan di cloud' };
    } catch (err) {
      console.error('Fetch cloud failed:', err);
      return { success: false, error: err.message };
    }
  }

  triggerCloudSyncDebounced() {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      this.syncToCloud().catch(() => {});
    }, 2000);
  }

  // --- EXPORT & IMPORT BACKUP ---
  exportBackup() {
    const fullData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      transactions: this.getTransactions(),
      kasbon: this.getKasbonList(),
      categories: this.getCategories()
    };
    return JSON.stringify(fullData, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.products || !data.settings) {
        return { success: false, message: 'Format file cadangan tidak valid!' };
      }

      if (data.products) this.save(DB_KEYS.PRODUCTS, data.products);
      if (data.transactions) this.save(DB_KEYS.TRANSACTIONS, data.transactions);
      if (data.kasbon) this.save(DB_KEYS.KASBON, data.kasbon);
      if (data.settings) this.save(DB_KEYS.SETTINGS, data.settings);
      if (data.categories) this.save(DB_KEYS.CATEGORIES, data.categories);

      this.triggerCloudSyncDebounced();
      return { success: true, message: 'Data cadangan berhasil dipulihkan!' };
    } catch (e) {
      return { success: false, message: 'Gagal memproses file JSON: ' + e.message };
    }
  }

  resetAll() {
    localStorage.removeItem(DB_KEYS.PRODUCTS);
    localStorage.removeItem(DB_KEYS.TRANSACTIONS);
    localStorage.removeItem(DB_KEYS.KASBON);
    localStorage.removeItem(DB_KEYS.SETTINGS);
    localStorage.removeItem(DB_KEYS.CLOUD_CONFIG);
    localStorage.removeItem(DB_KEYS.CATEGORIES);
    this.initDatabase();
  }
}

// Global instance
window.warungDB = new WarungDB();
