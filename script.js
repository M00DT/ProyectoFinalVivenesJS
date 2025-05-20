const Modal = {
    element: document.getElementById('modal'),
    title: document.getElementById('modalTitle'),
    body: document.getElementById('modalBody'),
    confirmBtn: document.getElementById('confirmModal'),
    cancelBtn: document.getElementById('cancelModal'),
    closeBtn: document.getElementById('closeModal'),

    alert: function (title, message, callback = null) {
        this.title.textContent = title;
        this.body.textContent = message;
        this.confirmBtn.style.display = 'block';
        this.cancelBtn.style.display = 'none';

        this.confirmBtn.onclick = () => {
            this.close();
            if (callback) callback(true);
        };

        this.closeBtn.onclick = () => {
            this.close();
            if (callback) callback(false);
        };

        this.element.style.display = 'flex';
    },

    confirm: function (title, message, callback) {
        this.title.textContent = title;
        this.body.textContent = message;
        this.confirmBtn.style.display = 'block';
        this.cancelBtn.style.display = 'block';

        this.confirmBtn.onclick = () => {
            this.close();
            if (callback) callback(true);
        };

        this.cancelBtn.onclick = () => {
            this.close();
            if (callback) callback(false);
        };

        this.closeBtn.onclick = () => {
            this.close();
            if (callback) callback(false);
        };

        this.element.style.display = 'flex';
    },

    prompt: function (title, message, defaultValue = "", callback) {
        this.title.textContent = title;
        this.body.innerHTML = `
            <p>${message}</p>
            <input type="text" id="promptInput" value="${defaultValue}" style="margin-top: 10px;">
        `;

        this.confirmBtn.style.display = 'block';
        this.cancelBtn.style.display = 'block';

        const input = document.getElementById('promptInput');
        setTimeout(() => input.focus(), 100);

        this.confirmBtn.onclick = () => {
            const value = input.value;
            this.close();
            if (callback) callback(value);
        };

        this.cancelBtn.onclick = () => {
            this.close();
            if (callback) callback(null);
        };

        this.closeBtn.onclick = () => {
            this.close();
            if (callback) callback(null);
        };

        this.element.style.display = 'flex';
    },

    close: function () {
        this.element.style.display = 'none';
    }
};

const API = {
    CURRENCY: 'https://api.exchangerate-api.com/v4/latest/USD',
    CRYPTO: 'https://api.coingecko.com/api/v3/simple/price'
};

const DEFAULT_CURRENCIES = {
    FIAT: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'MXN', 'BRL'],
    CRYPTO: ['bitcoin', 'ethereum', 'ripple', 'litecoin', 'cardano', 'polkadot', 'binancecoin', 'dogecoin', 'solana', 'tron']
};

const CURRENCY_NAMES = {
    USD: 'Dólar Estadounidense',
    EUR: 'Euro',
    GBP: 'Libra Esterlina',
    JPY: 'Yen Japonés',
    CAD: 'Dólar Canadiense',
    AUD: 'Dólar Australiano',
    CHF: 'Franco Suizo',
    CNY: 'Yuan Chino',
    MXN: 'Peso Mexicano',
    BRL: 'Real Brasileño',
    bitcoin: 'Bitcoin (BTC)',
    ethereum: 'Ethereum (ETH)',
    ripple: 'XRP (Ripple)',
    litecoin: 'Litecoin (LTC)',
    cardano: 'Cardano (ADA)',
    polkadot: 'Polkadot (DOT)',
    binancecoin: 'Binance Coin (BNB)',
    dogecoin: 'Dogecoin (DOGE)',
    solana: 'Solana (SOL)',
    tron: 'TRON (TRX)'
};

const state = {
    currentTab: 'currency',
    rates: {},
    cryptoRates: {},
    lastUpdate: new Date(),
    isLoading: false,
    history: []
};

function formatCurrency(value, currency = 'USD') {
    if (currency === 'bitcoin' || currency === 'ethereum' || currency === 'litecoin') {
        return parseFloat(value).toFixed(8);
    }
    return parseFloat(value).toFixed(4);
}

function updateLastUpdateInfo() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = state.lastUpdate.toLocaleString();
    }
}

async function fetchCurrencyRates() {
    state.isLoading = true;
    renderConverter();
    try {
        const response = await axios.get(API.CURRENCY);
        state.rates = response.data.rates;
        state.lastUpdate = new Date();
        updateLastUpdateInfo();
    } catch (error) {
        Modal.alert('Error', 'No se pudieron cargar los tipos de cambio. Por favor, inténtelo de nuevo más tarde.');
    } finally {
        state.isLoading = false;
        renderConverter();
    }
}

async function fetchCryptoRates() {
    state.isLoading = true;
    renderConverter();
    try {
        const ids = DEFAULT_CURRENCIES.CRYPTO.join(',');
        const vsCurrencies = 'usd,eur,gbp';
        const response = await axios.get(`${API.CRYPTO}?ids=${ids}&vs_currencies=${vsCurrencies}`);
        state.cryptoRates = response.data;
        state.lastUpdate = new Date();
        updateLastUpdateInfo();
    } catch (error) {
        Modal.alert('Error', 'No se pudieron cargar los precios de las criptomonedas. Por favor, inténtelo de nuevo más tarde.');
    } finally {
        state.isLoading = false;
        renderConverter();
    }
}

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!state.rates || Object.keys(state.rates).length === 0) return null;
    let valueInUSD = fromCurrency === 'USD' ? amount : amount / state.rates[fromCurrency];
    return toCurrency === 'USD' ? valueInUSD : valueInUSD * state.rates[toCurrency];
}

function convertCrypto(amount, fromCrypto, toCurrency) {
    if (!state.cryptoRates || Object.keys(state.cryptoRates).length === 0) return null;
    let result = 0;
    if (DEFAULT_CURRENCIES.CRYPTO.includes(toCurrency)) {
        const fromValueInUSD = state.cryptoRates[fromCrypto].usd * amount;
        result = fromValueInUSD / state.cryptoRates[toCurrency].usd;
    } else {
        if (state.cryptoRates[fromCrypto][toCurrency.toLowerCase()]) {
            result = state.cryptoRates[fromCrypto][toCurrency.toLowerCase()] * amount;
        } else {
            const valueInUSD = state.cryptoRates[fromCrypto].usd * amount;
            result = convertCurrency(valueInUSD, 'USD', toCurrency);
        }
    }
    return result;
}

function saveToHistory(fromAmount, fromCurrency, toAmount, toCurrency) {
    const conversion = {
        id: Date.now(),
        date: new Date(),
        fromAmount: parseFloat(fromAmount),
        fromCurrency,
        toAmount: parseFloat(toAmount),
        toCurrency
    };
    state.history.unshift(conversion);
    if (state.history.length > 10) state.history.pop();
    renderHistoricRates();
}

function performConversion() {
    const amount = parseFloat(document.getElementById('amount').value);
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const resultElement = document.getElementById('result');

    if (isNaN(amount) || amount <= 0) {
        Modal.alert('Error', 'Por favor, ingrese un monto válido mayor que cero.');
        return;
    }

    if (fromCurrency === toCurrency) {
        resultElement.textContent = `${formatCurrency(amount)} ${fromCurrency} = ${formatCurrency(amount)} ${toCurrency}`;
        return;
    }

    let result = state.currentTab === 'currency'
        ? convertCurrency(amount, fromCurrency, toCurrency)
        : convertCrypto(amount, fromCurrency, toCurrency);

    if (result !== null) {
        resultElement.textContent = `${formatCurrency(amount)} ${CURRENCY_NAMES[fromCurrency] || fromCurrency} = ${formatCurrency(result)} ${CURRENCY_NAMES[toCurrency] || toCurrency}`;
        saveToHistory(amount, fromCurrency, result, toCurrency);
    } else {
        resultElement.textContent = 'No hay datos disponibles para realizar la conversión.';
    }
}

function generateCurrencySelectors(type) {
    const currencies = type === 'currency' ? DEFAULT_CURRENCIES.FIAT : DEFAULT_CURRENCIES.CRYPTO;
    let fromOptions = '', toOptions = '';
    currencies.forEach(currency => {
        const label = CURRENCY_NAMES[currency] || currency;
        fromOptions += `<option value="${currency}">${label}</option>`;
        toOptions += `<option value="${currency}">${label}</option>`;
    });
    if (type === 'crypto') {
        DEFAULT_CURRENCIES.FIAT.forEach(currency => {
            const label = CURRENCY_NAMES[currency] || currency;
            toOptions += `<option value="${currency}">${label}</option>`;
        });
    }
    return { fromOptions, toOptions };
}

function renderConverter() {
    const container = document.getElementById('converterContainer');
    const type = state.currentTab;
    if (state.isLoading) {
        container.innerHTML = `<div class="converter-card"><div class="loader"></div><p style="text-align: center; margin-top: 10px;">Cargando datos de ${type === 'currency' ? 'monedas' : 'criptomonedas'}...</p></div>`;
        return;
    }
    const { fromOptions, toOptions } = generateCurrencySelectors(type);
    const title = type === 'currency' ? 'Conversor de Monedas' : 'Conversor de Criptomonedas';
    const defaultAmount = type === 'currency' ? '100' : '1';
    const defaultFrom = type === 'currency' ? 'USD' : 'bitcoin';
    const defaultTo = type === 'currency' ? 'EUR' : 'ethereum';

    container.innerHTML = `
        <div class="converter-card">
            <h2 style="margin-bottom: 20px; color: #00FF14;">${title}</h2>
            <div class="input-group">
                <label for="amount">Cantidad</label>
                <input type="number" id="amount" placeholder="Ingrese la cantidad" value="${defaultAmount}" min="0" step="any">
            </div>
            <div class="input-group">
                <label for="fromCurrency">De</label>
                <select id="fromCurrency">${fromOptions}</select>
            </div>
            <div class="input-group">
                <label for="toCurrency">A</label>
                <select id="toCurrency">${toOptions}</select>
            </div>
            <button id="convertButton">Convertir</button>
            <div class="result" id="result">Aquí aparecerá el resultado de la conversión</div>
        </div>`;

    document.getElementById('fromCurrency').value = defaultFrom;
    document.getElementById('toCurrency').value = defaultTo;
    document.getElementById('convertButton').addEventListener('click', performConversion);
}

function renderHistoricRates() {
    const container = document.getElementById('historicRates');
    if (state.history.length === 0) {
        container.innerHTML = '';
        return;
    }
    let tableRows = '';
    state.history.forEach(item => {
        const fromName = CURRENCY_NAMES[item.fromCurrency] || item.fromCurrency;
        const toName = CURRENCY_NAMES[item.toCurrency] || item.toCurrency;
        tableRows += `
            <tr>
                <td>${item.date.toLocaleString()}</td>
                <td>${formatCurrency(item.fromAmount)} ${fromName}</td>
                <td>${formatCurrency(item.toAmount)} ${toName}</td>
            </tr>`;
    });
    container.innerHTML = `<div class="converter-card"><h2 style="margin-bottom: 20px; color: #00FF14;">Historial de Conversiones</h2><table class="rate-table"><thead><tr><th>Fecha</th><th>De</th><th>A</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
}

function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    tabName === 'currency' ? fetchCurrencyRates() : fetchCryptoRates();
}

function init() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    switchTab('currency');
    updateLastUpdateInfo();
}

document.addEventListener('DOMContentLoaded', init);
