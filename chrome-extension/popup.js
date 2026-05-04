const exportButton = document.querySelector("#exportButton");
const statusText = document.querySelector("#status");

function setBusy(isBusy) {
  exportButton.disabled = isBusy;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendExportMessage(type) {
  setBusy(true);
  statusText.textContent = "Exporting...";

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type
    });

    if (!response?.ok) {
      const error = new Error(response?.error || "Export failed.");
      console.error(error);
      throw error;
    }

    statusText.textContent = `Exported ${response.count} items.`;
  } catch (error) {
    console.error(error);
    statusText.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

exportButton.addEventListener("click", async () => {
  sendExportMessage("EXPORT_VISIBLE_LIKED_VIDEOS");
});
