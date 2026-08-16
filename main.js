// @ts-check

/* global Plotly */

/** @type {any} */
const Plotly = window.Plotly;

const measures = /** @type {const} */ (["HR", "OR", "RR", "IRR"]);

/**
 * @typedef {Object} DataRow
 * @property {string} link
 * @property {string} study
 * @property {string} disease
 * @property {string} setting
 * @property {string} outcome
 * @property {string} group
 * @property {string} group2
//  * @property {string} group3
 * @property {string} exposureMeds
 * @property {string} controlMeds
 * @property {typeof measures[number]} measure
 * @property {number} estimate
 * @property {number} lowerCI
 * @property {number} highCI
 * @property {string} uniqueId
 */

/**
 *
 * @returns {Promise<DataRow[]>}
 */
const loadData = async () => {
  try {
    const response = await fetch("data/data.json");
    if (!response.ok) {
      throw new Error(`File error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Data is not an array");
    }
    return /** @type {DataRow[]} */ (data);
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

/** @satisfies {readonly (keyof DataRow)[]} */
const FILTER_FIELDS = /** @type {const} */ ([
  "study",
  "disease",
  "setting",
  "outcome",
  "group",
  "group2",
  "measure",
  "exposureMeds",
  "controlMeds",
]);

/** @typedef {typeof FILTER_FIELDS[number]} FilterField */

const TABLE_COLUMN_HEADINGS = /** @type {Record<keyof DataRow, string>} */ ({
  study: "Study",
  disease: "Disease",
  setting: "Setting",
  outcome: "Outcome",
  group: "Group",
  group2: "Group 2",
  exposureMeds: "Exposure Medications",
  controlMeds: "Control Medications",
  measure: "Measure",
  estimate: "Estimate",
  lowerCI: "Lower CI",
  highCI: "High CI",
});

const filteredBy = /** @type {Record<FilterField, string>} */ ({
  study: "",
  disease: "",
  setting: "",
  outcome: "",
  group: "",
  group2: "",
  measure: "",
  exposureMeds: "",
  controlMeds: "",
});

const measureColours = /** @type {Record<typeof measures[number], string>} */ ({
  HR: "#1f77b4", // blue
  OR: "#ff7f0e", // orange
  RR: "#2ca02c", // green
  IRR: "#d62728", // red
});

/** @type {PlotlyLayout} */
const layout = {
  width: 200,
  height: 200,
  margin: { l: 10, r: 10, t: 15, b: 35 },
  plot_bgcolor: "#f9f9f9",
  shapes: [
    {
      type: "line",
      xref: "x",
      yref: "paper",
      x0: 1.0,
      x1: 1.0,
      y0: 0.0,
      y1: 1.0,
      line: { color: "#6b0101", width: 1.2, dash: "dot" },
    },
  ],
  xaxis: {
    fixedrange: true,
    range: [0.1, 3],
    tickVals: [0.5, 1.0, 1.5, 2.0, 2.5, 3],
    font: { size: 8 },
    automargin: true,
    autorange: "nonnegative",
  },
  yaxis: {
    fixedrange: true,
    automargin: true,
    autorange: "max",
    showticklabels: false,
  },
};

/** @type {{ data: DataRow[], filteredBy: Record<FilterField, string>, exposureMeds: string[], controlMeds: string[], getFilteredData: () => DataRow[] }} */
const state = {
  data: [],
  filteredBy: /** @type {Record<FilterField, string>} */ (
    Object.fromEntries(FILTER_FIELDS.map((f) => [f, ""]))
  ),
  exposureMeds: [],
  controlMeds: [],
  getFilteredData: () =>
    state.data.filter((row) =>
      FILTER_FIELDS.every(
        (field) =>
          !state.filteredBy[field] || row[field] === state.filteredBy[field],
      ),
    ),
};

const getAvailableOptionsFor = (/** @type {FilterField} */ field) => {
  const relevantRows = state.data.filter((row) =>
    FILTER_FIELDS.every(
      (f) =>
        f === field || !state.filteredBy[f] || row[f] === state.filteredBy[f],
    ),
  );

  return new Set(relevantRows.map((row) => row[field]));
};

const updateFilterOptions = () => {
  for (const field of FILTER_FIELDS) {
    const select = /** @type {HTMLSelectElement}  */ (
      document.querySelector(`select#${field}`)
    );
    if (!select) continue;

    const available = getAvailableOptionsFor(field);

    for (const option of select.options) {
      if (option.value === "") continue; // skip the default option
      option.classList.toggle("not-available", !available.has(option.value));
    }
  }
};

const render = () => {
  const filteredData = state.getFilteredData();

  const dashboardContainer = document.querySelector("#table");
  if (!dashboardContainer) {
    console.error("Dashboard container not found");
    return;
  }

  dashboardContainer.setAttribute('aria-busy', String(true));

  const createTable = () => /** @type {HTMLTableElement} */ {
    const table = /** @type {HTMLTableElement} */ (
      document.createElement("table")
    );
    table.classList.add("dashboard-table");
    table.id = "dash-table";

    dashboardContainer.appendChild(table);

    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.role = "row";
    header.appendChild(headerRow);
    table.appendChild(header);
    headerRow.classList.add("table-header");

    const headerDiv = document.createElement("div");
    headerDiv.classList.add("table-header");
    for (const key of /** @type {(keyof DataRow)[]} */ (
      Object.keys(TABLE_COLUMN_HEADINGS)
    )) {
      const headerCell = document.createElement("th");
      headerCell.classList.add("table-cell");
      headerCell.setAttribute("data-column", key);
      headerCell.textContent = TABLE_COLUMN_HEADINGS[key];
      headerCell.scope = "col";
      headerRow.appendChild(headerCell);
    }

    return table;
  };

  const createTableBody = () => /** @type {HTMLTableSectionElement} */ {
    const tableBody = document.createElement("tbody");
    tableBody.classList.add("table-body");

    for (const row of filteredData) {
      const rowElement = document.createElement("tr");
      rowElement.classList.add("table-row");
      rowElement.setAttribute("data-unique-id", row.uniqueId);
      rowElement.id = `row-${row.uniqueId}`;
      rowElement.role = "row";
      tableBody.appendChild(rowElement);

      for (const key of /** @type {(keyof DataRow)[]} */ (
        Object.keys(TABLE_COLUMN_HEADINGS)
      )) {
        const cellElement = document.createElement("td");
        cellElement.classList.add("table-cell");
        cellElement.setAttribute("data-column", key);
        if (key === "study") {
          const link = cellElement.appendChild(document.createElement('a'));
          link.href = row['link'];
          link.textContent = String(row[key]);
        }
        else {
          cellElement.textContent = String(row[key]);
        }
        rowElement.appendChild(cellElement);
      }
      tableBody.appendChild(rowElement);
    }

    return tableBody;
  };

  const table = dashboardContainer.querySelector("#dash-table") || createTable();

  const oldTableBody = table.querySelector(".table-body");

  const newTableBody = createTableBody();

  if (oldTableBody) {
    table.replaceChild(newTableBody, oldTableBody);
  } else {
    table.appendChild(newTableBody);
  }

  dashboardContainer.setAttribute('aria-busy', String(false));
};

const update = () => {
  render();
  updateFilterOptions();

  updateGraphTable();
  updateQueryParams();
};

const updateQueryParams = () => {
  const queryParams = new URLSearchParams(window.location.search);
  for (const field of FILTER_FIELDS) {
    const value = state.filteredBy[field];
    if (value) {
      queryParams.set(field, value);
    } else {
      queryParams.delete(field);
    }
  }
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}?${queryParams.toString()}`,
  );
};

const updateGraphTable = () => {
  const graphTable = /** @type {HTMLTableElement} */ (
    document.querySelector("#graph-table")
  );

  const figures = graphTable.querySelectorAll("tbody td figure[id^=graph-]");

  for (const figure of figures) {
    const graphId = figure.id;
    const control = figure.getAttribute("data-control");
    const exposure = figure.getAttribute("data-exposure");

    if (!control || !exposure) continue;

    const rows = state.getFilteredData().filter(
      (row) => row.controlMeds === control && row.exposureMeds === exposure,
    );

    updateGraph(graphId, rows);
  }
}

const populateGraphTableBody = (/** @type {HTMLTableSectionElement} */ tbody) => {

  const data = state.data;
  const exposureMeds = state.exposureMeds;
  const controlMeds = state.controlMeds;

  for (const control of controlMeds) {
    const rowElement = document.createElement("tr");
    const controlHeaderCell = document.createElement("th");
    controlHeaderCell.textContent = control;
    controlHeaderCell.scope = "row";
    rowElement.appendChild(controlHeaderCell);

    tbody.appendChild(rowElement);

    for (const exposure of exposureMeds) {
      const cellElement = document.createElement("td");
      const rows = data.filter((row) => row.controlMeds === control && row.exposureMeds === exposure);

      rowElement.appendChild(cellElement);

      if (rows.length === 0) {
        cellElement.innerHTML = "<div></div>";
        continue;
      }

      const graphId = `graph-${control.replace(/\s+/g, "-").toLowerCase()}-${exposure.replace(/\s+/g, "-").toLowerCase()}`;

      cellElement.innerHTML = `<figure id="${graphId}" data-control="${control}" data-exposure="${exposure}"></figure>`;
      createGraph(graphId, rows);
    }
  }
}

const populateGraphTableHead = (/** @type {HTMLTableSectionElement} */ thead) => {

  const legendRow = thead.querySelector("tr[data-theader='legend']") || thead.appendChild(document.createElement("tr"));
  legendRow.setAttribute("data-theader", "legend");
  legendRow.innerHTML = '<th></th><th>Exposures</th>';

  const exposureMeds = state.exposureMeds;

  const graphTable = thead.closest("table");
  if (graphTable) {
    graphTable.style.setProperty("--num-columns", exposureMeds.length.toString());
  }

  const headerRow = thead.querySelector("tr[data-theader='columns']") || thead.appendChild(document.createElement("tr"));
  headerRow.setAttribute("data-theader", "columns");

  headerRow.innerHTML = "";

  const emptyHeaderCell = document.createElement("th");
  headerRow.appendChild(emptyHeaderCell);

  for (const exposure of exposureMeds) {
    const headerCell = document.createElement("th");
    headerCell.textContent = exposure;
    headerCell.scope = "col";
    headerRow.appendChild(headerCell);
  }
};

const populateGraphTable = () => {

  const graphTable = /** @type {HTMLTableElement} */ (
    document.querySelector(".dashboard__graph-table")
  );
  if (!graphTable) {
    console.error("Graph table container not found");
    return;
  }

  const thead = graphTable.querySelector("thead") || graphTable.appendChild(document.createElement("thead"));
  populateGraphTableHead(thead);
    
  const tbody = graphTable.querySelector("tbody") || graphTable.appendChild(document.createElement("tbody"));
  populateGraphTableBody(tbody);

};

const createTraceFromRows = (
  /** @type {DataRow[]} */ rows,
) => /** @type {PlotlyTrace} */ {
  const pointColours = rows.map((row) => measureColours[row.measure] || "#333");

  return {
    x: rows.map((row) => row.estimate),
    y: rows.map((row, index) => `${row.study}-${index}`),

    mode: "markers",
    type: "scatter",
    marker: {
      size: 9,
      symbol: "circle",
      color: pointColours,
    },
    error_x: {
      type: "data",
      symmetric: false,
      array: rows.map((row) => row.highCI - row.estimate),
      arrayminus: rows.map((row) => row.estimate - row.lowerCI),
      color: "#343585",
      thickness: 1.5,
      width: 5,
    },
    hoverinfo: "text",
    text: rows.map(
      (row) =>
        `${row.study}<br>${row.measure}: ${row.estimate} (${row.lowerCI} - ${row.highCI})`,
    ),
    textposition: "bottom right",
  };
};

const createGraph = (
  /** @type {string} */ graphId,
  /** @type {DataRow[]} */ rows
) => {
  const trace = createTraceFromRows(rows);

  Plotly.newPlot(graphId, [trace], layout, { displayModeBar: false })
  .then(
    () => {
      resizeGraph(graphId);
    },
  );
};

const updateGraph = (
  /** @type {string} */ graphId,
  /** @type {DataRow[]} */ rows
) => {
  const trace = createTraceFromRows(rows);

  Plotly.react(graphId, [trace], layout)
  .then(
    () => {
      resizeGraph(graphId);
    }
  );
};

const resizeGraph = (/** @type {string} */ graphId) => {
  const graphDiv = document.querySelector(`#${graphId}`);
  if (!graphDiv) return;

  const td = graphDiv.closest("td");

  if (!td) return;

  const rect = td.getBoundingClientRect();

  const size = Math.round(Math.min(rect.width, rect.height));
  const width = size;
  const height = size;

  Plotly.relayout(graphId, { width, height });
};

const installPlotResizeObserver = () => {
  const graphTable = document.querySelector('#graph-table');

  if (!graphTable) return;

  let rafRef = 0;
  const resizeAll = () => {
    console.log('Resizing...');
    const figures = graphTable.querySelectorAll("tbody td figure[id^=graph-]");

    figures.forEach(fig => {
      resizeGraph(fig.id);
    });
  }

  const resizeObserver = new ResizeObserver(() => {
    console.log('RO triggered');
    cancelAnimationFrame(rafRef);
    rafRef = requestAnimationFrame(resizeAll);
  });

  resizeObserver.observe(graphTable);
  requestAnimationFrame(resizeAll);
}

const createFilterElement = (
  /** @type {FilterField} */ field,
  /** @type {string[]} */ values,
  /** @type {string} */ label,
) => /** @type {HTMLDivElement} */ {
  const container = document.createElement("div");
  container.classList.add("filter-element");
  const labelElement = document.createElement("label");
  labelElement.htmlFor = field;
  labelElement.textContent = label;
  container.appendChild(labelElement);

  const filteredByValue = state.filteredBy[field];

  const select = document.createElement("select");
  select.name = field;
  select.id = field;

  const selectButton = document.createElement("button");
  selectButton.type = "button";
  selectButton.appendChild(document.createElement("selectedcontent"));

  select.appendChild(selectButton);

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Filter by ...";
  select.appendChild(defaultOption);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;

    if (filteredByValue && value.localeCompare(filteredByValue) === 0) {
      option.selected = true;
      select.value = value;
    }

    select.appendChild(option);
  }
  container.appendChild(select);
  return container;
};

const createFilterElements = (
  /** @type {Record<FilterField, string[]>} */ uniqueValues,
) => {
  const filtersForm = document.querySelector("#filters");
  if (!filtersForm) {
    console.error("filters section not found");
    return;
  }

  filtersForm.addEventListener("reset", () => {
    for (const field of FILTER_FIELDS) {
      state.filteredBy[field] = "";
    }
    update();
  });

  const fieldsetElement = filtersForm.querySelector("fieldset");

  if (!fieldsetElement) {
    console.error("fieldset element not found in filters section");
    return;
  }

  for (const field of FILTER_FIELDS) {
    const label = TABLE_COLUMN_HEADINGS[field];
    const options = uniqueValues[field];
    const element = createFilterElement(field, options, label);
    fieldsetElement.insertAdjacentElement("beforeend", element);
  }

  fieldsetElement.classList.add("filters-container");
  fieldsetElement.addEventListener("change", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    const select = /** @type {HTMLSelectElement} */ (
      target.closest("select[name]")
    );

    const name = /** @type {FilterField} */ (select.name);
    state.filteredBy[name] = select.value;

    const clearButton = /** @type {HTMLButtonElement} */ (
      fieldsetElement.querySelector(`button#clear-${name}`)
    );
    if (clearButton) clearButton.disabled = !select.value;

    update();
  });

  fieldsetElement.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    const button = /** @type {HTMLButtonElement} */ (
      target.closest("button[id^='clear-'][data-clears]")
    );

    if (!button) return;

    const field = /** @type {FilterField} */ (
      button.getAttribute("data-clears")
    );
    state.filteredBy[field] = "";
    const select = /** @type {HTMLSelectElement} */ (
      fieldsetElement.querySelector(`select#${field}`)
    );
    if (select) select.value = "";
    button.blur();
    update();
  });
};

const initialise = async () => {
  const data = await loadData();

  if (data.length === 0) {
    // display error message in dashboard container

    return;
  }

  state.data = data;

  const initialAcc = /** @type {Record<FilterField, Set<string>>} */ (
    Object.fromEntries(FILTER_FIELDS.map((field) => [field, new Set()]))
  );

  const uniqueSets = data.reduce((acc, row) => {
    for (const field of FILTER_FIELDS) {
      acc[field].add(row[field]);
    }
    return acc;
  }, initialAcc);

  const medicationOrder = [
    "GLP-1 RA",
    "Metformin",
    "SGLT2i",
    "Sulphonylureas",
    "DPP-4i",
    "Basal Insulin",
  ];

  const uniqueOrdering = /** @type {Record<string, string[]>} */ ({
    exposureMeds: medicationOrder,
    controlMeds: medicationOrder,
  });

  const orderSet = (
    /** @type {string} */ field,
    /** @type {string[]} */ values,
  ) => /** @type {string[]} */ {
    const order = uniqueOrdering[field];
    if (!order) return values.sort();

    const orderedValues = [...values].sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b);
      } else if (indexA === -1) {
        return 1; // a is not in the order, b is, so b comes first
      } else if (indexB === -1) {
        return -1; // b is not in the order, a is, so a comes first
      } else {
        return indexA - indexB; // both are in the order, sort by their index
      }
    });
    return orderedValues;
  };

  const uniqueValues = /** @type {Record<FilterField, string[]>} */ (
    Object.fromEntries(
      Object.entries(uniqueSets).map(([field, set]) => [
        field,
        orderSet(field, [...set]),
      ]),
    )
  );

  const queryParams = new URLSearchParams(window.location.search);
  for (const field of FILTER_FIELDS) {
    const value = queryParams.get(field);
    if (!value) continue;

    const uniqueOptions = uniqueValues[field];

    const index = uniqueOptions.findIndex(
      (option) => option.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );
    if (index !== -1) {
      state.filteredBy[field] = uniqueOptions[index];
    }
  }

  const exposureMeds = uniqueValues.exposureMeds;
  const controlMeds = uniqueValues.controlMeds;

  state.exposureMeds = exposureMeds;
  state.controlMeds = controlMeds;

  populateGraphTable();

  installPlotResizeObserver();

  createFilterElements(uniqueValues);

  update();
};

document.addEventListener("DOMContentLoaded", initialise);
