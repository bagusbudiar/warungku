/**
 * app.js - WarungKu Logic & UI Controller
 * Mengatur interaksi antarmuka POS, Keranjang, Struk, Kasbon, Laporan, Barcode, & Cloud
 */

const App = {
  state: {
    activeTab: 'kasir',
    cart: [],
    selectedCategory: 'all',
    searchQuery: '',
    discount: 0,
    paymentMethod: 'TUNAI',
    cashGiven: 0,
    currentTx: null,
    editingProduct: null,
    selectedKasbon: null,
    reportRange: 'today', // 'today', 'week', 'month', 'all'
    isOnline: navigator.onLine,
    isScannerActive: false,
    scannerStream: null
  },

  init() {
    this.setupAudio();
    this.setupNetworkListeners();
    this.setupNavigation();
    this.renderHeader();
    this.renderProducts();
    this.renderCategoryChips();
    this.renderKasbon();
    this.renderReports();
    this.renderSettings();
    this.checkCloudSync();

    // Auto sync berkala jika cloud aktif
    setInterval(() => {
      if (this.state.isOnline) {
        window.warungDB.syncToCloud().then(res => {
          if (res.success) this.updateSyncBadge();
        });
      }
    }, 60000);
  },

  // --- AUDIO SYNTHESIZER (Tanpa file audio eksternal) ---
  setupAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }
  },

  playBeep(type = 'item') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'item') {
        // Nada tingi singkat (Scan item)
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        // Nada sukses kasir (Dua nada ceria)
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio play error', e);
    }
  },

  triggerHaptic(ms = 40) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  },

  // --- NETWORK STATUS ---
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.renderHeader();
      this.showToast('Koneksi internet terhubung (Online)', 'success');
      window.warungDB.syncToCloud();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.renderHeader();
      this.showToast('Mode Offline aktif. Transaksi tetap tersimpan aman di HP!', 'info');
    });
  },

  // --- NAVIGATION TABS ---
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-tab-btn');
    navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tabName) {
    this.state.activeTab = tabName;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('text-emerald-600', 'font-bold');
        btn.classList.remove('text-gray-500');
      } else {
        btn.classList.remove('text-emerald-600', 'font-bold');
        btn.classList.add('text-gray-500');
      }
    });

    if (tabName === 'produk') this.renderProductsListTable();
    if (tabName === 'kasbon') this.renderKasbon();
    if (tabName === 'laporan') this.renderReports();
    if (tabName === 'pengaturan') this.renderSettings();
  },

  // --- HEADER & ONLINE STATUS ---
  renderHeader() {
    const settings = window.warungDB.getSettings();
    const cloud = window.warungDB.getCloudConfig();
    const nameEl = document.getElementById('store-name-display');
    const statusEl = document.getElementById('network-status-badge');

    if (nameEl) nameEl.textContent = settings.storeName || 'WarungKu POS';

    if (statusEl) {
      if (!this.state.isOnline) {
        statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Offline
        </span>`;
      } else if (cloud.enabled) {
        statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Cloud Online
        </span>`;
      } else {
        statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span> Online (Lokal)
        </span>`;
      }
    }
  },

  // --- KATEGORI CHIPS ---
  renderCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;

    const categories = window.warungDB.getCategories();
    container.innerHTML = categories.map(cat => {
      const isSelected = this.state.selectedCategory === cat.id;
      return `
        <button onclick="App.selectCategory('${cat.id}')"
          class="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            isSelected
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
              : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
          }">
          <span>${cat.icon}</span>
          <span>${cat.name}</span>
        </button>
      `;
    }).join('');
  },

  selectCategory(catId) {
    this.state.selectedCategory = catId;
    this.renderCategoryChips();
    this.renderProducts();
  },

  // --- KATALOG PRODUK KASIR ---
  renderProducts() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const allProducts = window.warungDB.getProducts();
    const query = this.state.searchQuery.toLowerCase().trim();

    let filtered = allProducts.filter(p => {
      const matchCat = (this.state.selectedCategory === 'all') || (p.category === this.state.selectedCategory);
      const matchSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400">
          <div class="text-4xl mb-2">🔍</div>
          <p class="font-medium text-gray-600">Tidak ada produk ditemukan</p>
          <p class="text-xs text-gray-400 mt-1">Coba kata kunci lain atau tambah produk baru</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(prod => {
      const isLowStock = prod.stock <= prod.minStock && prod.category !== 'digital';
      const isOutOfStock = prod.stock <= 0 && prod.category !== 'digital';
      const inCart = this.state.cart.find(c => c.id === prod.id);

      return `
        <div onclick="App.addToCart('${prod.id}')"
          class="relative bg-white rounded-xl p-3 border ${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200'}
                 shadow-sm hover:shadow-md active:scale-95 transition cursor-pointer flex flex-col justify-between select-none">
          
          ${inCart ? `
            <div class="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow">
              ${inCart.qty}
            </div>
          ` : ''}

          <div>
            <div class="flex items-start justify-between gap-1 mb-2">
              <span class="text-3xl p-1.5 bg-gray-50 rounded-lg inline-block">${prod.icon || '📦'}</span>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                isOutOfStock ? 'bg-red-100 text-red-700' :
                isLowStock ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-50 text-emerald-700'
              }">
                ${prod.category === 'digital' ? '♾️ Pulsa' : `Stok: ${prod.stock}`}
              </span>
            </div>
            
            <h4 class="font-bold text-gray-800 text-sm line-clamp-2 leading-tight">${prod.name}</h4>
          </div>

          <div class="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <span class="text-xs text-gray-400 block -mb-0.5">Harga</span>
              <span class="text-emerald-700 font-extrabold text-sm">${this.formatRupiah(prod.sellPrice)}</span>
            </div>
            <button class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  handleSearchInput(value) {
    this.state.searchQuery = value;
    this.renderProducts();
  },

  // --- KERANJANG POS ---
  addToCart(productId) {
    const prod = window.warungDB.getProductById(productId);
    if (!prod) return;

    if (prod.stock <= 0 && prod.category !== 'digital') {
      this.showToast(`Stok ${prod.name} sedang habis!`, 'warning');
      return;
    }

    const existing = this.state.cart.find(c => c.id === productId);
    if (existing) {
      if (prod.category !== 'digital' && existing.qty >= prod.stock) {
        this.showToast(`Maksimal stok tersedia: ${prod.stock}`, 'warning');
        return;
      }
      existing.qty++;
    } else {
      this.state.cart.push({
        id: prod.id,
        name: prod.name,
        price: prod.sellPrice,
        costPrice: prod.costPrice,
        unit: prod.unit,
        category: prod.category,
        stock: prod.stock,
        qty: 1
      });
    }

    this.playBeep('item');
    this.triggerHaptic(40);
    this.renderCart();
    this.renderProducts();
  },

  updateCartQty(productId, delta) {
    const item = this.state.cart.find(c => c.id === productId);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      this.removeFromCart(productId);
      return;
    }

    if (item.category !== 'digital' && newQty > item.stock) {
      this.showToast(`Maksimal stok tercapai (${item.stock})`, 'warning');
      return;
    }

    item.qty = newQty;
    this.playBeep('item');
    this.triggerHaptic(30);
    this.renderCart();
    this.renderProducts();
  },

  removeFromCart(productId) {
    this.state.cart = this.state.cart.filter(c => c.id !== productId);
    this.renderCart();
    this.renderProducts();
  },

  clearCart() {
    this.state.cart = [];
    this.state.discount = 0;
    this.renderCart();
    this.renderProducts();
  },

  getCartTotals() {
    const subtotal = this.state.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const discount = Number(this.state.discount) || 0;
    const total = Math.max(0, subtotal - discount);
    const totalItems = this.state.cart.reduce((acc, item) => acc + item.qty, 0);
    return { subtotal, discount, total, totalItems };
  },

  renderCart() {
    const { subtotal, discount, total, totalItems } = this.getCartTotals();
    const cartItemsContainer = document.getElementById('cart-items-list');
    const bottomBar = document.getElementById('mobile-cart-bar');
    const cartBadge = document.getElementById('cart-floating-count');

    // Update Floating Badge
    if (cartBadge) {
      cartBadge.textContent = totalItems;
      if (totalItems > 0) {
        cartBadge.classList.remove('hidden');
      } else {
        cartBadge.classList.add('hidden');
      }
    }

    // Update Bottom Floating Bar for Mobile
    if (bottomBar) {
      if (totalItems > 0) {
        bottomBar.classList.remove('hidden');
        document.getElementById('mobile-cart-total').textContent = this.formatRupiah(total);
        document.getElementById('mobile-cart-items-text').textContent = `${totalItems} item di keranjang`;
      } else {
        bottomBar.classList.add('hidden');
      }
    }

    // Render Cart Drawer / Sidebar Content
    if (!cartItemsContainer) return;

    if (this.state.cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="py-16 text-center text-gray-400">
          <div class="text-5xl mb-3">🛒</div>
          <p class="font-bold text-gray-700">Keranjang Masih Kosong</p>
          <p class="text-xs text-gray-400 mt-1">Sentuh produk di sebelah kiri untuk menambah pesanan</p>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = this.state.cart.map(item => `
        <div class="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
          <div class="flex-1 pr-2">
            <h5 class="font-bold text-gray-800 text-xs sm:text-sm line-clamp-1">${item.name}</h5>
            <span class="text-xs text-emerald-700 font-semibold">${this.formatRupiah(item.price)}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="App.updateCartQty('${item.id}', -1)"
              class="w-7 h-7 rounded-lg bg-white border border-gray-300 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95">
              -
            </button>
            <span class="w-6 text-center font-extrabold text-sm text-gray-800">${item.qty}</span>
            <button onclick="App.updateCartQty('${item.id}', 1)"
              class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold hover:bg-emerald-700 active:scale-95">
              +
            </button>
            <button onclick="App.removeFromCart('${item.id}')"
              class="ml-1 text-red-500 hover:text-red-700 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      `).join('');
    }

    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    if (subtotalEl) subtotalEl.textContent = this.formatRupiah(subtotal);
    if (totalEl) totalEl.textContent = this.formatRupiah(total);
  },

  openCartDrawer() {
    const drawer = document.getElementById('cart-drawer-modal');
    if (drawer) drawer.classList.remove('hidden');
  },

  closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer-modal');
    if (drawer) drawer.classList.add('hidden');
  },

  // --- CHECKOUT & PEMBAYARAN ---
  openCheckoutModal() {
    if (this.state.cart.length === 0) {
      this.showToast('Keranjang masih kosong!', 'warning');
      return;
    }

    const modal = document.getElementById('checkout-modal');
    const { total } = this.getCartTotals();

    document.getElementById('checkout-grand-total').textContent = this.formatRupiah(total);
    this.setPaymentMethod('TUNAI');
    this.setCashAmount(total); // Default uang pas

    if (modal) modal.classList.remove('hidden');
  },

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
  },

  setPaymentMethod(method) {
    this.state.paymentMethod = method;
    ['TUNAI', 'QRIS', 'KASBON'].forEach(m => {
      const btn = document.getElementById(`pay-method-${m.toLowerCase()}`);
      const section = document.getElementById(`pay-section-${m.toLowerCase()}`);
      if (btn) {
        if (m === method) {
          btn.classList.add('border-emerald-600', 'bg-emerald-50', 'text-emerald-800', 'ring-2', 'ring-emerald-600/30');
          btn.classList.remove('border-gray-200', 'bg-white', 'text-gray-700');
        } else {
          btn.classList.remove('border-emerald-600', 'bg-emerald-50', 'text-emerald-800', 'ring-2', 'ring-emerald-600/30');
          btn.classList.add('border-gray-200', 'bg-white', 'text-gray-700');
        }
      }
      if (section) {
        section.classList.toggle('hidden', m !== method);
      }
    });

    if (method === 'QRIS') {
      this.renderQrisCode();
    }
  },

  setCashAmount(amount) {
    this.state.cashGiven = Number(amount);
    const cashInput = document.getElementById('cash-input');
    if (cashInput) cashInput.value = amount;
    this.updateCashChange();
  },

  addCash(amount) {
    const current = Number(this.state.cashGiven) || 0;
    this.setCashAmount(current + amount);
  },

  updateCashChange() {
    const { total } = this.getCartTotals();
    const cashInput = document.getElementById('cash-input');
    const changeDisplay = document.getElementById('cash-change-display');
    const changeContainer = document.getElementById('change-box');

    const given = Number(cashInput?.value) || 0;
    this.state.cashGiven = given;
    const change = given - total;

    if (changeDisplay) {
      if (change >= 0) {
        changeDisplay.textContent = this.formatRupiah(change);
        changeContainer.classList.remove('bg-red-50', 'text-red-700');
        changeContainer.classList.add('bg-emerald-50', 'text-emerald-800');
      } else {
        changeDisplay.textContent = `Kurang ${this.formatRupiah(Math.abs(change))}`;
        changeContainer.classList.remove('bg-emerald-50', 'text-emerald-800');
        changeContainer.classList.add('bg-red-50', 'text-red-700');
      }
    }
  },

  renderQrisCode() {
    const { total } = this.getCartTotals();
    const settings = window.warungDB.getSettings();
    const canvas = document.getElementById('qris-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Bersihkan canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Frame QRIS Nasional
    ctx.fillStyle = '#b91c1c'; // Merah QRIS
    ctx.fillRect(0, 0, w, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QRIS STANDAR PEMBAYARAN', w / 2, 22);

    // Nama Merchant
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(settings.qrisMerchantName || settings.storeName, w / 2, 54);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`NMID: ${settings.qrisNmid || 'ID1020304050607'}`, w / 2, 68);

    // Simulasi Pola QR Code Dinamis Bersih
    const size = 150;
    const startX = (w - size) / 2;
    const startY = 80;
    const cellSize = 5;

    ctx.fillStyle = '#000000';
    // Gambar corner blocks standard QR
    this.drawQrCorner(ctx, startX, startY, 35);
    this.drawQrCorner(ctx, startX + size - 35, startY, 35);
    this.drawQrCorner(ctx, startX, startY + size - 35, 35);

    // Pattern titik acak terstruktur
    const seed = total + 777;
    for (let x = 0; x < size; x += cellSize) {
      for (let y = 0; y < size; y += cellSize) {
        // Jangan timpa corner markers
        if ((x < 40 && y < 40) || (x > size - 45 && y < 40) || (x < 40 && y > size - 45)) continue;
        const val = Math.sin((x * 12 + y * 23 + seed)) * 10000;
        if ((val - Math.floor(val)) > 0.5) {
          ctx.fillRect(startX + x, startY + y, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Logo GPN / Dompet Digital kecil di tengah
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 16, startY + size / 2 - 16, 32, 32);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 16, startY + size / 2 - 16, 32, 32);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('QRIS', w / 2, startY + size / 2 + 4);

    // Nominal
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(this.formatRupiah(total), w / 2, 256);
  },

  drawQrCorner(ctx, x, y, size) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 10, y + 10, size - 20, size - 20);
  },

  // --- SELESAIKAN TRANSAKSI ---
  processTransaction() {
    const { subtotal, discount, total } = this.getCartTotals();
    const method = this.state.paymentMethod;

    let customerName = 'Pembeli Umum';
    let customerPhone = '';
    let dueDate = '';

    if (method === 'TUNAI') {
      const given = Number(this.state.cashGiven) || 0;
      if (given < total) {
        this.showToast(`Uang tunai kurang! Butuh ${this.formatRupiah(total - given)} lagi`, 'warning');
        return;
      }
    } else if (method === 'KASBON') {
      customerName = document.getElementById('kasbon-customer-name')?.value.trim();
      customerPhone = document.getElementById('kasbon-customer-phone')?.value.trim();
      dueDate = document.getElementById('kasbon-due-date')?.value;

      if (!customerName) {
        this.showToast('Nama pelanggan wajib diisi untuk kasbon!', 'warning');
        return;
      }
    }

    const txData = {
      items: this.state.cart,
      subtotal,
      discount,
      total,
      paymentMethod: method,
      cashGiven: method === 'TUNAI' ? this.state.cashGiven : total,
      change: method === 'TUNAI' ? Math.max(0, this.state.cashGiven - total) : 0,
      customerName,
      customerPhone,
      dueDate
    };

    const newTx = window.warungDB.createTransaction(txData);

    this.playBeep('success');
    this.triggerHaptic(100);
    this.closeCheckoutModal();
    this.closeCartDrawer();
    this.clearCart();

    // Buka Struk Belanja
    this.showReceiptModal(newTx);
  },

  // --- STRUK BELANJA & THERMAL PRINT ---
  showReceiptModal(tx) {
    this.state.currentTx = tx;
    const modal = document.getElementById('receipt-modal');
    const container = document.getElementById('receipt-paper-content');
    const settings = window.warungDB.getSettings();

    if (!container || !modal) return;

    const dateStr = new Date(tx.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    container.innerHTML = `
      <div class="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
        <h3 class="font-extrabold text-base tracking-wider uppercase text-gray-900">${settings.storeName}</h3>
        <p class="text-xs text-gray-600 mt-0.5">${settings.address}</p>
        <p class="text-xs text-gray-600">WhatsApp: ${settings.phone}</p>
      </div>

      <div class="text-[11px] text-gray-600 space-y-0.5 mb-2">
        <div class="flex justify-between">
          <span>No. Nota:</span>
          <span class="font-mono font-bold text-gray-800">${tx.invoiceNumber}</span>
        </div>
        <div class="flex justify-between">
          <span>Waktu:</span>
          <span>${dateStr}</span>
        </div>
        <div class="flex justify-between">
          <span>Kasir:</span>
          <span>${tx.cashier}</span>
        </div>
        <div class="flex justify-between">
          <span>Pelanggan:</span>
          <span class="font-semibold">${tx.customerName}</span>
        </div>
      </div>

      <div class="border-t border-b border-dashed border-gray-300 py-2 my-2 space-y-1.5 text-xs">
        ${tx.items.map(item => `
          <div>
            <div class="font-semibold text-gray-800">${item.name}</div>
            <div class="flex justify-between text-gray-500 text-[11px]">
              <span>${item.qty} x ${this.formatRupiah(item.price)}</span>
              <span class="font-mono text-gray-800">${this.formatRupiah(item.qty * item.price)}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="space-y-1 text-xs mb-3">
        <div class="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span class="font-mono">${this.formatRupiah(tx.subtotal)}</span>
        </div>
        ${tx.discount > 0 ? `
          <div class="flex justify-between text-emerald-600">
            <span>Diskon:</span>
            <span class="font-mono">-${this.formatRupiah(tx.discount)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>TOTAL:</span>
          <span class="font-mono text-emerald-800">${this.formatRupiah(tx.total)}</span>
        </div>
        <div class="flex justify-between text-gray-600 pt-1">
          <span>Bayar (${tx.paymentMethod}):</span>
          <span class="font-mono">${this.formatRupiah(tx.cashGiven)}</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Kembalian:</span>
          <span class="font-mono font-semibold">${this.formatRupiah(tx.change)}</span>
        </div>
      </div>

      <div class="text-center text-[10px] text-gray-500 border-t border-dashed border-gray-300 pt-3">
        <p class="whitespace-pre-line leading-relaxed">${settings.receiptFooter}</p>
        <p class="mt-2 text-[9px] text-gray-400 font-mono">Ditenagai oleh WarungKu POS</p>
      </div>
    `;

    modal.classList.remove('hidden');
  },

  closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.add('hidden');
  },

  printReceipt() {
    window.print();
  },

  shareReceiptWhatsApp() {
    const tx = this.state.currentTx;
    if (!tx) return;
    const settings = window.warungDB.getSettings();

    const dateStr = new Date(tx.createdAt).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let message = `*STRUK PEMBELIAN - ${settings.storeName.toUpperCase()}*\n`;
    message += `${settings.address}\n`;
    message += `No. Nota : ${tx.invoiceNumber}\n`;
    message += `Tanggal  : ${dateStr}\n`;
    message += `Kasir    : ${tx.cashier}\n`;
    message += `Pelanggan: ${tx.customerName}\n`;
    message += `--------------------------------\n`;

    tx.items.forEach(item => {
      message += `${item.name}\n  ${item.qty}x @ ${this.formatRupiah(item.price)} = ${this.formatRupiah(item.qty * item.price)}\n`;
    });

    message += `--------------------------------\n`;
    message += `Subtotal : ${this.formatRupiah(tx.subtotal)}\n`;
    if (tx.discount > 0) message += `Diskon   : -${this.formatRupiah(tx.discount)}\n`;
    message += `*TOTAL    : ${this.formatRupiah(tx.total)}*\n`;
    message += `Metode   : ${tx.paymentMethod}\n`;
    message += `Bayar    : ${this.formatRupiah(tx.cashGiven)}\n`;
    message += `Kembalian: ${this.formatRupiah(tx.change)}\n`;
    message += `--------------------------------\n`;
    message += `${settings.receiptFooter.replace(/\n/g, ' ')}\n\n`;
    message += `_Terima kasih atas kunjungan Anda!_`;

    const encoded = encodeURIComponent(message);
    let targetUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    if (tx.customerPhone) {
      let cleanPhone = tx.customerPhone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      targetUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    }

    window.open(targetUrl, '_blank');
  },

  // --- BUKU KASBON / HUTANG PELANGGAN ---
  renderKasbon() {
    const list = window.warungDB.getKasbonList();
    const container = document.getElementById('kasbon-list-container');
    const totalDebtEl = document.getElementById('total-kasbon-active');
    const totalDebtorsEl = document.getElementById('total-debtors-count');

    // Hitung ringkasan
    const activeDebts = list.filter(k => k.status !== 'PAID');
    const totalPiutang = activeDebts.reduce((acc, k) => acc + k.remainingAmount, 0);

    if (totalDebtEl) totalDebtEl.textContent = this.formatRupiah(totalPiutang);
    if (totalDebtorsEl) totalDebtorsEl.textContent = activeDebts.length;

    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          <div class="text-4xl mb-2">📒</div>
          <p class="font-bold text-gray-700">Belum Ada Catatan Kasbon</p>
          <p class="text-xs text-gray-400 mt-1">Semua pelanggan tertib bayar tunai / QRIS!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(item => {
      const isPaid = item.status === 'PAID';
      const isPartial = item.status === 'PARTIAL';
      const statusBadge = isPaid
        ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Lunas</span>'
        : (isPartial
            ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Dicicil</span>'
            : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Belum Bayar</span>');

      const dateStr = new Date(item.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      return `
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-gray-300 transition">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="font-bold text-gray-900 text-sm sm:text-base">${item.customerName}</h4>
              <p class="text-xs text-gray-500 mt-0.5">
                📞 ${item.customerPhone || 'Tidak ada no WA'} • 🗓️ ${dateStr}
              </p>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div class="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-700">
            <span class="font-semibold block mb-0.5 text-gray-500">Rincian Barang / Catatan:</span>
            <p>${item.itemsDescription || item.notes || '-'}</p>
            ${item.dueDate ? `<p class="mt-1 text-red-600 font-medium">⏰ Janji Bayar: ${item.dueDate}</p>` : ''}
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              <span class="text-xs text-gray-400 block">Sisa Hutang:</span>
              <span class="font-extrabold text-base ${isPaid ? 'text-gray-400 line-through' : 'text-red-600'}">
                ${this.formatRupiah(item.remainingAmount)}
              </span>
              <span class="text-[11px] text-gray-500 block">
                Total Awal: ${this.formatRupiah(item.totalDebt)} (Terbayar: ${this.formatRupiah(item.paidAmount)})
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              ${!isPaid ? `
                <button onclick="App.openPayKasbonModal('${item.id}')"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition">
                  Bayar / Cicil
                </button>
                <button onclick="App.remindKasbonWhatsApp('${item.id}')"
                  class="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 active:scale-95 transition" title="Tagih via WhatsApp">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                </button>
              ` : `
                <button onclick="App.deleteKasbonEntry('${item.id}')"
                  class="px-2.5 py-1 text-xs text-gray-400 hover:text-red-500">
                  Hapus
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openNewKasbonModal() {
    const modal = document.getElementById('new-kasbon-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeNewKasbonModal() {
    const modal = document.getElementById('new-kasbon-modal');
    if (modal) modal.classList.add('hidden');
  },

  saveNewKasbon() {
    const name = document.getElementById('manual-kasbon-name')?.value.trim();
    const phone = document.getElementById('manual-kasbon-phone')?.value.trim();
    const amount = Number(document.getElementById('manual-kasbon-amount')?.value) || 0;
    const desc = document.getElementById('manual-kasbon-desc')?.value.trim();
    const dueDate = document.getElementById('manual-kasbon-due')?.value;

    if (!name || amount <= 0) {
      this.showToast('Nama pelanggan dan jumlah hutang wajib diisi!', 'warning');
      return;
    }

    window.warungDB.createKasbon({
      customerName: name,
      customerPhone: phone,
      itemsDescription: desc,
      totalDebt: amount,
      paidAmount: 0,
      dueDate
    });

    this.showToast('Catatan kasbon baru berhasil ditambahkan!', 'success');
    this.closeNewKasbonModal();
    this.renderKasbon();
  },

  openPayKasbonModal(kasbonId) {
    const item = window.warungDB.getKasbonList().find(k => k.id === kasbonId);
    if (!item) return;

    this.state.selectedKasbon = item;
    const modal = document.getElementById('pay-kasbon-modal');

    document.getElementById('pay-kasbon-customer-display').textContent = item.customerName;
    document.getElementById('pay-kasbon-remaining-display').textContent = this.formatRupiah(item.remainingAmount);
    document.getElementById('pay-kasbon-amount-input').value = item.remainingAmount;

    if (modal) modal.classList.remove('hidden');
  },

  closePayKasbonModal() {
    const modal = document.getElementById('pay-kasbon-modal');
    if (modal) modal.classList.add('hidden');
  },

  submitPayKasbon() {
    const item = this.state.selectedKasbon;
    if (!item) return;

    const amount = Number(document.getElementById('pay-kasbon-amount-input')?.value) || 0;
    if (amount <= 0) {
      this.showToast('Masukkan jumlah pembayaran yang valid!', 'warning');
      return;
    }

    window.warungDB.payKasbon(item.id, amount, 'Tunai');
    this.showToast(`Pembayaran Rp ${this.formatRupiah(amount)} berhasil dicatat!`, 'success');
    this.playBeep('success');
    this.closePayKasbonModal();
    this.renderKasbon();
  },

  remindKasbonWhatsApp(kasbonId) {
    const item = window.warungDB.getKasbonList().find(k => k.id === kasbonId);
    if (!item) return;

    const settings = window.warungDB.getSettings();
    let text = `Halo Kak *${item.customerName}* 🙏\n\n`;
    text += `Sekadar mengingatkan catatan kasbon di *${settings.storeName}*:\n`;
    text += `• Total Hutang: *${this.formatRupiah(item.totalDebt)}*\n`;
    text += `• Sudah Dibayar: ${this.formatRupiah(item.paidAmount)}\n`;
    text += `• *Sisa Belum Lunas: ${this.formatRupiah(item.remainingAmount)}*\n`;
    if (item.itemsDescription) text += `• Rincian: ${item.itemsDescription}\n`;
    if (item.dueDate) text += `• Jatuh Tempo: ${item.dueDate}\n`;
    text += `\nPembayaran dapat langsung di warung atau melalui transfer QRIS kami ya kak. Terima kasih banyak atas kerjasamanya! 😊`;

    const encoded = encodeURIComponent(text);
    let target = `https://api.whatsapp.com/send?text=${encoded}`;
    if (item.customerPhone) {
      let clean = item.customerPhone.replace(/[^0-9]/g, '');
      if (clean.startsWith('0')) clean = '62' + clean.slice(1);
      target = `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`;
    }
    window.open(target, '_blank');
  },

  deleteKasbonEntry(id) {
    if (confirm('Hapus catatan kasbon ini?')) {
      window.warungDB.deleteKasbon(id);
      this.renderKasbon();
      this.showToast('Catatan kasbon dihapus', 'info');
    }
  },

  // --- MANAJEMEN PRODUK & STOK ---
  renderProductsListTable() {
    const list = window.warungDB.getProducts();
    const container = document.getElementById('products-inventory-list');
    const totalAssetEl = document.getElementById('total-inventory-asset');
    const lowStockCountEl = document.getElementById('low-stock-items-count');

    // Hitung total aset modal
    const totalAsset = list.reduce((acc, p) => acc + (p.costPrice * (p.category === 'digital' ? 0 : p.stock)), 0);
    const lowCount = list.filter(p => p.stock <= p.minStock && p.category !== 'digital').length;

    if (totalAssetEl) totalAssetEl.textContent = this.formatRupiah(totalAsset);
    if (lowStockCountEl) lowStockCountEl.textContent = lowCount;

    if (!container) return;

    container.innerHTML = list.map(prod => {
      const isLow = prod.stock <= prod.minStock && prod.category !== 'digital';
      const margin = prod.sellPrice - prod.costPrice;
      const marginPct = prod.costPrice > 0 ? Math.round((margin / prod.costPrice) * 100) : 0;

      return `
        <div class="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl p-2 bg-gray-50 rounded-lg">${prod.icon || '📦'}</span>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-gray-900 text-sm">${prod.name}</h4>
                ${isLow ? '<span class="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full">Menipis</span>' : ''}
              </div>
              <div class="text-xs text-gray-500 mt-0.5 space-x-2">
                <span>Modal: ${this.formatRupiah(prod.costPrice)}</span>
                <span>•</span>
                <span class="text-emerald-700 font-semibold">Jual: ${this.formatRupiah(prod.sellPrice)}</span>
                <span>(Untung +${marginPct}%)</span>
              </div>
              ${prod.barcode ? `<span class="text-[10px] font-mono text-gray-400">Barcode: ${prod.barcode}</span>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Quick Stock Control -->
            <div class="text-right">
              <span class="text-[10px] text-gray-400 block">Stok</span>
              <div class="flex items-center gap-1 mt-0.5">
                <button onclick="App.quickAdjustStock('${prod.id}', -1)"
                  class="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">-</button>
                <span class="w-8 text-center font-bold text-sm ${isLow ? 'text-red-600' : 'text-gray-800'}">
                  ${prod.stock}
                </span>
                <button onclick="App.quickAdjustStock('${prod.id}', 1)"
                  class="w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200">+</button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 border-l border-gray-100 pl-2">
              <button onclick="App.openEditProductModal('${prod.id}')"
                class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="App.deleteProductConfirm('${prod.id}')"
                class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  quickAdjustStock(prodId, delta) {
    window.warungDB.adjustProductStock(prodId, delta);
    this.renderProductsListTable();
    this.renderProducts();
  },

  openNewProductModal() {
    this.state.editingProduct = null;
    document.getElementById('modal-product-title').textContent = 'Tambah Produk Baru';
    document.getElementById('prod-form-name').value = '';
    document.getElementById('prod-form-category').value = 'sembako';
    document.getElementById('prod-form-cost').value = '';
    document.getElementById('prod-form-sell').value = '';
    document.getElementById('prod-form-stock').value = '10';
    document.getElementById('prod-form-minstock').value = '3';
    document.getElementById('prod-form-unit').value = 'pcs';
    document.getElementById('prod-form-barcode').value = '';
    document.getElementById('prod-form-icon').value = '📦';

    document.getElementById('product-form-modal').classList.remove('hidden');
  },

  openEditProductModal(prodId) {
    const prod = window.warungDB.getProductById(prodId);
    if (!prod) return;

    this.state.editingProduct = prod;
    document.getElementById('modal-product-title').textContent = 'Edit Produk';
    document.getElementById('prod-form-name').value = prod.name;
    document.getElementById('prod-form-category').value = prod.category;
    document.getElementById('prod-form-cost').value = prod.costPrice;
    document.getElementById('prod-form-sell').value = prod.sellPrice;
    document.getElementById('prod-form-stock').value = prod.stock;
    document.getElementById('prod-form-minstock').value = prod.minStock;
    document.getElementById('prod-form-unit').value = prod.unit || 'pcs';
    document.getElementById('prod-form-barcode').value = prod.barcode || '';
    document.getElementById('prod-form-icon').value = prod.icon || '📦';

    document.getElementById('product-form-modal').classList.remove('hidden');
  },

  closeProductModal() {
    document.getElementById('product-form-modal').classList.add('hidden');
  },

  saveProductForm() {
    const name = document.getElementById('prod-form-name').value.trim();
    const category = document.getElementById('prod-form-category').value;
    const costPrice = Number(document.getElementById('prod-form-cost').value) || 0;
    const sellPrice = Number(document.getElementById('prod-form-sell').value) || 0;
    const stock = Number(document.getElementById('prod-form-stock').value) || 0;
    const minStock = Number(document.getElementById('prod-form-minstock').value) || 0;
    const unit = document.getElementById('prod-form-unit').value.trim() || 'pcs';
    const barcode = document.getElementById('prod-form-barcode').value.trim();
    const icon = document.getElementById('prod-form-icon').value.trim() || '📦';

    if (!name || sellPrice <= 0) {
      this.showToast('Nama produk dan harga jual harus diisi!', 'warning');
      return;
    }

    const payload = {
      name,
      category,
      costPrice,
      sellPrice,
      stock,
      minStock,
      unit,
      barcode,
      icon
    };

    if (this.state.editingProduct) {
      payload.id = this.state.editingProduct.id;
    }

    window.warungDB.saveProduct(payload);
    this.showToast('Produk berhasil disimpan!', 'success');
    this.closeProductModal();
    this.renderProducts();
    this.renderProductsListTable();
  },

  deleteProductConfirm(prodId) {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      window.warungDB.deleteProduct(prodId);
      this.renderProducts();
      this.renderProductsListTable();
      this.showToast('Produk telah dihapus', 'info');
    }
  },

  // --- LAPORAN KEUANGAN & GRAFIK OMSET ---
  setReportRange(range) {
    this.state.reportRange = range;
    ['today', 'week', 'month', 'all'].forEach(r => {
      const btn = document.getElementById(`rep-btn-${r}`);
      if (btn) {
        if (r === range) {
          btn.classList.add('bg-emerald-600', 'text-white', 'font-bold');
          btn.classList.remove('bg-white', 'text-gray-600');
        } else {
          btn.classList.remove('bg-emerald-600', 'text-white', 'font-bold');
          btn.classList.add('bg-white', 'text-gray-600');
        }
      }
    });
    this.renderReports();
  },

  renderReports() {
    const transactions = window.warungDB.getTransactions();
    const now = new Date();
    const range = this.state.reportRange;

    // Filter berdasarkan rentang tanggal
    const filtered = transactions.filter(t => {
      const txDate = new Date(t.createdAt);
      if (range === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (range === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        return txDate >= weekAgo;
      } else if (range === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });

    // Kalkulasi KPI
    const totalOmset = filtered.reduce((acc, t) => acc + (t.total || 0), 0);
    const totalLaba = filtered.reduce((acc, t) => acc + (t.profit || 0), 0);
    const totalTx = filtered.length;
    const avgBasket = totalTx > 0 ? Math.round(totalOmset / totalTx) : 0;

    document.getElementById('rep-total-omset').textContent = this.formatRupiah(totalOmset);
    document.getElementById('rep-total-laba').textContent = this.formatRupiah(totalLaba);
    document.getElementById('rep-total-tx').textContent = totalTx;
    document.getElementById('rep-avg-basket').textContent = this.formatRupiah(avgBasket);

    // Render Canvas Chart (Tren Penjualan 7 Hari)
    this.renderSalesChart(transactions);

    // Render Top Produk Terlaris
    this.renderTopProducts(filtered);

    // Render Tabel Riwayat Transaksi
    this.renderTransactionHistory(filtered);
  },

  renderSalesChart(allTx) {
    const canvas = document.getElementById('sales-chart-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Kumpulkan 7 hari terakhir
    const days = [];
    const values = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('id-ID', { weekday: 'short' });
      days.push(dayStr);

      const dayTotal = allTx
        .filter(t => new Date(t.createdAt).toDateString() === d.toDateString())
        .reduce((acc, t) => acc + (t.total || 0), 0);
      values.push(dayTotal);
    }

    const maxVal = Math.max(...values, 100000);
    const paddingBottom = 25;
    const paddingTop = 20;
    const chartHeight = height - paddingBottom - paddingTop;
    const barWidth = 28;
    const stepX = width / 7;

    // Draw Gridlines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const y = paddingTop + (chartHeight * (g / 3));
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Draw Bars
    values.forEach((val, idx) => {
      const x = (idx * stepX) + (stepX - barWidth) / 2;
      const barH = (val / maxVal) * chartHeight;
      const y = height - paddingBottom - barH;

      // Bar rounded
      ctx.fillStyle = idx === 6 ? '#059669' : '#a7f3d0';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, 4) : ctx.fillRect(x, y, barWidth, barH);
      ctx.fill();

      // Label Hari
      ctx.fillStyle = idx === 6 ? '#065f46' : '#6b7280';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(days[idx], x + barWidth / 2, height - 8);

      // Label Nilai di atas bar
      if (val > 0) {
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 9px sans-serif';
        const kValue = val >= 1000 ? Math.round(val / 1000) + 'k' : val;
        ctx.fillText(kValue, x + barWidth / 2, Math.max(12, y - 4));
      }
    });
  },

  renderTopProducts(transactions) {
    const container = document.getElementById('top-products-container');
    if (!container) return;

    const countMap = {};
    transactions.forEach(t => {
      t.items.forEach(i => {
        if (!countMap[i.id]) {
          countMap[i.id] = { name: i.name, qty: 0, revenue: 0, icon: i.icon || '📦' };
        }
        countMap[i.id].qty += i.qty;
        countMap[i.id].revenue += i.qty * i.price;
      });
    });

    const sorted = Object.values(countMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Belum ada penjualan di periode ini</p>';
      return;
    }

    container.innerHTML = sorted.map((p, idx) => `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
            ${idx + 1}
          </span>
          <span class="text-xs font-semibold text-gray-800 line-clamp-1">${p.name}</span>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-gray-900">${p.qty} terjual</span>
          <span class="text-[10px] text-gray-400 block">${this.formatRupiah(p.revenue)}</span>
        </div>
      </div>
    `).join('');
  },

  renderTransactionHistory(transactions) {
    const container = document.getElementById('transactions-history-list');
    if (!container) return;

    if (transactions.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-6 text-center">Tidak ada riwayat transaksi</p>';
      return;
    }

    container.innerHTML = transactions.map(t => {
      const dateStr = new Date(t.createdAt).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
      });
      const dayStr = new Date(t.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short'
      });

      return `
        <div class="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-800">${t.invoiceNumber}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                t.paymentMethod === 'TUNAI' ? 'bg-emerald-100 text-emerald-800' :
                t.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-800' :
                'bg-amber-100 text-amber-800'
              }">${t.paymentMethod}</span>
            </div>
            <p class="text-gray-500 text-[11px] mt-0.5">
              ${dayStr}, ${dateStr} • ${t.customerName} (${t.items.length} item)
            </p>
          </div>

          <div class="flex items-center gap-2 text-right">
            <div>
              <span class="font-bold text-sm text-gray-900 block">${this.formatRupiah(t.total)}</span>
              <span class="text-[10px] text-emerald-600 block">+Laba ${this.formatRupiah(t.profit)}</span>
            </div>
            <button onclick="App.reprintTransaction('${t.id}')"
              class="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Cetak Nota">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            </button>
            <button onclick="App.cancelTransaction('${t.id}')"
              class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Batalkan / Refund">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  reprintTransaction(txId) {
    const tx = window.warungDB.getTransactions().find(t => t.id === txId);
    if (tx) this.showReceiptModal(tx);
  },

  cancelTransaction(txId) {
    if (confirm('Batalkan transaksi ini dan kembalikan stok barang ke etalase?')) {
      window.warungDB.deleteTransaction(txId, true);
      this.renderReports();
      this.renderProducts();
      this.showToast('Transaksi dibatalkan & stok dikembalikan', 'info');
    }
  },

  exportReportsToCSV() {
    const transactions = window.warungDB.getTransactions();
    if (transactions.length === 0) {
      this.showToast('Belum ada transaksi untuk diekspor', 'warning');
      return;
    }

    let csv = 'No. Nota,Tanggal,Waktu,Pelanggan,Metode,Subtotal,Diskon,Total,Laba,Rincian Item\n';
    transactions.forEach(t => {
      const d = new Date(t.createdAt);
      const date = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('id-ID');
      const itemsSummary = t.items.map(i => `${i.name} (${i.qty}x)`).join('; ');

      csv += `"${t.invoiceNumber}","${date}","${time}","${t.customerName}","${t.paymentMethod}",${t.subtotal},${t.discount},${t.total},${t.profit},"${itemsSummary}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_WarungKu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Laporan CSV berhasil diunduh!', 'success');
  },

  // --- SETTINGS & CLOUD SYNC ---
  renderSettings() {
    const settings = window.warungDB.getSettings();
    const cloud = window.warungDB.getCloudConfig();

    document.getElementById('set-store-name').value = settings.storeName || '';
    document.getElementById('set-owner-name').value = settings.ownerName || '';
    document.getElementById('set-phone').value = settings.phone || '';
    document.getElementById('set-address').value = settings.address || '';
    document.getElementById('set-footer').value = settings.receiptFooter || '';
    document.getElementById('set-qris-name').value = settings.qrisMerchantName || '';

    // Cloud settings
    document.getElementById('cloud-toggle').checked = !!cloud.enabled;
    document.getElementById('cloud-firebase-url').value = cloud.firebaseDbUrl || '';
    document.getElementById('cloud-store-key').value = cloud.storeKey || '';

    this.updateSyncBadge();
  },

  saveStoreSettings() {
    const updated = {
      storeName: document.getElementById('set-store-name').value.trim(),
      ownerName: document.getElementById('set-owner-name').value.trim(),
      phone: document.getElementById('set-phone').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      receiptFooter: document.getElementById('set-footer').value.trim(),
      qrisMerchantName: document.getElementById('set-qris-name').value.trim()
    };

    window.warungDB.saveSettings(updated);
    this.renderHeader();
    this.showToast('Pengaturan warung tersimpan!', 'success');
  },

  saveCloudSettings() {
    const enabled = document.getElementById('cloud-toggle').checked;
    const firebaseDbUrl = document.getElementById('cloud-firebase-url').value.trim();
    const storeKey = document.getElementById('cloud-store-key').value.trim();

    window.warungDB.saveCloudConfig({
      enabled,
      firebaseDbUrl,
      storeKey
    });

    this.renderHeader();
    this.showToast('Pengaturan Cloud berhasil disimpan!', 'success');
    if (enabled) {
      this.triggerCloudSyncNow();
    }
  },

  async triggerCloudSyncNow() {
    const btn = document.getElementById('btn-sync-cloud-now');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Menyinkronkan...';
    }

    const res = await window.warungDB.syncToCloud();
    if (res.success) {
      this.showToast('Sinkronisasi Cloud Berhasil!', 'success');
      this.updateSyncBadge();
    } else {
      this.showToast(`Sinkronisasi gagal: ${res.reason || res.error}`, 'warning');
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 Sinkronkan Sekarang';
    }
  },

  updateSyncBadge() {
    const cloud = window.warungDB.getCloudConfig();
    const badge = document.getElementById('cloud-last-sync-time');
    if (badge) {
      if (cloud.lastSync) {
        const timeStr = new Date(cloud.lastSync).toLocaleTimeString('id-ID');
        badge.textContent = `Terakhir sinkron: ${timeStr}`;
      } else {
        badge.textContent = 'Belum pernah sinkron';
      }
    }
  },

  checkCloudSync() {
    const cloud = window.warungDB.getCloudConfig();
    if (cloud.enabled && cloud.firebaseDbUrl) {
      window.warungDB.syncFromCloud().then(res => {
        if (res.success) {
          this.renderProducts();
          this.renderKasbon();
          this.renderReports();
        }
      });
    }
  },

  // Backup & Restore
  exportBackupFile() {
    const jsonStr = window.warungDB.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_WarungKu_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    this.showToast('File backup database tersimpan!', 'success');
  },

  importBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = window.warungDB.importBackup(e.target.result);
      if (res.success) {
        this.showToast('Data toko berhasil dipulihkan!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast(res.message, 'warning');
      }
    };
    reader.readAsText(file);
  },

  resetAllData() {
    if (confirm('PERINGATAN: Semua produk, transaksi, dan kasbon akan direset ke pengaturan awal. Lanjutkan?')) {
      window.warungDB.resetAll();
      this.showToast('Database telah direset ke starter data', 'info');
      setTimeout(() => window.location.reload(), 800);
    }
  },

  // --- BARCODE SCANNER KAMERA ANDROID ---
  openBarcodeScanner() {
    const modal = document.getElementById('barcode-scanner-modal');
    if (modal) modal.classList.remove('hidden');

    this.startCameraScanner();
  },

  closeBarcodeScanner() {
    this.stopCameraScanner();
    const modal = document.getElementById('barcode-scanner-modal');
    if (modal) modal.classList.add('hidden');
  },

  async startCameraScanner() {
    const video = document.getElementById('scanner-video');
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = stream;
      this.state.scannerStream = stream;
      this.state.isScannerActive = true;

      // Cek apakah browser mendukung BarcodeDetector API natif (Android Chrome)
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a']
        });

        const detectFrame = async () => {
          if (!this.state.isScannerActive) return;
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              this.handleScannedBarcode(code);
              return;
            }
          } catch (err) {}
          requestAnimationFrame(detectFrame);
        };
        detectFrame();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      document.getElementById('scanner-error-hint')?.classList.remove('hidden');
    }
  },

  stopCameraScanner() {
    this.state.isScannerActive = false;
    if (this.state.scannerStream) {
      this.state.scannerStream.getTracks().forEach(track => track.stop());
      this.state.scannerStream = null;
    }
  },

  handleScannedBarcode(code) {
    this.playBeep('item');
    this.triggerHaptic(60);
    this.closeBarcodeScanner();

    // Cari produk dengan barcode ini
    const prod = window.warungDB.getProductByBarcode(code);
    if (prod) {
      this.addToCart(prod.id);
      this.showToast(`Ditemukan: ${prod.name}`, 'success');
    } else {
      // Jika tidak ada di keranjang, mungkin ingin ditambahkan ke input barcode
      const manualInput = document.getElementById('prod-form-barcode');
      if (manualInput) {
        manualInput.value = code;
        this.showToast(`Barcode ${code} terbaca!`, 'info');
      } else {
        this.showToast(`Barcode ${code} belum terdaftar di produk warung!`, 'warning');
      }
    }
  },

  manualBarcodeSubmit() {
    const input = document.getElementById('manual-barcode-input');
    const code = input?.value.trim();
    if (code) {
      this.handleScannedBarcode(code);
      if (input) input.value = '';
    }
  },

  // --- TOKO ONLINE LINK ---
  openOnlineStorefront() {
    window.open('./online-store.html', '_blank');
  },

  // --- HELPERS ---
  formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-emerald-800 text-white border border-emerald-600' :
      type === 'warning' ? 'bg-amber-800 text-white border border-amber-600' :
      'bg-gray-900 text-white border border-gray-700'
    }`;
    toast.classList.remove('opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2800);
  }
};

// Start application when DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA ServiceWorker registered:', reg.scope))
      .catch(err => console.log('PWA ServiceWorker failed:', err));
  }
});
