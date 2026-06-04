const STORAGE_KEY = "autonf.presets.v1";
const SETTINGS_KEY = "autonf.settings.v1";
const TARGET_URL = "https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas";
const DEFAULT_DESCRIPTION = "Suporte, instrução, desenvolvimento e/ou manutenção em serviços relacionados a webdesign.";
const DEFAULT_SETTINGS = {
  autoAdvance: "no",
  defaultValue: "",
  defaultDescription: DEFAULT_DESCRIPTION,
  municipalityExact: "Natal/RN",
  taxCodeMatch: "01.08.01 - Planejamento, confecção, manutenção e atualização de páginas eletrônicas.",
  nbsLabel: "115023000 - Serviços de projeto e desenvolvimento de estruturas e conteúdo de páginas eletrônicas",
  pisSituationPrefix: "00",
  retentionTypeValue: "0",
  retentionTypeLabel: "PIS/COFINS/CSLL Não Retidos",
  regimeLabel: "Regime de apuração dos tributos federais e municipal pelo Simples Nacional"
};
const hasChromeExtensionApi = Boolean(globalThis.chrome?.storage?.local && globalThis.chrome?.tabs);

const elements = {
  presetSelect: document.querySelector("#presetSelect"),
  presetForm: document.querySelector("#presetForm"),
  presetId: document.querySelector("#presetId"),
  nameInput: document.querySelector("#nameInput"),
  cnpjInput: document.querySelector("#cnpjInput"),
  valueInput: document.querySelector("#valueInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  newPresetBtn: document.querySelector("#newPresetBtn"),
  editPresetBtn: document.querySelector("#editPresetBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  closePresetFormBtn: document.querySelector("#closePresetFormBtn"),
  presetFormTitle: document.querySelector("#presetFormTitle"),
  deletePresetBtn: document.querySelector("#deletePresetBtn"),
  settingsForm: document.querySelector("#settingsForm"),
  closeSettingsBtn: document.querySelector("#closeSettingsBtn"),
  resetSettingsBtn: document.querySelector("#resetSettingsBtn"),
  defaultValueInput: document.querySelector("#defaultValueInput"),
  defaultDescriptionInput: document.querySelector("#defaultDescriptionInput"),
  municipalityExactInput: document.querySelector("#municipalityExactInput"),
  taxCodeMatchInput: document.querySelector("#taxCodeMatchInput"),
  nbsLabelInput: document.querySelector("#nbsLabelInput"),
  pisSituationPrefixInput: document.querySelector("#pisSituationPrefixInput"),
  retentionTypeValueInput: document.querySelector("#retentionTypeValueInput"),
  retentionTypeLabelInput: document.querySelector("#retentionTypeLabelInput"),
  regimeLabelInput: document.querySelector("#regimeLabelInput"),
  selectedName: document.querySelector("#selectedName"),
  selectedCnpj: document.querySelector("#selectedCnpj"),
  selectedValue: document.querySelector("#selectedValue"),
  runDescriptionInput: document.querySelector("#runDescriptionInput"),
  runValueInput: document.querySelector("#runValueInput"),
  autoAdvanceToggle: document.querySelector("#autoAdvanceToggle"),
  fillPeopleBtn: document.querySelector("#fillPeopleBtn"),
  fillServiceBtn: document.querySelector("#fillServiceBtn"),
  fillValuesBtn: document.querySelector("#fillValuesBtn"),
  diagnoseBtn: document.querySelector("#diagnoseBtn"),
  openPortalBtn: document.querySelector("#openPortalBtn"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  statusSection: document.querySelector("#statusSection"),
  toggleStatusBtn: document.querySelector("#toggleStatusBtn"),
  statusIndicator: document.querySelector("#statusIndicator"),
  statusText: document.querySelector("#statusText"),
  currentYear: document.querySelector("#currentYear"),
  logOutput: document.querySelector("#logOutput")
};

let presets = [];
let automationRunning = false;
let settings = { ...DEFAULT_SETTINGS };

init();

async function init() {
  elements.currentYear.textContent = String(new Date().getFullYear());
  presets = await loadPresets();
  await loadSettings();
  renderPresetOptions();
  selectPreset(presets[0]?.id ?? "");
  bindEvents();
  setAutomationStatus("idle", "Pronto");
  await redirectActiveTabToPortal();
  log("Painel pronto. Faça login manualmente no portal antes de automatizar.");
}

function bindEvents() {
  elements.presetSelect.addEventListener("change", () => selectPreset(elements.presetSelect.value));
  elements.newPresetBtn.addEventListener("click", () => {
    clearForm();
    openPresetForm("Novo cliente");
  });
  elements.editPresetBtn.addEventListener("click", () => {
    if (!getSelectedPreset()) return;
    openPresetForm("Editar cliente");
  });
  elements.settingsBtn.addEventListener("click", () => {
    elements.presetForm.classList.add("is-hidden");
    elements.settingsForm.classList.toggle("is-hidden");
  });
  elements.closePresetFormBtn.addEventListener("click", closePresetForm);
  elements.closeSettingsBtn.addEventListener("click", () => elements.settingsForm.classList.add("is-hidden"));
  elements.autoAdvanceToggle.addEventListener("change", async () => {
    await saveSettings();
    if (elements.autoAdvanceToggle.checked) runAutomation("people");
  });
  elements.toggleStatusBtn.addEventListener("click", () => {
    const collapsed = elements.statusSection.classList.toggle("is-collapsed");
    elements.toggleStatusBtn.classList.toggle("is-expanded", !collapsed);
    elements.toggleStatusBtn.title = collapsed ? "Expandir status" : "Recolher status";
    elements.toggleStatusBtn.setAttribute("aria-label", collapsed ? "Expandir status" : "Recolher status");
  });
  elements.clearLogBtn.addEventListener("click", () => {
    elements.logOutput.textContent = "";
  });

  elements.openPortalBtn.addEventListener("click", async () => {
    if (!hasChromeExtensionApi) {
      log("A abertura do portal funciona quando o painel está carregado como extensão.");
      return;
    }

    await chrome.runtime.sendMessage({ type: "OPEN_PORTAL" });
    log("Portal aberto.");
  });

  elements.presetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const preset = {
      id: elements.presetId.value || crypto.randomUUID(),
      name: elements.nameInput.value.trim(),
      cnpj: normalizeCnpj(elements.cnpjInput.value),
      value: normalizeMoney(elements.valueInput.value),
      description: elements.descriptionInput.value.trim()
    };

    if (!preset.name || !preset.cnpj || !preset.value || !preset.description) {
      log("Preencha todos os campos do cliente antes de salvar.", "erro");
      return;
    }

    presets = [...presets.filter((item) => item.id !== preset.id), preset].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
    await savePresets(presets);
    renderPresetOptions();
    selectPreset(preset.id);
    closePresetForm();
    log(`Cliente salvo: ${preset.name}.`);
  });

  elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettingsFromForm();
    elements.settingsForm.classList.add("is-hidden");
    log("Configurações salvas.");
  });

  elements.resetSettingsBtn.addEventListener("click", async () => {
    settings = { ...DEFAULT_SETTINGS, autoAdvance: getAutoAdvanceValue() };
    renderSettingsForm();
    await persistSettings();
    log("Configurações restauradas para os padrões.");
  });

  elements.deletePresetBtn.addEventListener("click", async () => {
    const id = elements.presetId.value;
    if (!id) return;

    const removed = presets.find((preset) => preset.id === id);
    presets = presets.filter((preset) => preset.id !== id);
    await savePresets(presets);
    renderPresetOptions();
    selectPreset(presets[0]?.id ?? "");
    closePresetForm();
    log(removed ? `Cliente excluído: ${removed.name}.` : "Cliente excluído.");
  });

  elements.fillPeopleBtn.addEventListener("click", () => runAutomation("people"));
  elements.fillServiceBtn.addEventListener("click", () => runAutomation("service"));
  elements.fillValuesBtn.addEventListener("click", () => runAutomation("values"));
  elements.diagnoseBtn.addEventListener("click", () => runAutomation("diagnose"));
}

async function loadPresets() {
  if (!hasChromeExtensionApi) {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }

  const data = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function savePresets(nextPresets) {
  if (!hasChromeExtensionApi) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPresets));
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: nextPresets });
}

async function loadSettings() {
  const storedSettings = hasChromeExtensionApi
    ? (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] || {}
    : JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");

  settings = { ...DEFAULT_SETTINGS, ...storedSettings };
  const autoAdvanceValue = settings.autoAdvance === "yes" ? "yes" : "no";
  elements.autoAdvanceToggle.checked = autoAdvanceValue === "yes";
  renderSettingsForm();
}

async function saveSettings() {
  settings = { ...settings, autoAdvance: getAutoAdvanceValue() };
  await persistSettings();
}

async function persistSettings() {
  if (!hasChromeExtensionApi) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return;
  }

  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function renderSettingsForm() {
  elements.defaultValueInput.value = settings.defaultValue || "";
  elements.defaultDescriptionInput.value = settings.defaultDescription || "";
  elements.municipalityExactInput.value = settings.municipalityExact || "";
  elements.taxCodeMatchInput.value = settings.taxCodeMatch || "";
  elements.nbsLabelInput.value = settings.nbsLabel || "";
  elements.pisSituationPrefixInput.value = settings.pisSituationPrefix || "";
  elements.retentionTypeValueInput.value = settings.retentionTypeValue || "";
  elements.retentionTypeLabelInput.value = settings.retentionTypeLabel || "";
  elements.regimeLabelInput.value = settings.regimeLabel || "";
}

async function saveSettingsFromForm() {
  settings = {
    ...settings,
    autoAdvance: getAutoAdvanceValue(),
    defaultValue: normalizeMoney(elements.defaultValueInput.value),
    defaultDescription: elements.defaultDescriptionInput.value.trim() || DEFAULT_SETTINGS.defaultDescription,
    municipalityExact: elements.municipalityExactInput.value.trim() || DEFAULT_SETTINGS.municipalityExact,
    taxCodeMatch: elements.taxCodeMatchInput.value.trim() || DEFAULT_SETTINGS.taxCodeMatch,
    nbsLabel: elements.nbsLabelInput.value.trim() || DEFAULT_SETTINGS.nbsLabel,
    pisSituationPrefix: elements.pisSituationPrefixInput.value.trim() || DEFAULT_SETTINGS.pisSituationPrefix,
    retentionTypeValue: elements.retentionTypeValueInput.value.trim() || DEFAULT_SETTINGS.retentionTypeValue,
    retentionTypeLabel: elements.retentionTypeLabelInput.value.trim() || DEFAULT_SETTINGS.retentionTypeLabel,
    regimeLabel: elements.regimeLabelInput.value.trim() || DEFAULT_SETTINGS.regimeLabel
  };
  await persistSettings();
}

function getAutoAdvanceValue() {
  return elements.autoAdvanceToggle.checked ? "yes" : "no";
}

function isNfseUrl(url) {
  try {
    const { hostname } = new URL(url || "");
    return hostname === "nfse.gov.br" || hostname.endsWith(".nfse.gov.br");
  } catch (_error) {
    return false;
  }
}

async function redirectActiveTabToPortal() {
  if (!hasChromeExtensionApi) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.url?.startsWith(TARGET_URL)) return;

  if (isNfseUrl(tab.url)) {
    await chrome.tabs.update(tab.id, { url: TARGET_URL });
    log("Aba redirecionada para a tela de Pessoas. Faça login manualmente antes de automatizar.");
    return;
  }

  await chrome.tabs.create({ url: TARGET_URL, active: true });
  log("Portal aberto em uma nova aba. Faça login manualmente antes de automatizar.");
}

function renderPresetOptions() {
  elements.presetSelect.replaceChildren();

  if (!presets.length) {
    elements.presetSelect.append(new Option("Nenhum cliente cadastrado", ""));
    return;
  }

  for (const preset of presets) {
    elements.presetSelect.append(new Option(preset.name, preset.id));
  }
}

function selectPreset(id) {
  const preset = presets.find((item) => item.id === id);
  elements.presetSelect.value = preset?.id ?? "";

  if (!preset) {
    clearForm();
    elements.selectedName.textContent = "Nenhum cliente";
    elements.selectedCnpj.textContent = "-";
    elements.selectedValue.textContent = "-";
    elements.runDescriptionInput.value = "";
    elements.runValueInput.value = "";
    setActionState(false);
    elements.editPresetBtn.disabled = true;
    return;
  }

  elements.presetId.value = preset.id;
  elements.nameInput.value = preset.name;
  elements.cnpjInput.value = preset.cnpj;
  elements.valueInput.value = preset.value;
  elements.descriptionInput.value = preset.description;
  elements.selectedName.textContent = preset.name;
  elements.selectedCnpj.textContent = preset.cnpj;
  elements.selectedValue.textContent = formatCurrency(preset.value);
  elements.runDescriptionInput.value = preset.description;
  elements.runValueInput.value = preset.value;
  setActionState(true);
  elements.editPresetBtn.disabled = false;
}

function clearForm() {
  elements.presetId.value = "";
  elements.nameInput.value = "";
  elements.cnpjInput.value = "";
  elements.valueInput.value = settings.defaultValue || "";
  elements.descriptionInput.value = settings.defaultDescription || DEFAULT_DESCRIPTION;
}

function openPresetForm(title) {
  elements.presetFormTitle.textContent = title;
  elements.presetForm.classList.remove("is-hidden");
  elements.nameInput.focus();
}

function closePresetForm() {
  elements.presetForm.classList.add("is-hidden");
}

function setActionState(enabled) {
  elements.fillPeopleBtn.disabled = !enabled;
  elements.fillServiceBtn.disabled = !enabled;
  elements.fillValuesBtn.disabled = !enabled;
  elements.diagnoseBtn.disabled = !enabled;
}

function getSelectedPreset() {
  return presets.find((preset) => preset.id === elements.presetSelect.value);
}

async function runAutomation(step) {
  if (!hasChromeExtensionApi) {
    log("A automação só roda quando a pasta está carregada como extensão no Chrome.", "erro");
    return;
  }

  const preset = getSelectedPreset();
  if (!preset) {
    log("Selecione um cliente antes de automatizar.", "erro");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    log("Nenhuma aba ativa encontrada.", "erro");
    return;
  }

  if (!tab.url?.startsWith(TARGET_URL)) {
    if (isNfseUrl(tab.url)) {
      await chrome.tabs.update(tab.id, { url: TARGET_URL });
      log("Aba redirecionada para a tela de Pessoas. Faça login e execute novamente.");
    } else {
      await chrome.tabs.create({ url: TARGET_URL, active: true });
      log("Portal aberto em uma nova aba. Faça login e execute novamente.");
    }
    return;
  }

  if (getAutoAdvanceValue() === "yes" && step !== "diagnose") {
    await runAutoFlow(tab.id, preset, step);
    return;
  }

  await runSingleAutomationStep(tab.id, preset, step);
}

function buildPayload(step, preset, autoAdvance = false) {
  return {
    step,
    autoAdvance,
    client: {
      name: preset.name,
      cnpj: preset.cnpj,
      value: normalizeMoney(elements.runValueInput.value || preset.value || settings.defaultValue),
      description: elements.runDescriptionInput.value.trim() || preset.description || settings.defaultDescription
    },
    settings
  };
}

async function executeAutomationPayload(tabId, payload) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: automateNfseStep,
    args: [payload]
  });
  return result?.result;
}

async function runSingleAutomationStep(tabId, preset, step) {
  const payload = buildPayload(step, preset, false);
  try {
    if (!automationRunning && step !== "diagnose") {
      setAutomationStatus("running", `Executando ${labelForStep(step)}`);
    }
    log(`Executando etapa: ${labelForStep(step)}...`);
    const response = await executeAutomationPayload(tabId, payload);
    if (!response?.ok) {
      setAutomationStatus("error", "Erro na automação");
      log(response?.message || "Automação não concluída.", "erro");
      if (response?.details?.length) {
        log(response.details.join("\n"), "erro");
      }
      return false;
    }

    log(response.message);
    if (response.details?.length) log(response.details.join("\n"));
    if (!automationRunning && step !== "diagnose" && step !== "next") {
      setAutomationStatus("done", `${labelForStep(step)} concluído`);
    }
    return true;
  } catch (error) {
    setAutomationStatus("error", "Erro na automação");
    log(error?.message || String(error), "erro");
    return false;
  }
}

function nextStepForPanel(step) {
  return {
    people: "service",
    service: "values",
    values: "review"
  }[step] || null;
}

function stepSequenceFrom(startStep) {
  const order = ["people", "service", "values"];
  const index = order.indexOf(startStep);
  return index >= 0 ? order.slice(index) : [];
}

async function waitForPortalStep(tabId, step, timeout = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: checkNfseStepReady,
        args: [step]
      });
      if (result?.result) return true;
    } catch (_error) {
      // The tab may be between document loads; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function runAutoFlow(tabId, preset, startStep = "people") {
  if (automationRunning) {
    log("Auto já está em execução.");
    return;
  }

  automationRunning = true;
  let completed = false;
  let failed = false;
  setAutomationStatus("running", "Auto em execução");
  try {
    const sequence = stepSequenceFrom(startStep);
    for (const currentStep of sequence) {
      const ready = await waitForPortalStep(tabId, currentStep, currentStep === startStep ? 1000 : 15000);
      if (!ready && currentStep !== startStep) {
        log(`A etapa ${labelForStep(currentStep)} não carregou a tempo.`, "erro");
        failed = true;
        break;
      }

      const filled = await runSingleAutomationStep(tabId, preset, currentStep);
      if (!filled) {
        failed = true;
        break;
      }

      const nextStep = nextStepForPanel(currentStep);
      if (!nextStep) break;

      const advanced = await runSingleAutomationStep(tabId, preset, "next");
      if (!advanced) {
        failed = true;
        break;
      }
      if (nextStep === "review") {
        log("Auto chegou à tela de revisão.");
        elements.autoAdvanceToggle.checked = false;
        await saveSettings();
        completed = true;
        break;
      }

      const loaded = await waitForPortalStep(tabId, nextStep, 15000);
      if (!loaded) {
        log(`A etapa ${labelForStep(nextStep)} não carregou a tempo.`, "erro");
        failed = true;
        break;
      }
    }
  } finally {
    automationRunning = false;
    if (completed) {
      setAutomationStatus("done", "Auto finalizado");
    } else if (failed) {
      setAutomationStatus("error", "Auto interrompido");
    }
  }
}

function labelForStep(step) {
  return {
    people: "Pessoas",
    service: "Serviço",
    values: "Valores",
    next: "Avançar",
    review: "Revisão",
    diagnose: "Diagnóstico"
  }[step] || step;
}

function checkNfseStepReady(step) {
  const byId = (id) => document.getElementById(id);
  const checks = {
    people: () =>
      byId("SimplesNacional_RegimeApuracaoTributosSN") ||
      byId("SimplesNacional_RegimeApuracaoTributosSN_chosen") ||
      byId("Tomador_CpfCnpj") ||
      Boolean([...document.querySelectorAll("input")].find((input) => /data|competencia/i.test(input.id + input.name))),
    service: () =>
      byId("LocalPrestacao_CodigoMunicipioPrestacao") ||
      byId("ServicoPrestado_CodigoTributacaoNacional") ||
      byId("ServicoPrestado_Descricao"),
    values: () =>
      byId("Valores_ValorServico") ||
      byId("ISSQN_HaRetencao") ||
      byId("TributacaoFederal_PISCofins_SituacaoTributaria")
  };
  return Boolean((checks[step] || (() => true))());
}

function normalizeCnpj(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function normalizeMoney(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const numeric = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) return raw;
  return parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  return `R$ ${normalizeMoney(value)}`;
}

function deriveSearchToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
    .slice(0, 4);
}

function log(message, type = "info") {
  const time = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const prefix = type === "erro" ? "ERRO" : "OK";
  if (type === "erro") {
    setAutomationStatus("error", "Erro na automação");
  }
  elements.logOutput.textContent = `[${time}] ${prefix}: ${message}\n${elements.logOutput.textContent}`;
}

function setAutomationStatus(status, text) {
  elements.statusIndicator.className = `status-indicator is-${status}`;
  elements.statusText.textContent = text;
}

function automateNfseStep(payload) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const details = [];
  const errors = [];
  const config = payload.settings || {};

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const deriveSearchToken = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 4);

  const deriveLeadingDigits = (value) => String(value ?? "").match(/\d+/)?.[0] || "";

  const visible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };

  const writable = (element) =>
    visible(element) &&
    !element.disabled &&
    !element.readOnly &&
    element.getAttribute("aria-disabled") !== "true" &&
    !element.classList.contains("disabled");

  const labelText = (element) => {
    const id = element.id;
    const labels = [];
    if (id) labels.push(...document.querySelectorAll(`label[for="${CSS.escape(id)}"]`));
    if (element.labels) labels.push(...element.labels);
    return labels.map((label) => label.textContent).join(" ");
  };

  const fieldText = (element) => {
    const candidates = [
      labelText(element),
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.closest(".form-group, .field, .row, .col, div")?.textContent
    ];
    return normalize(candidates.filter(Boolean).join(" "));
  };

  const allControls = (options = {}) =>
    [...document.querySelectorAll("input, textarea, select, [contenteditable='true']")].filter((control) =>
      options.writableOnly ? writable(control) : visible(control)
    );

  const findControl = (needles, options = {}) => {
    const normalizedNeedles = needles.map(normalize);
    const controls = allControls({ writableOnly: options.writableOnly ?? true });
    const matches = controls.filter((control) => {
      const text = fieldText(control);
      const type = control.getAttribute("type") || "";
      if (options.tag && control.tagName.toLowerCase() !== options.tag) return false;
      if (options.type && type.toLowerCase() !== options.type) return false;
      if (options.excludeTypes?.includes(type.toLowerCase())) return false;
      return normalizedNeedles.every((needle) => text.includes(needle));
    });
    return matches[0] || null;
  };

  const optionControls = () =>
    allControls({ writableOnly: true }).filter((control) => {
      const type = (control.getAttribute("type") || "").toLowerCase();
      return type !== "radio" && type !== "checkbox";
    });

  const findByPlaceholderOrValue = (needles) => {
    const normalizedNeedles = needles.map(normalize);
    return allControls({ writableOnly: true }).find((control) => {
      const text = normalize(
        [
          fieldText(control),
          control.value,
          control.getAttribute("placeholder"),
          control.getAttribute("aria-label")
        ].join(" ")
      );
      return normalizedNeedles.every((needle) => text.includes(needle));
    });
  };

  const nativeSet = (element, value) => {
    if (!element || !writable(element)) return false;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    element.focus();

    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    const ownDescriptor = Object.getOwnPropertyDescriptor(element, "value");

    if (descriptor?.set && descriptor.set !== ownDescriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    return true;
  };

  const keyboardSet = async (element, value, options = {}) => {
    if (!element || !writable(element)) return false;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    element.focus();
    clickElement(element);

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (descriptor?.set) descriptor.set.call(element, "");
    else element.value = "";

    element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

    let typedValue = "";
    for (const char of String(value)) {
      typedValue += char;
      element.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true, composed: true }));
      element.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        composed: true,
        data: char,
        inputType: "insertText"
      }));

      if (descriptor?.set) descriptor.set.call(element, typedValue);
      else element.value = typedValue;

      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: char,
        inputType: "insertText"
      }));
      element.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true, composed: true }));
      await sleep(25);
    }

    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    if (options.blur !== false) {
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true }));
      element.blur();
      element.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }));
      document.body.click();
    }
    return true;
  };

  const keyboardSetAndCommit = async (element, value) => {
    if (!await keyboardSet(element, value, { blur: false })) return false;
    await sleep(250);
    await pressEnterOnly(element);
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    element.blur();
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true }));
    element.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }));
    clickElement(document.body);
    await sleep(100);
    return true;
  };

  const searchSet = async (element, value, options = {}) => {
    if (!element || (!options.force && !writable(element))) return false;
    element.focus();
    clickElement(element);

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (descriptor?.set) descriptor.set.call(element, "");
    else element.value = "";

    element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    let typedValue = "";
    for (const char of String(value)) {
      typedValue += char;
      const keyCode = char.toUpperCase().charCodeAt(0);
      element.dispatchEvent(new KeyboardEvent("keydown", { key: char, keyCode, which: keyCode, bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keypress", { key: char, keyCode, which: keyCode, bubbles: true, composed: true }));
      element.dispatchEvent(new InputEvent("beforeinput", {
        bubbles: true,
        composed: true,
        data: char,
        inputType: "insertText"
      }));

      if (descriptor?.set) descriptor.set.call(element, typedValue);
      else element.value = typedValue;

      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: char,
        inputType: "insertText"
      }));
      element.dispatchEvent(new KeyboardEvent("keyup", { key: char, keyCode, which: keyCode, bubbles: true, composed: true }));

      if (globalThis.jQuery) {
        try {
          globalThis.jQuery(element).trigger("input").trigger({
            type: "keyup",
            keyCode,
            which: keyCode
          });
        } catch (_error) {
          // Native keyboard events above are enough for non-jQuery widgets.
        }
      }
      await sleep(45);
    }

    element.dispatchEvent(new KeyboardEvent("keyup", { key: "a", keyCode: 65, which: 65, bubbles: true, composed: true }));
    return true;
  };

  const pressAutocompleteConfirm = async (element) => {
    if (!element) return false;
    element.focus();
    for (const key of ["ArrowDown", "Enter"]) {
      const keyCode = key === "ArrowDown" ? 40 : 13;
      const init = { key, keyCode, which: keyCode, bubbles: true, composed: true };
      element.dispatchEvent(new KeyboardEvent("keydown", init));
      if (key === "Enter") element.dispatchEvent(new KeyboardEvent("keypress", init));
      element.dispatchEvent(new KeyboardEvent("keyup", init));
      if (globalThis.jQuery) {
        try {
          globalThis.jQuery(element)
            .trigger({ type: "keydown", keyCode, which: keyCode })
            .trigger({ type: "keyup", keyCode, which: keyCode });
        } catch (_error) {
          // Native key events above cover non-jQuery widgets.
        }
      }
      await sleep(key === "ArrowDown" ? 350 : 550);
    }
    return true;
  };

  const pressEnterOnly = async (element) => {
    if (!element) return false;
    element.focus();
    const keyCode = 13;
    const init = { key: "Enter", keyCode, which: keyCode, bubbles: true, composed: true };
    element.dispatchEvent(new KeyboardEvent("keydown", init));
    element.dispatchEvent(new KeyboardEvent("keypress", init));
    element.dispatchEvent(new KeyboardEvent("keyup", init));
    if (globalThis.jQuery) {
      try {
        globalThis.jQuery(element)
          .trigger({ type: "keydown", keyCode, which: keyCode })
          .trigger({ type: "keypress", keyCode, which: keyCode })
          .trigger({ type: "keyup", keyCode, which: keyCode });
      } catch (_error) {
        // Native key events above cover non-jQuery widgets.
      }
    }
    await sleep(650);
    return true;
  };

  const clickElement = (element) => {
    if (!element) return false;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
    element.click();
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    return true;
  };

  const nativeCheck = (element) => {
    if (!element) return false;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
    if (descriptor?.set) descriptor.set.call(element, true);
    else element.checked = true;
    element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    clickElement(element);
    return true;
  };

  const textMatches = (element, needles) => {
    const text = normalize(element.textContent);
    return needles.map(normalize).every((needle) => text.includes(needle));
  };

  const optionMatches = (element, matcher) => {
    const text = normalize(element.textContent);
    if (Array.isArray(matcher)) return matcher.some((item) => optionMatches(element, item));
    if (typeof matcher === "object" && matcher?.all) {
      return matcher.all.map(normalize).every((needle) => text.includes(needle));
    }

    const normalizedMatcher = normalize(matcher);
    if (text.includes(normalizedMatcher)) return true;

    const tokens = normalizedMatcher.split(/[^a-z0-9]+/).filter((token) => token.length > 1);
    return tokens.length > 0 && tokens.every((token) => text.includes(token));
  };

  const findSection = (...needles) => {
    const sections = [...document.querySelectorAll("section, fieldset, .card, .panel, .box, div")].filter(visible);
    return sections.find((section) => textMatches(section, needles)) || document.body;
  };

  const clickRadioByText = (sectionNeedles, optionNeedles) => {
    const root = sectionNeedles?.length ? findSection(...sectionNeedles) : document.body;
    const labels = [...root.querySelectorAll("label")].filter(visible);
    const label = labels.find((item) => textMatches(item, optionNeedles));
    if (label) {
      const input =
        label.control ||
        label.querySelector("input[type='radio'], input[type='checkbox']") ||
        (label.getAttribute("for") ? document.getElementById(label.getAttribute("for")) : null);
      if (input) return nativeCheck(input);
      return clickElement(label);
    }

    const radio = [...root.querySelectorAll("input[type='radio'], input[type='checkbox']")].find((input) =>
      textMatches(input.closest("label, div, li, tr, p") || input, optionNeedles)
    );
    return nativeCheck(radio);
  };

  const clickButtonNear = (nearControl, buttonNeedles) => {
    const row = nearControl?.closest(".input-group, .form-group, .row, div") || document.body;
    const buttons = [...row.querySelectorAll("button, a, [role='button'], .btn, span")].filter(visible);
    const wanted = buttons.find((button) => textMatches(button, buttonNeedles));
    if (wanted) return clickElement(wanted);

    const iconButton = buttons.find((button) => {
      const text = normalize([button.title, button.getAttribute("aria-label"), button.className].join(" "));
      return /search|pesquis|lupa|consulta|buscar/.test(text);
    });
    if (iconButton) return clickElement(iconButton);

    const rect = nearControl?.getBoundingClientRect();
    if (!rect) return false;
    const nearby = [...document.querySelectorAll("button, a, [role='button'], .btn")].filter(visible).find((button) => {
      const buttonRect = button.getBoundingClientRect();
      return Math.abs(buttonRect.top - rect.top) < 35 && buttonRect.left > rect.right - 4;
    });
    return clickElement(nearby);
  };

  const clickOptionLike = async (control, label, query = label, timeout = 5000) => {
    if (!control) return false;

    if (control.tagName === "SELECT") {
      const option = [...control.options].find((item) => normalize(item.textContent).includes(normalize(label)));
      if (!option) return false;
      nativeSet(control, option.value);
      return true;
    }

    const currentText = normalize([control.value, control.textContent, control.getAttribute("title")].join(" "));
    if (currentText.includes(normalize(label))) return true;

    clickElement(control);
    await sleep(250);

    if (writable(control)) {
      nativeSet(control, query);
      await sleep(350);
    }

    const findOption = () =>
      [
        ...document.querySelectorAll(
          "[role='option'], .option, .select2-results__option, .p-dropdown-item, .ui-select-choices-row, .dropdown-item, li, mat-option, ng-option"
        )
      ]
        .filter(visible)
        .find((item) => textMatches(item, [label]));

    const option = await waitFor(findOption, timeout);
    if (option) {
      clickElement(option);
      return true;
    }

    nativeSet(control, label);
    return true;
  };

  const byId = (id) => document.getElementById(id);

  const firstVisible = (selector, root = document) => [...root.querySelectorAll(selector)].find(visible);

  const selectNativeById = (id, value) => {
    const control = byId(id);
    if (!control || control.disabled) return false;

    const proto = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor?.set) descriptor.set.call(control, value);
    else control.value = value;

    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    control.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

    if (globalThis.jQuery) {
      try {
        globalThis.jQuery(control).trigger("chosen:updated").trigger("change");
      } catch (_error) {
        // The native events above are the canonical path; jQuery is only a compatibility nudge.
      }
    }

    return true;
  };

  const selectNativeByTextPrefix = (id, prefix) => {
    const control = byId(id);
    if (!(control instanceof HTMLSelectElement) || control.disabled) return false;

    const normalizedPrefix = normalize(prefix);
    const option = [...control.options].find((item) => normalize(item.textContent).startsWith(normalizedPrefix));
    if (!option) return false;
    return selectNativeById(id, option.value);
  };

  const forceChoiceById = (id, value, label) => {
    const control = byId(id);
    if (!control || control.disabled) return false;

    const setValue = (element, nextValue) => {
      const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor?.set) descriptor.set.call(element, nextValue);
      else element.value = nextValue;
    };

    if (control instanceof HTMLSelectElement) {
      let option = [...control.options].find((item) => item.value === value || normalize(item.textContent).includes(normalize(label)));
      if (!option) {
        option = new Option(label, value, true, true);
        control.add(option);
      }
      option.selected = true;
      setValue(control, option.value);
    } else {
      setValue(control, value);
      control.setAttribute("data-autonf-label", label);
    }

    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    control.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    control.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true }));

    const chosen = byId(`${id}_chosen`);
    const chosenText = chosen?.querySelector(".chosen-single span, .search-choice span");
    if (chosenText) chosenText.textContent = label;

    if (globalThis.jQuery) {
      try {
        globalThis.jQuery(control)
          .val(value)
          .trigger("input")
          .trigger("change")
          .trigger("chosen:updated")
          .trigger("liszt:updated")
          .trigger("change.select2");
      } catch (_error) {
        // Native events above keep the page framework informed when jQuery is unavailable.
      }
    }

    return true;
  };

  const forceChoiceByIds = (ids, value, label) => ids.some((id) => forceChoiceById(id, value, label));

  const scrollToPageEnd = async () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    await sleep(350);
  };

  const clickNextButton = async () => {
    await scrollToPageEnd();
    await sleep(300);

    const candidates = [...document.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']")]
      .filter(visible)
      .filter((element) => {
        const text = normalize([element.textContent, element.value, element.title, element.getAttribute("aria-label")].join(" "));
        return text.includes("avancar") || text.includes("proximo") || text.includes("seguinte");
      });

    const nextButton =
      candidates.find((element) => !element.disabled && element.getAttribute("aria-disabled") !== "true") ||
      [...document.querySelectorAll("button, a, [role='button'], .btn")].filter(visible).find((element) => {
        const classText = normalize(element.className || "");
        return /next|avancar|proximo|right/.test(classText);
      });

    return clickElement(nextButton);
  };

  const selectChosenById = async (id, options = {}) => {
    const sourceId = id.endsWith("_chosen") ? id.slice(0, -7) : id;
    const container = byId(id) || byId(`${id}_chosen`) || byId(`${sourceId}_chosen`);
    if (!container) return false;
    const source = byId(sourceId);
    const previousValue = source?.value || "";

    clickElement(container.querySelector(".chosen-single, .chosen-choices, a, div") || container);
    await sleep(300);

    const search =
      firstVisible("input[type='text'], .chosen-search input", container) ||
      firstVisible(".chosen-container-active input[type='text'], .chosen-drop input[type='text']");
    if (search && options.query) {
      await searchSet(search, options.query);
      await sleep(options.delay ?? 1800);
    }

    const findOption = () => {
      const results = [
        ...container.querySelectorAll(".active-result, .chosen-results li"),
        ...document.querySelectorAll(".active-result, .chosen-results li")
      ].filter(visible);
      const enabled = results.filter((item) => !item.classList.contains("disabled-result"));
      if (options.label) return enabled.find((item) => optionMatches(item, options.label));
      return enabled.find((item) => !normalize(item.textContent).includes("selecione"));
    };

    const option = await waitFor(findOption, options.timeout ?? 7000);
    if (!option) {
      await pressAutocompleteConfirm(search);
      const chosenText = normalize(container.querySelector(".chosen-single span, .search-choice span")?.textContent || "");
      const valueChanged = source?.value && source.value !== previousValue;
      const textChanged = options.label && optionMatches({ textContent: chosenText }, options.label);
      return Boolean(valueChanged || textChanged);
    }
    clickElement(option);
    await sleep(350);
    return true;
  };

  const findAutocompleteOption = (container, label) => {
    const selectors = [
      ".chosen-results li.active-result",
      ".chosen-results li.highlighted",
      ".ui-menu-item",
      ".ui-menu-item-wrapper",
      ".autocomplete-suggestion",
      "[role='option']",
      ".select2-results__option",
      "li"
    ].join(", ");
    const candidates = [
      ...(container ? [...container.querySelectorAll(selectors)] : []),
      ...document.querySelectorAll(selectors)
    ].filter((item, index, list) => list.indexOf(item) === index)
      .filter(visible)
      .filter((item) => !item.classList.contains("disabled-result") && !item.classList.contains("disabled"));

    const enabled = candidates.filter((item) => !normalize(item.textContent).includes("selecione"));
    if (label) {
      return enabled.find((item) => optionMatches(item, label)) || null;
    }
    return enabled[0] || null;
  };

  const selectedAutocompleteValue = (source, container, label, query) => {
    const sourceValue = normalize(source?.value || "");
    const chosenText = normalize(container?.querySelector(".chosen-single span, .search-choice span")?.textContent || "");
    const combined = [sourceValue, chosenText].filter(Boolean).join(" ");

    if (!combined || combined === normalize(query)) return false;
    if (label && optionMatches({ textContent: combined }, label)) return true;
    if (label) return source instanceof HTMLSelectElement && sourceValue.length > 0 && sourceValue !== normalize(query);
    return sourceValue.length > 0 && sourceValue !== normalize(query);
  };

  const mouseSelectAutocompleteOption = async (option, source) => {
    if (!option) return false;
    option.scrollIntoView({ block: "nearest", inline: "nearest" });
    option.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true }));
    option.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false, composed: true }));
    await sleep(100);

    for (const type of ["mousedown", "mouseup", "click"]) {
      option.dispatchEvent(new MouseEvent(type, { bubbles: true, composed: true, button: 0 }));
      if (globalThis.jQuery) {
        try {
          globalThis.jQuery(option).trigger(type);
        } catch (_error) {
          // Native mouse events cover non-jQuery widgets.
        }
      }
      await sleep(type === "mousedown" ? 120 : 80);
    }

    source?.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    source?.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    if (globalThis.jQuery && source) {
      try {
        globalThis.jQuery(source).trigger("input").trigger("change").trigger("chosen:updated");
      } catch (_error) {
        // Native events already ran.
      }
    }
    return true;
  };

  const selectChosenOptionByMouse = async (id, query, label, options = {}) => {
    const source = byId(id);
    const container = byId(`${id}_chosen`);
    if (!source || !container) return false;

    clickElement(container.querySelector(".chosen-single, .chosen-choices, a, div") || container);
    await sleep(350);

    const search =
      firstVisible("input[type='text'], .chosen-search input", container) ||
      firstVisible(".chosen-container-active input[type='text'], .chosen-drop input[type='text']");
    if (!search) return false;

    await searchSet(search, query);
    await sleep(options.loadDelay ?? 900);

    const option = await waitFor(
      () => findAutocompleteOption(container, label) || findAutocompleteOption(container, null),
      options.timeout ?? 10000
    );
    if (!option) return false;

    await mouseSelectAutocompleteOption(option, source);
    await sleep(options.settleDelay ?? 600);

    const chosenText = container.querySelector(".chosen-single span, .search-choice span")?.textContent || "";
    return optionMatches({ textContent: chosenText }, label) || source.value.length > 0;
  };

  const forceThenSelectChosenByMouse = async (id, value, displayLabel, query, label, options = {}) => {
    const forced = forceChoiceById(id, value, displayLabel);
    await sleep(250);
    const selected = await selectChosenOptionByMouse(id, query, label, options);
    return selected || forced;
  };

  const getSelect2Container = (source) => {
    if (!source?.id) return null;
    const sibling = source.nextElementSibling;
    if (sibling?.classList?.contains("select2")) return sibling;

    const label = document.getElementById(`select2-${source.id}-container`);
    return label?.closest(".select2-container") ||
      document.querySelector(`[aria-labelledby="select2-${CSS.escape(source.id)}-container"]`)?.closest(".select2-container") ||
      null;
  };

  const openSelect2 = async (source) => {
    if (!source) return false;
    source.scrollIntoView({ block: "center", inline: "nearest" });

    if (globalThis.jQuery) {
      try {
        const $source = globalThis.jQuery(source);
        if (typeof $source.select2 === "function") {
          $source.select2("open");
          await sleep(250);
          return true;
        }
      } catch (_error) {
        // Fall back to clicking the rendered Select2 container.
      }
    }

    const container = getSelect2Container(source);
    return clickElement(container?.querySelector(".select2-selection") || container);
  };

  const findOpenSelect2Search = () =>
    firstVisible(".select2-container--open .select2-search__field, .select2-dropdown .select2-search__field") ||
    document.querySelector(".select2-container--open .select2-search__field, .select2-dropdown .select2-search__field");

  const findOpenSelect2Option = (label) => {
    const comparable = (value) => normalize(value).replace(/\s*[/\\-]\s*/g, "/");
    const options = [
      ...document.querySelectorAll(".select2-container--open .select2-results__option, .select2-dropdown .select2-results__option")
    ]
      .filter(visible)
      .filter((option) => {
        const text = normalize(option.textContent);
        return !option.getAttribute("aria-disabled") &&
          option.getAttribute("aria-selected") !== "true" &&
          !text.includes("buscando") &&
          !text.includes("carregando") &&
          !text.includes("nenhum resultado") &&
          text.length > 0;
      });

    if (label) {
      const exact = label.exact ? comparable(label.exact) : "";
      if (exact) {
        return options.find((option) => {
          const text = comparable(option.textContent);
          return text === exact || text.startsWith(exact) || text.includes(exact);
        }) || null;
      }
      return options.find((option) => optionMatches(option, label)) ||
        options.find((option) => option.classList.contains("select2-results__option--highlighted")) ||
        options[0] ||
        null;
    }

    return options.find((option) => option.classList.contains("select2-results__option--highlighted")) ||
      options[0] ||
      null;
  };

  const waitForSelectValue = async (source, previousValue, timeout = 4000) =>
    waitFor(() => source.value && source.value !== previousValue, timeout);

  const closeSelect2 = async (source) => {
    if (!source) return;
    if (globalThis.jQuery) {
      try {
        const $source = globalThis.jQuery(source);
        if (typeof $source.select2 === "function") $source.select2("close");
      } catch (_error) {
        // Blur fallback below is enough when Select2 is unavailable.
      }
    }
    source.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true }));
    await sleep(250);
  };

  const select2TypeAndEnter = async (id, query, label, options = {}) => {
    const source = byId(id);
    if (!source || !source.classList.contains("select2-hidden-accessible")) return false;

    const previousValue = source.value || "";
    const opened = await openSelect2(source);
    if (!opened) return false;
    await sleep(options.openDelay ?? 250);

    const search = await waitFor(findOpenSelect2Search, options.searchTimeout ?? 5000);
    if (!search) return false;

    await searchSet(search, query, { force: true });
    await sleep(options.waitBeforeEnter ?? 150);

    const optionBeforeEnter = await waitFor(
      () => findOpenSelect2Option(label),
      options.resultTimeout ?? 2000
    );
    if (optionBeforeEnter) {
      clickElement(optionBeforeEnter);
      await sleep(options.settleDelay ?? 500);
      if (await waitForSelectValue(source, previousValue)) {
        await closeSelect2(source);
        return true;
      }
    }

    await pressEnterOnly(search);
    await sleep(options.settleDelay ?? 500);

    if (await waitForSelectValue(source, previousValue)) {
      await closeSelect2(source);
      return true;
    }

    const option = await waitFor(
      () =>
        findOpenSelect2Option(label) ||
        firstVisible(".select2-results__option--highlighted"),
      options.resultTimeout ?? 2000
    );
    if (option) {
      clickElement(option);
      await sleep(options.settleDelay ?? 500);
    }

    const selected = Boolean(await waitForSelectValue(source, previousValue));
    if (selected) await closeSelect2(source);
    return selected;
  };

  const clickTypeAndEnterAutocomplete = async (id, query, options = {}) => {
    const source = byId(id);
    if (source?.classList?.contains("select2-hidden-accessible")) {
      return select2TypeAndEnter(id, query, options.label, options);
    }

    const container = byId(`${id}_chosen`);
    const waitBeforeEnter = options.waitBeforeEnter ?? 800;
    const settleDelay = options.settleDelay ?? 500;

    if (container) {
      clickElement(container.querySelector(".chosen-single, .chosen-choices, a, div") || container);
      await sleep(350);

      const search =
        firstVisible("input[type='text'], .chosen-search input", container) ||
        firstVisible(".chosen-container-active input[type='text'], .chosen-drop input[type='text']") ||
        container.querySelector("input[type='text'], .chosen-search input") ||
        document.querySelector(".chosen-container-active input[type='text'], .chosen-drop input[type='text']");
      if (!search) return false;

      await searchSet(search, query, { force: true });
      await sleep(waitBeforeEnter);
      await pressEnterOnly(search);
      await sleep(settleDelay);
      return true;
    }

    if (!source || !writable(source)) return false;
    clickElement(source);
    await sleep(250);
    await searchSet(source, query, { force: true });
    await sleep(waitBeforeEnter);
    await pressEnterOnly(source);
    await sleep(settleDelay);
    return true;
  };

  const selectFirstAutocompleteWithKeyboard = async (id, query, label, options = {}) => {
    const source = byId(id);
    const container = byId(`${id}_chosen`);
    const timeout = options.timeout ?? 10000;
    const loadDelay = options.loadDelay ?? 900;
    const settleDelay = options.settleDelay ?? 600;

    if (container) {
      clickElement(container.querySelector(".chosen-single, .chosen-choices, a, div") || container);
      await sleep(350);

      const search =
        firstVisible("input[type='text'], .chosen-search input", container) ||
        firstVisible(".chosen-container-active input[type='text'], .chosen-drop input[type='text']");
      if (!search) return false;

      await searchSet(search, query);
      await sleep(loadDelay);
      const option = await waitFor(() => findAutocompleteOption(container, label), timeout);
      await pressAutocompleteConfirm(search);
      await sleep(settleDelay);

      if (selectedAutocompleteValue(source, container, label, query)) return true;
      if (option && visible(option)) {
        clickElement(option.querySelector("a, span") || option);
        await sleep(settleDelay);
      }
      return selectedAutocompleteValue(source, container, label, query);
    }

    if (!source || !writable(source)) return false;
    await searchSet(source, query);
    await sleep(loadDelay);
    const option = await waitFor(() => findAutocompleteOption(null, label), timeout);
    await pressAutocompleteConfirm(source);
    await sleep(settleDelay);

    if (selectedAutocompleteValue(source, null, label, query)) return true;
    if (option && visible(option)) {
      clickElement(option.querySelector("a, .ui-menu-item-wrapper, span") || option);
      await sleep(settleDelay);
    }
    return selectedAutocompleteValue(source, null, label, query);
  };

  const autocompleteById = async (id, query, label, timeout = 9000) => {
    const control = byId(id);
    if (!control) return false;

    if (byId(`${id}_chosen`)) {
      return selectChosenById(id, { query, label, timeout, delay: 1300 });
    }

    if (control.tagName === "SELECT") {
      const option = [...control.options].find((item) => normalize(item.textContent).includes(normalize(label)));
      if (option) return selectNativeById(id, option.value);
    }

    await searchSet(control, query);
    await sleep(1400);

    const findOption = () => {
      const candidates = [
        ...document.querySelectorAll(
          ".ui-menu-item, .ui-menu-item-wrapper, .autocomplete-suggestion, [role='option'], .active-result, .chosen-results li, .select2-results__option, li"
        )
      ].filter(visible);
      return candidates.find((item) => optionMatches(item, label));
    };

    const option = await waitFor(findOption, timeout);
    if (option) {
      clickElement(option.querySelector("a, .ui-menu-item-wrapper, span") || option);
      await sleep(350);
      return true;
    }

    await pressAutocompleteConfirm(control);
    await sleep(650);
    return selectedAutocompleteValue(control, null, label, query);
  };

  const autocompleteControl = async (control, query, label, timeout = 9000) => {
    if (!control) return false;
    await searchSet(control, query);
    await sleep(300);

    const findOption = () =>
      [
        ...document.querySelectorAll(
          ".ui-menu-item, .ui-menu-item-wrapper, .autocomplete-suggestion, [role='option'], .active-result, .chosen-results li, .select2-results__option, li"
        )
      ]
        .filter(visible)
        .find((item) => optionMatches(item, label));

    const option = await waitFor(findOption, timeout);
    if (!option) return pressAutocompleteConfirm(control);
    clickElement(option.querySelector("a, .ui-menu-item-wrapper, span") || option);
    return true;
  };

  const clickFirstRadioById = (id) => {
    const exact = byId(id);
    if (exact?.matches?.("input[type='radio']")) return nativeCheck(exact);

    const root = exact?.closest?.(".form-group, fieldset, section, div") || document;
    const radios = [
      ...root.querySelectorAll(`input[type='radio'][id^="${CSS.escape(id)}"], input[type='radio'][name="${CSS.escape(id)}"]`),
      ...document.querySelectorAll(`input[type='radio'][id^="${CSS.escape(id)}"], input[type='radio'][name="${CSS.escape(id)}"]`)
    ].filter(visible);

    return nativeCheck(radios[0]);
  };

  const waitForEnabledControlById = async (id, timeout = 10000) =>
    waitFor(() => {
      const control = byId(id);
      if (!control || control.disabled || control.readOnly || control.getAttribute("aria-disabled") === "true") return null;
      return control;
    }, timeout);

  const clickFirstEnabledRadioById = async (id, timeout = 10000) => {
    const radio = await waitFor(() => {
      const exact = byId(id);
      if (exact?.matches?.("input[type='radio']") && !exact.disabled && exact.getAttribute("aria-disabled") !== "true") {
        return exact;
      }

      const root = exact?.closest?.(".form-group, fieldset, section, div") || document;
      return [
        ...root.querySelectorAll(`input[type='radio'][id^="${CSS.escape(id)}"], input[type='radio'][name="${CSS.escape(id)}"]`),
        ...document.querySelectorAll(`input[type='radio'][id^="${CSS.escape(id)}"], input[type='radio'][name="${CSS.escape(id)}"]`)
      ].filter(visible).find((item) => !item.disabled && item.getAttribute("aria-disabled") !== "true");
    }, timeout);

    return nativeCheck(radio);
  };

  const moneyToPortalDigits = (value) => {
    const normalizedValue = String(value ?? "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const amount = Number.parseFloat(normalizedValue);
    if (!Number.isFinite(amount)) return String(value ?? "").replace(/\D/g, "");
    return String(Math.round(amount * 100));
  };

  const requireAction = (condition, message) => {
    if (condition) {
      details.push(message);
      return true;
    }
    errors.push(message);
    return false;
  };

  const waitFor = async (finder, timeout = 4000, interval = 150) => {
    const startedAt = Date.now();
    let found = finder();
    while (!found && Date.now() - startedAt < timeout) {
      await sleep(interval);
      found = finder();
    }
    return found;
  };

  const today = () => {
    const date = new Date();
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const todayDigits = () => today().replace(/\D/g, "");

  const fillPeople = async () => {
    const dateField =
      findControl(["data de competencia"]) ||
      findByPlaceholderOrValue(["dd/mm"]) ||
      [...document.querySelectorAll("input")].filter(writable).find((input) => /data|date|competencia|calendar/i.test(input.id + input.name + input.className)) ||
      [...document.querySelectorAll("input")].filter(writable).find((input) => /date|data/i.test(input.type));
    requireAction(await keyboardSet(dateField, todayDigits()), "Data de competência digitada e confirmada.");
    await sleep(1400);

    requireAction(clickRadioByText(["emitente"], ["prestador"]), "Emitente marcado como Prestador.");

    requireAction(
      await selectChosenById("SimplesNacional_RegimeApuracaoTributosSN_chosen", {
        label: config.regimeLabel || "Regime de apuração dos tributos federais e municipal pelo Simples Nacional",
        timeout: 2000
      }) ||
        await clickOptionLike(
          await waitFor(
            () =>
              findControl(["regime de apuracao"], { excludeTypes: ["radio", "checkbox"] }) ||
              findByPlaceholderOrValue(["regime de apuracao"]) ||
              optionControls().find((item) => fieldText(item).includes("regime")),
            6000
          ),
          config.regimeLabel || "Regime de apuração dos tributos federais e municipal pelo Simples Nacional"
        ),
      "Regime de apuração do Simples Nacional selecionado."
    );
    await sleep(800);

    requireAction(clickRadioByText(["tomador"], ["brasil"]), "Tomador marcado como Brasil.");
    await sleep(800);

    const cnpjField = await waitFor(
      () =>
        findControl(["cpf", "cnpj"]) ||
        findControl(["cnpj"]) ||
        [...document.querySelectorAll("input")].filter(writable).find((input) => !input.value && input.maxLength >= 14),
      6000
    );
    requireAction(nativeSet(cnpjField, payload.client.cnpj), "CNPJ do tomador preenchido.");
    await sleep(250);
    requireAction(clickButtonNear(cnpjField, ["pesquisar"]), "Botão de lupa do CNPJ acionado.");
    await sleep(1600);

    requireAction(
      clickRadioByText(["intermediario"], ["intermediario nao informado"]),
      "Intermediário marcado como não informado."
    );
    await scrollToPageEnd();
  };

  const fillService = async () => {
    const municipalityExact = config.municipalityExact || "Natal/RN";
    const municipalityQuery = deriveSearchToken(municipalityExact);
    const municipalityTokens = municipalityExact.split(/[/-]/).map((item) => item.trim()).filter(Boolean);
    const taxCodeLabel = config.taxCodeMatch || "01.08.01 - Planejamento, confecção, manutenção e atualização de páginas eletrônicas.";
    const taxCodeQuery = deriveSearchToken(taxCodeLabel);
    const nbsLabel = config.nbsLabel || "115023000 - Serviços de projeto e desenvolvimento de estruturas e conteúdo de páginas eletrônicas";
    const nbsCode = deriveLeadingDigits(nbsLabel) || "115023000";
    const nbsSearch = deriveSearchToken(nbsLabel);

    const municipalitySelected = await clickTypeAndEnterAutocomplete("LocalPrestacao_CodigoMunicipioPrestacao", municipalityQuery, {
      label: { exact: municipalityExact, all: municipalityTokens },
      waitBeforeEnter: 150,
      settleDelay: 350,
      resultTimeout: 2000
    }) ||
      await selectFirstAutocompleteWithKeyboard(
        "LocalPrestacao_CodigoMunicipioPrestacao",
        municipalityQuery,
        { exact: municipalityExact, all: municipalityTokens },
        { timeout: 2500, loadDelay: 500, settleDelay: 350 }
      ) ||
      await autocompleteById("LocalPrestacao_CodigoMunicipioPrestacao", municipalityQuery, { all: municipalityTokens }, 3000);

    if (!requireAction(
      municipalitySelected,
      "Município definido como Natal/RN."
    )) {
      await scrollToPageEnd();
      return;
    }
    await sleep(500);

    const taxCodeSelected = await clickTypeAndEnterAutocomplete("ServicoPrestado_CodigoTributacaoNacional", taxCodeQuery, {
      label: { all: ["01.08.01", "Planejamento"] },
      waitBeforeEnter: 200,
      settleDelay: 400,
      resultTimeout: 2500
    }) ||
      await selectFirstAutocompleteWithKeyboard(
        "ServicoPrestado_CodigoTributacaoNacional",
        taxCodeQuery,
        { all: ["01.08.01", "Planejamento"] },
        { timeout: 2000, loadDelay: 600, settleDelay: 400 }
      ) ||
      await autocompleteById(
        "ServicoPrestado_CodigoTributacaoNacional",
        taxCodeQuery,
        { all: ["01.08.01", "Planejamento"] },
        3000
      );

    requireAction(
      taxCodeSelected,
      "Código de Tributação Nacional 01.08.01 selecionado."
    );
    await sleep(500);

    requireAction(
      clickFirstRadioById("ServicoPrestado_HaExportacaoImunidadeNaoIncidencia") ||
        clickRadioByText(["servico prestado", "issqn"], ["nao"]) ||
        clickRadioByText(["imunidade"], ["nao"]),
      "Opção de imunidade/exportação/não incidência marcada como Não."
    );
    await sleep(800);

    const descriptionField =
      byId("ServicoPrestado_Descricao") ||
      findControl(["descricao do servico"], { tag: "textarea" }) ||
      findControl(["descricao"], { tag: "textarea" }) ||
      [...document.querySelectorAll("textarea")].filter(writable).find((textarea) => fieldText(textarea).includes("servico"));
    requireAction(nativeSet(descriptionField, payload.client.description), "Descrição do serviço preenchida.");

    const nbsField = await waitFor(
      () =>
        findControl(["item da nbs"], { excludeTypes: ["radio", "checkbox"] }) ||
        findControl(["nbs"], { excludeTypes: ["radio", "checkbox"] }) ||
        optionControls().find((item) => fieldText(item).includes("nbs")),
      1000,
      50
    );
    requireAction(
      await autocompleteControl(nbsField, nbsSearch, { all: [nbsCode] }, 1000) ||
        forceChoiceByIds(
        [
          "ServicoPrestado_CodigoNBS",
          "ServicoPrestado_CodigoNbs",
          "ServicoPrestado_ItemNBS",
          "ServicoPrestado_ItemNbs",
          "ServicoPrestado_CodigoItemNBS",
          "ServicoPrestado_CodigoItemNbs",
          "ServicoPrestado_NBS",
          "ServicoPrestado_Nbs"
        ],
        nbsCode,
        nbsLabel
      ) ||
        await clickOptionLike(
          nbsField,
          nbsLabel,
          nbsSearch,
          1000
        ),
      `Item da NBS ${nbsCode} selecionado.`
    );
    await scrollToPageEnd();
  };

  const fillValues = async () => {
    const valueField =
      byId("Valores_ValorServico") ||
      findControl(["valor do servico prestado"]) ||
      findControl(["valor do servico"]) ||
      [...document.querySelectorAll("input")].filter(writable).find((input) => fieldText(input).includes("valor"));
    requireAction(await keyboardSetAndCommit(valueField, moneyToPortalDigits(payload.client.value)), "Valor do serviço preenchido e confirmado.");
    const retentionRadio = await waitFor(() => {
      const exact = byId("ISSQN_HaRetencao");
      const radios = [
        ...(exact?.matches?.("input[type='radio']") ? [exact] : []),
        ...document.querySelectorAll(`input[type='radio'][id^="ISSQN_HaRetencao"], input[type='radio'][name="ISSQN_HaRetencao"]`)
      ];
      return radios.find((radio) => visible(radio) && !radio.disabled && radio.getAttribute("aria-disabled") !== "true");
    }, 2000, 50);

    const retentionSelected = nativeCheck(retentionRadio) ||
        await clickFirstEnabledRadioById("ISSQN_HaRetencao", 2000) ||
        clickRadioByText(["retencao do issqn"], ["nao"]) ||
        clickRadioByText(["tomador", "intermediario"], ["nao"]);
    requireAction(
      retentionSelected,
      "Retenção do ISSQN marcada como Não."
    );
    await sleep(500);
    await waitForEnabledControlById("TributacaoFederal_PISCofins_SituacaoTributaria", 2000);

    requireAction(
      selectNativeByTextPrefix("TributacaoFederal_PISCofins_SituacaoTributaria", config.pisSituationPrefix || "00") ||
        selectNativeById("TributacaoFederal_PISCofins_SituacaoTributaria", "0") ||
        forceChoiceById("TributacaoFederal_PISCofins_SituacaoTributaria", "0", "00 - Nenhum") ||
        await clickOptionLike(
          findControl(["situacao tributaria", "pis"], { excludeTypes: ["radio", "checkbox"] }) ||
            findByPlaceholderOrValue(["situacao tributaria"]) ||
            optionControls().find((item) => fieldText(item).includes("pis")),
          "00 - Nenhum"
        ),
      "Situação tributária PIS/COFINS definida como 00 - Nenhum."
    );
    await sleep(400);
    await waitForEnabledControlById("TributacaoFederal_PISCofins_TipoRetencao", 2000);

    requireAction(
      selectNativeById("TributacaoFederal_PISCofins_TipoRetencao", config.retentionTypeValue || "0") ||
        forceChoiceById("TributacaoFederal_PISCofins_TipoRetencao", config.retentionTypeValue || "0", config.retentionTypeLabel || "PIS/COFINS/CSLL Não Retidos") ||
        await clickOptionLike(
          findControl(["tipo de retencao"], { excludeTypes: ["radio", "checkbox"] }) ||
            findByPlaceholderOrValue(["tipo de retencao"]) ||
            optionControls().find((item) => fieldText(item).includes("tipo") && fieldText(item).includes("retencao")),
          config.retentionTypeLabel || "PIS/COFINS/CSLL Não Retidos",
          "PIS/COFINS/CSLL",
          7000
        ),
      "Tipo de retenção definido como PIS/COFINS/CSLL Não Retidos."
    );
    await scrollToPageEnd();
  };

  const diagnose = async () => {
    const specialIds = [
      "LocalPrestacao_CodigoMunicipioPrestacao",
      "ServicoPrestado_CodigoTributacaoNacional"
    ];
    const specialControls = specialIds.map((id) => {
      const control = byId(id);
      const chosen = byId(`${id}_chosen`);
      const select2Container = getSelect2Container(control);
      const describeElement = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || "",
          className: String(element.className || ""),
          value: "value" in element ? String(element.value || "") : "",
          text: String(element.textContent || "").trim().slice(0, 180),
          visible: visible(element),
          writable: writable(element),
          rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left)
          },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        };
      };
      const searchInputs = [
        ...(chosen ? [...chosen.querySelectorAll("input[type='text'], .chosen-search input")] : []),
        ...document.querySelectorAll(
          ".chosen-container-active input[type='text'], .chosen-drop input[type='text'], .select2-container--open .select2-search__field, .select2-dropdown .select2-search__field"
        )
      ].filter((item, index, list) => list.indexOf(item) === index);
      const visibleResults = [
        ...(chosen ? [...chosen.querySelectorAll(".chosen-results li, .active-result")] : []),
        ...document.querySelectorAll(
          ".chosen-container-active .chosen-results li, .chosen-drop .chosen-results li, .select2-results__option, .ui-menu-item, [role='option']"
        )
      ].filter((item, index, list) => list.indexOf(item) === index)
        .filter(visible)
        .slice(0, 20)
        .map((item) => ({
          text: item.textContent.trim(),
          className: String(item.className || "")
        }));
      const selectedOption = control instanceof HTMLSelectElement
        ? control.options[control.selectedIndex]
        : null;
      const options = control instanceof HTMLSelectElement
        ? [...control.options].slice(0, 20).map((option) => ({
          value: option.value,
          text: option.textContent.trim(),
          selected: option.selected
        }))
        : [];

      return {
        id,
        exists: Boolean(control),
        tag: control?.tagName.toLowerCase() || "",
        value: control?.value || "",
        name: control?.getAttribute("name") || "",
        selectedIndex: control instanceof HTMLSelectElement ? control.selectedIndex : null,
        selectedOption: selectedOption
          ? { value: selectedOption.value, text: selectedOption.textContent.trim() }
          : null,
        optionCount: control instanceof HTMLSelectElement ? control.options.length : null,
        firstOptions: options,
        chosenText: chosen?.querySelector(".chosen-single span, .search-choice span")?.textContent.trim() || "",
        chosenClass: chosen?.className || "",
        sourceProbe: describeElement(control),
        chosenProbe: describeElement(chosen),
        select2Probe: describeElement(select2Container),
        select2Text: select2Container?.querySelector(".select2-selection__rendered")?.textContent.trim() || "",
        activeElement: describeElement(document.activeElement),
        searchInputs: searchInputs.map(describeElement),
        visibleResults
      };
    });

    const controls = allControls().slice(0, 80).map((control, index) => ({
      index,
      tag: control.tagName.toLowerCase(),
      type: control.getAttribute("type") || "",
      id: control.id || "",
      name: control.getAttribute("name") || "",
      label: fieldText(control).slice(0, 160),
      value: String(control.value || control.textContent || "").slice(0, 80),
      disabled: Boolean(control.disabled),
      readOnly: Boolean(control.readOnly)
    }));

    const buttons = [...document.querySelectorAll("button, a, [role='button']")]
      .filter(visible)
      .slice(0, 60)
      .map((button, index) => ({
        index,
        tag: button.tagName.toLowerCase(),
        text: normalize([button.textContent, button.title, button.getAttribute("aria-label"), button.className].join(" ")).slice(0, 140)
      }));

    details.push(`URL: ${location.href}`);
    details.push(`Título: ${document.title}`);
    details.push(`Campos especiais: ${JSON.stringify(specialControls, null, 2)}`);
    details.push(`Controles visíveis: ${JSON.stringify(controls, null, 2)}`);
    details.push(`Botões/links visíveis: ${JSON.stringify(buttons, null, 2)}`);
  };

  const fillStep = async (step) => {
    if (step === "people") await fillPeople();
    if (step === "service") await fillService();
    if (step === "values") await fillValues();
    if (step === "diagnose") await diagnose();
  };

  const nextStepFor = (step) => ({
    people: "service",
    service: "values",
    values: "review"
  })[step] || null;

  const waitForStepReady = async (step) => {
    const checks = {
      service: () =>
        byId("LocalPrestacao_CodigoMunicipioPrestacao") ||
        byId("ServicoPrestado_CodigoTributacaoNacional") ||
        byId("ServicoPrestado_Descricao"),
      values: () =>
        byId("Valores_ValorServico") ||
        byId("ISSQN_HaRetencao") ||
        byId("TributacaoFederal_PISCofins_SituacaoTributaria")
    };

    return waitFor(checks[step] || (() => true), 12000);
  };

  return (async () => {
    if (payload.step === "next") {
      const clicked = await clickNextButton();
      if (!clicked) {
        errors.push("Botão Avançar não localizado.");
      } else {
        details.push("Botão Avançar acionado.");
      }
    }

    let currentStep = payload.step;
    if (payload.step !== "next") await fillStep(currentStep);

    while (payload.autoAdvance && !errors.length && nextStepFor(currentStep)) {
      const nextStep = nextStepFor(currentStep);
      const advanced = await clickNextButton();
      details.push(advanced ? `Avançou automaticamente para ${nextStep}.` : "Botão Avançar não localizado para automação.");
      if (!advanced) break;
      if (nextStep === "review") break;

      await sleep(400);
      const ready = await waitForStepReady(nextStep);
      if (!ready) {
        errors.push(`Tela ${nextStep} não carregou a tempo para preenchimento automático.`);
        break;
      }

      currentStep = nextStep;
      await fillStep(currentStep);
    }

    if (errors.length) {
      return {
        ok: false,
        message: "Revise a etapa no portal. Alguns campos não foram localizados ou acionados.",
        details: [...details, ...errors.map((item) => `Falhou: ${item}`)]
      };
    }

    return {
      ok: true,
      message: payload.autoAdvance && payload.step !== "diagnose"
        ? "Automação concluída até a última etapa disponível antes da revisão."
        : "Etapa preenchida. Confira visualmente antes de avançar.",
      details
    };
  })();
}
