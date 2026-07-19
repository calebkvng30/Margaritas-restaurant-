
// ============ NAV / SCROLL / REVEAL ============
try {
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });

  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  navToggle.addEventListener('click', () => {
    siteNav.classList.toggle('open');
  });
  siteNav.querySelectorAll('a, .account-btn').forEach(el => {
    el.addEventListener('click', () => siteNav.classList.remove('open'));
  });

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} catch (err) {
  console.error('Nav/reveal script failed:', err);
}

// ============ CART ============
// Exposes window.MargaritasCart so the auth block can hook into it
// even if this block or the auth block individually fail.
try {
  const WHATSAPP_NUMBER = '27514363729';
  const cart = {}; // { name: { price, qty } }

  const cartTrigger = document.getElementById('cartTrigger');
  const cartCount = document.getElementById('cartCount');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartClose = document.getElementById('cartClose');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCheckout = document.getElementById('cartCheckout');

  function openCart(){
    cartOverlay.classList.add('open');
    cartDrawer.classList.add('open');
  }
  function closeCart(){
    cartOverlay.classList.remove('open');
    cartDrawer.classList.remove('open');
  }
  cartTrigger.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  function addToCart(name, price){
    if (!cart[name]) cart[name] = { price, qty: 0 };
    cart[name].qty += 1;
    renderCart();
  }
  function changeQty(name, delta){
    if (!cart[name]) return;
    cart[name].qty += delta;
    if (cart[name].qty <= 0) delete cart[name];
    renderCart();
  }
  function removeItem(name){
    delete cart[name];
    renderCart();
  }

  function renderCart(){
    const names = Object.keys(cart);
    const totalCount = names.reduce((sum, n) => sum + cart[n].qty, 0);
    const totalPrice = names.reduce((sum, n) => sum + cart[n].qty * cart[n].price, 0);

    cartCount.textContent = totalCount;
    cartTrigger.classList.toggle('empty', totalCount === 0);
    cartTotalEl.textContent = 'R ' + totalPrice;

    if (names.length === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Nothing added yet — tap the <strong>+</strong> next to any dish to start an order.</p>';
    } else {
      cartItemsEl.innerHTML = names.map(name => {
        const item = cart[name];
        const lineTotal = item.price * item.qty;
        return `
          <div class="cart-item">
            <span class="ci-name">${name}</span>
            <span class="ci-line-price">R ${lineTotal}</span>
            <div class="ci-controls">
              <button class="qty-btn" data-action="dec" data-name="${name}" aria-label="Decrease quantity">&minus;</button>
              <span class="ci-qty">${item.qty}</span>
              <button class="qty-btn" data-action="inc" data-name="${name}" aria-label="Increase quantity">+</button>
              <button class="ci-remove" data-action="remove" data-name="${name}">Remove</button>
            </div>
          </div>`;
      }).join('');
    }

    // Build WhatsApp checkout link (includes customer info if logged in)
    const user = window.MargaritasAuth && window.MargaritasAuth.getCurrentUser
      ? window.MargaritasAuth.getCurrentUser() : null;

    let message = "Hi Margaritas, I'd like to place an order:\n";
    names.forEach(name => {
      const item = cart[name];
      message += `- ${item.qty}x ${name} (R${item.price} each)\n`;
    });
    message += `\nTotal: R${totalPrice}`;
    if (user) {
      message += `\n\nName: ${user.name}\nPhone: ${user.phone}`;
    }
    message += `\n\nPlease confirm delivery or collection.`;
    cartCheckout.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dish = btn.closest('.dish');
      const name = dish.dataset.name;
      const price = parseFloat(dish.dataset.price);
      addToCart(name, price);
      btn.classList.add('bumped');
      setTimeout(() => btn.classList.remove('bumped'), 180);
      openCart();
    });
  });

  cartItemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const name = btn.dataset.name;
    const action = btn.dataset.action;
    if (action === 'inc') changeQty(name, 1);
    if (action === 'dec') changeQty(name, -1);
    if (action === 'remove') removeItem(name);
  });

  // Gate checkout behind login, once auth block is ready
  cartCheckout.addEventListener('click', (e) => {
    const auth = window.MargaritasAuth;
    if (auth && !auth.getCurrentUser()) {
      e.preventDefault();
      auth.requireLoginThenCheckout(cartCheckout.href);
    }
  });

  window.MargaritasCart = { renderCart, openCart };
  renderCart();
} catch (err) {
  console.error('Cart script failed:', err);
}

// ============ AUTH (front-end only, in-memory for this session) ============
try {
  const users = [];       // { name, email, phone, password }
  let currentUser = null;
  let pendingCheckout = false;

  const authOverlay = document.getElementById('authOverlay');
  const authModal = document.getElementById('authModal');
  const authClose = document.getElementById('authClose');
  const accountBtn = document.getElementById('accountBtn');
  const accountBtnLabel = document.getElementById('accountBtnLabel');

  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const accountPanel = document.getElementById('accountPanel');
  const authTabsEl = document.querySelector('.auth-tabs');
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');

  function openAuthModal(view){
    authOverlay.classList.add('open');
    authModal.classList.add('open');
    showAuthView(currentUser ? 'account' : (view || 'login'));
  }
  function closeAuthModal(){
    authOverlay.classList.remove('open');
    authModal.classList.remove('open');
  }
  function showAuthView(view){
    tabLogin.classList.toggle('active', view === 'login');
    tabSignup.classList.toggle('active', view === 'signup');
    loginForm.classList.toggle('active', view === 'login');
    signupForm.classList.toggle('active', view === 'signup');
    accountPanel.style.display = view === 'account' ? 'flex' : 'none';
    loginForm.style.display = view === 'account' ? 'none' : (view === 'login' ? 'flex' : 'none');
    signupForm.style.display = view === 'account' ? 'none' : (view === 'signup' ? 'flex' : 'none');
    if (authTabsEl) authTabsEl.style.display = view === 'account' ? 'none' : 'flex';
    loginError.classList.remove('show');
    signupError.classList.remove('show');
  }

  accountBtn.addEventListener('click', () => openAuthModal('login'));
  authClose.addEventListener('click', () => { closeAuthModal(); pendingCheckout = false; });
  authOverlay.addEventListener('click', () => { closeAuthModal(); pendingCheckout = false; });
  tabLogin.addEventListener('click', () => showAuthView('login'));
  tabSignup.addEventListener('click', () => showAuthView('signup'));
  document.getElementById('goSignup').addEventListener('click', () => showAuthView('signup'));
  document.getElementById('goLogin').addEventListener('click', () => showAuthView('login'));

  function updateAccountUI(){
    if (currentUser) {
      accountBtn.classList.add('logged-in');
      accountBtnLabel.textContent = currentUser.name.split(' ')[0] || 'Account';
      document.getElementById('accountName').textContent = currentUser.name;
      document.getElementById('accountEmail').textContent = currentUser.email;
      document.getElementById('accountPhone').textContent = currentUser.phone;
    } else {
      accountBtn.classList.remove('logged-in');
      accountBtnLabel.textContent = 'Log In';
    }
    if (window.MargaritasCart) window.MargaritasCart.renderCart();
  }

  function afterAuthSuccess(){
    updateAccountUI();
    if (pendingCheckout) {
      pendingCheckout = false;
      closeAuthModal();
      // Re-read the freshly rebuilt href (renderCart() just ran via updateAccountUI)
      const link = document.getElementById('cartCheckout');
      window.open(link.href, '_blank');
    } else {
      showAuthView('account');
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const match = users.find(u => u.email === email && u.password === password);
    if (!match) {
      loginError.textContent = 'No account matches that email and password.';
      loginError.classList.add('show');
      return;
    }
    currentUser = match;
    loginForm.reset();
    afterAuthSuccess();
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
      signupError.textContent = 'Password should be at least 6 characters.';
      signupError.classList.add('show');
      return;
    }
    if (users.some(u => u.email === email)) {
      signupError.textContent = 'An account with that email already exists — try logging in.';
      signupError.classList.add('show');
      return;
    }
    const newUser = { name, phone, email, password };
    users.push(newUser);
    currentUser = newUser;
    signupForm.reset();
    afterAuthSuccess();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    updateAccountUI();
    closeAuthModal();
  });

  window.MargaritasAuth = {
    getCurrentUser: () => currentUser,
    requireLoginThenCheckout: () => {
      pendingCheckout = true;
      openAuthModal('login');
    }
  };
} catch (err) {
  console.error('Auth script failed:', err);
}
