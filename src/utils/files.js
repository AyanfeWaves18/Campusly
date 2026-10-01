export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const DOC_EXT = ["pdf", "doc", "docx", "txt"];
export const MAX_IMAGE = 5 * 1024 * 1024;
export const MAX_DOC = 1024 * 1024;

export function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function compressImage(file, max = 900, quality = 0.8) {
  return readDataUrl(file).then(
    (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = src;
      })
  );
}

export function checkImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return "Only JPG, PNG, WEBP or GIF images are allowed.";
  if (file.size > MAX_IMAGE) return "Images must be under 5 MB.";
  return "";
}

export function checkDoc(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!DOC_EXT.includes(ext)) return "Only PDF, DOC, DOCX or TXT files are allowed.";
  if (file.size > MAX_DOC) return "Files must be under 1 MB.";
  return "";
}