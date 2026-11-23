const hasTabs = typeof chrome !== "undefined" && chrome.tabs;
const hasWindows = typeof chrome !== "undefined" && chrome.windows;
const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };

on("open-google", () => {
  if (hasTabs) chrome.tabs.create({ url: "https://www.google.com/" });
  else window.open("https://www.google.com/", "_blank");
});
on("window-open", async () => {
  if (!hasWindows) return;
  const win = await chrome.windows.getCurrent();
  if (win?.id) chrome.windows.update(win.id, { state: "maximized" });
});
on("window-close", async () => {
  if (!hasTabs) { window.close(); return; }
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id) chrome.tabs.remove(tab.id);
});
on("window-minimize", async () => {
  if (!hasWindows) return;
  const win = await chrome.windows.getCurrent();
  if (win?.id) chrome.windows.update(win.id, { state: "minimized" });
});
