// @ts-check

/**
 * @typedef {Object} DataRow
 * @property {string} study
 * @property {string} disease
 * @property {string} setting
 * @property {string} outcome
 * @property {string} group
 * @property {string} group2
//  * @property {string} group3
 * @property {string} exposureMeds
 * @property {string} controlMeds
 * @property {string} measure
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

// /** @type {Record<FilterField, string>} */
// const FIELD_LABELS = {
//     study: 'Study',
//     disease: 'Disease',
//     setting: 'Setting',
//     outcome: 'Outcome',
//     group: 'Group',
//     group2: 'Group 2',
//     group3: 'Group 3',
//     measure: 'Measure',
//     exposureMeds: 'Exposure Medications',
//     controlMeds: 'Control Medications'
// };

const TABLE_COLUMN_HEADINGS = /** @type {Record<keyof DataRow, string>} */ ({
  study: "Study",
  disease: "Disease",
  setting: "Setting",
  outcome: "Outcome",
  group: "Group",
  group2: "Group 2",
  // group3: 'Group 3',
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
  // group3: '',
  measure: "",
  exposureMeds: "",
  controlMeds: "",
});
/** @type {{ data: DataRow[], filteredBy: Record<FilterField, string>, grid: Map<string, Map<string, DataRow[]>> }} */
const state = {
  data: [],
  filteredBy: /** @type {Record<FilterField, string>} */ (
    Object.fromEntries(FILTER_FIELDS.map((f) => [f, ""]))
  ),
  grid: new Map(),
};

const getFilteredData = () =>
  state.data.filter((row) =>
    FILTER_FIELDS.every(
      (field) =>
        !state.filteredBy[field] || row[field] === state.filteredBy[field],
    ),
  );

const getAvailbleOptionsFor = (/** @type {FilterField} */ field) => {
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
      document.getElementById(field)
    );
    if (!select) continue;

    const available = getAvailbleOptionsFor(field);

    for (const option of select.options) {
      if (option.value === "") continue; // skip the default option
      option.disabled = !available.has(option.value);
    }
  }
};

const render = () => {
  const filteredData = getFilteredData();

  const dashboardContainer = document.getElementById("dashboard");
  if (!dashboardContainer) {
    console.error("Dashboard container not found");
    return;
  }

  const createTable = () => /** @type {HTMLDivElement} */ {
    const tableDiv = document.createElement("div");
    tableDiv.id = "table";
    tableDiv.classList.add("dashboard-table");
    dashboardContainer.appendChild(tableDiv);

    const headerDiv = document.createElement("div");
    headerDiv.classList.add("table-header");
    for (const key of /** @type {(keyof DataRow)[]} */ (
      Object.keys(TABLE_COLUMN_HEADINGS)
    )) {
      const cellDiv = document.createElement("div");
      cellDiv.classList.add("table-cell");
      cellDiv.setAttribute("data-column", key);
      cellDiv.textContent = TABLE_COLUMN_HEADINGS[key];
      headerDiv.appendChild(cellDiv);
    }
    tableDiv.appendChild(headerDiv);

    return tableDiv;
  };

  const createTableBody = () => /** @type {HTMLDivElement} */ {
    const bodyDiv = document.createElement("div");
    bodyDiv.classList.add("table-body");

    for (const row of filteredData) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("table-row");
      rowDiv.setAttribute("data-unique-id", row.uniqueId);
      rowDiv.id = `row-${row.uniqueId}`;
      for (const key of /** @type {(keyof DataRow)[]} */ (
        Object.keys(TABLE_COLUMN_HEADINGS)
      )) {
        const cellDiv = document.createElement("div");
        cellDiv.classList.add("table-cell");
        cellDiv.setAttribute("data-column", key);
        cellDiv.textContent = String(row[key]);
        rowDiv.appendChild(cellDiv);
      }
      bodyDiv.appendChild(rowDiv);
    }

    return bodyDiv;
  };

  const table = dashboardContainer.querySelector("#table") || createTable();

  const oldTableBody = table.querySelector(".table-body");

  const newTableBody = createTableBody();

  if (oldTableBody) {
    table.replaceChild(newTableBody, oldTableBody);
  } else {
    table.appendChild(newTableBody);
  }
};

const update = () => {
  render();
  updateFilterOptions();

  const clearAllButton = /** @type {HTMLButtonElement} */ (
    document.querySelector("#filters button#reset-filters")
  );
  clearAllButton.disabled = !Object.values(state.filteredBy).some((v) => v);

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
  window.history.replaceState({}, "", `${window.location.pathname}?${queryParams.toString()}`);
};

const buildGrid = (
  /** @type {DataRow[]} */ data,
) => /** @type {Map<string, Map<string, DataRow[]>>} */ {
  /** @type {Map<string, Map<string, DataRow[]>>} */
  const grid = new Map();

  for (const row of data) {
    let byExposure = grid.get(row.controlMeds);
    if (!byExposure) {
      byExposure = new Map();
      grid.set(row.controlMeds, byExposure);
    }
    let rows = byExposure.get(row.exposureMeds);
    if (!rows) {
      rows = [];
      byExposure.set(row.exposureMeds, rows);
    }
    rows.push(row);
  }

  return grid;
};

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

  const clearButton = /** @type {HTMLButtonElement} */ (document.createElement("button"));
  clearButton.type = "button";
  clearButton.id = `clear-${field}`;
  clearButton.setAttribute("aria-label", `Clear ${label} filter`);
  clearButton.setAttribute("data-clears", field);
  clearButton.textContent = "Clear";
  clearButton.disabled = !filteredByValue;
  container.appendChild(clearButton);

  const select = document.createElement("select");
  select.name = field;
  select.id = field;
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = 'Filter by ...';
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
  const filtersSection = document.querySelector("#filters");
  if (!filtersSection) {
    console.error("filters section not found");
    return;
  }

  const clearAllButton = /** @type {HTMLButtonElement} */ (filtersSection.querySelector("button#reset-filters"));

  clearAllButton?.addEventListener("click", () => {
    for (const field of FILTER_FIELDS) {
      state.filteredBy[field] = "";
      const select = /** @type {HTMLSelectElement} */ (
        document.getElementById(field)
      );
      if (select) select.value = "";
    }
    clearAllButton.blur();
    update();
  });

  const filtersContainer = document.createElement("div");

  for (const field of FILTER_FIELDS) {
    const label = TABLE_COLUMN_HEADINGS[field];
    const options = uniqueValues[field];
    const element = createFilterElement(field, options, label);
    filtersContainer.appendChild(element);
  }

  filtersContainer.classList.add("filters-container");
  filtersContainer.addEventListener("change", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    const select = /** @type {HTMLSelectElement} */ (
      target.closest("select[name]")
    );

    const name = /** @type {FilterField} */ (select.name);
    state.filteredBy[name] = select.value;

    const clearButton = /** @type {HTMLButtonElement} */ (
      filtersContainer.querySelector(`button#clear-${name}`)
    );
    if (clearButton) clearButton.disabled = !select.value;

    update();
  });

  filtersContainer.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);

    const button = /** @type {HTMLButtonElement} */ (
      target.closest("button[id^='clear-'][data-clears]")
    );

    if (!button) return;

    const field = /** @type {FilterField} */ (button.getAttribute("data-clears"));
    state.filteredBy[field] = "";
    const select = /** @type {HTMLSelectElement} */ (
      filtersContainer.querySelector(`#${field}`)
    );
    if (select) select.value = "";
    button.blur();
    button.disabled = true;
    update();
  });


  filtersSection.appendChild(filtersContainer);
};

const initialise = async () => {
  const data = await loadData();

  if (data.length === 0) {
    // display error message in dashboard container

    return;
  }

  state.data = data;

  const initialAcc = /** @type {Record<FilterField, Set<string | number>>} */ (
    Object.fromEntries(FILTER_FIELDS.map((field) => [field, new Set()]))
  );

  const uniqueSets = data.reduce((acc, row) => {
    for (const field of FILTER_FIELDS) {
      acc[field].add(row[field]);
    }
    return acc;
  }, initialAcc);

  const uniqueValues = /** @type {Record<FilterField, string[]>} */ (
    Object.fromEntries(
      Object.entries(uniqueSets).map(([field, set]) => [
        field,
        [...set].sort(),
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


  /** @type {Map<string, Map<string, DataRow[]>>} */
  state.grid = buildGrid(data);

  createFilterElements(uniqueValues);

  update();
};

document.addEventListener("DOMContentLoaded", initialise);
