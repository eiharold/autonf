const TARGET_URL = "https://www.nfse.gov.br/EmissorNacional";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  if (!tab.url?.startsWith(TARGET_URL)) {
    await chrome.tabs.update(tab.id, { url: TARGET_URL });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_PORTAL") return false;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) {
      sendResponse({ ok: false, error: "Nenhuma aba ativa encontrada." });
      return;
    }

    await chrome.tabs.update(tab.id, { url: TARGET_URL });
    sendResponse({ ok: true });
  });

  return true;
});
