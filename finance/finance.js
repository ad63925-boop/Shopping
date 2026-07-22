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
  
  renderFinanceScreen();        // Отрисовываем HTML
  initFinanceTabs();            // 🔥 ВАЖНО: инициализируем вкладки
  setupFinanceEvents();        // Вешаем обработчики (если есть)
  loadFinanceData();           // Загружаем данные из Firebase
  financeState.initialized = true;
}

//Функция для рендеринга экрана финансового модуля
function renderFinanceScreen() {
  const container = document.getElementById('financeScreen');
  if (!container) return;
  container.innerHTML = `
    <div class="finance-header">
      <h2>Finance_Pro</h2>
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
  
  document.getElementById('financeNavDashboard')?.addEventListener('click', () => showFinancePanel('dashboard'));
  document.getElementById('financeNavWallets')?.addEventListener('click', () => showFinancePanel('wallets'));
  document.getElementById('financeNavIncome')?.addEventListener('click', () => showFinancePanel('income'));
  document.getElementById('financeNavExpenses')?.addEventListener('click', () => showFinancePanel('expenses'));
  document.getElementById('financeNavTransfers')?.addEventListener('click', () => showFinancePanel('transfers'));
  document.getElementById('financeNavCategories')?.addEventListener('click', () => showFinancePanel('categories'));
  document.getElementById('financeNavHistory')?.addEventListener('click', () => showFinancePanel('history'));
}

function getTodayDateValue() {
  const today = new Date();
  const offsetDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function setFinanceDateToday(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.value = getTodayDateValue();
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function focusFinanceAmountField(view) {
  const amountFieldIds = {
    income: 'incomeAmount',
    expenses: 'expenseAmount',
    expense: 'expenseAmount',
    transfers: 'transferAmountFrom',
    transfer: 'transferAmountFrom'
  };

  const inputId = amountFieldIds[view];
  if (!inputId) return;

  setTimeout(() => {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.focus();
    input.select();
  }, 120);
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
  focusFinanceAmountField(panel);
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
  const container = document.getElementById('financePanel-wallets'); // Ваш ID контейнера кошельков
  if (!container) return;

  container.innerHTML = '';

  if (!financeState.wallets || financeState.wallets.length === 0) {
    container.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Нет созданных кошельков</div>';
    return;
  }

  financeState.wallets.forEach(wallet => {
    // Создаем главный элемент карточки кошелька
    const walletCard = document.createElement('div');
    walletCard.className = 'finance-item-card';

    // Определяем иконку в зависимости от типа кошелька
    const typeIcons = { cash: '💵', card: '💳', account: '🏦' };
    const icon = typeIcons[wallet.type] || '💰';

    // Внутренняя разметка: верхняя инфо-плашка + выезжающая панель действий
    walletCard.innerHTML = `
      <!-- Кликабельная шапка кошелька -->
      <div class="wallet-main-info" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.2rem; flex-shrink: 0;">${icon}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 500; color: #1e293b;">${escapeHtml(wallet.name)}</span>
            <span style="font-size: 0.75rem; color: #64748b;">
              ${wallet.type === 'cash' ? 'Наличные' : wallet.type === 'card' ? 'Карта' : 'Счёт'}
            </span>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 600; color: #0f172a;">${Number(wallet.balance || 0).toFixed(2)}</span>
          <span style="font-size: 0.85rem; color: #64748b; font-weight: 500; margin-left: 2px;">${wallet.currency || 'RUP'}</span>
        </div>
      </div>

      <!-- Выезжающая панель с кнопками (использует тот же CSS-класс, что и категории) -->
      <div class="category-actions-panel" hidden>
        <button onclick="event.stopPropagation(); editFinanceWallet('${wallet.id}')" 
                style="flex: 1; padding: 8px; border: none; background: #eff6ff; color: #2563eb; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">
          ✏️ Редактировать
        </button>
        <button onclick="event.stopPropagation(); deleteFinanceWallet('${wallet.id}')" 
                style="flex: 1; padding: 8px; border: none; background: #fef2f2; color: #dc2626; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">
          🗑️ Удалить
        </button>
      </div>
    `;

    // Логика клика по карточке кошелька
    walletCard.addEventListener('click', () => {
      // Ищем панель действий именно внутри этой карточки
      const currentPanel = walletCard.querySelector('.category-actions-panel');
      
      // Если внутри карточки сейчас открыта форма редактирования (тег <form>), клик не должен её закрывать
      if (walletCard.querySelector('.finance-wallet-edit-form')) return;

      const isOpen = currentPanel.classList.contains('is-open');

      // Закрываем все остальные открытые панели кошельков
      container.querySelectorAll('.category-actions-panel').forEach(panel => {
        panel.classList.remove('is-open');
      });

      // Переключаем состояние текущей панели
      if (!isOpen) {
        currentPanel.classList.add('is-open');
      }
    });

    container.appendChild(walletCard);
  });
}


//Функция для рендеринга финансовых категорий
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
    <div class="finance-section-title finance-income-title"><span>Доходы</span></div>
    <div class="finance-form">
      <div class="form-row">
        <select id="incomeWallet"></select>
        <select id="incomeCategory"></select>
      </div>
      <div class="form-row">
        <input id="incomeAmount" type="number" placeholder="Сумма">
        <div class="finance-date-field">
          <input id="incomeDate" type="date" value="">
          <button type="button" class="finance-date-today-btn" onclick="setFinanceDateToday('incomeDate')" title="Сегодня">
            <i class="fa-solid fa-calendar-day"></i>
          </button>
        </div>
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
    <div class="finance-section-title finance-expense-title"><span>Расходы</span></div>
    <div class="finance-form">
      <div class="form-row">
        <select id="expenseWallet"></select>
        <select id="expenseCategory"></select>
      </div>
      <div class="form-row">
        <input id="expenseAmount" type="number" placeholder="Сумма">
        <div class="finance-date-field">
          <input id="expenseDate" type="date" value="" required>
          <button type="button" class="finance-date-today-btn" onclick="setFinanceDateToday('expenseDate')" title="Сегодня">
            <i class="fa-solid fa-calendar-day"></i>
          </button>
        </div>
      </div>
      <textarea id="expenseComment" placeholder="Комментарий"></textarea>
      <button onclick="saveFinanceTransaction('expense')">Создать расход</button>
    </div>
  `;
  fillFinanceTransactionSelects('expense');
  renderFinanceTransactionList('expense', 'financeTransactionListExpense');
}

// Функция для рендеринга финансовых переводов
function renderFinanceTransfers() {
  const panel = document.getElementById('financePanel-transfers');
  if (!panel) return;

  // Устанавливаем сегодняшнюю дату по умолчанию (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  panel.innerHTML = `
    <div class="finance-section-title finance-transfer-title">
      <span>Переводы</span>
    </div>
    
    <div class="finance-form finance-transfer-form">
      
      <!-- Выбор кошельков -->
      <div class="form-row finance-transfer-row">
        <div class="finance-transfer-half">
          <select id="transferFrom" class="finance-transfer-control" onchange="window.updateFinanceTransferLabels()"></select>
          <div id="currencyFromLabel" class="finance-currency-label">Валюта: --</div>
        </div>
        <div class="finance-transfer-half">
          <select id="transferTo" class="finance-transfer-control" onchange="window.updateFinanceTransferLabels()"></select>
          <div id="currencyToLabel" class="finance-currency-label">Валюта: --</div>
        </div>
      </div>
      
      <!-- Сумма отправления и Сумма приема -->
      <div class="form-row finance-transfer-row">
        <div class="finance-transfer-half">
          <input id="transferAmountFrom" type="number" step="0.01" placeholder="Сумма списания" 
                 class="finance-transfer-control" oninput="window.handleTransferAmountInput('from')">
        </div>
        <div class="finance-transfer-half">
          <input id="transferAmountTo" type="number" step="0.01" placeholder="Сумма зачисления" 
                 class="finance-transfer-control" oninput="window.handleTransferAmountInput('to')">
        </div>
      </div>

      <!-- Блок автоматического расчета курса -->
      <div id="transferRateLabel" class="finance-transfer-rate-label" style="display: none;"></div>
      
      <!-- Дата перевода -->
      <div class="form-row-full">
        <div class="finance-date-field">
          <input id="transferDate" type="date" value="${today}" required 
                 class="finance-transfer-control">
          <button type="button" class="finance-date-today-btn" onclick="setFinanceDateToday('transferDate')" title="Сегодня">
            <i class="fa-solid fa-calendar-day"></i>
          </button>
        </div>
      </div>
      
      <!-- Комментарий -->
      <textarea id="transferComment" placeholder="Комментарий" 
                class="finance-transfer-comment"></textarea>
      
      <!-- Кнопка действия -->
      <button onclick="saveFinanceTransaction('transfer')" 
              class="finance-transfer-submit">
        Создать перевод
      </button>
    </div>
    
    <div id="financeTransferPreview" class="finance-transfer-preview-container"></div>
  `;

  // Заполняем выпадающие списки кошельков
  fillFinanceTransactionSelects('transfer');

  // Глобальная функция для обновления текстовых меток валюты
  window.updateFinanceTransferLabels = () => {
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;

    const fromWallet = financeState.wallets.find(w => w.id === fromId);
    const toWallet = financeState.wallets.find(w => w.id === toId);

    const curFromLabel = document.getElementById('currencyFromLabel');
    const curToLabel = document.getElementById('currencyToLabel');

    if (curFromLabel) curFromLabel.innerText = fromWallet ? `Валюта: ${fromWallet.currency || 'RUP'}` : 'Валюта: --';
    if (curToLabel) curToLabel.innerText = toWallet ? `Валюта: ${toWallet.currency || 'RUP'}` : 'Валюта: --';
    
    // Синхронизируем суммы, если валюты одинаковые
    if (fromWallet && toWallet && (fromWallet.currency || 'RUP') === (toWallet.currency || 'RUP')) {
      const amountFrom = document.getElementById('transferAmountFrom')?.value;
      const inputTo = document.getElementById('transferAmountTo');
      if (inputTo && amountFrom) inputTo.value = amountFrom;
    }

    window.calculateFinanceExchangeRate();
  };

  // Обработка ввода сумм
  window.handleTransferAmountInput = (source) => {
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;
    const fromWallet = financeState.wallets.find(w => w.id === fromId);
    const toWallet = financeState.wallets.find(w => w.id === toId);

    // Если валюты кошельков совпадают — автоматически дублируем введенную сумму во второе поле
    if (fromWallet && toWallet && (fromWallet.currency || 'RUP') === (toWallet.currency || 'RUP')) {
      const inputFrom = document.getElementById('transferAmountFrom');
      const inputTo = document.getElementById('transferAmountTo');
      if (source === 'from' && inputTo) inputTo.value = inputFrom.value;
      if (source === 'to' && inputFrom) inputFrom.value = inputTo.value;
    }

    window.calculateFinanceExchangeRate();
  };

  // Автоматический подсчет курса
  window.calculateFinanceExchangeRate = () => {
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;
    const fromWallet = financeState.wallets.find(w => w.id === fromId);
    const toWallet = financeState.wallets.find(w => w.id === toId);

    const amountFrom = Number(document.getElementById('transferAmountFrom')?.value || 0);
    const amountTo = Number(document.getElementById('transferAmountTo')?.value || 0);
    const rateLabel = document.getElementById('transferRateLabel');

    if (!rateLabel) return;

    // Скрываем плашку, если кошельки одинаковые или не выбраны
    if (!fromWallet || !toWallet || fromWallet.id === toWallet.id) {
      rateLabel.style.display = 'none';
      return;
    }

    const curFrom = fromWallet.currency || 'RUP';
    const curTo = toWallet.currency || 'RUP';

    // При одинаковых валютах курс 1:1 — скрываем плашку
    if (curFrom === curTo) {
      rateLabel.style.display = 'none';
      return;
    }

    // Расчет курса
    if (amountFrom > 0 && amountTo > 0) {
      const rateDirect = (amountTo / amountFrom).toFixed(4);
      const rateReverse = (amountFrom / amountTo).toFixed(4);

      rateLabel.innerHTML = `
        <div class="finance-transfer-rate-row">
          <span>Курс: 1 ${curFrom} = ${rateDirect} ${curTo}</span>
          <span class="finance-transfer-rate-reverse">Обратный: 1 ${curTo} = ${rateReverse} ${curFrom}</span>
        </div>
      `;
      rateLabel.style.display = 'block';
    } else {
      rateLabel.style.display = 'none';
    }
  };

  // Подтягиваем начальные метки с небольшим таймаутом после инициализации селектов
  setTimeout(() => {
    if (typeof window.updateFinanceTransferLabels === 'function') {
      window.updateFinanceTransferLabels();
    }
  }, 50);
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

//Функция для рендеринга списка финансовых транзакций с группировкой по дате 2
// Вспомогательная функция для генерации списка транзакций



//Функция для рендеринга элемента списка финансовых транзакций 21.44
function renderTransactionListItem(tx, isEditing = false) {

// Определяем цвет суммы в зависимости от типа операции
let amountColorClass = '';
if (tx.type === 'income') {
  amountColorClass = 'text-green';
} else if (tx.type === 'expense') {
  amountColorClass = 'text-red';
} else if (tx.type === 'transfer') {
  amountColorClass = 'text-blue'; // Новый цвет для перевода
}

// Надежное получение суммы для любых типов транзакций
const displayAmount = Number(
  tx.type === 'transfer' 
    ? (tx.amountFrom || tx.amountTo || tx.amount || 0)
    : (tx.amount || 0)
).toFixed(2);


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
        <span class="finance-tx-amount ${amountColorClass}">
  ${sign} ${displayAmount} ${tx.currency || tx.currencyFrom || ''}
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

// Основная функция рендеринга истории финансовых транзакций
function renderFinanceHistoryList() {
  const container = document.getElementById('financeHistoryList');
  if (!container) return;

  // 1. ФИЛЬТРАЦИЯ
  let filtered = (financeState.transactions || []).filter(tx => {
    // Фильтр по кошельку (списание, зачисление или обычный счет)
    if (financeState.historyFilters.walletId && financeState.historyFilters.walletId !== 'all') {
      const selectedWallet = financeState.historyFilters.walletId;
      const isRelated = tx.walletId === selectedWallet || 
                        tx.fromWalletId === selectedWallet || 
                        tx.toWalletId === selectedWallet;
      if (!isRelated) return false;
    }

    // Фильтры по датам
    if (financeState.historyFilters.date && tx.date.slice(0, 10) !== financeState.historyFilters.date) return false;
    if (financeState.historyFilters.startDate && tx.date.slice(0, 10) < financeState.historyFilters.startDate) return false;
    if (financeState.historyFilters.endDate && tx.date.slice(0, 10) > financeState.historyFilters.endDate) return false;

    // Текстовый поиск
    if (financeState.searchQuery) {
      const q = financeState.searchQuery.toLowerCase();
      const matchName = (tx.name || '').toLowerCase().includes(q);
      const matchComment = (tx.comment || '').toLowerCase().includes(q);
      const matchCategory = (tx.category || '').toLowerCase().includes(q);
      const matchFrom = (tx.fromWalletName || '').toLowerCase().includes(q);
      const matchTo = (tx.toWalletName || '').toLowerCase().includes(q);
      
      if (!matchName && !matchComment && !matchCategory && !matchFrom && !matchTo) return false;
    }

    return true;
  });

  // Пустое состояние
  if (filtered.length === 0) {
    container.innerHTML = `<div class="finance-empty-state">Транзакции не найдены</div>`;
    return;
  }

  // 2. СОРТИРОВКА: Новые операции сверху
  filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 3. ГРУППИРОВКА ПО ДАТАМ (по первым 10 символам YYYY-MM-DD)
  const groupedByDate = filtered.reduce((groups, tx) => {
    const dateKey = tx.date ? tx.date.slice(0, 10) : 'Без даты';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {});

  // 4. ФОРМАТИРОВАНИЕ ЗАГОЛОВКА ДАТЫ
  const formatDateHeader = (dateStr) => {
    if (dateStr === 'Без даты') return dateStr;
    
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dateStr === todayStr) return 'Сегодня';

    const [year, month, day] = dateStr.split('-');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const monthName = months[parseInt(month, 10) - 1] || '';
    
    return `${parseInt(day, 10)} ${monthName} ${year}`;
  };

  // 5. РЕНДЕРИНГ HTML (рендерим обычные карточки, isEditing = false)
  container.innerHTML = Object.keys(groupedByDate).map(date => {
    const transactions = groupedByDate[date];

    // Обычный рендеринг карточек
    const itemsHtml = transactions.map(tx => renderTransactionListItem(tx, false)).join('');

    return `
      <div class="finance-history-date-group">
        <div class="finance-history-date-header">
          <span>${formatDateHeader(date)}</span>
        </div>
        <div class="finance-history-date-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');
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
//Функция для заполнения селектов валют, кошельков и категорий в формах транзакций
function fillFinanceTransactionSelects(type) {
  const walletSelect = document.getElementById(`${type}Wallet`);
  const categorySelect = document.getElementById(`${type}Category`);
  const fromSelect = document.getElementById('transferFrom');
  const toSelect = document.getElementById('transferTo');

  // УБРАНО: Генерация currencySelect для income и expense

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
    
    // Для переводов валюту оставляем!
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

//Функция редактирования транзакции (editFinanceTransaction)
async function editFinanceTransaction(txId) {
  const tx = financeState.transactions.find(t => String(t.id) === String(txId));
  if (!tx) {
    Swal.fire('Ошибка', 'Транзакция не найдена', 'error');
    return;
  }

  // Форматируем текущую дату транзакции в YYYY-MM-DD для input[type="date"]
  const dateObj = parseTxDate(tx.date);
  const formattedDate = dateObj ? dateObj.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  // Формируем список опций для кошельков
  const walletOptions = financeState.wallets
    .map(w => `<option value="${w.id}" ${w.id === tx.walletId ? 'selected' : ''}>${escapeHtml(w.name)} (${w.currency || 'USD'})</option>`)
    .join('');

  // HTML формы внутри SweetAlert2
  let modalHtml = '';

  if (tx.type === 'transfer') {
    const fromOptions = financeState.wallets
      .map(w => `<option value="${w.id}" ${w.id === tx.fromWalletId ? 'selected' : ''}>${escapeHtml(w.name)}</option>`)
      .join('');
    const toOptions = financeState.wallets
      .map(w => `<option value="${w.id}" ${w.id === tx.toWalletId ? 'selected' : ''}>${escapeHtml(w.name)}</option>`)
      .join('');

    modalHtml = `
      <div style="text-align: left; display: flex; flex-direction: column; gap: 12px;">
        <label>
          <b>Дата:</b>
          <input type="date" id="swal-tx-date" class="swal2-input" value="${formattedDate}" style="margin-top: 4px; width: 100%;">
        </label>
        <label>
          <b>Откуда:</b>
          <select id="swal-tx-from" class="swal2-select" style="margin-top: 4px; width: 100%;">${fromOptions}</select>
        </label>
        <label>
          <b>Сумма списания:</b>
          <input type="number" step="0.01" id="swal-tx-amount-from" class="swal2-input" value="${tx.amountFrom || tx.amount}" style="margin-top: 4px; width: 100%;">
        </label>
        <label>
          <b>Куда:</b>
          <select id="swal-tx-to" class="swal2-select" style="margin-top: 4px; width: 100%;">${toOptions}</select>
        </label>
        <label>
          <b>Сумма зачисления:</b>
          <input type="number" step="0.01" id="swal-tx-amount-to" class="swal2-input" value="${tx.amountTo || tx.amount}" style="margin-top: 4px; width: 100%;">
        </label>
        <label>
          <b>Комментарий:</b>
          <input type="text" id="swal-tx-comment" class="swal2-input" value="${escapeHtml(tx.comment || '')}" placeholder="Комментарий" style="margin-top: 4px; width: 100%;">
        </label>
      </div>
    `;
  } else {
    // Для Дохода (income) и Расхода (expense)
    const categoryOptions = (financeState.categories || [])
      .filter(c => c.type === tx.type)
      .map(c => `<option value="${c.name}" ${c.name === tx.category ? 'selected' : ''}>${escapeHtml(c.name)}</option>`)
      .join('');

    modalHtml = `
      <div style="text-align: left; display: flex; flex-direction: column; gap: 12px;">
        <label>
          <b>Дата:</b>
          <input type="date" id="swal-tx-date" class="swal2-input" value="${formattedDate}" style="margin-top: 4px; width: 100%;">
        </label>
        <label>
          <b>Кошелек:</b>
          <select id="swal-tx-wallet" class="swal2-select" style="margin-top: 4px; width: 100%;">${walletOptions}</select>
        </label>
        <label>
          <b>Сумма:</b>
          <input type="number" step="0.01" id="swal-tx-amount" class="swal2-input" value="${tx.amount}" style="margin-top: 4px; width: 100%;">
        </label>
        <label>
          <b>Категория:</b>
          <select id="swal-tx-category" class="swal2-select" style="margin-top: 4px; width: 100%;">${categoryOptions}</select>
        </label>
        <label>
          <b>Комментарий:</b>
          <input type="text" id="swal-tx-comment" class="swal2-input" value="${escapeHtml(tx.comment || '')}" placeholder="Комментарий" style="margin-top: 4px; width: 100%;">
        </label>
      </div>
    `;
  }

  const { value: formValues } = await Swal.fire({
    title: 'Редактировать транзакцию',
    html: modalHtml,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Сохранить',
    cancelButtonText: 'Отмена',
    preConfirm: () => {
      const newDateVal = document.getElementById('swal-tx-date').value;
      if (!newDateVal) {
        Swal.showValidationMessage('Укажите дату!');
        return false;
      }

      if (tx.type === 'transfer') {
        const fromId = document.getElementById('swal-tx-from').value;
        const toId = document.getElementById('swal-tx-to').value;
        const amountFrom = parseFloat(document.getElementById('swal-tx-amount-from').value);
        const amountTo = parseFloat(document.getElementById('swal-tx-amount-to').value);

        if (fromId === toId) {
          Swal.showValidationMessage('Кошельки списания и зачисления должны отличаться!');
          return false;
        }
        if (isNaN(amountFrom) || amountFrom <= 0 || isNaN(amountTo) || amountTo <= 0) {
          Swal.showValidationMessage('Укажите корректные суммы!');
          return false;
        }

        return {
          date: newDateVal,
          fromWalletId: fromId,
          toWalletId: toId,
          amountFrom,
          amountTo,
          comment: document.getElementById('swal-tx-comment').value.trim()
        };
      } else {
        const walletId = document.getElementById('swal-tx-wallet').value;
        const amount = parseFloat(document.getElementById('swal-tx-amount').value);
        const category = document.getElementById('swal-tx-category').value;

        if (isNaN(amount) || amount <= 0) {
          Swal.showValidationMessage('Введите корректную сумму!');
          return false;
        }

        return {
          date: newDateVal,
          walletId,
          amount,
          category,
          comment: document.getElementById('swal-tx-comment').value.trim()
        };
      }
    }
  });

  if (!formValues) return;

  try {
    // 1. Откатываем старую транзакцию из баланса кошельков
    revertFinanceTransactionFromWallets(tx);

    // 2. Обновляем объект транзакции
    tx.date = formValues.date;
    tx.comment = formValues.comment;

    if (tx.type === 'transfer') {
      const fromWallet = financeState.wallets.find(w => w.id === formValues.fromWalletId);
      const toWallet = financeState.wallets.find(w => w.id === formValues.toWalletId);

      tx.fromWalletId = formValues.fromWalletId;
      tx.fromWalletName = fromWallet ? fromWallet.name : '';
      tx.toWalletId = formValues.toWalletId;
      tx.toWalletName = toWallet ? toWallet.name : '';
      tx.amountFrom = formValues.amountFrom;
      tx.amountTo = formValues.amountTo;
      tx.currencyFrom = fromWallet ? fromWallet.currency : 'USD';
      tx.currencyTo = toWallet ? toWallet.currency : 'USD';
      tx.amount = formValues.amountFrom; // Базовая сумма для совместимости
    } else {
      const wallet = financeState.wallets.find(w => w.id === formValues.walletId);

      tx.walletId = formValues.walletId;
      tx.walletName = wallet ? wallet.name : '';
      tx.currency = wallet ? wallet.currency : 'USD';
      tx.amount = formValues.amount;
      tx.category = formValues.category;
    }

    // 3. Применяем обновленную транзакцию к балансам кошельков
    applyFinanceTransactionToWallets(tx);

    // 4. Сохраняем измененные данные в Firebase
    await saveFinanceStateToDb();

    Swal.fire({
      icon: 'success',
      title: 'Успешно!',
      text: 'Транзакция обновлена',
      timer: 1500,
      showConfirmButton: false
    });

  } catch (err) {
    console.error('Ошибка при сохранении транзакции:', err);
    Swal.fire('Ошибка', 'Не удалось сохранить изменения в базу данных', 'error');
  }
}

//функция удаления транзакции.
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

//Функция для запроса валюты с проверкой на допустимые значения
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

//Функция для добавления категории
function addFinanceCategory() {
  console.log("[Category] Запуск создания новой категории через SweetAlert2");

  // Рендерим красивое окно SweetAlert2 с формой внутри
  Swal.fire({
    title: 'Новая категория',
    html: `
      <div style="text-align: left; font-family: inherit;">
        <div style="margin-bottom: 12px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Название</label>
          <input id="swal-cat-name" class="swal2-input" placeholder="Например: Продукты" style="margin: 0; width: 100%; box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Тип категории</label>
          <select id="swal-cat-type" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; display: flex;">
            <option value="expense">Расход (expense)</option>
            <option value="income">Доход (income)</option>
          </select>
        </div>

        <div style="margin-bottom: 4px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Цвет категории</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="color" id="swal-cat-color" value="#4f46e5" style="width: 50px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0; cursor: pointer;">
            <span style="font-size: 0.85rem; color: #64748b;">Нажмите на квадрат для выбора</span>
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Создать',
    cancelButtonText: 'Отмена',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    // Собираем данные из инпутов модального окна перед закрытием
    preConfirm: () => {
      const name = document.getElementById('swal-cat-name').value.trim();
      const type = document.getElementById('swal-cat-type').value;
      const color = document.getElementById('swal-cat-color').value;

      if (!name) {
        Swal.showValidationMessage('Название категории обязательно!');
        return false;
      }

      return { name, type, color };
    }
  }).then((result) => {
    // Если пользователь нажал "Создать" и валидация прошла успешно
    if (result.isConfirmed && result.value) {
      const { name, type, color } = result.value;
      console.log("[Category] Данные валидны, отправка в Firebase:", { name, type, color });

      const id = `category-${Date.now()}`;
      
      // Сборка текущих категорий в payload объект
      const payload = financeState.categories.reduce((acc, item) => {
        acc[item.id] = { 
          name: item.name, 
          type: item.type, 
          color: item.color 
        };
        return acc;
      }, {});

      // Добавление новой категории
      payload[id] = { name, type, color };

      // Отправка пачки в базу Realtime Database
      financeDb.child('categories').set(payload)
        .then(() => {
          console.log("[Category Success] Категория сохранена в Firebase.");
          Swal.fire({
            icon: 'success',
            title: 'Категория добавлена',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
          
          // Если у вас есть функция рендера списка категорий — вызовите её здесь:
          // if (typeof renderFinanceCategories === 'function') renderFinanceCategories();
        })
        .catch(err => {
          console.error("[Category Firebase Error]", err);
          Swal.fire({
            icon: 'error',
            title: 'Ошибка',
            text: 'Не удалось сохранить категорию в базу данных',
            confirmButtonColor: '#dc2626'
          });
        });
    }
  });
}

// Функция для редактирования финансового кошелька
function editFinanceWallet(walletId) {
  const wallet = financeState.wallets.find(w => w.id === walletId);
  if (!wallet) return;

  // Ищем кнопку управления внутри карточки, чтобы найти саму карточку
  const card = document.querySelector(`.finance-item-card button[onclick*="'${walletId}'"]`)?.closest('.finance-item-card');
  if (!card) return;

  // Заменяем содержимое карточки на форму редактирования
  // event.stopPropagation() не дает карточке перехватывать клики внутри инпутов
  card.innerHTML = `
    <form class="finance-wallet-edit-form" 
          onsubmit="handleWalletEdit(event, '${walletId}')" 
          onclick="event.stopPropagation()" 
          style="display: flex; flex-direction: column; gap: 12px; background: #ffffff; padding: 4px;">
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 0.85rem; font-weight: 500; color: #475569;">Название</label>
        <input type="text" id="walletName_${walletId}" value="${escapeHtml(wallet.name)}" required 
               style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;">
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 0.85rem; font-weight: 500; color: #475569;">Тип</label>
        <select id="walletType_${walletId}" 
                style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: #fff;">
          <option value="cash" ${wallet.type === 'cash' ? 'selected' : ''}>Наличные</option>
          <option value="card" ${wallet.type === 'card' ? 'selected' : ''}>Карта</option>
          <option value="account" ${wallet.type === 'account' ? 'selected' : ''}>Счёт</option>
        </select>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 0.85rem; font-weight: 500; color: #475569;">Валюта</label>
        <input type="text" id="walletCurrency_${walletId}" value="${wallet.currency || 'RUP'}" required 
               style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;">
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-size: 0.85rem; font-weight: 500; color: #475569;">Баланс (текущий)</label>
        <input type="number" id="walletBalance_${walletId}" step="0.01" value="${wallet.balance || 0}" readonly 
               style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; background: #f1f5f9; color: #64748b;">
        <small style="color: #64748b; font-size: 0.75rem; margin-top: 2px;">Баланс лучше менять через транзакции, а не вручную.</small>
      </div>
      
      <div class="finance-wallet-form-actions" style="display: flex; gap: 8px; margin-top: 4px;">
        <button type="submit" class="btn-save" 
                style="flex: 1; padding: 10px; border: none; background: #2563eb; color: white; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9rem;">
          Сохранить
        </button>
        <button type="button" onclick="event.stopPropagation(); renderFinanceWallets()" class="btn-cancel" 
                style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9rem;">
          Отмена
        </button>
      </div>
    </form>
  `;
}

//Функция для обработки редактирования кошелька
function handleWalletEdit(event, walletId) {
  event.preventDefault(); // Предотвращаем перезагрузку страницы

  const newName = document.getElementById(`walletName_${walletId}`)?.value.trim();
  const newType = document.getElementById(`walletType_${walletId}`)?.value;
  const newCurrency = document.getElementById(`walletCurrency_${walletId}`)?.value.trim().toUpperCase() || 'RUP';

  if (!newName) {
    Swal.fire({ icon: 'warning', title: 'Ошибка', text: 'Введите название кошелька' });
    return;
  }

  // Обновляем локальный стейт (опционально, зависит от вашей архитектуры)
  const walletIndex = financeState.wallets.findIndex(w => w.id === walletId);
  if (walletIndex !== -1) {
    financeState.wallets[walletIndex].name = newName;
    financeState.wallets[walletIndex].type = newType;
    financeState.wallets[walletIndex].currency = newCurrency;
  }

  // Записываем обновленные данные в Firebase Realtime Database
  financeDb.child(`wallets/${walletId}`).update({
    name: newName,
    type: newType,
    currency: newCurrency
  })
  .then(() => {
    Swal.fire({ 
      icon: 'success', 
      title: 'Кошелек обновлен', 
      toast: true, 
      position: 'top-end', 
      showConfirmButton: false, 
      timer: 2000 
    });
    // Перерисовываем список кошельков, возвращая карточку в нормальное состояние
    renderFinanceWallets();
  })
  .catch(error => {
    console.error("Ошибка при обновлении кошелька:", error);
    Swal.fire({ icon: 'error', title: 'Ошибка Firebase', text: 'Не удалось сохранить изменения' });
  });
}

//Функция для удаления финансового кошелька с проверкой на наличие транзакций
async function removeFinanceWallet(walletId, hasTransactions) {
  if (hasTransactions) {
    await Swal.fire({
      icon: 'warning',
      title: 'Внимание',
      text: 'Нельзя удалить кошелёк, по которому есть транзакции. Сначала удалите или перенесите операции.'
    });
    return;
  }

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

  if (result.isConfirmed) {
    try {
      // 🔥 Используем Realtime Database (не Firestore!)
      await financeDb.child('wallets').child(walletId).remove();
      
      // Обновляем локальное состояние
      financeState.wallets = financeState.wallets.filter(w => w.id !== walletId);
      
      renderFinanceWallets();
      renderFinanceHistoryList();
      
      Swal.fire({
        icon: 'success',
        title: 'Кошелёк удалён.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
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
}
/*
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
*/

/*
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
*/

//Функция для редактирования финансовой категории
function editFinanceCategory(id) {
  console.log(`[Category Edit] Попытка редактирования категории ID: ${id}`);

  // 1. Находим текущую категорию в стейте
  const category = financeState.categories.find(item => item.id === id);
  if (!category) {
    console.error(`[Category Edit Error] Категория с ID "${id}" не найдена в стейте.`);
    return;
  }

  // Дефолтный цвет, если в базе пусто
  const defaultColor = category.color || '#4f46e5';

  // 2. Вызываем модальное окно SweetAlert2 с предзаполненными данными
  Swal.fire({
    title: 'Редактировать категорию',
    html: `
      <div style="text-align: left; font-family: inherit;">
        <div style="margin-bottom: 12px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Название</label>
          <input id="swal-edit-cat-name" class="swal2-input" value="${category.name}" placeholder="Название категории" style="margin: 0; width: 100%; box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Тип категории</label>
          <select id="swal-edit-cat-type" class="swal2-select" style="margin: 0; width: 100%; box-sizing: border-box; display: flex;">
            <option value="expense" ${category.type === 'expense' ? 'selected' : ''}>Расход (expense)</option>
            <option value="income" ${category.type === 'income' ? 'selected' : ''}>Доход (income)</option>
          </select>
        </div>

        <div style="margin-bottom: 4px;">
          <label style="display:block; font-size: 0.85rem; color: #475569; margin-bottom: 4px; font-weight: 600;">Цвет категории</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="color" id="swal-edit-cat-color" value="${defaultColor}" style="width: 50px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0; cursor: pointer;">
            <span style="font-size: 0.85rem; color: #64748b;">Выберите новый цвет на палитре</span>
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Сохранить',
    cancelButtonText: 'Отмена',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#64748b',
    preConfirm: () => {
      const name = document.getElementById('swal-edit-cat-name').value.trim();
      const type = document.getElementById('swal-edit-cat-type').value;
      const color = document.getElementById('swal-edit-cat-color').value;

      if (!name) {
        Swal.showValidationMessage('Название категории не может быть пустым!');
        return false;
      }

      return { name, type, color };
    }
  }).then((result) => {
    // Если пользователь подтвердил изменения
    if (result.isConfirmed && result.value) {
      const { name, type, color } = result.value;
      console.log("[Category Edit] Изменения валидны. Обновляем структуру...");

      // Формируем payload для Firebase Realtime Database
      const payload = financeState.categories.reduce((acc, item) => {
        acc[item.id] = item.id === id 
          ? { name, type, color } // Пишем новые данные для изменяемой категории
          : { name: item.name, type: item.type, color: item.color }; // Остальные оставляем как были
        return acc;
      }, {});

      // Записываем пачку в Firebase
      financeDb.child('categories').set(payload)
        .then(() => {
          console.log(`[Category Edit Success] Категория ${id} успешно обновлена в Firebase.`);
          
          Swal.fire({
            icon: 'success',
            title: 'Изменения сохранены',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });

          // Раскомментируйте рендер, если список категорий не обновляется автоматом:
          // if (typeof renderFinanceCategories === 'function') renderFinanceCategories();
        })
        .catch(err => {
          console.error("[Category Edit Firebase Error]", err);
          Swal.fire({
            icon: 'error',
            title: 'Ошибка',
            text: 'Не удалось обновить категорию в базе данных',
            confirmButtonColor: '#dc2626'
          });
        });
    }
  });
}

function removeFinanceCategory(id) {
  const payload = financeState.categories.reduce((acc, cat) => {
    if (cat.id !== id) acc[cat.id] = { name: cat.name, type: cat.type, color: cat.color };
    return acc;
  }, {});
  financeDb.child('categories').set(payload);
}
/*
//функция для сохранения финансовой транзакции (доход, расход, перевод)
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
*/

// функция для сохранения финансовой транзакции (доход, расход, перевод)
function saveFinanceTransaction(type) {
  const comment = document.getElementById(`${type === 'income' ? 'incomeComment' : type === 'expense' ? 'expenseComment' : 'transferComment'}`)?.value || '';
  const date = document.getElementById(`${type === 'income' ? 'incomeDate' : type === 'expense' ? 'expenseDate' : 'transferDate'}`)?.value || '';

  // ПРОВЕРКА: если даты нет — показываем ошибку и прерываем
  if (!date) {
    Swal.fire({ 
      icon: 'warning', 
      title: 'Дата не указана', 
      text: 'Пожалуйста, выберите дату операции на календаре', 
      confirmButtonColor: '#2563eb' 
    });  
    return; // прерываем функцию сохранения
  }

 // Логика для ПЕРЕВОДА (ОБНОВЛЕННАЯ С ДВУМЯ СУММАМИ)
  if (type === 'transfer') {
    const fromId = document.getElementById('transferFrom')?.value;
    const toId = document.getElementById('transferTo')?.value;
    
    // Считываем две разные суммы
    const amountFrom = Number(document.getElementById('transferAmountFrom')?.value || 0);
    const amountTo = Number(document.getElementById('transferAmountTo')?.value || 0);

    if (!fromId || !toId || fromId === toId) {
      Swal.fire({ icon: 'warning', title: 'Проверьте счета', text: 'Выберите разные счета для перевода', confirmButtonColor: '#2563eb' });
      return;
    }

    if (amountFrom <= 0 || amountTo <= 0) {
      Swal.fire({ icon: 'warning', title: 'Некорректная сумма', text: 'Обе суммы должны быть больше 0', confirmButtonColor: '#2563eb' });
      return;
    }

    const fromWallet = financeState.wallets.find(item => item.id === fromId);
    const toWallet = financeState.wallets.find(item => item.id === toId);
    if (!fromWallet || !toWallet) return;

    // Обновляем балансы кошельков: с одного списываем amountFrom, на второй зачисляем amountTo
    const updatedWallets = financeState.wallets.reduce((acc, wallet) => {
      if (wallet.id === fromWallet.id) {
        acc[wallet.id] = { ...wallet, balance: Number(wallet.balance || 0) - amountFrom };
      } else if (wallet.id === toWallet.id) {
        acc[wallet.id] = { ...wallet, balance: Number(wallet.balance || 0) + amountTo };
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
      amountFrom,                                 // Сохраняем сколько ушло
      currencyFrom: fromWallet.currency || 'RUP', // Валюта отправления
      amountTo,                                   // Сохраняем сколько пришло
      currencyTo: toWallet.currency || 'RUP',     // Валюта приема
      exchangeRate: amountFrom > 0 ? (amountTo / amountFrom).toFixed(4) : 1, // Рассчитываем курс обмена
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

  // Логика для ДОХОДА и РАСХОДА
  const amountInput = document.getElementById(`${type === 'income' ? 'incomeAmount' : 'expenseAmount'}`);
  const amount = Number(amountInput?.value || 0);

  if (amount <= 0) {
    Swal.fire({ icon: 'warning', title: 'Некорректная сумма', text: 'Сумма должна быть больше 0', confirmButtonColor: '#2563eb' });
    return;
  }

  const name = document.getElementById(`${type === 'income' ? 'incomeName' : 'expenseName'}`)?.value || (type === 'income' ? 'Доход' : 'Расход');
  const walletId = document.getElementById(`${type === 'income' ? 'incomeWallet' : 'expenseWallet'}`)?.value;
  const categoryId = document.getElementById(`${type === 'income' ? 'incomeCategory' : 'expenseCategory'}`)?.value;
  
  const wallet = financeState.wallets.find(item => item.id === walletId);
  const category = financeState.categories.find(item => item.id === categoryId);
  
  if (!wallet) {
    Swal.fire({ icon: 'warning', title: 'Ошибка выбора', text: 'Выберите корректный кошелек', confirmButtonColor: '#2563eb' });
    return;
  }

  // Валюта принудительно берется из выбранного кошелька
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
    { btnId: 'financeNavIncome', panelId: 'financePanel-income', view: 'income', icon: 'fa-circle-plus', title: 'Доходы' },
    { btnId: 'financeNavExpenses', panelId: 'financePanel-expenses', view: 'expenses', icon: 'fa-circle-minus', title: 'Расходы' },
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
      focusFinanceAmountField(view);

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
