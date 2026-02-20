const MAX_DIMENSION = 1600;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB target
const MAX_RAW_SIZE = 4 * 1024 * 1024; // 4MB max for non-compressible files
const JPEG_QUALITY = 0.8;

export async function compressImage(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_RAW_SIZE) {
      throw new Error(
        `This PDF is too large (${Math.round(file.size / 1024 / 1024)}MB). Please use a smaller file under 4MB, or take a photo of the lab report page instead.`
      );
    }
    return fileToBase64Raw(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = JPEG_QUALITY;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      while (dataUrl.length * 0.75 > MAX_FILE_SIZE && quality > 0.3) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image. Please try a different file."));
    };

    img.src = url;
  });
}

function fileToBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
