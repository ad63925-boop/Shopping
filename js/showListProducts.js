(function () {
    const OTHER_PRODUCTS_DB_PATH = 'otherProducts';
    const MIN_ROWS = 20;

    let modalElement = null;
    let isOpen = false;
    let currentRows = [];

    function makeEmptyRow() {
        return { name: '', price: '' };
    }

    function rowHasData(row) {
        if (!row) return false;
        return String(row.name || '').trim() !== '' || String(row.price || '').trim() !== '';
    }

    function normalizeRow(row) {
        const item = row || {};
        return {
            name: String(item.name || '').trim(),
            price: String(item.price || '').trim()
        };
    }

    function ensureListSize(rows) {
        const list = Array.isArray(rows) ? rows.map(normalizeRow) : [];

        while (list.length < MIN_ROWS) {
            list.push(makeEmptyRow());
        }

        while (list.length > MIN_ROWS && !rowHasData(list[list.length - 1])) {
            list.pop();
        }

        if (rowHasData(list[list.length - 1])) {
            list.push(makeEmptyRow());
        }

        return list;
    }

    function ensureStyles() {
        if (document.getElementById('other-products-modal-style')) return;

        const style = document.createElement('style');
        style.id = 'other-products-modal-style';
        style.textContent = `
            #other-products-modal {
                position: fixed;
                inset: 0;
                display: none;
                align-items: center;
                justify-content: center;
                background: rgba(15, 23, 42, 0.5);
                z-index: 2000;
                padding: 10px;
            }
            #other-products-modal.visible {
                display: flex;
            }
            .other-products-panel {
                width: min(760px, 100%);
                max-height: 95vh;
                border-radius: 7px;
                background: #fff;
                box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .other-products-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                background: #bddeff;
                border-bottom: 1px solid #454647;
            }
            .other-products-header h3 {
                margin: 0;
                font-size: 1.15rem;
                color: #0f172a;
                font-weight: 700;
            }
            .other-products-close {
                width: 34px;
                height: 34px;
                color: #ff0404;
                cursor: pointer;
                font-size: 3rem;
                line-height: 0.8;
                border: none;
                background: transparent;
            }
            .other-products-body {
                padding: 18px 20px 20px;
                max-height: calc(86vh - 80px);
                overflow-y: auto;
            }
            .other-products-list {
                margin: 0;
                padding: 0;
                display: grid;
                gap: 5px;
            }
            .other-product-row {
                display: grid;
                grid-auto-flow: column;
                gap: 4px;
                align-items: center;
                border-radius: 7px;
                background: #fff;
            }
            .other-product-delete {
                width: 42px;
                height: 42px;
                border: none;
                border-radius: 7px;
                background: #fee2e2;
                color: #b91c1c;
                font-size: 1.2rem;
                cursor: pointer;
            }
            .other-product-delete:hover {
                background: #fecaca;
            }
            .other-product-input-name {
                width: 200px;
                border: 1px solid #84b4f4;
                border-radius: 7px;
                padding: 10px 12px;
                font-size: 0.96rem;
                background: #fff;
                color: #0f172a;
                box-sizing: border-box;
            }
            .other-product-input-price {
                box-sizing: border-box;
                border-radius: 7px;
                padding: 10px 12px;
                font-size: 0.96rem;
                background: #fff;
                color: #0f172a;
                width: 65px;
                border: 1px solid #84b4f4;
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }

    function getOtherProductsRef() {
        if (typeof firebase === 'undefined' || !firebase.database) return null;
        return firebase.database().ref(OTHER_PRODUCTS_DB_PATH);
    }

    function readRowsFromDom() {
        if (!modalElement) return [];
        const list = modalElement.querySelector('.other-products-list');
        if (!list) return [];

        const rows = Array.from(list.querySelectorAll('.other-product-row'));
        return rows.map((row) => ({
            name: row.querySelector('input[data-field="name"]')?.value || '',
            price: row.querySelector('input[data-field="price"]')?.value || ''
        }));
    }

    function renderRows() {
        if (!modalElement) return;
        const listNode = modalElement.querySelector('.other-products-list');
        if (!listNode) return;

        // Сохраняем активный элемент перед рендером
        const activeEl = document.activeElement;
        let activeState = null;

        if (activeEl && listNode.contains(activeEl)) {
            const rowNode = activeEl.closest('.other-product-row');
            if (rowNode) {
                activeState = {
                    index: Number(rowNode.dataset.index),
                    field: activeEl.dataset.field,
                    start: activeEl.selectionStart,
                    end: activeEl.selectionEnd
                };
            }
        }

        currentRows = ensureListSize(currentRows);

        listNode.innerHTML = currentRows.map((row, index) => {
            const name = String(row.name || '').replace(/"/g, '&quot;');
            const price = String(row.price || '').replace(/"/g, '&quot;');

            return `
                <li class="other-product-row" data-index="${index}">
                    <input type="text" class="other-product-input-name" data-field="name" value="${name}" placeholder="Название" aria-label="Название">
                    <input type="number" step="1" min="0" class="other-product-input-price" data-field="price" value="${price}" placeholder="₽" aria-label="Цена">
                    <button type="button" class="other-product-delete" data-delete-index="${index}" aria-label="Стереть">×</button>
                </li>
            `;
        }).join('');

        // Навешиваем слушатели событий
        listNode.querySelectorAll('input').forEach((input) => {
            input.addEventListener('input', (e) => {
                const rowEl = e.target.closest('.other-product-row');
                const idx = Number(rowEl.dataset.index);
                const field = e.target.dataset.field;

                if (currentRows[idx]) {
                    currentRows[idx][field] = e.target.value;
                }

                // Если начали заполнять последнюю строку — динамически добавляем еще одну
                const isLastRow = idx === currentRows.length - 1;
                if (isLastRow && rowHasData(currentRows[idx])) {
                    currentRows.push(makeEmptyRow());
                    renderRows();
                }
            });

            input.addEventListener('change', () => {
                saveRows(currentRows);
            });
        });

        listNode.querySelectorAll('.other-product-delete').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.deleteIndex);
                if (Number.isNaN(index)) return;

                currentRows[index] = makeEmptyRow();
                currentRows = ensureListSize(currentRows);
                renderRows();
                saveRows(currentRows);
            });
        });

        // Восстанавливаем фокус
        if (activeState && !Number.isNaN(activeState.index)) {
            const targetRow = listNode.querySelector(`.other-product-row[data-index="${activeState.index}"]`);
            if (targetRow) {
                const targetInput = targetRow.querySelector(`input[data-field="${activeState.field}"]`);
                if (targetInput) {
                    targetInput.focus();
                    if (targetInput.type === 'text' && typeof activeState.start === 'number') {
                        try {
                            targetInput.setSelectionRange(activeState.start, activeState.end);
                        } catch (e) {
                            /* игнорируем типы инпутов без поддержки selectionRange */
                        }
                    }
                }
            }
        }
    }

    function saveRows(rows) {
        const ref = getOtherProductsRef();
        if (!ref) return Promise.resolve();

        const safeRows = ensureListSize(rows || currentRows);
        const payload = {};

        safeRows.forEach((row, index) => {
            payload[index] = {
                name: String(row.name || '').trim(),
                price: String(row.price || '').trim()
            };
        });

        return ref.set(payload);
    }

    function syncFromFirebase(snapshot) {
        // Не перерисовываем списки, пока пользователь печатает в фокусе
        if (modalElement && modalElement.contains(document.activeElement)) {
            return;
        }

        const data = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : null;
        const loaded = [];

        if (data && typeof data === 'object') {
            Object.keys(data)
                .sort((a, b) => Number(a) - Number(b))
                .forEach((key) => {
                    const item = data[key] || {};
                    loaded.push({
                        name: String(item.name || '').trim(),
                        price: String(item.price || '').trim()
                    });
                });
        }

        currentRows = ensureListSize(loaded);
        if (modalElement && isOpen) {
            renderRows();
        }
    }

    function initModal() {
        ensureStyles();

        if (modalElement) return modalElement;

        modalElement = document.createElement('div');
        modalElement.id = 'other-products-modal';
        modalElement.setAttribute('role', 'dialog');
        modalElement.setAttribute('aria-modal', 'true');
        modalElement.setAttribute('aria-labelledby', 'other-products-title');
        modalElement.innerHTML = `
            <div class="other-products-panel">
                <div class="other-products-header">
                    <h3 id="other-products-title">Прочие товары</h3>
                    <button type="button" class="other-products-close" aria-label="Закрыть окно">×</button>
                </div>
                <div class="other-products-body">
                    <ol class="other-products-list"></ol>
                </div>
            </div>
        `;

        modalElement.querySelector('.other-products-close').addEventListener('click', () => {
            showListProducts();
        });

        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) {
                showListProducts();
            }
        });

        document.body.appendChild(modalElement);

        const ref = getOtherProductsRef();
        if (ref) {
            ref.on('value', syncFromFirebase);
        }

        return modalElement;
    }

    function showListProducts() {
        initModal();
        if (!modalElement) return;

        isOpen = !isOpen;

        if (isOpen) {
            modalElement.classList.add('visible');
            currentRows = ensureListSize(currentRows);
            renderRows();
            return;
        }

        modalElement.classList.remove('visible');
        const rows = readRowsFromDom();
        const nextRows = ensureListSize(rows);
        currentRows = nextRows;
        saveRows(nextRows);
    }

    if (typeof window !== 'undefined') {
        window.showListProducts = showListProducts;
    }

    if (typeof globalThis !== 'undefined') {
        globalThis.showListProducts = showListProducts;
    }

    currentRows = ensureListSize([]);
})();