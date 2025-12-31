const STORAGE_KEY = "tf-data";
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const state = {
  data: loadData(),
  currentYear: null,
  currentMonth: new Date().getMonth() + 1,
  planilhaMode: false,
};

const elements = {
  yearSelect: document.getElementById("yearSelect"),
  addYearBtn: document.getElementById("addYearBtn"),
  monthSelect: document.getElementById("monthSelect"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  planilhaMode: document.getElementById("planilhaMode"),
  monthTable: document.getElementById("monthTable"),
  monthSummary: document.getElementById("monthSummary"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  exportCsv: document.getElementById("exportCsv"),
  importCsv: document.getElementById("importCsv"),
  economiaYearA: document.getElementById("economiaYearA"),
  economiaYearB: document.getElementById("economiaYearB"),
  economiaTable: document.getElementById("economiaTable"),
  addCategory: document.getElementById("addCategory"),
  goalCategories: document.getElementById("goalCategories"),
  yearDialog: document.getElementById("yearDialog"),
  newYearInput: document.getElementById("newYearInput"),
  confirmYear: document.getElementById("confirmYear"),
  categoryDialog: document.getElementById("categoryDialog"),
  newCategoryInput: document.getElementById("newCategoryInput"),
  confirmCategory: document.getElementById("confirmCategory"),
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return JSON.parse(raw);
  }
  return {
    years: { "2026": createYearData(2026) },
    goals: {
      categories: [
        { id: crypto.randomUUID(), name: "Vida", goals: [] },
        { id: crypto.randomUUID(), name: "Financeira", goals: [] },
      ],
    },
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function createYearData(yearNumber) {
  const months = {};
  for (let i = 1; i <= 12; i += 1) {
    months[i] = { days: {}, economy: 0 };
  }
  return { yearNumber, months };
}

function getYearData(yearNumber) {
  if (!state.data.years[yearNumber]) {
    state.data.years[yearNumber] = createYearData(yearNumber);
  }
  return state.data.years[yearNumber];
}

function init() {
  initTabs();
  initYearSelector();
  initMonthSelector();
  initTableEvents();
  initEconomia();
  initGoals();
  initImportExport();
  renderAll();
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });
}

function initYearSelector() {
  elements.addYearBtn.addEventListener("click", () => {
    elements.newYearInput.value = "";
    elements.yearDialog.showModal();
  });

  elements.confirmYear.addEventListener("click", (event) => {
    event.preventDefault();
    const value = Number(elements.newYearInput.value);
    if (!Number.isFinite(value)) {
      return;
    }
    getYearData(String(value));
    saveData();
    renderYearOptions();
    elements.yearDialog.close();
    state.currentYear = String(value);
    renderAll();
  });

  elements.yearSelect.addEventListener("change", (event) => {
    state.currentYear = event.target.value;
    renderAll();
  });
}

function initMonthSelector() {
  elements.prevMonth.addEventListener("click", () => {
    state.currentMonth = state.currentMonth === 1 ? 12 : state.currentMonth - 1;
    elements.monthSelect.value = String(state.currentMonth);
    renderMonth();
  });
  elements.nextMonth.addEventListener("click", () => {
    state.currentMonth = state.currentMonth === 12 ? 1 : state.currentMonth + 1;
    elements.monthSelect.value = String(state.currentMonth);
    renderMonth();
  });
  elements.monthSelect.addEventListener("change", (event) => {
    state.currentMonth = Number(event.target.value);
    renderMonth();
  });
  elements.planilhaMode.addEventListener("change", (event) => {
    state.planilhaMode = event.target.checked;
    renderMonth();
  });
}

function initTableEvents() {
  elements.monthTable.addEventListener("input", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    const day = Number(input.dataset.day);
    const field = input.dataset.field;
    updateDayValue(day, field, input.value);
  });

  elements.monthTable.addEventListener("blur", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    input.value = formatNumber(parseNumber(input.value));
  }, true);

  elements.monthTable.addEventListener("keydown", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    if (event.key === "Enter") {
      event.preventDefault();
      focusNextInput(input, "down");
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusNextInput(input, "down");
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusNextInput(input, "up");
    }
    if (event.key === "ArrowLeft") {
      focusNextInput(input, "left");
    }
    if (event.key === "ArrowRight") {
      focusNextInput(input, "right");
    }
  });

  elements.monthTable.addEventListener("paste", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    const text = event.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const rows = text.trim().split(/\r?\n/).map((row) => row.split("\t"));
    const startDay = Number(input.dataset.day);
    const fields = ["entrada", "saida", "diario"];
    const startFieldIndex = fields.indexOf(input.dataset.field);
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        const day = startDay + rowIndex;
        const field = fields[startFieldIndex + cellIndex];
        if (!field) return;
        updateDayValue(day, field, cell);
      });
    });
    renderMonth();
  });
}

function initEconomia() {
  elements.economiaYearA.addEventListener("change", () => renderEconomia());
  elements.economiaYearB.addEventListener("change", () => renderEconomia());
  elements.economiaTable.addEventListener("input", (event) => {
    const input = event.target.closest("input");
    if (!input) return;
    const year = input.dataset.year;
    const month = Number(input.dataset.month);
    const value = parseNumber(input.value);
    const yearData = getYearData(year);
    yearData.months[month].economy = value;
    saveData();
    renderEconomia();
  });
}

function initGoals() {
  elements.addCategory.addEventListener("click", () => {
    elements.newCategoryInput.value = "";
    elements.categoryDialog.showModal();
  });

  elements.confirmCategory.addEventListener("click", (event) => {
    event.preventDefault();
    const name = elements.newCategoryInput.value.trim();
    if (!name) return;
    state.data.goals.categories.push({ id: crypto.randomUUID(), name, goals: [] });
    saveData();
    elements.categoryDialog.close();
    renderGoals();
  });
}

function initImportExport() {
  elements.exportJson.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `termometro-${state.currentYear}.json`);
  });

  elements.importJson.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    state.data = JSON.parse(text);
    saveData();
    renderAll();
    event.target.value = "";
  });

  elements.exportCsv.addEventListener("click", () => {
    const year = state.currentYear;
    const yearData = getYearData(year);
    const rows = [["ano", "mes", "dia", "entrada", "saida", "diario"]];
    Object.entries(yearData.months).forEach(([month, monthData]) => {
      Object.entries(monthData.days).forEach(([day, dayData]) => {
        rows.push([
          year,
          month,
          day,
          dayData.entrada || 0,
          dayData.saida || 0,
          dayData.diario || 0,
        ]);
      });
    });
    const blob = new Blob([rows.map((row) => row.join("; ")).join("\n")], { type: "text/csv" });
    downloadBlob(blob, `termometro-${year}.csv`);
  });

  elements.importCsv.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    lines.slice(1).forEach((line) => {
      const [year, month, day, entrada, saida, diario] = line.split(";").map((item) => item.trim());
      if (!year) return;
      const yearData = getYearData(year);
      const monthData = yearData.months[Number(month)];
      monthData.days[Number(day)] = {
        entrada: parseNumber(entrada),
        saida: parseNumber(saida),
        diario: parseNumber(diario),
      };
    });
    saveData();
    renderAll();
    event.target.value = "";
  });
}

function renderAll() {
  renderYearOptions();
  renderMonthOptions();
  renderMonth();
  renderEconomia();
  renderGoals();
}

function renderYearOptions() {
  const years = Object.keys(state.data.years).sort();
  if (!state.currentYear) {
    state.currentYear = years.includes("2026") ? "2026" : years[0];
  }
  elements.yearSelect.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  elements.yearSelect.value = state.currentYear;

  const yearOptions = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  elements.economiaYearA.innerHTML = yearOptions;
  elements.economiaYearB.innerHTML = `<option value="">Sem comparação</option>${yearOptions}`;
  if (!elements.economiaYearA.value) {
    elements.economiaYearA.value = state.currentYear;
  }
}

function renderMonthOptions() {
  elements.monthSelect.innerHTML = MONTHS.map(
    (label, index) => `<option value="${index + 1}">${label}</option>`
  ).join("");
  elements.monthSelect.value = String(state.currentMonth);
}

function renderMonth() {
  const yearData = getYearData(state.currentYear);
  const monthData = yearData.months[state.currentMonth];
  const daysInMonth = state.planilhaMode
    ? 31
    : new Date(Number(state.currentYear), state.currentMonth, 0).getDate();
  const tbody = elements.monthTable.querySelector("tbody");
  tbody.innerHTML = "";
  const { saldos, totals } = calculateMonthTotals(monthData, daysInMonth);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayEntry = monthData.days[day] || { entrada: 0, saida: 0, diario: 0 };
    const row = document.createElement("tr");
    const saldo = saldos[day] ?? 0;
    const saldoClass = saldo < 0 ? "negative" : saldo > 0 ? "positive" : "";
    row.innerHTML = `
      <td>${day}</td>
      <td><input data-day="${day}" data-field="entrada" value="${formatNumber(dayEntry.entrada)}" /></td>
      <td><input data-day="${day}" data-field="saida" value="${formatNumber(dayEntry.saida)}" /></td>
      <td><input data-day="${day}" data-field="diario" value="${formatNumber(dayEntry.diario)}" /></td>
      <td class="saldo ${saldoClass}">${formatNumber(saldo)}</td>
    `;
    tbody.appendChild(row);
  }
  renderSummary(totals);
}

function updateDayValue(day, field, value) {
  const yearData = getYearData(state.currentYear);
  const monthData = yearData.months[state.currentMonth];
  if (!monthData.days[day]) {
    monthData.days[day] = { entrada: 0, saida: 0, diario: 0 };
  }
  monthData.days[day][field] = parseNumber(value);
  saveData();
  renderMonth();
}

function calculateMonthTotals(monthData, daysInMonth) {
  const saldos = {};
  let totalEntrada = 0;
  let totalSaida = 0;
  let totalDiario = 0;
  let saldoAnterior = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const entry = monthData.days[day] || { entrada: 0, saida: 0, diario: 0 };
    totalEntrada += entry.entrada || 0;
    totalSaida += entry.saida || 0;
    totalDiario += entry.diario || 0;
    if (day === 1) {
      saldoAnterior = (entry.entrada || 0) - ((entry.saida || 0) + (entry.diario || 0));
    } else {
      saldoAnterior += (entry.entrada || 0) - ((entry.saida || 0) + (entry.diario || 0));
    }
    saldos[day] = saldoAnterior;
  }
  const saidaTotal = totalSaida + totalDiario;
  const performance = totalEntrada - saidaTotal;
  return {
    saldos,
    totals: {
      entradas: totalEntrada,
      saidas: totalSaida,
      diario: totalDiario,
      saidaTotal,
      performance,
      saldoFinal: saldos[daysInMonth] || 0,
    },
  };
}

function renderSummary(totals) {
  elements.monthSummary.innerHTML = "";
  const items = [
    { label: "Entradas do mês", value: totals.entradas },
    { label: "Saídas do mês", value: totals.saidas },
    { label: "Diário do mês", value: totals.diario },
    { label: "Saída Total do mês", value: totals.saidaTotal },
    { label: "Performance do mês", value: totals.performance },
    { label: "Saldo final do mês", value: totals.saldoFinal },
  ];
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "summary-item";
    const valueClass = item.value < 0 ? "negative" : item.value > 0 ? "positive" : "";
    card.innerHTML = `<span>${item.label}</span><strong class="${valueClass}">${formatNumber(
      item.value
    )}</strong>`;
    elements.monthSummary.appendChild(card);
  });
}

function renderEconomia() {
  const yearA = elements.economiaYearA.value || state.currentYear;
  const yearB = elements.economiaYearB.value;
  const table = elements.economiaTable;
  const rows = [];
  const head = [`<tr><th>Mês</th><th>Entradas ${yearA}</th><th>Economia ${yearA}</th><th>%</th>`];
  if (yearB) {
    head.push(`<th>Entradas ${yearB}</th><th>Economia ${yearB}</th><th>%</th>`);
  }
  head.push("</tr>");
  rows.push(head.join(""));

  const totals = {
    a: { entradas: 0, economia: 0 },
    b: { entradas: 0, economia: 0 },
  };

  MONTHS.forEach((monthLabel, index) => {
    const monthNumber = index + 1;
    const { entradas: entradasA } = getMonthTotals(yearA, monthNumber);
    const economiaA = getYearData(yearA).months[monthNumber].economy || 0;
    totals.a.entradas += entradasA;
    totals.a.economia += economiaA;
    const percentA = entradasA ? economiaA / entradasA : 0;

    const rowCells = [
      `<td>${monthLabel}</td>`,
      `<td>${formatNumber(entradasA)}</td>`,
      `<td><input data-year="${yearA}" data-month="${monthNumber}" value="${formatNumber(
        economiaA
      )}" /></td>`,
      `<td>${formatPercent(percentA)}</td>`,
    ];

    if (yearB) {
      const { entradas: entradasB } = getMonthTotals(yearB, monthNumber);
      const economiaB = getYearData(yearB).months[monthNumber].economy || 0;
      totals.b.entradas += entradasB;
      totals.b.economia += economiaB;
      const percentB = entradasB ? economiaB / entradasB : 0;
      rowCells.push(
        `<td>${formatNumber(entradasB)}</td>`,
        `<td><input data-year="${yearB}" data-month="${monthNumber}" value="${formatNumber(
          economiaB
        )}" /></td>`,
        `<td>${formatPercent(percentB)}</td>`
      );
    }
    rows.push(`<tr>${rowCells.join("")}</tr>`);
  });

  const totalRow = [
    `<td><strong>Total</strong></td>`,
    `<td><strong>${formatNumber(totals.a.entradas)}</strong></td>`,
    `<td><strong>${formatNumber(totals.a.economia)}</strong></td>`,
    `<td><strong>${formatPercent(
      totals.a.entradas ? totals.a.economia / totals.a.entradas : 0
    )}</strong></td>`,
  ];
  if (yearB) {
    totalRow.push(
      `<td><strong>${formatNumber(totals.b.entradas)}</strong></td>`,
      `<td><strong>${formatNumber(totals.b.economia)}</strong></td>`,
      `<td><strong>${formatPercent(
        totals.b.entradas ? totals.b.economia / totals.b.entradas : 0
      )}</strong></td>`
    );
  }
  rows.push(`<tr>${totalRow.join("")}</tr>`);
  table.innerHTML = rows.join("");
}

function getMonthTotals(year, month) {
  const yearData = getYearData(year);
  const monthData = yearData.months[month];
  const daysInMonth = new Date(Number(year), month, 0).getDate();
  return calculateMonthTotals(monthData, daysInMonth).totals;
}

function renderGoals() {
  elements.goalCategories.innerHTML = "";
  state.data.goals.categories.forEach((category) => {
    const template = document.getElementById("goalCategoryTemplate");
    const node = template.content.cloneNode(true);
    const section = node.querySelector(".goal-category");
    const nameInput = node.querySelector(".category-name");
    const removeBtn = node.querySelector(".remove-category");
    const goalList = node.querySelector(".goal-list");
    const newGoalInput = node.querySelector(".new-goal-input");
    const addGoalBtn = node.querySelector(".add-goal");

    nameInput.value = category.name;
    nameInput.addEventListener("input", () => {
      category.name = nameInput.value;
      saveData();
    });

    removeBtn.addEventListener("click", () => {
      state.data.goals.categories = state.data.goals.categories.filter(
        (item) => item.id !== category.id
      );
      saveData();
      renderGoals();
    });

    category.goals.forEach((goal) => {
      const item = document.createElement("li");
      if (goal.done) item.classList.add("done");
      item.innerHTML = `
        <input type="checkbox" ${goal.done ? "checked" : ""} />
        <input type="text" value="${goal.title}" />
        <button class="ghost" title="Remover meta">✕</button>
      `;
      const checkbox = item.querySelector("input[type=checkbox]");
      const textInput = item.querySelector("input[type=text]");
      const removeGoal = item.querySelector("button");

      checkbox.addEventListener("change", () => {
        goal.done = checkbox.checked;
        saveData();
        renderGoals();
      });

      textInput.addEventListener("input", () => {
        goal.title = textInput.value;
        saveData();
      });

      removeGoal.addEventListener("click", () => {
        category.goals = category.goals.filter((itemGoal) => itemGoal.id !== goal.id);
        saveData();
        renderGoals();
      });

      goalList.appendChild(item);
    });

    addGoalBtn.addEventListener("click", () => {
      const title = newGoalInput.value.trim();
      if (!title) return;
      category.goals.push({ id: crypto.randomUUID(), title, done: false });
      newGoalInput.value = "";
      saveData();
      renderGoals();
    });

    newGoalInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addGoalBtn.click();
      }
    });

    elements.goalCategories.appendChild(node);
  });
}

function focusNextInput(current, direction) {
  const inputs = Array.from(elements.monthTable.querySelectorAll("input"));
  const index = inputs.indexOf(current);
  if (index === -1) return;
  let nextIndex = index;
  const rowLength = 3;
  if (direction === "down") nextIndex = index + rowLength;
  if (direction === "up") nextIndex = index - rowLength;
  if (direction === "left") nextIndex = index - 1;
  if (direction === "right") nextIndex = index + 1;
  const next = inputs[nextIndex];
  if (next) {
    next.focus();
    next.select();
  }
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const sanitized = value
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

init();
