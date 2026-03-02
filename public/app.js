const mainBalance = document.getElementById('mainBalance');
const insightBadge = document.getElementById('insightBadge');
const esencialAmount = document.getElementById('esencialAmount');
const ocioAmount = document.getElementById('ocioAmount');
const esencialBar = document.getElementById('esencialBar');
const ocioBar = document.getElementById('ocioBar');
const transactionsList = document.getElementById('transactionsList');
const viewAllBtn = document.getElementById('viewAllBtn');

const addExpenseModal = document.getElementById('addExpenseModal');
const modalContent = document.getElementById('modalContent');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const addExpenseForm = document.getElementById('addExpenseForm');
const submitExpenseBtn = document.getElementById('submitExpenseBtn');
const deleteExpenseBtn = document.getElementById('deleteExpenseBtn');
const modalTitle = document.getElementById('modalTitle');

const btnMethodMp = document.getElementById('btnMethodMp');
const btnMethodCash = document.getElementById('btnMethodCash');
const btnTypeEsencial = document.getElementById('btnTypeEsencial');
const btnTypeOcio = document.getElementById('btnTypeOcio');

// Vistas principales (referencias DOM para ruteo)
const viewHome = document.getElementById('viewHome');
const viewAnalysis = document.getElementById('viewAnalysis');
const viewAccounts = document.getElementById('viewAccounts');
const viewSettings = document.getElementById('viewSettings');

// Navegación principal (añadidos recientemente con IDs)
const navHome = document.getElementById('navHome');
const navAnalysis = document.getElementById('navAnalysis');
const navAccounts = document.getElementById('navAccounts');
const navSettings = document.getElementById('navSettings');

const btnFilterToday = document.getElementById('btnFilterToday');
const btnFilterWeek = document.getElementById('btnFilterWeek');
const btnFilterMonth = document.getElementById('btnFilterMonth');
const btnFilterAll = document.getElementById('btnFilterAll');
const balanceLabel = document.getElementById('balanceLabel');

const topExpensesList = document.getElementById('topExpensesList');
const mpTotalDisplay = document.getElementById('mpTotalDisplay');
const cashTotalDisplay = document.getElementById('cashTotalDisplay');
const budgetInput = document.getElementById('budgetInput');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');

let analysisChartInstance = null;

let currentFilter = 'month'; // Filtro predeterminado


let trendChartInstance = null;
let globalExpenses = [];
let showingAllTransactions = false;

// Estado del formulario
let currentMethod = 'Mercado Pago';
let currentType = 'Esencial';
let editingExpenseId = null; // Si es null, estamos creando. Si tiene un ID, estamos editando.

/**
 * Actualiza el estilo visual de los botones de selección y guarda el estado.
 * @param {HTMLElement} btnActive - Botón tocado.
 * @param {HTMLElement} btnInactive - Botón a apagar.
 * @param {string} value - Valor a guardar.
 * @param {string} category - 'metodo' o 'tipo'.
 * @returns {void}
 */
const toggleSelectionButton = (btnActive, btnInactive, value, category) => {
    btnActive.classList.replace('text-zinc-400', 'text-white');
    btnActive.classList.add('bg-indigo-600');

    btnInactive.classList.remove('bg-indigo-600');
    btnInactive.classList.replace('text-white', 'text-zinc-400');

    if (category === 'metodo') currentMethod = value;
    if (category === 'tipo') currentType = value;
};

// Listeners de los botones pastilla
btnMethodMp.addEventListener('click', () => toggleSelectionButton(btnMethodMp, btnMethodCash, 'Mercado Pago', 'metodo'));
btnMethodCash.addEventListener('click', () => toggleSelectionButton(btnMethodCash, btnMethodMp, 'Efectivo', 'metodo'));
btnTypeEsencial.addEventListener('click', () => toggleSelectionButton(btnTypeEsencial, btnTypeOcio, 'Esencial', 'tipo'));
btnTypeOcio.addEventListener('click', () => toggleSelectionButton(btnTypeOcio, btnTypeEsencial, 'Ocio', 'tipo'));

const fetchExpenses = async () => {
    try {
        const response = await fetch('/api/gastos');
        const data = await response.json();
        return data.datos;
    } catch (error) { return []; }
};

const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);

const getIconForExpense = (name, type) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('uber') || lowerName.includes('taxi')) return { icon: 'fa-car', color: 'bg-blue-500/20 text-blue-400' };
    if (lowerName.includes('cena') || lowerName.includes('comida')) return { icon: 'fa-burger', color: 'bg-orange-500/20 text-orange-400' };
    if (lowerName.includes('credito') || lowerName.includes('tarjeta')) return { icon: 'fa-credit-card', color: 'bg-emerald-500/20 text-emerald-400' };

    if (type === 'Ocio') return { icon: 'fa-gamepad', color: 'bg-purple-500/20 text-purple-400' };
    return { icon: 'fa-receipt', color: 'bg-zinc-500/20 text-zinc-400' };
};

const isCurrentMonth = (dateStr) => {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return dateStr.startsWith(currentMonth);
};

/**
 * Dibuja el gráfico de curva suave con la data ya filtrada.
 * @param {Array} filteredExpenses - Lista de gastos ya filtrados por fecha.
 * @returns {void}
 */
const renderTrendChart = (filteredExpenses) => {
    if (trendChartInstance) trendChartInstance.destroy();

    const dailyTotals = {};
    const reversedExpenses = [...filteredExpenses].reverse();

    reversedExpenses.forEach(e => {
        const parts = e.fecha.split('T')[0].split('-');
        const dateLabel = `${parts[2]}/${parts[1]}`; // Formato universal DD/MM
        dailyTotals[dateLabel] = (dailyTotals[dateLabel] || 0) + e.valor;
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: Object.keys(dailyTotals), datasets: [{ data: Object.values(dailyTotals), borderColor: '#6366f1', borderWidth: 3, backgroundColor: gradient, fill: true, tension: 0.4, pointRadius: 0, pointHitRadius: 20 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } }, interaction: { mode: 'nearest', axis: 'x', intersect: false } }
    });
};

const renderTransactionsList = (expenses, showAll) => {
    transactionsList.innerHTML = '';
    const limit = showAll ? expenses.length : 5;
    const displayExpenses = expenses.slice(0, limit);

    displayExpenses.forEach(e => {
        const { icon, color } = getIconForExpense(e.nombre, e.tipo);
        const [year, month, day] = e.fecha.split('T')[0].split('-');

        // Colores de los tags
        const methodBadgeClass = e.metodoPago === 'Mercado Pago' ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400';
        const typeBadgeClass = e.tipo === 'Ocio' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400';

        // Agregamos cursor-pointer y el evento onclick al div principal
        const itemHTML = `
            <div class="flex items-center justify-between bg-zinc-900 p-3 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer active:scale-[0.98]" onclick="window.openEditModal('${e.id}')">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center ${color}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <p class="font-bold text-sm text-white capitalize">${e.nombre}</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-xs font-medium text-zinc-500">${day}/${month}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${methodBadgeClass}">${e.metodoPago}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${typeBadgeClass}">${e.tipo}</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-sm text-white">-${formatMoney(e.valor)}</p>
                </div>
            </div>
        `;
        transactionsList.insertAdjacentHTML('beforeend', itemHTML);
    });
    viewAllBtn.textContent = showAll ? 'Ver menos' : 'Ver todos';
};

/**
 * Renderiza el gráfico de torta y el top 3 de gastos en la pestaña de Análisis.
 * @param {Array} filteredData - Datos de gastos filtrados.
 * @returns {void}
 */
const renderAnalysisView = (filteredData) => {
    // 1. Gráfico de Torta (Ocio vs Esencial)
    if (analysisChartInstance) analysisChartInstance.destroy();

    let ocio = 0, esencial = 0;
    filteredData.forEach(e => {
        if (e.tipo === 'Ocio') ocio += e.valor;
        if (e.tipo === 'Esencial') esencial += e.valor;
    });

    const ctx = document.getElementById('analysisChart').getContext('2d');
    analysisChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Esencial', 'Ocio'],
            datasets: [{
                data: [esencial, ocio],
                backgroundColor: ['#34d399', '#a78bfa'], // Emerald y Purple
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#a1a1aa', usePointStyle: true, padding: 20 } }
            }
        }
    });

    // 2. Top 3 Gastos Más Caros
    topExpensesList.innerHTML = '';
    const sortedExpenses = [...filteredData].sort((a, b) => b.valor - a.valor).slice(0, 3);

    if (sortedExpenses.length === 0) {
        topExpensesList.innerHTML = '<p class="text-zinc-500 text-sm text-center py-2">No hay gastos para analizar.</p>';
        return;
    }

    sortedExpenses.forEach((e, index) => {
        const { icon, color } = getIconForExpense(e.nombre, e.tipo);
        const itemHTML = `
            <div class="flex items-center justify-between bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-400 font-bold text-xs">
                        #${index + 1}
                    </div>
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center ${color}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <p class="font-bold text-sm text-white capitalize">${e.nombre}</p>
                        <p class="text-[10px] text-zinc-500 uppercase">${e.tipo}</p>
                    </div>
                </div>
                <p class="font-bold text-sm text-rose-400">-${formatMoney(e.valor)}</p>
            </div>
        `;
        topExpensesList.insertAdjacentHTML('beforeend', itemHTML);
    });
};

/**
 * Calcula y muestra los totales por método de pago en la pestaña Cuentas.
 * @param {Array} filteredData - Datos de gastos filtrados.
 * @returns {void}
 */
const renderAccountsView = (filteredData) => {
    let mpTotal = 0, cashTotal = 0;

    filteredData.forEach(e => {
        if (e.metodoPago === 'Mercado Pago') mpTotal += e.valor;
        if (e.metodoPago === 'Efectivo') cashTotal += e.valor;
    });

    mpTotalDisplay.textContent = formatMoney(mpTotal);
    cashTotalDisplay.textContent = formatMoney(cashTotal);
};

/**
 * Inicializa la lógica de la pestaña Ajustes (Presupuesto en LocalStorage).
 * @returns {void}
 */
const setupSettingsView = () => {
    const savedBudget = localStorage.getItem('gastoTrackBudget');
    if (savedBudget) budgetInput.value = savedBudget;

    saveBudgetBtn.addEventListener('click', () => {
        const value = budgetInput.value;
        if (value && !isNaN(value)) {
            localStorage.setItem('gastoTrackBudget', value);
            showToastNotification('Presupuesto actualizado 🎯', 'fa-solid fa-check');
            renderApp(globalExpenses); // Forzamos un re-render para evaluar el color del balance
        }
    });
};

/**
 * Renderiza la interfaz principal
 * @param {Array} expenses - Lista de gastos sin filtrar.
 * @returns {void}
 */
const renderApp = (expenses) => {
    globalExpenses = expenses;

    // Aplicamos el filtro seleccionado
    const currentData = filterExpensesData(expenses, currentFilter);

    let total = 0, totalEsencial = 0, totalOcio = 0;
    currentData.forEach(e => {
        total += e.valor;
        if (e.tipo === 'Esencial') totalEsencial += e.valor;
        if (e.tipo === 'Ocio') totalOcio += e.valor;
    });

    // Lógica de color del Balance vs Presupuesto
    const savedBudget = Number(localStorage.getItem('gastoTrackBudget')) || 0;
    mainBalance.textContent = formatMoney(total);

    if (savedBudget > 0 && total > savedBudget) {
        mainBalance.classList.replace('text-white', 'text-rose-500');
    } else {
        mainBalance.classList.replace('text-rose-500', 'text-white');
    }

    if (total > 0) {
        insightBadge.innerHTML = `<i class="fa-solid fa-chart-simple text-indigo-400 text-xs"></i><span class="text-xs font-semibold text-zinc-300">Mayoría en ${totalEsencial > totalOcio ? 'Esenciales' : 'Ocio'}</span>`;
    } else {
        insightBadge.innerHTML = `<span class="text-xs font-semibold text-zinc-300">Sin gastos en este período</span>`;
    }

    esencialAmount.textContent = formatMoney(totalEsencial);
    ocioAmount.textContent = formatMoney(totalOcio);

    setTimeout(() => {
        esencialBar.style.width = total > 0 ? `${(totalEsencial / total) * 100}%` : '0%';
        ocioBar.style.width = total > 0 ? `${(totalOcio / total) * 100}%` : '0%';
    }, 100);

    renderTrendChart(currentData);

    // Ahora la lista del final solo muestra los transacciones del periodo seleccionado
    renderTransactionsList(currentData, showingAllTransactions);
    // --- NUEVAS LLAMADAS ---
    renderAnalysisView(currentData);
    renderAccountsView(currentData);
};

const toggleAddModal = (show) => {
    if (show) {
        addExpenseModal.classList.remove('hidden');
        setTimeout(() => {
            addExpenseModal.classList.remove('opacity-0');
            modalContent.classList.remove('translate-y-full');
        }, 10);
    } else {
        addExpenseModal.classList.add('opacity-0');
        modalContent.classList.add('translate-y-full');
        setTimeout(() => { addExpenseModal.classList.add('hidden'); }, 300);
    }
};

/**
 * Verifica si una fecha coincide con el día de hoy.
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {boolean} True si es hoy.
 */
const checkIsToday = (dateStr) => {
    const today = new Date();
    const dateStrToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr.startsWith(dateStrToday);
};

/**
 * Verifica si una fecha pertenece a la semana actual (desde el lunes).
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {boolean} True si es de esta semana.
 */
const checkIsCurrentWeek = (dateStr) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const [year, month, day] = dateStr.split('T')[0].split('-');
    const expenseDate = new Date(year, month - 1, day);

    return expenseDate >= startOfWeek && expenseDate <= today;
};

/**
 * Filtra la lista de gastos según el filtro de tiempo activo.
 * @param {Array} expenses - Lista completa de gastos.
 * @param {string} filterType - Tipo de filtro a aplicar.
 * @returns {Array} Gastos filtrados.
 */
const filterExpensesData = (expenses, filterType) => {
    if (filterType === 'today') return expenses.filter(e => checkIsToday(e.fecha));
    if (filterType === 'week') return expenses.filter(e => checkIsCurrentWeek(e.fecha));
    if (filterType === 'month') return expenses.filter(e => isCurrentMonth(e.fecha));
    return expenses;
};

/**
 * Actualiza la interfaz visual de los botones de filtro y el título del balance.
 * @param {HTMLElement} activeBtn - Botón seleccionado.
 * @param {string} filterType - Tipo de filtro aplicado.
 * @returns {void}
 */
const updateFilterUi = (activeBtn, filterType) => {
    const allBtns = [btnFilterToday, btnFilterWeek, btnFilterMonth, btnFilterAll];
    allBtns.forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-zinc-800', 'text-zinc-400');
    });
    activeBtn.classList.remove('bg-zinc-800', 'text-zinc-400');
    activeBtn.classList.add('bg-indigo-600', 'text-white');

    if (filterType === 'today') balanceLabel.textContent = 'Gastado hoy';
    else if (filterType === 'week') balanceLabel.textContent = 'Gastado esta semana';
    else if (filterType === 'month') balanceLabel.textContent = 'Gastado este mes';
    else balanceLabel.textContent = 'Gasto total histórico';
};

/**
 * Cambia el filtro activo y recarga la vista.
 * @param {string} filterType - El nuevo filtro.
 * @param {HTMLElement} btnElement - El botón presionado.
 * @returns {void}
 */
const applyFilter = (filterType, btnElement) => {
    currentFilter = filterType;
    updateFilterUi(btnElement, filterType);
    renderApp(globalExpenses);
};

/**
 * Prepara y abre el modal para editar un gasto existente.
 * @param {string} id - ID del gasto en Notion.
 * @returns {void}
 */
window.openEditModal = (id) => {
    const expense = globalExpenses.find(e => e.id === id);
    if (!expense) return;

    editingExpenseId = id;
    modalTitle.textContent = 'Editar Gasto';
    document.getElementById('inputName').value = expense.nombre;
    document.getElementById('inputValue').value = expense.valor;

    if (expense.metodoPago === 'Efectivo') toggleSelectionButton(btnMethodCash, btnMethodMp, 'Efectivo', 'metodo');
    else toggleSelectionButton(btnMethodMp, btnMethodCash, 'Mercado Pago', 'metodo');

    if (expense.tipo === 'Ocio') toggleSelectionButton(btnTypeOcio, btnTypeEsencial, 'Ocio', 'tipo');
    else toggleSelectionButton(btnTypeEsencial, btnTypeOcio, 'Esencial', 'tipo');

    deleteExpenseBtn.classList.remove('hidden');
    toggleAddModal(true);
};

/**
 * Guarda o Edita un gasto dependiendo del estado de editingExpenseId.
 * @param {Event} event - Evento submit del formulario.
 * @returns {Promise<void>}
 */
const handleAddExpense = async (event) => {
    event.preventDefault();
    submitExpenseBtn.disabled = true;
    submitExpenseBtn.textContent = 'Guardando...';

    const expenseData = {
        nombre: document.getElementById('inputName').value,
        valor: document.getElementById('inputValue').value,
        metodoPago: currentMethod,
        tipo: currentType
    };

    try {
        const method = editingExpenseId ? 'PUT' : 'POST';
        const url = editingExpenseId ? `/api/gastos/${editingExpenseId}` : '/api/gastos';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseData)
        });

        if (!response.ok) throw new Error('Error al guardar');

        toggleAddModal(false);
        init();
    } catch (error) { alert('No se pudo guardar el gasto'); }
    finally {
        submitExpenseBtn.disabled = false;
        submitExpenseBtn.textContent = 'Guardar Gasto';
    }
};

/**
 * Elimina el gasto que se está editando actualmente.
 * @returns {Promise<void>}
 */
const handleDeleteExpense = async () => {
    if (!editingExpenseId) return;

    deleteExpenseBtn.disabled = true;
    deleteExpenseBtn.textContent = 'Eliminando...';

    try {
        const response = await fetch(`/api/gastos/${editingExpenseId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');

        toggleAddModal(false);
        init();
    } catch (error) { alert('No se pudo eliminar el gasto'); }
    finally {
        deleteExpenseBtn.disabled = false;
        deleteExpenseBtn.textContent = 'Eliminar Gasto';
    }
};

// Listeners
viewAllBtn.addEventListener('click', () => {
    showingAllTransactions = !showingAllTransactions;
    renderTransactionsList(globalExpenses, showingAllTransactions);
});


navSettings.addEventListener('click', () => switchAppView('viewSettings'));


openAddModalBtn.addEventListener('click', () => {
    editingExpenseId = null;
    modalTitle.textContent = 'Nuevo Gasto';
    addExpenseForm.reset();
    toggleSelectionButton(btnMethodMp, btnMethodCash, 'Mercado Pago', 'metodo');
    toggleSelectionButton(btnTypeEsencial, btnTypeOcio, 'Esencial', 'tipo');
    deleteExpenseBtn.classList.add('hidden');
    toggleAddModal(true);
});

closeModalBtn.addEventListener('click', () => toggleAddModal(false));
addExpenseForm.addEventListener('submit', handleAddExpense);
deleteExpenseBtn.addEventListener('click', handleDeleteExpense);
btnFilterToday.addEventListener('click', () => applyFilter('today', btnFilterToday));
btnFilterWeek.addEventListener('click', () => applyFilter('week', btnFilterWeek));
btnFilterMonth.addEventListener('click', () => applyFilter('month', btnFilterMonth));
btnFilterAll.addEventListener('click', () => applyFilter('all', btnFilterAll));

/**
 * Alterna la visibilidad de las vistas de la aplicación para simular navegación nativa.
 * @param {HTMLElement} activeView - El contenedor de la vista a mostrar.
 * @param {HTMLElement} activeNavBtn - El botón a resaltar.
 * @returns {void}
 */
const switchAppView = (activeView, activeNavBtn) => {
    // 1. Ocultar todas
    const allViews = [viewHome, viewAnalysis, viewAccounts, viewSettings];
    allViews.forEach(view => {
        if (view) view.classList.add('hidden');
    });

    // 2. Mostrar la seleccionada
    if (activeView) activeView.classList.remove('hidden');

    // 3. Apagar botones
    const allNavBtns = [navHome, navAnalysis, navAccounts, navSettings];
    allNavBtns.forEach(btn => {
        if (btn) {
            btn.classList.remove('text-white');
            btn.classList.add('text-zinc-500');
        }
    });

    // 4. Encender el seleccionado
    if (activeNavBtn) {
        activeNavBtn.classList.remove('text-zinc-500');
        activeNavBtn.classList.add('text-white');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Listeners de navegación
navHome.addEventListener('click', () => switchAppView(viewHome, navHome));
navAnalysis.addEventListener('click', () => switchAppView(viewAnalysis, navAnalysis));
navAccounts.addEventListener('click', () => switchAppView(viewAccounts, navAccounts));
navSettings.addEventListener('click', () => switchAppView(viewSettings, navSettings));

const init = async () => {
    setupSettingsView();
    const data = await fetchExpenses();
    renderApp(data);
};

init();