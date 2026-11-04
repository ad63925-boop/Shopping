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

    function normalizeRows(rows) {
        const source = Array.isArray(rows) ? rows : [];
        const normalized = source.map(normalizeRow);

        while (normalized.length < MIN_ROWS) {
            normalized.push(makeEmptyRow());
        }

        while (normalized.length > MIN_ROWS && !rowHasData(normalized[normalized.length - 1])) {
            normalized.pop();
        }

        const lastIndex = normalized.length - 1;
        if (normalized.length > MIN_ROWS && rowHasData(normalized[lastIndex])) {
            normalized.push(makeEmptyRow());
        }

        while (normalized.length > MIN_ROWS && !rowHasData(normalized[normalized.length - 1])) {
            normalized.pop();
        }

        if (normalized.length < MIN_ROWS) {
            while (normalized.length < MIN_ROWS) {
                normalized.push(makeEmptyRow());
            }
        }

        return normalized;
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
                padding: 20px;
            }
            #other-products-modal.visible {
                display: flex;
            }
            .other-products-panel {
                width: min(760px, 100%);
                max-height: 86vh;
                border-radius: 18px;
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
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
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
                border: none;
                border-radius: 50%;
                background: #e2e8f0;
                color: #0f172a;
                font-size: 1.4rem;
                cursor: pointer;
            }
            .other-products-close:hover {
                background: #cbd5e1;
            }
            .other-products-body {
                padding: 18px 20px 20px;
                max-height: calc(86vh - 80px);
                overflow-y: auto;
            }
            .other-products-list {
                margin: 0;
                padding: 0;
                list-style: decimal inside;
                display: grid;
                gap: 10px;
            }
            .other-product-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(120px, 190px) 42px;
                gap: 10px;
                align-items: center;
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #fff;
            }
            .other-product-row input {
                width: 100%;
                box-sizing: border-box;
                border: 1px solid #dbe3ee;
                border-radius: 10px;
                padding: 10px 12px;
                font-size: 0.96rem;
                background: #fff;
                color: #0f172a;
            }
            .other-product-row input:focus {
                outline: none;
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
            }
            .other-product-delete {
                width: 42px;
                height: 42px;
                border: none;
                border-radius: 10px;
                background: #fee2e2;
                color: #b91c1c;
                font-size: 1.2rem;
                cursor: pointer;
            }
            .other-product-delete:hover {
                background: #fecaca;
            }
            @media (max-width: 640px) {
                .other-product-row {
                    grid-template-columns: 1fr 120px 40px;
                    gap: 8px;
                }
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

    function ensureListSize(rows) {
        const list = Array.isArray(rows) ? rows.map(normalizeRow) : [];

        while (list.length < MIN_ROWS) {
            list.push(makeEmptyRow());
        }

        while (list.length > MIN_ROWS && !rowHasData(list[list.length - 1])) {
            list.pop();
        }

        if (list.length > MIN_ROWS && rowHasData(list[list.length - 1])) {
            list.push(makeEmptyRow());
        }

        while (list.length > MIN_ROWS && !rowHasData(list[list.length - 1])) {
            list.pop();
        }

        while (list.length < MIN_ROWS) {
            list.push(makeEmptyRow());
        }

        return list;
    }

    function renderRows() {
        if (!modalElement) return;
        const listNode = modalElement.querySelector('.other-products-list');
        if (!listNode) return;

        const rows = ensureListSize(currentRows);
        currentRows = rows;

        listNode.innerHTML = rows.map((row, index) => {
            const name = String(row.name || '').replace(/"/g, '&quot;');
            const price = String(row.price || '').replace(/"/g, '&quot;');

            return `
                <li class="other-product-row" data-index="${index}">
                    <input type="text" data-field="name" value="${name}" placeholder="Название" aria-label="Название">
                    <input type="number" step="0.01" min="0" data-field="price" value="${price}" placeholder="Цена" aria-label="Цена">
                    <button type="button" class="other-product-delete" data-delete-index="${index}" aria-label="Стереть">×</button>
                </li>
            `;
        }).join('');

        listNode.querySelectorAll('input').forEach((input) => {
            input.addEventListener('blur', () => {
                const snapshot = readRowsFromDom();
                const nextRows = ensureListSize(snapshot);
                currentRows = nextRows;
                renderRows();
                saveRows(nextRows);
            });

            input.addEventListener('change', () => {
                const snapshot = readRowsFromDom();
                const nextRows = ensureListSize(snapshot);
                currentRows = nextRows;
                renderRows();
                saveRows(nextRows);
            });

            input.addEventListener('input', () => {
                const snapshot = readRowsFromDom();
                const lastRow = snapshot[snapshot.length - 1];
                if (snapshot.length >= MIN_ROWS && rowHasData(lastRow)) {
                    const nextRows = ensureListSize(snapshot.concat([makeEmptyRow()]));
                    if (nextRows.length > snapshot.length) {
                        currentRows = nextRows;
                        renderRows();
                    }
                }
            });
        });

        listNode.querySelectorAll('.other-product-delete').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.deleteIndex);
                if (Number.isNaN(index)) return;

                const nextRows = ensureListSize(currentRows.map((row, rowIndex) => {
                    if (rowIndex === index) return makeEmptyRow();
                    return row;
                }));

                currentRows = nextRows;
                renderRows();
                saveRows(nextRows);
            });
        });
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
        if (modalElement) {
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

        currentRows = ensureListSize([]);
        renderRows();

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
