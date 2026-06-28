const TARGET_URL = "https://www.nfse.gov.br/EmissorNacional/DPS/Pessoas";

function isNfseUrl(url) {
  try {
    const { hostname } = new URL(url || "");
    return hostname === "nfse.gov.br" || hostname.endsWith(".nfse.gov.br");
  } catch (_error) {
    return false;
  }
}

async function openPortal(tab) {
  if (tab?.id && isNfseUrl(tab.url)) {
    await chrome.tabs.update(tab.id, { url: TARGET_URL });
    return;
  }

  await chrome.tabs.create({ url: TARGET_URL, active: true });
}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  await openPortal(tab);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_PORTAL") return false;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) {
      sendResponse({ ok: false, error: "Nenhuma aba ativa encontrada." });
      return;
    }

    await openPortal(tab);
    sendResponse({ ok: true });
  });

  return true;
});
