"use strict";

/* =========================================
   PENNYWISE PRO
   Personal Finance Manager
========================================= */

const STORAGE_KEY = "pennywise_pro_data_v1";

const DEFAULT_DATA = {
    transactions: [],
    goals: [],
    monthlyBudget: 10000,
    currency: "INR",
    profileName: "",
    darkMode: false
};

let appData = loadData();
let toastTimer;
let resizeTimer;

/* =========================================
   UTILITIES
========================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentMonth() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isThisMonth(dateString) {
    return String(dateString || "").slice(0, 7) === getCurrentMonth();
}

function money(amount) {
    const currency = appData.currency || "INR";

    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    } catch (error) {
        return "₹" + (Number(amount) || 0).toFixed(2);
    }
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const parts = String(dateString).split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return escapeHTML(dateString);
    }

    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getMonthName(date) {
    return date.toLocaleDateString("en-IN", { month: "short" });
}

function showToast(message) {
    const toast = $("#toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (error) {
        console.error("Unable to save application data:", error);
        showToast("Unable to save data. Check your browser storage.");
    }
}

function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return structuredClone(DEFAULT_DATA);
        }

        const parsed = JSON.parse(stored);

        return {
            ...structuredClone(DEFAULT_DATA),
            ...parsed,
            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions
                : [],
            goals: Array.isArray(parsed.goals)
                ? parsed.goals
                : []
        };
    } catch (error) {
        console.error("Unable to load saved data:", error);
        return structuredClone(DEFAULT_DATA);
    }
}

function getMonthlyTransactions() {
    return appData.transactions.filter(transaction =>
        isThisMonth(transaction.date)
    );
}

function getMonthlyIncome() {
    return getMonthlyTransactions()
        .filter(transaction => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getMonthlyExpenses() {
    return getMonthlyTransactions()
        .filter(transaction => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getAllIncome() {
    return appData.transactions
        .filter(transaction => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getAllExpenses() {
    return appData.transactions
        .filter(transaction => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function getBalance() {
    return getAllIncome() - getAllExpenses();
}

function getCategoryIcon(category) {
    const icons = {
        Food: "🍽️",
        Transport: "🚗",
        Shopping: "🛍️",
        Bills: "📄",
        Education: "📚",
        Health: "💊",
        Entertainment: "🎬",
        Salary: "💼",
        Freelance: "💻",
        Investment: "📈",
        Other: "💳"
    };

    return icons[category] || "💳";
}

const CHART_COLORS = [
    "#16866a",
    "#e9ad68",
    "#547bd7",
    "#bd80cc",
    "#e27676",
    "#65b9c7",
    "#a4b86a",
    "#ed8f58",
    "#7e91a8",
    "#d0a5a0",
    "#8c79c7"
];

/* =========================================
   NAVIGATION
========================================= */

const PAGE_TITLES = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    budgets: "Budgets",
    analytics: "Analytics",
    savings: "Savings Goals",
    settings: "Settings"
};

function navigateTo(pageId) {
    if (!PAGE_TITLES[pageId]) return;

    $$(".page").forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    $$(".nav-item[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    $("#pageTitle").textContent = PAGE_TITLES[pageId];
    $("#breadcrumbPage").textContent = PAGE_TITLES[pageId];

    $("#sidebar").classList.remove("open");

    if (pageId === "analytics") {
        requestAnimationFrame(drawAllCharts);
    }

    if (pageId === "dashboard") {
        requestAnimationFrame(drawAllCharts);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.page);
    });
});

$$("[data-goto]").forEach(button => {
    button.addEventListener("click", () => {
        navigateTo(button.dataset.goto);
    });
});

$("#mobileMenu").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

/* =========================================
   MODALS
========================================= */

function openModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add("show");

        const firstInput = modal.querySelector(
            "input:not([type='hidden']):not([type='radio']), select"
        );

        setTimeout(() => {
            firstInput?.focus();
        }, 80);
    }
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove("show");
}

$$("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

$$(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.classList.remove("show");
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        $$(".modal-overlay.show").forEach(modal => {
            modal.classList.remove("show");
        });
    }
});

/* =========================================
   TRANSACTIONS
========================================= */

function resetTransactionForm() {
    $("#transactionForm").reset();

    $("#transactionId").value = "";
    $("#transactionDate").value = localDateString();
    $("#transactionModalTitle").textContent = "Add Transaction";
    $("#saveTransactionButton").textContent = "Save Transaction";

    $('input[name="transactionType"][value="expense"]').checked = true;

    updateCategoryOptions();
}

function openTransactionModal(transaction = null) {
    resetTransactionForm();

    if (transaction) {
        $("#transactionId").value = transaction.id;
        $("#transactionTitle").value = transaction.title;
        $("#transactionAmount").value = transaction.amount;
        $("#transactionCategory").value = transaction.category;
        $("#transactionDate").value = transaction.date;
        $("#transactionNote").value = transaction.note || "";

        const typeRadio = document.querySelector(
            `input[name="transactionType"][value="${transaction.type}"]`
        );

        if (typeRadio) {
            typeRadio.checked = true;
        }

        $("#transactionModalTitle").textContent = "Edit Transaction";
        $("#saveTransactionButton").textContent = "Update Transaction";
    }

    updateCategoryOptions();
    openModal("transactionModal");
}

$("#topAddButton").addEventListener("click", () => {
    openTransactionModal();
});

$("#transactionAddButton").addEventListener("click", () => {
    openTransactionModal();
});

function updateCategoryOptions() {
    const type = document.querySelector(
        'input[name="transactionType"]:checked'
    )?.value || "expense";

    const categorySelect = $("#transactionCategory");
    const currentValue = categorySelect.value;

    const expenseCategories = [
        "Food",
        "Transport",
        "Shopping",
        "Bills",
        "Education",
        "Health",
        "Entertainment",
        "Other"
    ];

    const incomeCategories = [
        "Salary",
        "Freelance",
        "Investment",
        "Other"
    ];

    const categories = type === "income"
        ? incomeCategories
        : expenseCategories;

    categorySelect.innerHTML = categories.map(category =>
        `<option value="${category}">${category}</option>`
    ).join("");

    if (categories.includes(currentValue)) {
        categorySelect.value = currentValue;
    }
}

$$('input[name="transactionType"]').forEach(radio => {
    radio.addEventListener("change", updateCategoryOptions);
});

$("#transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("#transactionId").value;
    const title = $("#transactionTitle").value.trim();
    const amount = Number($("#transactionAmount").value);
    const category = $("#transactionCategory").value;
    const date = $("#transactionDate").value;
    const note = $("#transactionNote").value.trim();

    const type = document.querySelector(
        'input[name="transactionType"]:checked'
    )?.value;

    if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
        showToast("Please enter valid transaction details.");
        return;
    }

    if (date > "9999-12-31") {
        showToast("Please enter a valid date.");
        return;
    }

    const existingTransaction = id
        ? appData.transactions.find(item => item.id === id)
        : null;

    const transaction = {
        id: id || makeId(),
        title,
        amount,
        category,
        date,
        note,
        type: type || "expense",
        createdAt: existingTransaction?.createdAt || Date.now()
    };

    if (id) {
        const index = appData.transactions.findIndex(item => item.id === id);

        if (index !== -1) {
            appData.transactions[index] = transaction;
        } else {
            appData.transactions.push(transaction);
        }

        showToast("Transaction updated successfully.");
    } else {
        appData.transactions.push(transaction);
        showToast("Transaction added successfully.");
    }

    saveData();
    refreshApp();
    closeModal("transactionModal");
});

function deleteTransaction(id) {
    const transaction = appData.transactions.find(item => item.id === id);

    if (!transaction) return;

    const confirmed = window.confirm(
        `Delete "${transaction.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    appData.transactions = appData.transactions.filter(item => item.id !== id);

    saveData();
    refreshApp();

    showToast("Transaction deleted.");
}

function renderTransactionRow(transaction, includeActions = false) {
    const icon = getCategoryIcon(transaction.category);

    const amountClass = transaction.type === "income"
        ? "amount-income"
        : "amount-expense";

    const amountPrefix = transaction.type === "income" ? "+" : "−";

    const typePill = `
        <span class="type-pill ${transaction.type}">
            ${transaction.type === "income" ? "Income" : "Expense"}
        </span>
    `;

    const actions = includeActions
        ? `
            <div class="action-buttons">
                <button class="action-button" data-edit-transaction="${escapeHTML(transaction.id)}" aria-label="Edit transaction">Edit</button>
                <button class="action-button delete" data-delete-transaction="${escapeHTML(transaction.id)}" aria-label="Delete transaction">Delete</button>
            </div>
        `
        : "";

    return `
        <tr>
            <td>
                <div class="transaction-name">
                    <span class="transaction-icon">${icon}</span>
                    <span>${escapeHTML(transaction.title)}</span>
                </div>
            </td>

            <td>${escapeHTML(transaction.category)}</td>

            ${includeActions ? `<td>${typePill}</td>` : ""}

            <td>${formatDate(transaction.date)}</td>

            <td class="${amountClass}">
                ${amountPrefix}${money(transaction.amount)}
            </td>

            ${includeActions ? `<td>${actions}</td>` : ""}
        </tr>
    `;
}

function renderRecentTransactions() {
    const container = $("#recentTransactions");

    const sorted = [...appData.transactions].sort((a, b) => {
        return String(b.date).localeCompare(String(a.date))
            || Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });

    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No transactions yet. Add your first transaction!
                </td>
            </tr>
        `;

        return;
    }

    container.innerHTML = recent.map(transaction =>
        renderTransactionRow(transaction, false)
    ).join("");
}

function getFilteredTransactions() {
    const search = $("#searchTransactions").value.trim().toLowerCase();
    const type = $("#typeFilter").value;
    const category = $("#categoryFilter").value;

    return [...appData.transactions]
        .filter(transaction => {
            const matchesSearch = [
                transaction.title,
                transaction.category,
                transaction.note || ""
            ].join(" ").toLowerCase().includes(search);

            const matchesType = type === "all" || transaction.type === type;

            const matchesCategory = category === "all"
                || transaction.category === category;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => {
            return String(b.date).localeCompare(String(a.date))
                || Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
}

function renderAllTransactions() {
    const transactions = getFilteredTransactions();
    const container = $("#allTransactions");

    if (transactions.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No matching transactions found.
                </td>
            </tr>
        `;
    } else {
        container.innerHTML = transactions.map(transaction =>
            renderTransactionRow(transaction, true)
        ).join("");
    }

    $("#transactionFooter").textContent =
        `Showing ${transactions.length} of ${appData.transactions.length} transactions`;

    $("#transactionCount").textContent = appData.transactions.length;
    $("#transactionIncome").textContent = money(getMonthlyIncome());
    $("#transactionExpenses").textContent = money(getMonthlyExpenses());

    renderCategoryFilter();
}

function renderCategoryFilter() {
    const select = $("#categoryFilter");
    const currentValue = select.value;

    const categories = [...new Set(
        appData.transactions.map(transaction => transaction.category)
    )].sort();

    select.innerHTML = `
        <option value="all">All categories</option>
        ${categories.map(category =>
            `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
        ).join("")}
    `;

    if (categories.includes(currentValue)) {
        select.value = currentValue;
    }
}

$("#allTransactions").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-transaction]");
    const deleteButton = event.target.closest("[data-delete-transaction]");

    if (editButton) {
        const transaction = appData.transactions.find(item =>
            item.id === editButton.dataset.editTransaction
        );

        if (transaction) {
            openTransactionModal(transaction);
        }
    }

    if (deleteButton) {
        deleteTransaction(deleteButton.dataset.deleteTransaction);
    }
});

$("#searchTransactions").addEventListener("input", renderAllTransactions);
$("#typeFilter").addEventListener("change", renderAllTransactions);
$("#categoryFilter").addEventListener("change", renderAllTransactions);

$("#clearFilters").addEventListener("click", () => {
    $("#searchTransactions").value = "";
    $("#typeFilter").value = "all";
    $("#categoryFilter").value = "all";

    renderAllTransactions();
});

/* =========================================
   CSV EXPORT
========================================= */

$("#exportButton").addEventListener("click", () => {
    const transactions = getFilteredTransactions();

    if (transactions.length === 0) {
        showToast("There are no transactions to export.");
        return;
    }

    const headers = [
        "Description",
        "Type",
        "Category",
        "Amount",
        "Date",
        "Note"
    ];

    const rows = transactions.map(transaction => [
        transaction.title,
        transaction.type,
        transaction.category,
        transaction.amount,
        transaction.date,
        transaction.note || ""
    ]);

    function csvEscape(value) {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection in text fields.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return `"${text.replace(/"/g, '""')}"`;
    }

    const csv = [headers, ...rows]
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pennywise-transactions-${localDateString()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("CSV exported successfully.");
});

/* =========================================
   BUDGET MANAGEMENT
========================================= */

function openBudgetModal() {
    $("#budgetAmount").value = appData.monthlyBudget;
    openModal("budgetModal");
}

$("#editBudgetButton").addEventListener("click", openBudgetModal);

$("#budgetForm").addEventListener("submit", event => {
    event.preventDefault();

    const amount = Number($("#budgetAmount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Enter a valid budget amount.");
        return;
    }

    appData.monthlyBudget = amount;

    saveData();
    refreshApp();

    closeModal("budgetModal");

    showToast("Monthly budget updated.");
});

function renderBudget() {
    const budget = Math.max(0, Number(appData.monthlyBudget) || 0);
    const spent = getMonthlyExpenses();
    const remaining = budget - spent;

    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const displayPercentage = Math.round(percentage);
    const progressWidth = Math.min(percentage, 100);

    const isOverBudget = spent > budget;
    const isNearBudget = !isOverBudget && percentage >= 80;

    $("#dashboardBudget").textContent = money(budget);
    $("#budgetSpentText").textContent = `${money(spent)} spent`;
    $("#budgetRemainingText").textContent = `${money(remaining)} left`;

    $("#dashboardBudgetProgress").style.width = `${progressWidth}%`;

    $("#budgetBadge").textContent = isOverBudget
        ? "Over budget"
        : isNearBudget
            ? "Almost there"
            : "On track";

    $("#budgetBadge").style.background = isOverBudget
        ? "#fff0ed"
        : isNearBudget
            ? "#fff5d9"
            : "";

    $("#budgetBadge").style.color = isOverBudget
        ? "#d76060"
        : isNearBudget
            ? "#b38324"
            : "";

    $("#dashboardBudgetProgress").style.background = isOverBudget
        ? "#dc6262"
        : isNearBudget
            ? "#dc9a38"
            : "";

    $("#budgetInsight").textContent = isOverBudget
        ? `⚠ You have exceeded your monthly budget by ${money(Math.abs(remaining))}. Review your expenses.`
        : isNearBudget
            ? `⚠ You have used ${displayPercentage}% of your budget. Only ${money(remaining)} remains.`
            : `✦ You have ${money(remaining)} available. Keep tracking your expenses to stay on budget.`;

    $("#budgetPageTotal").textContent = money(budget);
    $("#budgetPageSpent").textContent = money(spent);
    $("#budgetPageRemaining").textContent = money(remaining);
    $("#budgetPagePercentage").textContent = `${displayPercentage}%`;

    $("#budgetPageProgress").style.width = `${progressWidth}%`;
    $("#budgetPageProgress").style.background = isOverBudget
        ? "#dc6262"
        : isNearBudget
            ? "#dc9a38"
            : "";

    $("#budgetPageBadge").textContent = isOverBudget
        ? "Over budget"
        : isNearBudget
            ? "Almost there"
            : "On track";

    $("#budgetPageBadge").style.background = isOverBudget
        ? "#fff0ed"
        : isNearBudget
            ? "#fff5d9"
            : "";

    $("#budgetPageBadge").style.color = isOverBudget
        ? "#d76060"
        : isNearBudget
            ? "#b38324"
            : "";

    $("#budgetPageProgressSpent").textContent = `${money(spent)} spent`;
    $("#budgetPageProgressTotal").textContent = `${money(budget)} budget`;

    $("#budgetPageInsight").textContent = isOverBudget
        ? `You are ${money(Math.abs(remaining))} over your budget. Consider reducing non-essential spending.`
        : isNearBudget
            ? `You have used ${displayPercentage}% of your budget. Plan the rest of the month carefully.`
            : `Your spending is within the budget. You have ${money(remaining)} remaining.`;
}

/* =========================================
   SAVINGS GOALS
========================================= */

function openGoalModal(goal = null) {
    $("#goalForm").reset();

    $("#goalId").value = "";
    $("#goalSaved").value = "0";
    $("#goalIcon").value = "💻";
    $("#goalModalTitle").textContent = "Create Savings Goal";

    if (goal) {
        $("#goalId").value = goal.id;
        $("#goalName").value = goal.name;
        $("#goalTarget").value = goal.target;
        $("#goalSaved").value = goal.saved;
        $("#goalIcon").value = goal.icon || "🎯";

        $("#goalModalTitle").textContent = "Edit Savings Goal";
    }

    openModal("goalModal");
}

$("#addGoalButton").addEventListener("click", () => {
    openGoalModal();
});

$("#goalForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("#goalId").value;
    const name = $("#goalName").value.trim();
    const target = Number($("#goalTarget").value);
    const saved = Number($("#goalSaved").value);
    const icon = $("#goalIcon").value;

    if (
        !name ||
        !Number.isFinite(target) ||
        !Number.isFinite(saved) ||
        target <= 0 ||
        saved < 0
    ) {
        showToast("Please enter valid goal details.");
        return;
    }

    const goal = {
        id: id || makeId(),
        name,
        target,
        saved: Math.min(saved, target),
        icon
    };

    if (id) {
        const index = appData.goals.findIndex(item => item.id === id);

        if (index !== -1) {
            appData.goals[index] = goal;
        } else {
            appData.goals.push(goal);
        }

        showToast("Savings goal updated.");
    } else {
        appData.goals.push(goal);
        showToast("Savings goal created.");
    }

    saveData();
    refreshApp();
    closeModal("goalModal");
});

function deleteGoal(id) {
    const goal = appData.goals.find(item => item.id === id);

    if (!goal) return;

    if (!window.confirm(`Delete the savings goal "${goal.name}"?`)) {
        return;
    }

    appData.goals = appData.goals.filter(item => item.id !== id);

    saveData();
    refreshApp();

    showToast("Savings goal deleted.");
}

function renderGoals() {
    const goals = appData.goals;

    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.target), 0);
    const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.saved), 0);
    const completed = goals.filter(goal => Number(goal.saved) >= Number(goal.target)).length;

    $("#totalGoalTarget").textContent = money(totalTarget);
    $("#totalGoalSaved").textContent = money(totalSaved);
    $("#completedGoals").textContent = completed;

    const container = $("#goalsGrid");

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="panel" style="grid-column: 1 / -1; text-align: center; padding: 45px 20px;">
                <div style="font-size: 35px; margin-bottom: 12px;">🎯</div>
                <h3 style="font-size: 16px; margin-bottom: 8px;">Start with your first goal</h3>
                <p style="font-size: 11px; color: var(--text-light); margin-bottom: 18px;">
                    Create a savings goal and track your progress over time.
                </p>
                <button class="primary-button" id="emptyGoalButton">＋ Create Goal</button>
            </div>
        `;

        $("#emptyGoalButton").addEventListener("click", () => openGoalModal());

        return;
    }

    container.innerHTML = goals.map(goal => {
        const target = Number(goal.target) || 0;
        const saved = Number(goal.saved) || 0;
        const percentage = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
        const remaining = Math.max(target - saved, 0);
        const isCompleted = saved >= target;

        return `
            <article class="goal-card">

                <div class="goal-card-top">
                    <div class="goal-emoji">${escapeHTML(goal.icon || "🎯")}</div>

                    <span class="budget-badge" style="${
                        isCompleted
                            ? "background:var(--primary-light);color:var(--primary)"
                            : ""
                    }">
                        ${isCompleted ? "✓ Completed" : `${Math.round(percentage)}% saved`}
                    </span>
                </div>

                <h3>${escapeHTML(goal.name)}</h3>

                <p>${isCompleted
                    ? "Congratulations! You reached your goal."
                    : `${money(remaining)} left to reach your target.`
                }</p>

                <div class="goal-amounts">
                    <strong>${money(saved)}</strong>
                    <span>of ${money(target)}</span>
                </div>

                <div class="progress-track">
                    <div class="progress-fill" style="width:${percentage}%"></div>
                </div>

                <div class="progress-info">
                    <span>Progress</span>
                    <span>${Math.round(percentage)}%</span>
                </div>

                <div class="goal-card-actions">
                    <button class="secondary-button" data-edit-goal="${escapeHTML(goal.id)}">Edit Goal</button>
                    <button class="secondary-button" data-delete-goal="${escapeHTML(goal.id)}">Delete</button>
                </div>

            </article>
        `;
    }).join("");
}

$("#goalsGrid").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-goal]");
    const deleteButton = event.target.closest("[data-delete-goal]");

    if (editButton) {
        const goal = appData.goals.find(item => item.id === editButton.dataset.editGoal);

        if (goal) {
            openGoalModal(goal);
        }
    }

    if (deleteButton) {
        deleteGoal(deleteButton.dataset.deleteGoal);
    }
});

/* =========================================
   CHARTS
========================================= */

function prepareCanvas(canvas) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    const context = canvas.getContext("2d");

    if (!context) return null;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    return {
        context,
        width: rect.width,
        height: rect.height
    };
}

function getMonthlyChartData() {
    const months = [];

    const now = new Date();

    for (let offset = 5; offset >= 0; offset--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - offset,
            1
        );

        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const monthTransactions = appData.transactions.filter(transaction =>
            String(transaction.date || "").slice(0, 7) === key
        );

        const income = monthTransactions
            .filter(transaction => transaction.type === "income")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        const expenses = monthTransactions
            .filter(transaction => transaction.type === "expense")
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        months.push({
            key,
            label: getMonthName(date),
            income,
            expenses
        });
    }

    return months;
}

function drawBarChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    const prepared = prepareCanvas(canvas);

    if (!prepared) return;

    const { context: ctx, width, height } = prepared;

    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.body);
    const gridColor = styles.getPropertyValue("--border").trim() || "#e8eeeb";
    const textColor = styles.getPropertyValue("--text-light").trim() || "#89958f";
    const incomeColor = "#16866a";
    const expenseColor = "#e9ad68";

    const data = getMonthlyChartData();

    const left = 42;
    const right = 10;
    const top = 15;
    const bottom = 33;

    const chartWidth = Math.max(0, width - left - right);
    const chartHeight = Math.max(0, height - top - bottom);

    const maxValue = Math.max(
        1,
        ...data.flatMap(item => [item.income, item.expenses])
    );

    const roundedMax = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const axisMax = Math.ceil(maxValue / roundedMax) * roundedMax;

    ctx.font = "10px Inter, Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let step = 0; step <= 4; step++) {
        const value = axisMax * step / 4;
        const y = top + chartHeight - chartHeight * step / 4;

        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();

        ctx.fillStyle = textColor;

        const compactValue = value >= 100000
            ? `${(value / 100000).toFixed(1)}L`
            : value >= 1000
                ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
                : String(Math.round(value));

        ctx.fillText(compactValue, left - 8, y);
    }

    const groupWidth = chartWidth / data.length;
    const barWidth = Math.min(20, Math.max(7, groupWidth * 0.23));

    data.forEach((item, index) => {
        const centerX = left + groupWidth * index + groupWidth / 2;

        const incomeHeight = item.income / axisMax * chartHeight;
        const expenseHeight = item.expenses / axisMax * chartHeight;

        const incomeX = centerX - barWidth - 2;
        const expenseX = centerX + 2;

        ctx.fillStyle = incomeColor;

        ctx.beginPath();
        ctx.roundRect(
            incomeX,
            top + chartHeight - incomeHeight,
            barWidth,
            Math.max(0, incomeHeight),
            [4, 4, 0, 0]
        );
        ctx.fill();

        ctx.fillStyle = expenseColor;

        ctx.beginPath();
        ctx.roundRect(
            expenseX,
            top + chartHeight - expenseHeight,
            barWidth,
            Math.max(0, expenseHeight),
            [4, 4, 0, 0]
        );
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = "10px Inter, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillText(
            item.label,
            centerX,
            top + chartHeight + 11
        );
    });
}

function getExpenseCategories() {
    const totals = {};

    getMonthlyTransactions()
        .filter(transaction => transaction.type === "expense")
        .forEach(transaction => {
            const category = transaction.category || "Other";

            totals[category] = (totals[category] || 0) + Number(transaction.amount);
        });

    return Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);
}

function renderCategoryBreakdown() {
    const categories = getExpenseCategories();
    const total = categories.reduce((sum, item) => sum + item[1], 0);

    $("#donutTotal").textContent = money(total);

    const donut = $("#categoryDonut");
    const legend = $("#categoryLegend");

    if (total <= 0) {
        donut.style.background = "conic-gradient(var(--border) 0deg 360deg)";

        legend.innerHTML = `
            <p class="empty-state">Add expenses to see your spending breakdown.</p>
        `;

        return;
    }

    let currentDegree = 0;

    const gradientParts = categories.map((item, index) => {
        const degree = item[1] / total * 360;
        const start = currentDegree;
        const end = currentDegree + degree;

        currentDegree = end;

        return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}deg ${end}deg`;
    });

    donut.style.background = `conic-gradient(${gradientParts.join(", ")})`;

    legend.innerHTML = categories.slice(0, 6).map((item, index) => {
        const percentage = Math.round(item[1] / total * 100);

        return `
            <div class="category-legend-item">
                <div class="category-legend-label">
                    <span class="category-color" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
                    <span>${escapeHTML(item[0])} (${percentage}%)</span>
                </div>

                <strong>${money(item[1])}</strong>
            </div>
        `;
    }).join("");
}

function renderAnalytics() {
    $("#analyticsIncome").textContent = money(getAllIncome());
    $("#analyticsExpenses").textContent = money(getAllExpenses());
    $("#analyticsSavings").textContent = money(getBalance());

    const categories = getExpenseCategories();
    const total = categories.reduce((sum, item) => sum + item[1], 0);

    const container = $("#analyticsCategories");

    if (categories.length === 0) {
        container.innerHTML = `
            <p class="empty-state">No expenses recorded for this month yet.</p>
        `;
    } else {
        container.innerHTML = categories.map((item, index) => {
            const percentage = total > 0 ? item[1] / total * 100 : 0;

            return `
                <div class="analytics-category-row">
                    <span>${escapeHTML(item[0])}</span>

                    <div class="analytics-bar">
                        <div
                            class="analytics-bar-fill"
                            style="width:${percentage}%;background:${CHART_COLORS[index % CHART_COLORS.length]}"
                        ></div>
                    </div>

                    <strong>${money(item[1])}</strong>
                </div>
            `;
        }).join("");
    }

    drawBarChart("analyticsChart");
}

function drawAllCharts() {
    drawBarChart("incomeExpenseChart");
    drawBarChart("analyticsChart");
}

/* =========================================
   DASHBOARD SUMMARY
========================================= */

function renderDashboard() {
    const income = getMonthlyIncome();
    const expenses = getMonthlyExpenses();
    const savings = income - expenses;
    const balance = getBalance();

    $("#totalBalance").textContent = money(balance);
    $("#totalIncome").textContent = money(income);
    $("#totalExpenses").textContent = money(expenses);
    $("#monthlySavings").textContent = money(savings);

    $("#savingsStatus").textContent = savings >= 0
        ? "Positive savings"
        : "Spending exceeds income";

    $("#savingsStatus").className = savings >= 0
        ? "trend-positive"
        : "trend-negative";

    renderRecentTransactions();
    renderCategoryBreakdown();
}

/* =========================================
   SETTINGS
========================================= */

function applyTheme() {
    document.body.classList.toggle("dark-mode", Boolean(appData.darkMode));

    $("#themeToggle").textContent = appData.darkMode ? "☀" : "☾";
    $("#settingsThemeButton").textContent = appData.darkMode
        ? "☀ Switch to Light Mode"
        : "☾ Switch to Dark Mode";
}

function toggleTheme() {
    appData.darkMode = !appData.darkMode;

    applyTheme();
    saveData();

    requestAnimationFrame(drawAllCharts);
}

$("#themeToggle").addEventListener("click", toggleTheme);
$("#settingsThemeButton").addEventListener("click", toggleTheme);

$("#saveSettingsButton").addEventListener("click", () => {
    appData.profileName = $("#profileName").value.trim();

    appData.currency = $("#currencySelect").value;

    saveData();
    refreshApp();

    showToast("Preferences saved successfully.");
});

function renderSettings() {
    $("#profileName").value = appData.profileName || "";
    $("#currencySelect").value = appData.currency || "INR";
}

/* =========================================
   RESET DATA
========================================= */

$("#resetDataButton").addEventListener("click", () => {
    const confirmed = window.confirm(
        "This will permanently delete all locally saved transactions, savings goals, and budget settings. Continue?"
    );

    if (!confirmed) return;

    const preserveTheme = Boolean(appData.darkMode);
    const preserveCurrency = appData.currency || "INR";
    const preserveName = appData.profileName || "";

    appData = structuredClone(DEFAULT_DATA);

    appData.darkMode = preserveTheme;
    appData.currency = preserveCurrency;
    appData.profileName = preserveName;

    saveData();
    applyTheme();
    refreshApp();

    showToast("Your financial data has been reset.");
});

/* =========================================
   REFRESH APPLICATION
========================================= */

function refreshApp() {
    applyTheme();

    renderDashboard();
    renderBudget();
    renderAllTransactions();
    renderGoals();
    renderAnalytics();
    renderSettings();

    $("#footerYear").textContent = new Date().getFullYear();
}

/* =========================================
   INITIALIZE
========================================= */

function initializeApp() {
    $("#todayDate").textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    $("#transactionDate").value = localDateString();
    $("#footerYear").textContent = new Date().getFullYear();

    applyTheme();
    refreshApp();

    // Redraw charts when the browser window changes size.
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            drawAllCharts();
        }, 150);
    });

    // Keep the date selector on today's date when opening a new transaction.
    $("#transactionDate").max = "9999-12-31";
}

initializeApp();