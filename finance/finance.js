//-----------КНОПКИ--------------
document.addEventListener('DOMContentLoaded', () => {
  // Закрытие экрана финансов
  const closeBtn = document.getElementById('financeCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('financeScreen').classList.add('hidden');
      // тут можно сбросить состояние financeState.view и т.д.
    });
  }

  // Переключение вкладок (пример для одной, остальные по аналогии)
  const tabs = [
    { btnId: 'financeNavDashboard', panelId: 'financePanel-dashboard' },
    { btnId: 'financeNavWallets', panelId: 'financePanel-wallets' },
    { btnId: 'financeNavIncome', panelId: 'financePanel-income' },
    { btnId: 'financeNavExpenses', panelId: 'financePanel-expenses' },
    { btnId: 'financeNavTransfers', panelId: 'financePanel-transfers' },
    { btnId: 'financeNavCategories', panelId: 'financePanel-categories' },
    { btnId: 'financeNavHistory', panelId: 'financePanel-history' }
  ];

  // Функция для парсинга даты транзакции
  function parseTxDate(dateValue) {
  // Если уже Date — возвращаем как есть
  if (dateValue instanceof Date) return dateValue;

  // Если timestamp (число) — конвертируем
  if (typeof dateValue === 'number') return new Date(dateValue);

  // Если ISO строка "2026-07-12T14:30:00" — new Date() справится
  if (typeof dateValue === 'string') {
    // Формат "ДД.ММ.ГГГГ"
    const parts = dateValue.split('.');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    // Любой другой строковый формат — доверяем конструктору Date
    return new Date(dateValue);
  }

  return new Date(); // fallback
}

  tabs.forEach(({ btnId, panelId }) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', () => {
      // убираем active у всех кнопок вкладок
      document.querySelectorAll('.finance-panel-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // скрываем все панели
      document.querySelectorAll('.finance-panel').forEach(p => p.classList.add('hidden'));
      // показываем нужную
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');

      // можно обновить financeState.view здесь
    });
  });

  // Кнопки действий: Добавить кошелек / категорию
  const addWalletBtn = document.getElementById('btnAddWallet');
  const addCategoryBtn = document.getElementById('btnAddCategory');

  if (addWalletBtn) {
    addWalletBtn.addEventListener('click', addFinanceWallet);
  }
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addFinanceCategory);
  }

  // Сохранение: Доход
  const saveIncomeBtn = document.getElementById('btnSaveIncome');
  if (saveIncomeBtn) {
    saveIncomeBtn.addEventListener('click', () => saveFinanceTransaction('income'));
  }

  // Сохранение: Расход
  const saveExpenseBtn = document.getElementById('btnSaveExpense');
  if (saveExpenseBtn) {
    saveExpenseBtn.addEventListener('click', () => saveFinanceTransaction('expense'));
  }

  // Сохранение: Перевод
  const saveTransferBtn = document.getElementById('btnSaveTransfer');
  if (saveTransferBtn) {
    saveTransferBtn.addEventListener('click', () => saveFinanceTransaction('transfer'));
  }
});

//-----------------------------------------------------------

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
  searchQuery: '',
  historyFilters: {
    walletId: 'all',
    date: '',
    startDate: '',
    endDate: ''
  }
};

// Функция для инициализации финансового модуля
function initFinanceModule() {
  if (financeState.initialized) return;
  renderFinanceScreen();
  initFinanceTabs();
  setupFinanceEvents();
  loadFinanceData();
  financeState.initialized = true;
}

//Функция для рендеринга экрана финансового модуля
function renderFinanceScreen() {
  const container = document.getElementById('financeScreen');
  if (!container) return;
  container.innerHTML = `
    <div class="finance-header">
      <h2 ">Finance_Pro</h2>
      <button id="financeCloseBtn" class="finance-close-btn">✖</button>
    </div>
    <div class="finance-panel-tabs">
      <button id="financeNavDashboard" class="active">Обзор</button>
      <button id="financeNavWallets">Счета</button>
      <button id="financeNavIncome">Доходы</button>
      <button id="financeNavExpenses">Расходы</button>
      <button id="financeNavTransfers">Переводы</button>
      <button id="financeNavCategories">Категории</button>
      <button id="financeNavHistory">История</button>
    </div>
    <div id="financePanel-dashboard" class="finance-panel"></div>
    <div id="financePanel-wallets" class="finance-panel hidden"></div>
    <div id="financePanel-income" class="finance-panel hidden"></div>
    <div id="financePanel-expenses" class="finance-panel hidden"></div>
    <div id="financePanel-transfers" class="finance-panel hidden"></div>
    <div id="financePanel-categories" class="finance-panel hidden"></div>
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

//Функция для установки событий на кнопки финансового модуля
function setupFinanceEvents() {
  document.getElementById('financeCloseBtn')?.addEventListener('click', closeFinanceScreen);
  
  const setupTabScroll = (btnId, panelId, view) => {
    const btn = document.getElementById(btnId);
    btn?.addEventListener('click', () => {
      showFinancePanel(view);
      setTimeout(() => {
        document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  };
  document.getElementById('financeCloseBtn')?.addEventListener('click', closeFinanceScreen);
  document.getElementById('financeNavDashboard')?.addEventListener('click', () => showFinancePanel('dashboard'));
  document.getElementById('financeNavWallets')?.addEventListener('click', () => showFinancePanel('wallets'));
  document.getElementById('financeNavIncome')?.addEventListener('click', () => showFinancePanel('income'));
  document.getElementById('financeNavExpenses')?.addEventListener('click', () => showFinancePanel('expenses'));
  document.getElementById('financeNavTransfers')?.addEventListener('click', () => showFinancePanel('transfers'));
  document.getElementById('financeNavCategories')?.addEventListener('click', () => showFinancePanel('categories'));
  document.getElementById('financeNavHistory')?.addEventListener('click', () => showFinancePanel('history'));
}

//Функция для открытия финансового модуля
function openFinanceModule() {
  initFinanceModule();
  loadFinanceScreen();
  showFinancePanel('dashboard');
}

// Функция для переключения состояния финансового модуля
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

//загрузка данных финансового модуля из Firebase
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

//Функция для обеспечения наличия данных по умолчанию в финансовом модуле
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

//Функция для сохранения данных в Firebase
function saveFinanceNode(node, payload) {
  return financeDb.child(node).set(payload);
}

//Функция для отображения выбранной панели финансового модуля
function showFinancePanel(panel) {
  financeState.view = panel;
  document.querySelectorAll('.finance-panel').forEach(el => el.classList.add('hidden'));
  document.getElementById(`financePanel-${panel}`)?.classList.remove('hidden');
  document.querySelectorAll('.finance-panel-tabs button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`financeNav${panel.charAt(0).toUpperCase() + panel.slice(1)}`)?.classList.add('active');
  renderFinancePanel();
}

//Функция для рендеринга финансового дашборда, кошельков, доходов, расходов, переводов и истории
function renderFinancePanel() {
  renderFinanceDashboard();
  renderFinanceWallets();
  renderFinanceIncome();
  renderFinanceExpenses();
  renderFinanceTransfers();
  renderFinanceCategories();
  renderFinanceHistory();
}

//Функция для экранирования HTML-символов в строке
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[tag]));
}

//Функция для удаления финансового кошелька


//Функция для рендеринга финансового дашборда, кошельков, доходов, расходов, переводов и истории
function renderFinanceDashboard() {
  const panel = document.getElementById('financePanel-dashboard');
  if (!panel) return;
  const balance = financeState.wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
  const income = financeState.transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const expenses = financeState.transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  panel.innerHTML = `
    <div class="finance-section-title"><span>Обзор</span></div>
    <div class="finance-dashboard-grid">
      <div class="finance-dashboard-card"><strong>Баланс</strong><span>${balance.toFixed(2)}</span></div>
      <div class="finance-dashboard-card"><strong>Доход</strong><span>${income.toFixed(2)}</span></div>
      <div class="finance-dashboard-card"><strong>Расход</strong><span>${expenses.toFixed(2)}</span></div>
    </div>
  `;
}

//Функция для рендеринга финансовых кошельков
function renderFinanceWallets() {
  const panel = document.getElementById('financePanel-wallets');
  if (!panel) return;

  panel.innerHTML = `
    <div class="finance-section-title"><span>Кошельки</span></div>

    <div id="financeWalletList"></div>

        <div class="finance-buttons-row">
      <button onclick="showAddWalletForm()">➕ Добавить кошелёк</button>
    </div>
  `;

  const list = document.getElementById('financeWalletList');
  if (!list) return;

  list.innerHTML = financeState.wallets.map(wallet => {
    const balance = Number(wallet.balance || 0);
    const colorClass = balance >= 0 ? 'text-green' : 'text-red';
    const hasTransactions = financeState.transactions.some(t =>
      t.walletId === wallet.id || t.fromWalletId === wallet.id || t.toWalletId === wallet.id
    );

    return `
      <div class="finance-item-card">
        <div class="finance-wallet-header">
          <strong class="finance-wallet-name">${escapeHtml(wallet.name)}</strong>
          <span class="finance-wallet-type">(${wallet.type || 'Кошелёк'})</span>
        </div>
        <div class="finance-wallet-balance">
          ${wallet.currency || 'RUB'}
          <span class="${colorClass}" style="font-weight:700;">${balance.toFixed(2)}</span>
        </div>

        <div class="finance-item-actions">
          <button class="btn-edit-wallet" onclick="editFinanceWallet('${wallet.id}')">✎ Редактировать</button>
          <button 
            class="btn-delete-wallet ${hasTransactions ? 'btn-delete-disabled' : ''}" 
            onclick="removeFinanceWallet('${wallet.id}', ${hasTransactions})"
            ${hasTransactions ? 'disabled title="Есть транзакции — сначала перенесите или удалите их"' : ''}
          >
            🗑 Удалить
          </button>
        </div>
      </div>
    `;
  }).join('') || '<div class="finance-empty-state">Кошельков пока нет</div>';
}


//Функция для рендеринга финансовых  и категорий
//Функция для рендеринга финансовых кошельков и категорий
function renderFinanceCategories() {
    const panel = document.getElementById('financePanel-categories');
    if (!panel) return;

    // Разделяем категории на доходы и расходы
    const incomeCats = financeState.categories.filter(cat => cat.type === 'income');
    const expenseCats = financeState.categories.filter(cat => cat.type === 'expense');

    // Формируем HTML для доходов
    const incomeHtml = incomeCats.map(cat => `
        <div class="finance-item-card">
            <div>
                <span class="finance-category-swatch" style="background:${cat.color || '#22c55e'}"></span> ${cat.name}
            </div>
            <div>${cat.type}</div>
            <div class="finance-item-actions">
                <button style="background: #2563eb;" onclick="editFinanceCategory('${cat.id}')">✎ Редактировать</button>
                <button style="background: #dc2626;" onclick="removeFinanceCategory('${cat.id}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('') || '<div class="finance-item-card">Нет категорий доходов</div>';

    // Формируем HTML для расходов
    const expenseHtml = expenseCats.map(cat => `
        <div class="finance-item-card">
            <div>
                <span class="finance-category-swatch" style="background:${cat.color || '#ef4444'}"></span> ${cat.name}
            </div>
            <div>${cat.type}</div>
            <div class="finance-item-actions">
                <button style="background: #2563eb;" onclick="editFinanceCategory('${cat.id}')">✎ Редактировать</button>
                <button style="background: #dc2626;" onclick="removeFinanceCategory('${cat.id}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('') || '<div class="finance-item-card">Нет категорий расходов</div>';

    // Обновляем HTML панели
    panel.innerHTML = `
        <div class="finance-section-title"><span>Категории</span></div>
        
        <!-- Секция Доходов -->
        <div class="finance-category-section">
            <h3 style="color: #22c55e; margin: 10px 0 5px;">Категории Доходов</h3>
            <button type="button" id="financeCategoryToggleIncome" class="finance-category-toggle" aria-expanded="false">
                <span>Доходы</span>
                <span class="finance-category-toggle-icon">▸</span>
            </button>
            <div id="financeCategoryContentIncome" class="finance-category-content hidden">
                ${incomeHtml}
            </div>
        </div>

        <!-- Секция Расходов -->
        <div class="finance-category-section">
            <h3 style="color: #dc2626; margin: 10px 0 5px;">Категории Расходов</h3>
            <button type="button" id="financeCategoryToggleExpense" class="finance-category-toggle" aria-expanded="false">
                <span>Расходы</span>
                <span class="finance-category-toggle-icon">▸</span>
            </button>
            <div id="financeCategoryContentExpense" class="finance-category-content hidden">
                ${expenseHtml}
            </div>
        </div>

        <div class="finance-buttons-row" style="margin-top: 20px;">
            <button class="finance-category-income-add" onclick="addFinanceCategory('income')" style="background: #22c55e; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">Добавить категорию дохода</button>
            <button class="finance-category-expense-add" onclick="addFinanceCategory('expense')" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">Добавить категорию расхода</button>
        </div>
    `;

    // Логика сворачивания/разворачивания для Доходов
    const toggleIncome = document.getElementById('financeCategoryToggleIncome');
    const contentIncome = document.getElementById('financeCategoryContentIncome');
    if (toggleIncome && contentIncome) {
        toggleIncome.addEventListener('click', () => {
            const isHidden = contentIncome.classList.toggle('hidden');
            toggleIncome.setAttribute('aria-expanded', String(!isHidden));
            toggleIncome.classList.toggle('expanded', !isHidden);
            const icon = toggleIncome.querySelector('.finance-category-toggle-icon');
            if (icon) icon.textContent = isHidden ? '▸' : '▼';
        });
    }

    // Логика сворачивания/разворачивания для Расходов
    const toggleExpense = document.getElementById('financeCategoryToggleExpense');
    const contentExpense = document.getElementById('financeCategoryContentExpense');
    if (toggleExpense && contentExpense) {
        toggleExpense.addEventListener('click', () => {
            const isHidden = contentExpense.classList.toggle('hidden');
            toggleExpense.setAttribute('aria-expanded', String(!isHidden));
            toggleExpense.classList.toggle('expanded', !isHidden);
            const icon = toggleExpense.querySelector('.finance-category-toggle-icon');
            if (icon) icon.textContent = isHidden ? '▸' : '▼';
        });
    }
}


//Функция для рендеринга финансовых доходов
function renderFinanceIncome() {
  const panel = document.getElementById('financePanel-income');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-section-title"><span style="color: green;">Доходы</span></div>
    <div class="finance-form">
      <div class="form-row">
        <input id="incomeName" type="text" placeholder="Название дохода">
      </div>
      <div class="form-row">
        <select id="incomeWallet"></select>
        <select id="incomeCategory"></select>
      </div>
      <div class="form-row">
        <input id="incomeAmount" type="number" placeholder="Сумма">
        <input id="incomeDate" type="date" value="">
      </div>
      <textarea id="incomeComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('income')">Создать доход</button>
    </div>
    
  `;
  fillFinanceTransactionSelects('income');
  renderFinanceTransactionList('income', 'financeTransactionListIncome');
}


//Функция для рендеринга финансовых расходов
function renderFinanceExpenses() {
  const panel = document.getElementById('financePanel-expenses');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-section-title"><span style="color: #dc2626;">Расходы</span></div>
    <div class="finance-form">
      <div class="form-row">
        <input id="expenseName" type="text" placeholder="Название расхода">
      </div>
      <div class="form-row">
        <select id="expenseWallet"></select>
        <select id="expenseCategory"></select>
      </div>
      <div class="form-row">
        <input id="expenseAmount" type="number" placeholder="Сумма">
        <input id="expenseDate" type="date" value="" required>
      </div>
      <textarea id="expenseComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('expense')">Создать расход</button>
    </div>
  `;
  fillFinanceTransactionSelects('expense');
  renderFinanceTransactionList('expense', 'financeTransactionListExpense');
}

//Функция для рендеринга финансовых переводов
function renderFinanceTransfers() {
  const panel = document.getElementById('financePanel-transfers');
  if (!panel) return;
  panel.innerHTML = `
    <div class="finance-section-title"><span style="color: #2563eb;">Переводы</span></div>
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
        <input id="transferDate" type="date" value="" required>
      </div>
      <textarea id="transferComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('transfer')">Создать перевод</button>
    </div>
    <div id="financeTransferPreview"></div>
  `;
  fillFinanceTransactionSelects('transfer');
}

//Функция для фильтрации финансовых транзакций по поисковому запросу, кошельку и дате
function getFilteredFinanceTransactions() {
  const query = financeState.searchQuery.trim().toLowerCase();
  const walletId = financeState.historyFilters.walletId;
  const selectedDate = financeState.historyFilters.date;
  const startDate = financeState.historyFilters.startDate;
  const endDate = financeState.historyFilters.endDate;

  return financeState.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(tx => {
      if (walletId !== 'all') {
        if (tx.type === 'transfer') {
          const isFrom = String(tx.fromWalletId) === String(walletId);
          const isTo = String(tx.toWalletId) === String(walletId);
          if (!isFrom && !isTo) return false;
        } else if (String(tx.walletId) !== String(walletId)) {
          return false;
        }
      }

      if (selectedDate) {
        const txDate = new Date(tx.date).toISOString().slice(0, 10);
        if (txDate !== selectedDate) return false;
      }

      if (startDate || endDate) {
        const txDate = new Date(tx.date).toISOString().slice(0, 10);
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
      }

      if (!query) return true;
      return [tx.name, tx.comment, tx.category, tx.type, tx.currency, tx.walletName, tx.fromWalletName, tx.toWalletName]
        .some(field => String(field || '').toLowerCase().includes(query));
    });
}

//Функция для применения финансовой транзакции к кошелькам
function revertFinanceTransactionFromWallets(wallets, tx) {
  return wallets.map(wallet => {
    if (tx.type === 'transfer') {
      if (wallet.id === tx.fromWalletId) {
        const amount = convertCurrency(Number(tx.amount || 0), tx.currency, wallet.currency);
        return { ...wallet, balance: Number(wallet.balance || 0) + amount };
      }
      if (wallet.id === tx.toWalletId) {
        const amount = convertCurrency(Number(tx.amount || 0), tx.currency, wallet.currency);
        return { ...wallet, balance: Number(wallet.balance || 0) - amount };
      }
      return { ...wallet };
    }

    if (wallet.id === tx.walletId) {
      const delta = tx.type === 'income' ? -Number(tx.amount || 0) : Number(tx.amount || 0);
      return { ...wallet, balance: Number(wallet.balance || 0) + delta };
    }
    return { ...wallet };
  });
}

//Функция для применения финансовой транзакции к кошелькам
function applyFinanceTransactionToWallets(wallets, tx) {
  return wallets.map(wallet => {
    if (tx.type === 'transfer') {
      if (wallet.id === tx.fromWalletId) {
        const amount = convertCurrency(Number(tx.amount || 0), tx.currency, wallet.currency);
        return { ...wallet, balance: Number(wallet.balance || 0) - amount };
      }
      if (wallet.id === tx.toWalletId) {
        const amount = convertCurrency(Number(tx.amount || 0), tx.currency, wallet.currency);
        return { ...wallet, balance: Number(wallet.balance || 0) + amount };
      }
      return { ...wallet };
    }

    if (wallet.id === tx.walletId) {
      const delta = tx.type === 'income' ? Number(tx.amount || 0) : -Number(tx.amount || 0);
      return { ...wallet, balance: Number(wallet.balance || 0) + delta };
    }
    return { ...wallet };
  });
}

//Функция для построения полезной нагрузки для финансовых кошельков
function buildFinanceWalletPayload(wallets) {
  return wallets.reduce((acc, wallet) => {
    acc[wallet.id] = {
      name: wallet.name,
      type: wallet.type,
      currency: wallet.currency,
      balance: Number(wallet.balance || 0)
    };
    return acc;
  }, {});
}

//Функция для построения полезной нагрузки для финансовых транзакций
// ГАРАНТИРОВАННО РАБОЧИЙ ВАРИАНТ ФУНКЦИИ
function buildFinanceTransactionsPayload(transactionsArray) {
  console.log("[Payload Builder] Сборка транзакций для Firebase из массива:", transactionsArray);
  
  // Защита: если передан пустой или некорректный аргумент, берем текущий стейт
  const list = transactionsArray || financeState.transactions;
  
  return list.reduce((acc, tx) => {
    if (!tx.id) return acc;
    
    // Формируем чистый объект для каждой транзакции, исключая мусорные свойства DOM
    acc[tx.id] = {
      id: tx.id,
      name: tx.name || '',
      type: tx.type,
      amount: Number(tx.amount), // Принудительно приводим к числу перед отправкой
      currency: tx.currency,
      comment: tx.comment || '',
      date: tx.date
    };

    // Добавляем специфичные поля в зависимости от типа операции
    if (tx.type === 'transfer') {
      acc[tx.id].fromWalletId = tx.fromWalletId;
      acc[tx.id].fromWalletName = tx.fromWalletName;
      acc[tx.id].toWalletId = tx.toWalletId;
      acc[tx.id].toWalletName = tx.toWalletName;
    } else {
      acc[tx.id].walletId = tx.walletId;
      acc[tx.id].walletName = tx.walletName;
      acc[tx.id].categoryId = tx.categoryId || '';
      acc[tx.id].category = tx.category || '';
    }

    return acc;
  }, {});
}



// Функция для получения ключа даты в формате YYYY-MM-DD для группировки транзакций
function getLocalDateKey(dateValue) {
  const d = parseTxDate(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Функция для рендеринга карточки финансовых транзакций
function renderFinanceHistoryList() {
  const listContainer = document.getElementById('financeHistoryList');
  if (!listContainer) return;

  const transactions = getFilteredFinanceTransactions();

  // Группируем по дате (YYYY-MM-DD)
  const grouped = {};
  transactions.forEach(tx => {
    const d = parseTxDate(tx.date);
    const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });

  // Сортируем даты по убыванию: сначала новые дни
  const sortedDates = Object.keys(grouped).sort().reverse();

  let html = '';

  if (sortedDates.length === 0) {
    html = '<div class="finance-empty-state">Нет транзакций по выбранным фильтрам</div>';
  } else {
    sortedDates.forEach(dateKey => {
      const dateObj = new Date(dateKey);
      const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Сортируем транзакции внутри дня по убыванию (новые первыми)
      const sortedTxs = grouped[dateKey].sort((a, b) => {
        const da = parseTxDate(a.date).getTime();
        const db = parseTxDate(b.date).getTime();
        return db - da; // обратный порядок: новые раньше
      });

      html += `
        <div class="finance-history-date-header">
          ----- ${formattedDate} -----
        </div>
        <div class="finance-history-group">
          ${sortedTxs.map(tx => renderTransactionListItem(tx)).join('')}
        </div>
      `;
    });
  }

  listContainer.innerHTML = html;
}

//Функция для рендеринга панели со всеми карточками истории финансовых транзакций
function renderFinanceHistory() {
  const panel = document.getElementById('financePanel-history');
  if (!panel) return;

  panel.innerHTML = `
    <div class="finance-section-title"><span>История транзакций</span></div>

    <div class="finance-history-filters">
      <div class="finance-filter-group">
        <label for="financeHistoryAccount">По счетам</label>
        <select id="financeHistoryAccount">
          <option value="all">Все счета</option>
          ${financeState.wallets.map(wallet => `
            <option value="${wallet.id}" ${financeState.historyFilters.walletId === wallet.id ? 'selected' : ''}>
              ${wallet.name} (${wallet.currency})
            </option>
          `).join('')}
        </select>
      </div>
      <div class="finance-filter-group">
        <label for="financeHistoryDate">По дате</label>
        <input id="financeHistoryDate" type="date" value="${financeState.historyFilters.date || ''}">
      </div>
      <div class="finance-filter-group">
        <label for="financeHistoryStartDate">Период с</label>
        <input id="financeHistoryStartDate" type="date" value="${financeState.historyFilters.startDate || ''}">
      </div>
      <div class="finance-filter-group">
        <label for="financeHistoryEndDate">Период по</label>
        <input id="financeHistoryEndDate" type="date" value="${financeState.historyFilters.endDate || ''}">
      </div>
    </div>

    <div class="finance-search-row">
      <input id="financeSearchInput" placeholder="Поиск по операциям..." value="${financeState.searchQuery}">
    </div>

    <div id="financeHistoryList"></div>
  `;

  // Поиск
  const input = document.getElementById('financeSearchInput');
  if (input) {
    input.oninput = event => {
      financeState.searchQuery = event.target.value.toLowerCase();
      renderFinanceHistoryList();
    };
  }

  // Фильтры
  const accountSelect = document.getElementById('financeHistoryAccount');
  if (accountSelect) {
    accountSelect.onchange = event => {
      financeState.historyFilters.walletId = event.target.value;
      renderFinanceHistoryList();
    };
  }

  const dateInput = document.getElementById('financeHistoryDate');
  if (dateInput) {
    dateInput.onchange = event => {
      financeState.historyFilters.date = event.target.value;
      renderFinanceHistoryList();
    };
  }

  const startDateInput = document.getElementById('financeHistoryStartDate');
  if (startDateInput) {
    startDateInput.onchange = event => {
      financeState.historyFilters.startDate = event.target.value;
      renderFinanceHistoryList();
    };
  }

  const endDateInput = document.getElementById('financeHistoryEndDate');
  if (endDateInput) {
    endDateInput.onchange = event => {
      financeState.historyFilters.endDate = event.target.value;
      renderFinanceHistoryList();
    };
  }

  renderFinanceHistoryList();
}

//Функция для рендеринга списка финансовых транзакций с группировкой по дате
function renderFinanceHistoryList() {
  const listContainer = document.getElementById('financeHistoryList');
  if (!listContainer) return;

  const transactions = getFilteredFinanceTransactions();

  // Группируем по дате (YYYY-MM-DD)
  const grouped = {};
  transactions.forEach(tx => {
    const date = new Date(tx.date).toISOString().slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(tx);
  });

  // Сортируем даты по убыванию
  const sortedDates = Object.keys(grouped).sort().reverse();

  let html = '';

  if (sortedDates.length === 0) {
    html = '<div class="finance-empty-state">Нет транзакций по выбранным фильтрам</div>';
  } else {
    sortedDates.forEach(date => {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      html += `
        <div class="finance-history-date-header">
          ${formattedDate}
        </div>
        <div class="finance-history-group">
          ${grouped[date].map(tx => renderTransactionListItem(tx)).join('')}
        </div>
      `;
    });
  }

  listContainer.innerHTML = html;
}

//Функция для рендеринга элемента списка финансовых транзакций
function renderTransactionListItem(tx, isEditing = false) {
  let icon = '💵';
  let sign = '';
  if (tx.type === 'income') { icon = '➕'; sign = '+'; }
  else if (tx.type === 'expense') { icon = '➖'; sign = '-'; }
  else if (tx.type === 'transfer') { icon = '🔄'; sign = '='; }

  let sourceName = '';
  if (tx.type === 'transfer') {
    const fromWallet = financeState.wallets.find(w => w.id === tx.fromWalletId)?.name || 'Неизвестный счёт';
    const toWallet = financeState.wallets.find(w => w.id === tx.toWalletId)?.name || 'Неизвестный счёт';
    sourceName = `(${fromWallet} → ${toWallet})`;
  } else {
    const wallet = financeState.wallets.find(w => w.id === tx.walletId)?.name || 'Неизвестный счёт';
    sourceName = `(${wallet})`;
  }

  const categoryName = tx.category || '';
  const commentPreview = (tx.comment || '').length > 40
    ? (tx.comment.substring(0, 40) + '…')
    : (tx.comment || '');

  // Если этот элемент сейчас РЕДАКТИРУЕТСЯ прямо в списке
  if (isEditing) {
    return `
      <div class="finance-transaction-item editing-mode" data-id="${tx.id}">
        <div class="finance-tx-edit-container" style="padding: 10px; background: #f9fafb; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; color: #374151;">Редактирование операции</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Сумма</label>
              <input type="number" id="inline-amount-${tx.id}" value="${tx.amount}" step="0.01" style="width:100%; padding:4px;">
            </div>
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Валюта</label>
              <select id="inline-currency-${tx.id}" style="width:100%; padding:4px;">
                ${financeState.currencies.map(c => `<option value="${c}" ${c === tx.currency ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>

          ${tx.type !== 'transfer' ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Счёт</label>
              <select id="inline-wallet-${tx.id}" style="width:100%; padding:4px;">
                ${financeState.wallets.map(w => `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${w.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Категория</label>
              <select id="inline-category-${tx.id}" style="width:100%; padding:4px;">
                ${financeState.categories.filter(c => c.type === tx.type).map(c => `<option value="${c.id}" ${c.name === tx.category ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          ` : `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Откуда</label>
              <select id="inline-from-${tx.id}" style="width:100%; padding:4px;">
                ${financeState.wallets.map(w => `<option value="${w.id}" ${w.id === tx.fromWalletId ? 'selected' : ''}>${w.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 0.75rem; color: #6b7280;">Куда</label>
              <select id="inline-to-${tx.id}" style="width:100%; padding:4px;">
                ${financeState.wallets.map(w => `<option value="${w.id}" ${w.id === tx.toWalletId ? 'selected' : ''}>${w.name}</option>`).join('')}
              </select>
            </div>
          </div>
          `}

          <div style="margin-bottom: 8px;">
            <label style="font-size: 0.75rem; color: #6b7280;">Комментарий</label>
            <input type="text" id="inline-comment-${tx.id}" value="${escapeHtml(tx.comment || '')}" style="width:100%; padding:4px;">
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="saveInlineEdit('${tx.id}')" style="background:#22c55e; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Сохранить</button>
            <button onclick="renderFinanceHistoryList()" style="background:#9ca3af; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Отмена</button>
          </div>
        </div>
      </div>
    `;
  }

  // Обычный режим просмотра (добавлена кнопка "Редактировать" и "Удалить" вниз)
  return `
    <div class="finance-transaction-item" data-id="${tx.id}" onclick="toggleTransactionDetails(this, event)">
      <div class="finance-tx-summary">
        ${icon} ${sourceName} ${categoryName ? '<span class="finance-tx-category">' + categoryName + '</span>' : ''}
        <span class="finance-tx-amount ${tx.type === 'income' ? 'text-green' : 'text-red'}">
          ${sign} ${Number(tx.amount || 0).toFixed(2)} ${tx.currency || ''}
        </span>
      </div>
      ${commentPreview ? `<div class="finance-tx-comment-preview">💬 ${commentPreview}</div>` : ''}
      
      <div class="finance-tx-details hidden">
        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e5e7eb;">
        <div><strong>Тип:</strong> ${tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод'}</div>
        ${tx.type === 'transfer'
          ? `
            <div><strong>От:</strong> ${financeState.wallets.find(w => w.id === tx.fromWalletId)?.name || '—'}</div>
            <div><strong>Кому:</strong> ${financeState.wallets.find(w => w.id === tx.toWalletId)?.name || '—'}</div>
          `
          : `
            <div><strong>Счёт:</strong> ${financeState.wallets.find(w => w.id === tx.walletId)?.name || '—'}</div>
          `}
        <div><strong>Категория:</strong> ${tx.category || 'Без категории'}</div>
        <div><strong>Дата:</strong> ${new Date(tx.date).toLocaleString('ru-RU')}</div>
        <div><strong>Комментарий:</strong> <em>${tx.comment || 'Нет комментария'}</em></div>
        
        <div class="finance-tx-actions" style="margin-top: 10px; display: flex; gap: 8px;">
          <button onclick="startInlineEdit('${tx.id}', event)" style="background:#2563eb; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">✎ Редактировать</button>
          <button onclick="removeFinanceTransaction('${tx.id}')" style="background:#dc2626; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">🗑 Удалить</button>
        </div>
      </div>
    </div>
  `;
}

//Функция для переключения видимости деталей транзакции
function toggleTransactionDetails(element, event) {
  // Если кликнули на кнопку или инпут внутри карточки — не сворачиваем её
  if (event.target.closest('button') || event.target.closest('.finance-tx-edit-container')) return;

  const details = element.querySelector('.finance-tx-details');
  if (!details) return;
  details.classList.toggle('hidden');
}

//Функция для сохранения изменений транзакции после редактирования
function saveInlineEdit(id) {
  console.log(`%c[Inline Save] Начало сохранения изменений для транзакции ID: ${id}`, 'color: #0284c7; font-weight: bold;');

  // 1. Поиск исходной транзакции
  const tx = financeState.transactions.find(item => item.id === id);
  if (!tx) {
    console.error(`[Inline Save Error] Исходная трансакция с ID "${id}" не найдена в financeState.transactions!`);
    return;
  }
  console.log("[Inline Save] Исходный объект транзакции до изменений:", { ...tx });

  // 2. Сбор базовых данных из инпутов инлайн-формы
  const amountEl = document.getElementById(`inline-amount-${id}`);
  const currencyEl = document.getElementById(`inline-currency-${id}`);
  const commentEl = document.getElementById(`inline-comment-${id}`);

  if (!amountEl || !currencyEl || !commentEl) {
    console.error("[Inline Save Error] Не удалось найти базовые инпуты редактирования в DOM!", {
      amountEl, currencyEl, commentEl
    });
    return;
  }

  const amount = Number(amountEl.value || 0);
  const currency = currencyEl.value;
  const comment = commentEl.value.trim();

  console.log("[Inline Save] Считанные базовые данные:", { amount, currency, comment });

  if (amount <= 0) {
    console.warn(`[Inline Save Validation] Некорректная сумма: ${amount}. Остановка сохранения.`);
    Swal.fire({
      icon: 'warning',
      title: 'Некорректная сумма',
      text: 'Сумма должна быть больше 0',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

  let updatedTx = { ...tx, amount, currency, comment };

  // 3. Сбор специфичных данных в зависимости от типа транзакции
  if (tx.type === 'transfer') {
    const fromEl = document.getElementById(`inline-from-${id}`);
    const toEl = document.getElementById(`inline-to-${id}`);

    if (!fromEl || !toEl) {
      console.error("[Inline Save Error] Не найдены инпуты счетов (from/to) для перевода в DOM!");
      return;
    }

    const fromId = fromEl.value;
    const toId = toEl.value;
    console.log("[Inline Save] Считанные счета для перевода:", { fromId, toId });

    if (fromId === toId) {
      console.warn("[Inline Save Validation] Совпадают счета отправления и получения. Остановка.");
      Swal.fire({
        icon: 'warning',
        title: 'Проверьте счета',
        text: 'Выберите разные счета для перевода',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
    
    const fromWallet = financeState.wallets.find(w => w.id === fromId);
    const toWallet = financeState.wallets.find(w => w.id === toId);
    
    updatedTx.fromWalletId = fromId;
    updatedTx.fromWalletName = fromWallet ? fromWallet.name : '';
    updatedTx.toWalletId = toId;
    updatedTx.toWalletName = toWallet ? toWallet.name : '';

  } else {
    const walletEl = document.getElementById(`inline-wallet-${id}`);
    const categoryEl = document.getElementById(`inline-category-${id}`);

    if (!walletEl || !categoryEl) {
      console.error("[Inline Save Error] Не найдены инпуты кошелька или категории в DOM!");
      return;
    }

    const walletId = walletEl.value;
    const categoryId = categoryEl.value;
    console.log("[Inline Save] Считанные кошелек и категория:", { walletId, categoryId });

    const wallet = financeState.wallets.find(w => w.id === walletId);
    const category = financeState.categories.find(c => c.id === categoryId);

    updatedTx.walletId = walletId;
    updatedTx.walletName = wallet ? wallet.name : '';
    updatedTx.categoryId = categoryId;
    updatedTx.category = category ? category.name : '';
  }

  console.log("[Inline Save] Сформирован измененный объект транзакции:", updatedTx);

  // 4. Пересчет балансов кошельков
  console.log("[Inline Save] Запуск пересчета балансов...");
  let cleanWallets, updatedWallets;
  
  try {
    cleanWallets = revertFinanceTransactionFromWallets(financeState.wallets.map(w => ({ ...w })), tx);
    console.log("[Inline Save] Балансы после отката старой транзакции:", cleanWallets);
    
    updatedWallets = applyFinanceTransactionToWallets(cleanWallets, updatedTx);
    console.log("[Inline Save] Итоговые балансы после наката новой транзакции:", updatedWallets);
  } catch (calcErr) {
    console.error("[Inline Save Critical Error] Ошибка в функциях пересчета баланса (revert/apply):", calcErr);
    return;
  }

  // 5. Обновление локального стейта
  financeState.wallets = updatedWallets;
  financeState.transactions = financeState.transactions.map(item => item.id === id ? updatedTx : item);
  console.log("[Inline Save] Локальное состояние financeState успешно обновлено.");

  // 6. Синхронизация пачкой с Firebase Realtime Database
  console.log("[Inline Save] Отправка данных в Firebase...");
  
  const walletsPayload = buildFinanceWalletPayload(updatedWallets);
  const transactionsPayload = buildFinanceTransactionsPayload(financeState.transactions);

  Promise.all([
    financeDb.child('wallets').set(walletsPayload),
    financeDb.child('transactions').set(transactionsPayload)
  ])
  .then(() => {
    console.log(`%c[Inline Save Success] Данные успешно сохранены в Firebase для ID: ${id}`, 'color: #10b981; font-weight: bold;');
    
    Swal.fire({
      icon: 'success',
      title: 'Операция обновлена',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
    
    console.log("[Inline Save] Запуск полного перерендера интерфейса панели...");
    renderFinancePanel(); 
  })
  .catch(err => {
    console.error("[Inline Save Firebase Error] Сбой при записи пачки в Firebase:", err);
    Swal.fire({
      icon: 'error',
      title: 'Ошибка',
      text: 'Ошибка сохранения изменений в базу данных',
      confirmButtonColor: '#dc2626'
    });
  });
}


// Переключение конкретного элемента в режим редактирования с проверками
function startInlineEdit(id, event) {
  console.log(`%c[Inline Edit] Попытка входа в режим редактирования транзакции ID: ${id}`, 'color: #2563eb; font-weight: bold;');

  if (event) {
    console.log("[Inline Edit] Обнаружено событие клика. Вызываем stopPropagation().");
    event.stopPropagation(); // Стоп клик по родителю
  } else {
    console.warn("[Inline Edit Warning] Объект события (event) не был передан в функцию.");
  }
  
  // 1. Проверяем наличие транзакции в локальном состоянии
  const tx = financeState.transactions.find(item => item.id === id);
  if (!tx) {
    console.error(`[Inline Edit Error] Транзакция с ID "${id}" не найдена в массиве financeState.transactions!`, financeState.transactions);
    return;
  }
  console.log("[Inline Edit] Объект транзакции успешно найден в state:", tx);

  // 2. Ищем элемент в DOM-дереве
  const selector = `.finance-transaction-item[data-id="${id}"]`;
  const container = document.querySelector(selector);
  
  if (!container) {
    console.error(`[Inline Edit Error] Элемент не найден в DOM по селектору: "${selector}". Проверьте, добавлен ли атрибут data-id="${id}" к контейнеру карточки.`);
    return;
  }
  
  console.log("[Inline Edit] Текущий DOM-контейнер элемента успешно найден:", container);

  // 3. Проверяем существование функции рендеринга
  if (typeof renderTransactionListItem !== 'function') {
    console.error("[Inline Edit Error] Функция renderTransactionListItem не объявлена или не видна в данном контексте!");
    return;
  }

  // 4. Пробуем перерисовать элемент
  try {
    const editHtml = renderTransactionListItem(tx, true);
    
    if (!editHtml || typeof editHtml !== 'string') {
      console.warn("[Inline Edit Warning] Функция renderTransactionListItem вернула пустую строку или некорректный тип данных:", editHtml);
    }

    container.outerHTML = editHtml;
    console.log(`%c[Inline Edit Success] Элемент ${id} успешно перерисован в режим инпут-формы!`, 'color: #10b981; font-weight: bold;');
  } catch (error) {
    console.error("[Inline Edit Critical Error] Произошел сбой при выполнении renderTransactionListItem или замене outerHTML:", error);
  }
}

//Функция для конвертации валюты
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!amount) return 0;
  if (fromCurrency === toCurrency) return Number(amount);
  const rates = financeState.exchangeRates;
  const fromRate = Number(rates[fromCurrency] || 1);
  const toRate = Number(rates[toCurrency] || 1);
  return Number(amount) * (toRate / fromRate);
}


//Функция для заполнения селектов валют, кошельков и категорий в формах транзакций
function fillFinanceTransactionSelects(type) {
  const currencySelect = document.getElementById(`${type}Currency`) || document.getElementById('transferCurrency');
  const walletSelect = document.getElementById(`${type}Wallet`);
  const categorySelect = document.getElementById(`${type}Category`);
  const fromSelect = document.getElementById('transferFrom');
  const toSelect = document.getElementById('transferTo');

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

//Функция для рендеринга списка финансовых транзакций
function renderFinanceTransactionList(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = financeState.transactions
    .filter(tx => tx.type === type)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = list.map(tx => {
    const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
    const amountClass = tx.type === 'income'
      ? 'finance-amount-positive'
      : tx.type === 'expense'
        ? 'finance-amount-negative'
        : 'finance-amount-neutral';
    return `
      <div class="finance-item-card">
        <div><strong>${tx.name || (type === 'income' ? 'Доход' : 'Расход')}</strong></div>
        <div>${tx.walletName || ''}</div>
        <div class="${amountClass}">${sign}${tx.currency} ${Number(tx.amount || 0).toFixed(2)}</div>
        <div>${tx.category || '-'}</div>
        <div>${tx.comment || ''}</div>
        <div>${new Date(tx.date).toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

/*
//Функция для редактирования финансовой транзакции
function editFinanceTransaction(id) {
  const tx = financeState.transactions.find(item => item.id === id);
  if (!tx) return;

  if (tx.type === 'transfer') {
    const fromName = prompt('Счет отправления', tx.fromWalletName || '') || tx.fromWalletName || '';
    const toName = prompt('Счет получения', tx.toWalletName || '') || tx.toWalletName || '';
    const fromWallet = financeState.wallets.find(item => item.name === fromName) || financeState.wallets.find(item => item.id === tx.fromWalletId);
    const toWallet = financeState.wallets.find(item => item.name === toName) || financeState.wallets.find(item => item.id === tx.toWalletId);
    if (!fromWallet || !toWallet) {
      Swal.fire({
  icon: 'warning',
  title: 'Проверьте счета',
  text: 'Выберите разные счета для перевода',
  confirmButtonColor: '#2563eb'
});
      return;
    }

    const amount = Number(prompt('Сумма', tx.amount || '0') || 0);
    const currency = prompt('Валюта', tx.currency || 'RUP') || tx.currency || 'RUP';
    const date = prompt('Дата (YYYY-MM-DD)', tx.date ? tx.date.slice(0, 10) : '') || tx.date || new Date().toISOString().slice(0, 10);
    const comment = prompt('Комментарий', tx.comment || '') || tx.comment || '';

    if (amount <= 0) {
      Swal.fire({
  icon: 'warning',
  title: 'Некорректная сумма',
  text: 'Сумма должна быть больше 0',
  confirmButtonColor: '#2563eb'
});
      return;
    }

    const updatedWallets = applyFinanceTransactionToWallets(revertFinanceTransactionFromWallets(financeState.wallets.map(wallet => ({ ...wallet })), tx), {
      ...tx,
      amount,
      currency,
      date,
      comment,
      fromWalletId: fromWallet.id,
      fromWalletName: fromWallet.name,
      toWalletId: toWallet.id,
      toWalletName: toWallet.name
    });

    const updatedTx = {
      ...tx,
      amount,
      currency,
      date,
      comment,
      fromWalletId: fromWallet.id,
      fromWalletName: fromWallet.name,
      toWalletId: toWallet.id,
      toWalletName: toWallet.name
    };

    financeState.wallets = updatedWallets;
    financeState.transactions = financeState.transactions.map(item => item.id === id ? updatedTx : item);
    financeDb.child('wallets').set(buildFinanceWalletPayload(updatedWallets));
    financeDb.child('transactions').set(buildFinanceTransactionsPayload(financeState.transactions));
    renderFinancePanel();
    return;
  }

  const walletName = prompt('Кошелек', tx.walletName || '') || tx.walletName || '';
  const wallet = financeState.wallets.find(item => item.name === walletName) || financeState.wallets.find(item => item.id === tx.walletId);
  if (!wallet) {
    Swal.fire({
  icon: 'warning',
  title: 'Ошибка выбора',
  text: 'Выберите корректный кошелек',
  confirmButtonColor: '#2563eb'
});
    return;
  }

  const categoryName = prompt('Категория', tx.category || '') || tx.category || '';
  const category = financeState.categories.find(item => item.name === categoryName) || financeState.categories.find(item => item.id === tx.categoryId);
  const name = prompt('Название', tx.name || '') || tx.name || (tx.type === 'income' ? 'Доход' : 'Расход');
  const amount = Number(prompt('Сумма', tx.amount || '0') || 0);
  const currency = prompt('Валюта', tx.currency || 'RUP') || tx.currency || 'RUP';
  const date = prompt('Дата (YYYY-MM-DD)', tx.date ? tx.date.slice(0, 10) : '') || tx.date || new Date().toISOString().slice(0, 10);
  const comment = prompt('Комментарий', tx.comment || '') || tx.comment || '';

  if (amount <= 0) {
    Swal.fire({
  icon: 'warning',
  title: 'Некорректная сумма',
  text: 'Сумма должна быть больше 0',
  confirmButtonColor: '#2563eb'
});

Swal.fire({
  icon: 'warning',
  title: 'Проверьте счета',
  text: 'Выберите разные счета для перевода',
  confirmButtonColor: '#2563eb'
});
    return;
  }

  const updatedWallets = applyFinanceTransactionToWallets(revertFinanceTransactionFromWallets(financeState.wallets.map(wallet => ({ ...wallet })), tx), {
    ...tx,
    name,
    amount,
    currency,
    date,
    comment,
    walletId: wallet.id,
    walletName: wallet.name,
    category: category ? category.name : tx.category || '',
    categoryId: category ? category.id : tx.categoryId || ''
  });

  const updatedTx = {
    ...tx,
    name,
    amount,
    currency,
    date,
    comment,
    walletId: wallet.id,
    walletName: wallet.name,
    category: category ? category.name : tx.category || '',
    categoryId: category ? category.id : tx.categoryId || ''
  };

  financeState.wallets = updatedWallets;
  financeState.transactions = financeState.transactions.map(item => item.id === id ? updatedTx : item);
  financeDb.child('wallets').set(buildFinanceWalletPayload(updatedWallets));
  financeDb.child('transactions').set(buildFinanceTransactionsPayload(financeState.transactions));
  renderFinancePanel();
}*/

async function removeFinanceTransaction(id) {
  const tx = financeState.transactions.find(item => item.id === id);
  if (!tx) return;

  const result = await Swal.fire({
    title: 'Удалить операцию?',
    text: `Будет удалена транзакция на сумму ${tx.amount} ${tx.currency}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Удалить',
    cancelButtonText: 'Оставить'
  });

  if (result.isConfirmed) {
    const updatedWallets = revertFinanceTransactionFromWallets(financeState.wallets.map(wallet => ({ ...wallet })), tx);
    const nextTransactions = financeState.transactions.filter(item => item.id !== id);
    financeState.wallets = updatedWallets;
    financeState.transactions = nextTransactions;
    
    financeDb.child('wallets').set(buildFinanceWalletPayload(updatedWallets));
    financeDb.child('transactions').set(buildFinanceTransactionsPayload(nextTransactions));
    
    Swal.fire({
      icon: 'success',
      title: 'Удалено',
      timer: 1000,
      showConfirmButton: false
    });
    renderFinancePanel();
  }
}

function promptFinanceCurrency(defaultCurrency = 'RUP') {
  const currencies = financeState.currencies || ['RUP', 'RUR', 'USD', 'EUR', 'MDL'];
  const value = prompt(`Валюта (${currencies.join(', ')})`, defaultCurrency || 'RUP');
  if (!value) return defaultCurrency || 'RUP';

  const normalized = value.trim().toUpperCase();
  return currencies.includes(normalized) ? normalized : (defaultCurrency || 'RUP');
}

// Функция для отрисовки inline-формы добавления кошелька вместо prompt
function showAddWalletForm() {
  const container = document.getElementById('financeWalletList'); // Ваш ID контейнера кошельков
  if (!container) return;

  // Создаем блок формы
  const formHtml = `
    <div class="finance-item-card finance-wallet-add-box" style="background: #f9fafb; border: 2px dashed #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <h4 style="margin: 0 0 10px 0; font-size: 1rem; color: #1e293b;">Новый кошелек / счет</h4>
      
      <div style="margin-bottom: 8px;">
        <label style="display:block; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">Название</label>
        <input type="text" id="newWalletName" placeholder="Например, Карта **4455" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <div>
          <label style="display:block; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">Тип</label>
          <select id="newWalletType" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
            <option value="Кошелек">Кошелек</option>
            <option value="Карта">Карта</option>
            <option value="Счет">Счет</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">Валюта</label>
          <select id="newWalletCurrency" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
            ${(financeState.currencies || ['RUP', 'USD', 'EUR']).map(cur => `<option value="${cur}">${cur}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display:block; font-size: 0.8rem; color: #475569; margin-bottom: 2px;">Начальный баланс</label>
        <input type="number" id="newWalletBalance" value="0" step="0.01" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
      </div>

      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="saveFinanceWalletFromInput()" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Создать</button>
        <button onclick="renderFinanceWallets()" style="background: #64748b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Отмена</button>
      </div>
    </div>
  `;

  // Вставляем форму в начало списка кошельков
  container.insertAdjacentHTML('afterbegin', formHtml);
  
  // Плавно скроллим к форме добавления
  document.querySelector('.finance-wallet-add-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Функция сбора данных из инпутов и сохранения кошелька
function saveFinanceWalletFromInput() {
  const nameInput = document.getElementById('newWalletName');
  const typeSelect = document.getElementById('newWalletType');
  const currencySelect = document.getElementById('newWalletCurrency');
  const balanceInput = document.getElementById('newWalletBalance');

  const name = nameInput?.value.trim();
  const type = typeSelect?.value || 'Кошелек';
  const currency = currencySelect?.value || 'RUP';
  const balance = Number(balanceInput?.value || 0);

  if (!name) {
    Swal.fire({ icon: 'info', title: 'Заполните поле', text: 'Пожалуйста, введите название кошелька/счета' });
    if (nameInput) nameInput.focus();
    return;
  }

  const id = `wallet-${Date.now()}`;
  const wallet = { name, type, currency, balance };

  // Формируем payload на основе текущих кошельков в financeState
  const payload = financeState.wallets.reduce((acc, item) => {
    acc[item.id] = { 
      name: item.name, 
      type: item.type, 
      currency: item.currency, 
      balance: item.balance 
    };
    return acc;
  }, {});

  // Добавляем новый кошелек в объект отправки
  payload[id] = wallet;

  // Отправляем всю структуру в Firebase Realtime Database
// Отправляем всю структуру в Firebase Realtime Database
financeDb.child('wallets').set(payload)
  .then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Кошелек успешно добавлен!',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
    // renderFinanceWallets();
  })
  .catch(err => {
    console.error("Ошибка при создании кошелька:", err);
    Swal.fire({
      icon: 'error',
      title: 'Ошибка базы данных',
      text: 'Не удалось сохранить кошелек в базу данных.',
      confirmButtonColor: '#2563eb'
    });
  });
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

//Функция для редактирования финансового кошелька
function editFinanceWallet(walletId) {
  const wallet = financeState.wallets.find(w => w.id === walletId);
  if (!wallet) return;

  const card = document.querySelector(`.finance-item-card button[onclick*="'${walletId}'"]`).closest('.finance-item-card');
  if (!card) return;

  card.innerHTML = `
    <form class="finance-wallet-edit-form" onsubmit="handleWalletEdit(event, '${walletId}')">
      <div>
        <label>Название</label>
        <input type="text" id="walletName_${walletId}" value="${escapeHtml(wallet.name)}" required>
      </div>
      <div>
        <label>Тип</label>
        <select id="walletType_${walletId}">
          <option value="cash" ${wallet.type === 'cash' ? 'selected' : ''}>Наличные</option>
          <option value="card" ${wallet.type === 'card' ? 'selected' : ''}>Карта</option>
          <option value="account" ${wallet.type === 'account' ? 'selected' : ''}>Счёт</option>
        </select>
      </div>
      <div>
        <label>Валюта</label>
        <input type="text" id="walletCurrency_${walletId}" value="${wallet.currency || 'RUB'}" required>
      </div>
      <div>
        <label>Баланс (текущий)</label>
        <input type="number" id="walletBalance_${walletId}" step="0.01" value="${wallet.balance || 0}" readonly style="background:#f3f4f6;">
        <small style="color:#666;">Баланс лучше менять через транзакции, а не вручную.</small>
      </div>
      <div class="finance-wallet-form-actions">
        <button type="submit" class="btn-save">Сохранить</button>
        <button type="button" onclick="renderFinanceWallets()" class="btn-cancel">Отмена</button>
      </div>
    </form>
  `;
}

//Функция для обработки редактирования кошелька
async function handleWalletEdit(e, walletId) {
  e.preventDefault();

  const name = document.getElementById(`walletName_${walletId}`).value.trim();
  const type = document.getElementById(`walletType_${walletId}`).value;
  const currency = document.getElementById(`walletCurrency_${walletId}`).value.trim().toUpperCase();

  if (!name) {
    Swal.fire({
  icon: 'error',
  title: 'Упс...',
  text: 'Название кошелька обязательно.',
  confirmButtonColor: '#2563eb'
});
    return;
  }

  // Находим текущий кошелек, чтобы сохранить его баланс
  const wallet = financeState.wallets.find(w => w.id === walletId);
  if (!wallet) return;

  const updatedWallet = {
    name,
    type,
    currency,
    balance: Number(wallet.balance || 0) // сохраняем баланс неизменным
  };

  try {
    // Сохраняем в Realtime Database в ту же ветку 'finance/wallets/id'
    await financeDb.child('wallets').child(walletId).set(updatedWallet);
    Swal.fire({
  icon: 'success',
  title: 'Успешно!',
  text: 'Кошелёк обновлён.',
  timer: 1500,
  showConfirmButton: false
});
    
    // Рендеринг вызовется автоматически через подписку .on('value') в loadFinanceData
  } catch (err) {
    console.error(err);
    Swal.fire({
  icon: 'error',
  title: 'Упс...',
  text: 'Ошибка при сохранении кошелька.',
  confirmButtonColor: '#2563eb'
});
  }
}

//Функция для удаления финансового кошелька
async function removeFinanceWallet(walletId, hasTransactions) {
  if (hasTransactions) {
    Swal.fire({
      icon: 'warning',
      title: 'Внимание',
      text: 'Нельзя удалить кошелёк, по которому есть транзакции. Сначала удалите или перенесите операции.'
    });
    return;
  }

  // Красивое окно подтверждения
  const result = await Swal.fire({
    title: 'Вы уверены?',
    text: "Это действие нельзя будет отменить!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Да, удалить!',
    cancelButtonText: 'Отмена'
  });

  // Если пользователь подтвердил
  if (result.isConfirmed) {
    try {
      await financeDb.child('wallets').child(walletId).remove();
      Swal.fire({
        icon: 'success',
        title: 'Удалено!',
        text: 'Кошелёк успешно удалён.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Ошибка', text: 'Ошибка при удалении кошелька.' });
    }
  }
}

//Функция для удаления финансового кошелька
async function removeFinanceWallet(walletId, hasTransactions) {
  if (hasTransactions) {
    Swal.fire({
      icon: 'warning',
      title: 'Внимание',
      text: 'Нельзя удалить кошелёк, по которому есть транзакции. Сначала удалите или перенесите операции.'
    });
    return;
  }

  const confirmResult = await Swal.fire({
    title: 'Вы уверены?',
    text: "Это действие нельзя будет отменить!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Да, удалить!',
    cancelButtonText: 'Отмена'
  });
  if (!confirmResult.isConfirmed) return;

  try {
    // 1. Удалить из Firebase
    const db = firebase.firestore();
    await db.collection('wallets').doc(walletId).delete();

    // 2. Удалить локально
    financeState.wallets = financeState.wallets.filter(w => w.id !== walletId);

    renderFinanceWallets();
    renderFinanceHistoryList(); // если где-то отображаются кошельки
    Swal.fire({
      icon: 'success',
      title: 'Кошелёк удалён.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
  } catch (err) {
console.error(err);
    Swal.fire({
      icon: 'error',
      title: 'Ошибка удаления',
      text: 'Ошибка при удалении кошелька.',
      confirmButtonColor: '#dc2626'
    });
  }
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
  const comment = document.getElementById(`${type === 'income' ? 'incomeComment' : type === 'expense' ? 'expenseComment' : 'transferComment'}`)?.value || '';
  const date = document.getElementById(`${type === 'income' ? 'incomeDate' : type === 'expense' ? 'expenseDate' : 'transferDate'}`)?.value || '';

  // ПРОВЕРКА: если даты нет — показываем ошибку и прерываем
  if (!date) {

    Swal.fire({ 
      icon: 'warning', 
      title: 'Дата не указана', 
      text: 'Пожалуйста, выберите дату операции', 
      confirmButtonColor: '#2563eb' 
    });  

    document.getElementById(`${type === 'income' ? 'incomeDate' : type === 'expense' ? 'expenseDate' : 'transferDate'}`)?.focus();
    return; // прерываем функцию сохранения
  }

  if (amount <= 0) {
    Swal.fire({ icon: 'warning', title: 'Некорректная сумма', text: 'Сумма должна быть больше 0', confirmButtonColor: '#2563eb' });
    return;
  }

  // Логика для ПЕРЕВОДА (остается прежней, валюта берется из селекта)
  if (type === 'transfer') {
    const currency = document.getElementById('transferCurrency')?.value || 'RUP';
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;
    if (!fromId || !toId || fromId === toId) {
      Swal.fire({ icon: 'warning', title: 'Проверьте счета', text: 'Выберите разные счета для перевода', confirmButtonColor: '#2563eb' });
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
    
    Swal.fire({ icon: 'success', title: 'Перевод сохранен', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    renderFinanceTransfers();
    renderFinanceHistory();
    return;
  }

  // Логика для ДОХОДА и РАСХОДА (ИСПРАВЛЕНО)
  const name = document.getElementById(`${type === 'income' ? 'incomeName' : 'expenseName'}`)?.value || (type === 'income' ? 'Доход' : 'Расход');
  const walletId = document.getElementById(`${type === 'income' ? 'incomeWallet' : 'expenseWallet'}`)?.value;
  const categoryId = document.getElementById(`${type === 'income' ? 'incomeCategory' : 'expenseCategory'}`)?.value;
  
  const wallet = financeState.wallets.find(item => item.id === walletId);
  const category = financeState.categories.find(item => item.id === categoryId);
  
  if (!wallet) {
    Swal.fire({ icon: 'warning', title: 'Ошибка выбора', text: 'Выберите корректный кошелек', confirmButtonColor: '#2563eb' });
    return;
  }

  // 👇 ВАЛЮТА ПРИНУДИТЕЛЬНО БЕРЕТСЯ ИЗ ВЫБРАННОГО КОШЕЛЬКА 👇
  const currency = wallet.currency || 'RUP';

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
    currency, // запишется валюта кошелька
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
  
  Swal.fire({ icon: 'success', title: type === 'income' ? 'Доход сохранен' : 'Расход сохранен', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
  
  renderFinanceTransactionList(type, type === 'income' ? 'financeTransactionListIncome' : 'financeTransactionListExpense');
  renderFinanceHistory();
}

//-----------КНОПКИ (Внутри DOMContentLoaded)--------------
// Вызывайте эту функцию СРАЗУ после того, как вставили HTML финансовой панели на страницу
function initFinanceTabs() {
  //console.log("[Finance] Инициализация вкладок панели...");

  // Добавляем классы иконок Font Awesome для каждой вкладки
  const tabs = [
    { btnId: 'financeNavDashboard', panelId: 'financePanel-dashboard', view: 'dashboard', icon: 'fa-chart-pie', title: 'Главная' },
    { btnId: 'financeNavWallets', panelId: 'financePanel-wallets', view: 'wallets', icon: 'fa-wallet', title: 'Кошельки' },
    { btnId: 'financeNavIncome', panelId: 'financePanel-income', view: 'income', icon: 'fa-arrow-down-long', title: 'Доходы' },
    { btnId: 'financeNavExpenses', panelId: 'financePanel-expenses', view: 'expenses', icon: 'fa-arrow-up-long', title: 'Расходы' },
    { btnId: 'financeNavTransfers', panelId: 'financePanel-transfers', view: 'transfers', icon: 'fa-right-left', title: 'Переводы' },
    { btnId: 'financeNavCategories', panelId: 'financePanel-categories', view: 'categories', icon: 'fa-tags', title: 'Категории' },
    { btnId: 'financeNavHistory', panelId: 'financePanel-history', view: 'history', icon: 'fa-history', title: 'История' }
  ];

  tabs.forEach(({ btnId, panelId, view, icon, title }) => {
    const btn = document.getElementById(btnId);
    if (!btn) {
      console.warn(`[Finance Error] Кнопка ${btnId} не найдена в DOM!`);
      return;
    }

    // ЧИСТИМ ТЕКСТ И ВСТАВЛЯЕМ ИКОНКУ Font Awesome
    // Атрибут title добавит всплывающую подсказку при наведении на десктопе
    btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    btn.setAttribute('title', title); 
    btn.setAttribute('aria-label', title); // Для доступности

    // Пересоздаем слушатель клика (защита от дублирования)
    btn.replaceWith(btn.cloneNode(true)); 
    const freshBtn = document.getElementById(btnId);

    freshBtn.addEventListener('click', () => {
      console.log(`--- [Клик] Нажата вкладка: ${view} ---`);
      financeState.view = view;

      document.querySelectorAll('.finance-panel-tabs button').forEach(b => b.classList.remove('active'));
      freshBtn.classList.add('active');

      document.querySelectorAll('.finance-panel').forEach(p => p.classList.add('hidden'));
      
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');

      triggerPanelSpecificRender(view);

      if (panel) {
        setTimeout(() => {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });
  });
}

//Функция для точечного рендеринга контента конкретной вкладки
function triggerPanelSpecificRender(view) {
  console.log(`[Вызов рендера] Отрисовка контента для панели: ${view}`);
  
  switch (view) {
    case 'dashboard':
      if (typeof renderFinanceDashboard === 'function') renderFinanceDashboard();
      break;
    case 'wallets':
      if (typeof renderFinanceWallets === 'function') renderFinanceWallets();
      break;
    case 'income':
      // Подставляем ID контейнера доходов из вашей разметки
      renderFinanceTransactionList('income', 'financeTransactionListIncome');
      break;
    case 'expenses':
      // Подставляем ID контейнера расходов из вашей разметки
      renderFinanceTransactionList('expense', 'financeTransactionListExpense');
      break;
    case 'transfers':
      if (typeof renderFinanceTransfers === 'function') renderFinanceTransfers();
      break;
    case 'categories':
      if (typeof renderFinanceCategories === 'function') renderFinanceCategories();
      break;
    case 'history':
      // Вызываем построение истории операций
      if (typeof renderFinanceHistory === 'function') {
        renderFinanceHistory(); 
      } else if (typeof renderFinanceHistoryList === 'function') {
        renderFinanceHistoryList();
      }
      break;
    default:
      console.warn(`[Finance] Неизвестный тип панели для рендера: ${view}`);
  }
}