// State management
let people = JSON.parse(localStorage.getItem('moneyTracker_people')) || [];
let bankTransactions = JSON.parse(localStorage.getItem('moneyTracker_bank')) || [];
let activePersonId = null;

// DOM Elements
const totalAmountView = document.getElementById('totalAmountView');
const bankAmountView = document.getElementById('bankAmountView');
const peopleList = document.getElementById('peopleList');
const bankTxList = document.getElementById('bankTxList');

function saveData() {
    localStorage.setItem('moneyTracker_people', JSON.stringify(people));
    localStorage.setItem('moneyTracker_bank', JSON.stringify(bankTransactions));
}

function updateUI() {
    renderPeopleList();
    renderBankList();
    calculateTotals();
    if (activePersonId !== null) {
        renderPersonDetails();
    }
}

function calculateTotals() {
    let bankTotal = 0;
    bankTransactions.forEach(tx => {
        bankTotal += Number(tx.signedAmount);
    });

    let peopleTotal = 0;
    people.forEach(p => {
        p.transactions.forEach(tx => {
            peopleTotal += Number(tx.signedAmount);
        });
    });

    let grandTotal = bankTotal + peopleTotal;

    bankAmountView.textContent = `$${bankTotal.toFixed(2)}`;
    bankAmountView.className = `balance-amount ${bankTotal >= 0 ? 'positive' : 'negative'}`;

    totalAmountView.textContent = `$${grandTotal.toFixed(2)}`;
    totalAmountView.className = `balance-amount ${grandTotal >= 0 ? 'positive' : 'negative'}`;
}

// --- TAB SWITCHING ---
window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tabName === 'people') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('peopleTab').classList.add('active');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('bankTab').classList.add('active');
        closePersonView();
    }
}

// --- PEOPLE LEDGER LOGIC ---
const addPersonForm = document.getElementById('addPersonForm');
addPersonForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('personName').value;
    people.push({
        id: Date.now().toString(),
        name: name,
        transactions: []
    });
    document.getElementById('personName').value = '';
    saveData();
    updateUI();
});

function renderPeopleList() {
    peopleList.innerHTML = '';
    if (people.length === 0) {
        peopleList.innerHTML = '<li style="color: var(--text-secondary); text-align: center; padding: 10px 0;">No people added yet</li>';
        return;
    }

    people.forEach((person) => {
        let personBalance = 0;
        person.transactions.forEach(tx => personBalance += Number(tx.signedAmount));

        const li = document.createElement('li');
        li.className = 'list-item';
        li.onclick = () => openPersonView(person.id);

        li.innerHTML = `
            <div class="item-info">
                <span class="item-title">${escapeHtml(person.name)}</span>
                <span class="item-sub">${person.transactions.length} transactions</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="item-amount ${personBalance >= 0 ? 'positive' : 'negative'}">
                    ${personBalance >= 0 ? '+' : ''}$${personBalance.toFixed(2)}
                </span>
                <button class="delete-btn" onclick="event.stopPropagation(); removePerson('${person.id}')">&times;</button>
            </div>
        `;
        peopleList.appendChild(li);
    });
}

window.openPersonView = function (id) {
    activePersonId = id;
    document.getElementById('peopleMainView').style.display = 'none';
    document.getElementById('personDetailView').style.display = 'block';
    renderPersonDetails();
}

window.closePersonView = function () {
    activePersonId = null;
    document.getElementById('personDetailView').style.display = 'none';
    document.getElementById('peopleMainView').style.display = 'block';
}

function renderPersonDetails() {
    const person = people.find(p => p.id === activePersonId);
    if (!person) return;

    document.getElementById('detailPersonName').textContent = person.name;
    const txList = document.getElementById('personTxList');
    txList.innerHTML = '';

    if (person.transactions.length === 0) {
        txList.innerHTML = '<li style="color: var(--text-secondary); text-align: center; padding: 10px 0;">No transactions recorded</li>';
        return;
    }

    person.transactions.forEach((tx, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'default';

        const formatted = `${tx.signedAmount >= 0 ? '+' : ''}$${Number(tx.signedAmount).toFixed(2)}`;
        li.innerHTML = `
            <div class="item-info">
                <span class="item-title">${escapeHtml(tx.note)}</span>
                <span class="item-sub">${tx.type.toUpperCase()}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="item-amount ${tx.signedAmount >= 0 ? 'positive' : 'negative'}">${formatted}</span>
                <button class="delete-btn" onclick="removePersonTx(${index})">&times;</button>
            </div>
        `;
        txList.appendChild(li);
    });
}

const addPersonTxForm = document.getElementById('addPersonTxForm');
addPersonTxForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const person = people.find(p => p.id === activePersonId);
    if (!person) return;

    const rawAmount = parseFloat(document.getElementById('txAmount').value);
    const note = document.getElementById('txNote').value;
    const type = document.getElementById('txType').value;

    const signedAmount = type === 'give' ? Math.abs(rawAmount) : -Math.abs(rawAmount);

    person.transactions.unshift({
        amount: rawAmount,
        signedAmount: signedAmount,
        note: note,
        type: type,
        date: new Date().toISOString()
    });

    document.getElementById('txAmount').value = '';
    document.getElementById('txNote').value = '';
    saveData();
    updateUI();
});

window.removePersonTx = function (index) {
    const person = people.find(p => p.id === activePersonId);
    if (!person) return;
    person.transactions.splice(index, 1);
    saveData();
    updateUI();
}

window.removePerson = function (id) {
    people = people.filter(p => p.id !== id);
    saveData();
    updateUI();
}

// --- BANK EXPENSES LOGIC ---
const addBankTxForm = document.getElementById('addBankTxForm');
addBankTxForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const rawAmount = parseFloat(document.getElementById('bankAmount').value);
    const note = document.getElementById('bankNote').value;
    const type = document.getElementById('bankType').value;

    const signedAmount = type === 'income' ? Math.abs(rawAmount) : -Math.abs(rawAmount);

    bankTransactions.unshift({
        amount: rawAmount,
        signedAmount: signedAmount,
        note: note,
        type: type,
        date: new Date().toISOString()
    });

    document.getElementById('bankAmount').value = '';
    document.getElementById('bankNote').value = '';
    saveData();
    updateUI();
});

function renderBankList() {
    bankTxList.innerHTML = '';
    if (bankTransactions.length === 0) {
        bankTxList.innerHTML = '<li style="color: var(--text-secondary); text-align: center; padding: 10px 0;">No bank transactions yet</li>';
        return;
    }

    bankTransactions.forEach((tx, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.cursor = 'default';

        const formatted = `${tx.signedAmount >= 0 ? '+' : ''}$${Number(tx.signedAmount).toFixed(2)}`;
        li.innerHTML = `
            <div class="item-info">
                <span class="item-title">${escapeHtml(tx.note)}</span>
                <span class="item-sub">${tx.type.toUpperCase()}</span>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="item-amount ${tx.signedAmount >= 0 ? 'positive' : 'negative'}">${formatted}</span>
                <button class="delete-btn" onclick="removeBankTx(${index})">&times;</button>
            </div>
        `;
        bankTxList.appendChild(li);
    });
}

window.removeBankTx = function (index) {
    bankTransactions.splice(index, 1);
    saveData();
    updateUI();
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Initial launch render
updateUI();