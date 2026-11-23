const $ = (id) => document.getElementById(id);
const fileInput = $("file");
const dropZone = $("drop-zone");
const previewWrap = $("preview-wrap");
const preview = $("preview");
const fileName = $("file-name");
const saveButton = $("save");
const status = $("status");
const hasExt = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
const KEYS = ["backgroundImage", "fit", "opacity", "blur", "glass"];
const store = {
  async get(keys) {
    if (hasExt) return await chrome.storage.local.get(keys);
    const out = {};
    for (const k of keys) {
      try { const v = localStorage.getItem("fieldnote:" + k); if (v !== null) out[k] = JSON.parse(v); } catch (_) {}
    }
    return out;
  },
  async set(obj) {
    if (hasExt) return await chrome.storage.local.set(obj);
    for (const [k, v] of Object.entries(obj)) localStorage.setItem("fieldnote:" + k, JSON.stringify(v));
  },
  async remove(key) {
    if (hasExt) return await chrome.storage.local.remove(key);
    localStorage.removeItem("fieldnote:" + key);
  },
};
let selectedDataUrl = null;
let savedDataUrl = null;

function say(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
function currentSettings() {
  return {
    fit: $("fit").value,
    opacity: Number($("opacity").value),
    blur: Number($("blur").value),
    glass: Number($("glass").value),
  };
}
function updateLivePreview() {
  const settings = currentSettings();
  const fitMap = { cover: "cover", contain: "contain", auto: "auto" };
  preview.style.objectFit = fitMap[settings.fit] || "cover";
  preview.style.filter = `blur(${settings.blur}px)`;
  preview.style.opacity = String(settings.opacity / 100);
  preview.style.transform = settings.fit === "cover" ? "scale(1.025)" : "none";
}
async function prepareImage(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("That image is over 20 MB. Please choose a smaller file.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    const maxSide = 2400;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#08101e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/webp", 0.82);
    if (result.length > 5_500_000) result = canvas.toDataURL("image/jpeg", 0.75);
    if (result.length > 7_000_000) throw new Error("Image is still too large after compression. Try a smaller image.");
    return result;
  } finally { URL.revokeObjectURL(objectUrl); }
}
function showPreview(dataUrl, name) {
  preview.src = dataUrl;
  fileName.textContent = name || "Saved background";
  previewWrap.classList.add("visible");
  updateLivePreview();
}
async function acceptFile(file) {
  if (!file) return;
  say("Preparing your image…");
  try {
    selectedDataUrl = await prepareImage(file);
    showPreview(selectedDataUrl, `${file.name} · ${formatSize(file.size)}`);
    say("Image ready. The preview updates as you adjust the settings.");
  } catch (error) {
    selectedDataUrl = null;
    say(error.message || "Could not read that image.", true);
  }
}
fileInput.addEventListener("change", () => acceptFile(fileInput.files[0]));
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.click(); }
});
for (const eventName of ["dragenter", "dragover"]) dropZone.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.add("dragover");
});
for (const eventName of ["dragleave", "drop"]) dropZone.addEventListener(eventName, (event) => {
  event.preventDefault(); dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (event) => acceptFile(event.dataTransfer.files[0]));

for (const [rangeId, labelId, suffix] of [
  ["opacity", "opacity-value", "%"], ["blur", "blur-value", "px"], ["glass", "glass-value", "%"]
]) {
  const range = $(rangeId);
  if (!range || !$(labelId)) continue;
  range.addEventListener("input", () => {
    $(labelId).textContent = `${range.value}${suffix}`;
    updateLivePreview();
  });
}
$("fit").addEventListener("change", updateLivePreview);

$("remove-image").addEventListener("click", async () => {
  selectedDataUrl = null;
  savedDataUrl = null;
  fileInput.value = "";
  previewWrap.classList.remove("visible");
  try { await store.remove("backgroundImage"); } catch (error) { say(`Could not remove: ${error.message || "storage error"}`, true); return; }
  say("Background removed. Google Search will return to its normal appearance.");
});
saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  say("Saving…");
  try {
    const existing = await store.get(["backgroundImage"]);
    const image = selectedDataUrl || existing.backgroundImage;
    if (!image) { say("Choose an image first.", true); return; }
    const settings = currentSettings();
    await store.set({
      backgroundImage: image,
      fit: settings.fit,
      opacity: settings.opacity,
      blur: settings.blur,
      glass: settings.glass,
    });
    savedDataUrl = image;
    say(hasExt
      ? "Saved. Refresh Google Search to see it. Your page keeps its original layout and colours; only the background and card surfaces change."
      : "Saved in this page only. To apply it to Google, open Fieldnote from the extension (installed in Chrome/Brave).");
  } catch (error) {
    const msg = String(error && error.message || error || "");
    say(/quota/i.test(msg) ? "Could not save: the image is too large for browser storage. Try a smaller image." : `Could not save: ${msg || "storage error"}`, true);
  } finally { saveButton.disabled = false; }
});
(async () => {
  let data = {};
  try { data = await store.get(KEYS); } catch (_) {}
  $("fit").value = data.fit || "cover";
  $("opacity").value = data.opacity ?? 100;
  $("blur").value = data.blur ?? 0;
  $("opacity-value").textContent = `${$("opacity").value}%`;
  $("blur-value").textContent = `${$("blur").value}px`;
  $("glass").value = data.glass ?? 60;
  $("glass-value").textContent = `${$("glass").value}%`;
  if (data.backgroundImage) {
    selectedDataUrl = data.backgroundImage;
    savedDataUrl = data.backgroundImage;
    showPreview(data.backgroundImage, "Your saved background");
  } else {
    updateLivePreview();
  }
})();
