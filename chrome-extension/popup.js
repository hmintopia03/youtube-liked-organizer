const exportButton = document.querySelector("#exportButton");
const statusText = document.querySelector("#status");

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  statusText.textContent = "Exporting...";

  try {
    const tab = await getActiveTab();

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "EXPORT_VISIBLE_LIKED_VIDEOS"
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Export failed.");
    }

    statusText.textContent = `Exported ${response.count} items.`;
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    exportButton.disabled = false;
  }
});
