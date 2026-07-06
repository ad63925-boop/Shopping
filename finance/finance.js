// Финансовый модуль: экран, операции, кошельки и категории
const financeDb = firebase.database().ref('finance');

const financeState = {
  initialized: false,
  view: 'dashboard',
  wallets: [],
  categories: [],
  transactions: [],
  currencies: ['RUP', 'RUR', 'USD', 'EUR', 'MDL'],
  exchangeRates: {},
  searchQuery: ''
};

function initFinanceModule() {
  if (financeState.initialized) return;
  renderFinanceScreen();
  setupFinanceEvents();
  loadFinanceData();
  financeState.initialized = true;
}

function renderFinanceScreen() {
  const container = document.getElementById('financeScreen');
  if (!container) return;
  container.innerHTML = `
    <div class="finance-header">
      <h2>Finance</h2>
      <button id="financeCloseBtn" class="finance-close-btn">✖</button>
    </div>
    <div class="finance-panel-tabs">
      <button id="financeNavDashboard" class="active">Обзор</button>
      <button id="financeNavWallets">Счета</button>
      <button id="financeNavIncome">Доходы</button>
      <button id="financeNavExpenses">Расходы</button>
      <button id="financeNavTransfers">Переводы</button>
      <button id="financeNavHistory">История</button>
    </div>
    <div id="financePanel-dashboard" class="finance-panel"></div>
    <div id="financePanel-wallets" class="finance-panel hidden"></div>
    <div id="financePanel-income" class="finance-panel hidden"></div>
    <div id="financePanel-expenses" class="finance-panel hidden"></div>
    <div id="financePanel-transfers" class="finance-panel hidden"></div>
    <div id="financePanel-history" class="finance-panel hidden"></div>
  `;
}

function loadFinanceScreen() {
  const screen = document.getElementById('financeScreen');
  if (!screen) return;
  screen.classList.remove('hidden');
  screen.classList.add('open');
  //document.getElementById('mainAppScreen')?.classList.add('hidden');
}

function closeFinanceScreen() {
  const screen = document.getElementById('financeScreen');
  if (!screen) return;
  screen.classList.remove('open');
  screen.classList.add('hidden');
  document.getElementById('mainAppScreen')?.classList.remove('hidden');
}

function setupFinanceEvents() {
  document.getElementById('financeCloseBtn')?.addEventListener('click', closeFinanceScreen);
  document.getElementById('financeNavDashboard')?.addEventListener('click', () => showFinancePanel('dashboard'));
  document.getElementById('financeNavWallets')?.addEventListener('click', () => showFinancePanel('wallets'));
  document.getElementById('financeNavIncome')?.addEventListener('click', () => showFinancePanel('income'));
  document.getElementById('financeNavExpenses')?.addEventListener('click', () => showFinancePanel('expenses'));
  document.getElementById('financeNavTransfers')?.addEventListener('click', () => showFinancePanel('transfers'));
  document.getElementById('financeNavHistory')?.addEventListener('click', () => showFinancePanel('history'));
}

function openFinanceModule() {
  initFinanceModule();
  loadFinanceScreen();
  showFinancePanel('dashboard');
}

function toggleFinanceModule() {
  const screen = document.getElementById('financeScreen');
  if (!screen) return openFinanceModule();
  if (screen.classList.contains('open')) {
    closeFinanceScreen();
  } else {
    openFinanceModule();
  }
}

document.getElementById('financeBtn')?.addEventListener('click', toggleFinanceModule);

function loadFinanceData() {
  financeDb.on('value', snapshot => {
    const data = snapshot.val() || {};
    financeState.wallets = data.wallets ? Object.entries(data.wallets).map(([id, value]) => ({ id, ...value })) : [];
    financeState.categories = data.categories ? Object.entries(data.categories).map(([id, value]) => ({ id, ...value })) : [];
    financeState.transactions = data.transactions ? Object.entries(data.transactions).map(([id, value]) => ({ id, ...value })) : [];
    financeState.exchangeRates = data.exchangeRates || {};
    ensureFinanceDefaults();
    renderFinancePanel();
  });
}

function ensureFinanceDefaults() {
  if (!financeState.exchangeRates || Object.keys(financeState.exchangeRates).length === 0) {
    const defaultRates = { RUP: 1, RUR: 0.95, USD: 90, EUR: 100, MDL: 4.5 };
    financeDb.child('exchangeRates').set(defaultRates);
    financeState.exchangeRates = defaultRates;
  }

  if (financeState.categories.length === 0) {
    const defaultCategories = [
      { name: 'Зарплата', type: 'income', color: '#22c55e' },
      { name: 'Подарок', type: 'income', color: '#0ea5e9' },
      { name: 'Продукты', type: 'expense', color: '#ef4444' },
      { name: 'Транспорт', type: 'expense', color: '#f97316' },
      { name: 'Развлечения', type: 'expense', color: '#6366f1' }
    ];
    const payload = {};
    defaultCategories.forEach((cat, index) => {
      payload[`cat-${index + 1}`] = cat;
    });
    financeDb.child('categories').set(payload);
    financeState.categories = Object.entries(payload).map(([id, value]) => ({ id, ...value }));
  }
}

function saveFinanceNode(node, payload) {
  return financeDb.child(node).set(payload);
}

function showFinancePanel(panel) {
  financeState.view = panel;
  document.querySelectorAll('.finance-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`financePanel-${panel}`)?.classList.remove('hidden');
  document.querySelectorAll('.finance-panel-tabs button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`financeNav${panel.charAt(0).toUpperCase() + panel.slice(1)}`)?.classList.add('active');
  renderFinancePanel();
}

function renderFinancePanel() {
  renderFinanceDashboard();
  renderFinanceWallets();
  renderFinanceIncome();
  renderFinanceExpenses();
  renderFinanceTransfers();
  renderFinanceHistory();
}

function renderFinanceDashboard() {
  const panel = document.getElementById('financePanel-dashboard');
  if (!panel) return;
  const balance = financeState.wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
  const income = financeState.transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const expenses = financeState.transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  panel.innerHTML = `
    <div class="finance-dashboard-grid">
      <div class="finance-dashboard-card"><strong>Баланс</strong><span>${balance.toFixed(2)}</span></div>
      <div class="finance-dashboard-card"><strong>Доход</strong><span>${income.toFixed(2)}</span></div>
      <div class="finance-dashboard-card"><strong>Расход</strong><span>${expenses.toFixed(2)}</span></div>
    </div>
  `;
}

function renderFinanceWallets() {
  const panel = document.getElementById('financePanel-wallets');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-buttons-row">
      <button onclick="addFinanceWallet()">Добавить кошелек</button>
      <button onclick="addFinanceCategory()">Добавить категорию</button>
    </div>
    <div id="financeWalletList"></div>
    <div id="financeCategoryList"></div>
  `;
  const list = document.getElementById('financeWalletList');
  list.innerHTML = financeState.wallets.map(wallet => `
    <div class="finance-item-card">
      <div><strong>${wallet.name}</strong></div>
      <div>${wallet.type || 'Кошелек'} — ${wallet.currency} ${Number(wallet.balance || 0).toFixed(2)}</div>
      <div class="finance-item-actions">
        <button onclick="editFinanceWallet('${wallet.id}')">✎</button>
        <button onclick="removeFinanceWallet('${wallet.id}')">🗑</button>
      </div>
    </div>
  `).join('');
  const categoryList = document.getElementById('financeCategoryList');
  categoryList.innerHTML = `
    <div class="finance-category-section">
      <button type="button" id="financeCategoryToggle" class="finance-category-toggle" aria-expanded="false">
        <span>Категории</span>
        <span class="finance-category-toggle-icon">▸</span>
      </button>
      <div id="financeCategoryContent" class="finance-category-content hidden">
        ${financeState.categories.map(cat => `
          <div class="finance-item-card">
            <div><span class="finance-category-swatch" style="background:${cat.color || '#4f46e5'}"></span> ${cat.name}</div>
            <div>${cat.type}</div>
            <div class="finance-item-actions">
              <button onclick="editFinanceCategory('${cat.id}')">✎</button>
              <button onclick="removeFinanceCategory('${cat.id}')">🗑</button>
            </div>
          </div>
        `).join('') || '<div class="finance-item-card">Категорий пока нет</div>'}
      </div>
    </div>
  `;

  const categoryToggle = document.getElementById('financeCategoryToggle');
  const categoryContent = document.getElementById('financeCategoryContent');
  if (categoryToggle && categoryContent) {
    categoryToggle.addEventListener('click', () => {
      const isHidden = categoryContent.classList.toggle('hidden');
      categoryToggle.setAttribute('aria-expanded', String(!isHidden));
      categoryToggle.classList.toggle('expanded', !isHidden);
    });
  }
}

function renderFinanceIncome() {
  const panel = document.getElementById('financePanel-income');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-form">
      <div class="form-row">
        <input id="incomeName" type="text" placeholder="Название дохода">
        <select id="incomeCurrency"></select>
      </div>
      <div class="form-row">
        <select id="incomeWallet"></select>
        <select id="incomeCategory"></select>
      </div>
      <div class="form-row">
        <input id="incomeAmount" type="number" placeholder="Сумма">
        <input id="incomeDate" type="date" value="${new Date().toISOString().slice(0, 10)}">
      </div>
      <textarea id="incomeComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('income')">Сохранить доход</button>
    </div>
    <div id="financeTransactionListIncome"></div>
  `;
  fillFinanceTransactionSelects('income');
  renderFinanceTransactionList('income', 'financeTransactionListIncome');
}

function renderFinanceExpenses() {
  const panel = document.getElementById('financePanel-expenses');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-form">
      <div class="form-row">
        <input id="expenseName" type="text" placeholder="Название расхода">
        <select id="expenseCurrency"></select>
      </div>
      <div class="form-row">
        <select id="expenseWallet"></select>
        <select id="expenseCategory"></select>
      </div>
      <div class="form-row">
        <input id="expenseAmount" type="number" placeholder="Сумма">
        <input id="expenseDate" type="date" value="${new Date().toISOString().slice(0, 10)}">
      </div>
      <textarea id="expenseComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('expense')">Сохранить расход</button>
    </div>
    <div id="financeTransactionListExpense"></div>
  `;
  fillFinanceTransactionSelects('expense');
  renderFinanceTransactionList('expense', 'financeTransactionListExpense');
}

function renderFinanceTransfers() {
  const panel = document.getElementById('financePanel-transfers');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-form">
      <div class="form-row">
        <select id="transferFrom"></select>
        <select id="transferTo"></select>
      </div>
      <div class="form-row">
        <select id="transferCurrency"></select>
        <input id="transferAmount" type="number" placeholder="Сумма">
      </div>
      <div class="form-row-full">
        <input id="transferDate" type="date" value="${new Date().toISOString().slice(0, 10)}">
      </div>
      <textarea id="transferComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('transfer')">Сохранить перевод</button>
    </div>
    <div id="financeTransferPreview"></div>
  `;
  fillFinanceTransactionSelects('transfer');
}

function renderFinanceHistory() {
  const panel = document.getElementById('financePanel-history');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-search-row">
      <input id="financeSearchInput" placeholder="Поиск по операциям...">
    </div>
    <div id="financeHistoryList"></div>
  `;
  const input = document.getElementById('financeSearchInput');
  if (input) {
    input.oninput = event => {
      financeState.searchQuery = event.target.value.toLowerCase();
      renderFinanceHistory();
    };
    input.value = financeState.searchQuery;
  }
  const list = document.getElementById('financeHistoryList');
  const filtered = financeState.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(tx => {
      const query = financeState.searchQuery;
      if (!query) return true;
      return [tx.name, tx.comment, tx.category, tx.type, tx.currency].some(field => String(field || '').toLowerCase().includes(query));
    });
  const rows = filtered.map(tx => {
    const walletText = tx.type === 'transfer'
      ? `${tx.fromWalletName || ''}${tx.fromWalletName && tx.toWalletName ? ' → ' : ''}${tx.toWalletName || ''}`
      : tx.walletName || '';
    return `
      <div class="finance-item-card">
        <div><strong>${tx.type === 'transfer' ? 'Перевод' : tx.type === 'income' ? 'Доход' : 'Расход'}</strong></div>
        <div>${walletText}</div>
        <div>${tx.currency} ${Number(tx.amount || 0).toFixed(2)}</div>
        <div>${tx.category || '-'}</div>
        <div>${tx.comment || ''}</div>
        <div>${new Date(tx.date).toLocaleString()}</div>
      </div>
    `;
  }).join('');
  list.innerHTML = rows;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!amount) return 0;
  if (fromCurrency === toCurrency) return Number(amount);
  const rates = financeState.exchangeRates;
  const fromRate = Number(rates[fromCurrency] || 1);
  const toRate = Number(rates[toCurrency] || 1);
  return Number(amount) * (toRate / fromRate);
}

function fillFinanceTransactionSelects(type) {
  const currencySelect = document.getElementById(`${type}Currency`) || document.getElementById('transferCurrency');
  const walletSelect = document.getElementById(`${type}Wallet`);
  const categorySelect = document.getElementById(`${type}Category`);
  const fromSelect = document.getElementById('transferFrom');
  const toSelect = document.getElementById('transferTo');

  if (currencySelect) {
    currencySelect.innerHTML = financeState.currencies.map(cur => `<option value="${cur}">${cur}</option>`).join('');
  }
  if (walletSelect) {
    walletSelect.innerHTML = financeState.wallets.map(wallet => `<option value="${wallet.id}">${wallet.name} (${wallet.currency})</option>`).join('');
  }
  if (categorySelect) {
    categorySelect.innerHTML = financeState.categories
      .filter(cat => cat.type === type)
      .map(cat => `<option value="${cat.id}">${cat.name}</option>`) 
      .join('');
  }
  if (fromSelect && toSelect) {
    const html = financeState.wallets.map(wallet => `<option value="${wallet.id}">${wallet.name} (${wallet.currency})</option>`).join('');
    fromSelect.innerHTML = html;
    toSelect.innerHTML = html;
    const transferCurrency = document.getElementById('transferCurrency');
    if (transferCurrency) {
      transferCurrency.innerHTML = financeState.currencies.map(cur => `<option value="${cur}">${cur}</option>`).join('');
    }
  }
}

function renderFinanceTransactionList(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = financeState.transactions
    .filter(tx => tx.type === type)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = list.map(tx => `
    <div class="finance-item-card">
      <div><strong>${tx.name || (type === 'income' ? 'Доход' : 'Расход')}</strong></div>
      <div>${tx.walletName || ''}</div>
      <div>${tx.currency} ${Number(tx.amount || 0).toFixed(2)}</div>
      <div>${tx.category || '-'}</div>
      <div>${tx.comment || ''}</div>
      <div>${new Date(tx.date).toLocaleString()}</div>
    </div>
  `).join('');
}

function addFinanceWallet() {
  const name = prompt('Название кошелька/карты/счета');
  if (!name) return;
  const type = prompt('Тип (Кошелек/Карта/Счет)', 'Кошелек') || 'Кошелек';
  const currency = prompt('Валюта (RUP,RUR,USD,EUR,MDL)', 'RUP') || 'RUP';
  const balance = Number(prompt('Баланс', '0') || 0);
  const id = `wallet-${Date.now()}`;
  const wallet = { name, type, currency, balance };
  const payload = financeState.wallets.reduce((acc, item) => ({ ...acc, [item.id]: { name: item.name, type: item.type, currency: item.currency, balance: item.balance } }), {});
  payload[id] = wallet;
  financeDb.child('wallets').set(payload);
}

function addFinanceCategory() {
  const name = prompt('Название категории');
  if (!name) return;
  const type = prompt('Тип категории (income/expense)', 'expense') || 'expense';
  const color = prompt('Цвет категории в HEX', '#4f46e5') || '#4f46e5';
  const id = `category-${Date.now()}`;
  const payload = financeState.categories.reduce((acc, item) => ({ ...acc, [item.id]: { name: item.name, type: item.type, color: item.color } }), {});
  payload[id] = { name, type, color };
  financeDb.child('categories').set(payload);
}

function editFinanceWallet(id) {
  const wallet = financeState.wallets.find(item => item.id === id);
  if (!wallet) return;
  const name = prompt('Название кошелька/карты/счета', wallet.name) || wallet.name;
  const type = prompt('Тип (Кошелек/Карта/Счет)', wallet.type || 'Кошелек') || wallet.type;
  const currency = prompt('Валюта (RUP,RUR,USD,EUR,MDL)', wallet.currency) || wallet.currency;
  const balance = Number(prompt('Баланс', wallet.balance) || wallet.balance);
  const payload = financeState.wallets.reduce((acc, item) => ({ ...acc, [item.id]: item.id === id ? { name, type, currency, balance } : { name: item.name, type: item.type, currency: item.currency, balance: item.balance } }), {});
  financeDb.child('wallets').set(payload);
}

function removeFinanceWallet(id) {
  const payload = financeState.wallets.reduce((acc, wallet) => {
    if (wallet.id !== id) acc[wallet.id] = { name: wallet.name, type: wallet.type, currency: wallet.currency, balance: wallet.balance };
    return acc;
  }, {});
  financeDb.child('wallets').set(payload);
}

function editFinanceCategory(id) {
  const category = financeState.categories.find(item => item.id === id);
  if (!category) return;
  const name = prompt('Название категории', category.name) || category.name;
  const type = prompt('Тип категории (income/expense)', category.type) || category.type;
  const color = prompt('Цвет категории в HEX', category.color || '#4f46e5') || category.color;
  const payload = financeState.categories.reduce((acc, item) => ({ ...acc, [item.id]: item.id === id ? { name, type, color } : { name: item.name, type: item.type, color: item.color } }), {});
  financeDb.child('categories').set(payload);
}

function removeFinanceCategory(id) {
  const payload = financeState.categories.reduce((acc, cat) => {
    if (cat.id !== id) acc[cat.id] = { name: cat.name, type: cat.type, color: cat.color };
    return acc;
  }, {});
  financeDb.child('categories').set(payload);
}

function saveFinanceTransaction(type) {
  const amountInput = document.getElementById(`${type === 'income' ? 'incomeAmount' : type === 'expense' ? 'expenseAmount' : 'transferAmount'}`);
  const amount = Number(amountInput?.value || 0);
  const currency = document.getElementById(`${type === 'income' ? 'incomeCurrency' : type === 'expense' ? 'expenseCurrency' : 'transferCurrency'}`)?.value || 'RUP';
  const comment = document.getElementById(`${type === 'income' ? 'incomeComment' : type === 'expense' ? 'expenseComment' : 'transferComment'}`)?.value || '';
  const date = document.getElementById(`${type === 'income' ? 'incomeDate' : type === 'expense' ? 'expenseDate' : 'transferDate'}`)?.value || new Date().toISOString();

  if (amount <= 0) {
    alert('Сумма должна быть больше 0');
    return;
  }

  if (type === 'transfer') {
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;
    if (!fromId || !toId || fromId === toId) {
      alert('Выберите разные счета для перевода');
      return;
    }
    const fromWallet = financeState.wallets.find(item => item.id === fromId);
    const toWallet = financeState.wallets.find(item => item.id === toId);
    if (!fromWallet || !toWallet) return;
    const fromAmount = convertCurrency(amount, currency, fromWallet.currency);
    const toAmount = convertCurrency(amount, currency, toWallet.currency);
    const updatedWallets = financeState.wallets.reduce((acc, wallet) => {
      if (wallet.id === fromWallet.id) {
        acc[wallet.id] = { ...wallet, balance: Number(wallet.balance || 0) - fromAmount };
      } else if (wallet.id === toWallet.id) {
        acc[wallet.id] = { ...wallet, balance: Number(wallet.balance || 0) + toAmount };
      } else {
        acc[wallet.id] = { ...wallet };
      }
      return acc;
    }, {});
    financeDb.child('wallets').set(updatedWallets);
    const txId = `tx-${Date.now()}`;
    const transaction = {
      id: txId,
      name: 'Перевод',
      type: 'transfer',
      amount,
      currency,
      comment,
      date,
      fromWalletId: fromWallet.id,
      fromWalletName: fromWallet.name,
      toWalletId: toWallet.id,
      toWalletName: toWallet.name
    };
    const payload = financeState.transactions.reduce((acc, tx) => ({ ...acc, [tx.id]: tx }), {});
    payload[txId] = transaction;
    financeDb.child('transactions').set(payload);
    alert('Перевод сохранен');
    renderFinanceTransfers();
    renderFinanceHistory();
    return;
  }

  const name = document.getElementById(`${type === 'income' ? 'incomeName' : 'expenseName'}`)?.value || (type === 'income' ? 'Доход' : 'Расход');
  const walletId = document.getElementById(`${type === 'income' ? 'incomeWallet' : 'expenseWallet'}`)?.value;
  const categoryId = document.getElementById(`${type === 'income' ? 'incomeCategory' : 'expenseCategory'}`)?.value;
  const wallet = financeState.wallets.find(item => item.id === walletId);
  const category = financeState.categories.find(item => item.id === categoryId);
  if (!wallet) {
    alert('Выберите кошелек');
    return;
  }
  const payloadWallets = financeState.wallets.reduce((acc, item) => {
    if (item.id === wallet.id) {
      const delta = type === 'income' ? amount : -amount;
      acc[item.id] = { ...item, balance: Number(item.balance || 0) + delta };
    } else {
      acc[item.id] = { ...item };
    }
    return acc;
  }, {});
  financeDb.child('wallets').set(payloadWallets);
  const txId = `tx-${Date.now()}`;
  const transaction = {
    id: txId,
    name,
    type,
    amount,
    currency,
    comment,
    date,
    walletId: wallet.id,
    walletName: wallet.name,
    category: category ? category.name : '',
    categoryId: category?.id || ''
  };
  const payload = financeState.transactions.reduce((acc, tx) => ({ ...acc, [tx.id]: tx }), {});
  payload[txId] = transaction;
  financeDb.child('transactions').set(payload);
  alert(type === 'income' ? 'Доход сохранен' : 'Расход сохранен');
  renderFinanceTransactionList(type, type === 'income' ? 'financeTransactionListIncome' : 'financeTransactionListExpense');
  renderFinanceHistory();
}
