/** Standard homepage slide size — wide strip matching desktop h-64 (256px) display. */
export const SLIDE_BANNER_WIDTH = 1920;
export const SLIDE_BANNER_HEIGHT = 640;
export const SLIDE_BANNER_ASPECT = SLIDE_BANNER_WIDTH / SLIDE_BANNER_HEIGHT;

export const SLIDE_BANNER_GUIDE = `Upload any image — we crop and resize it to ${SLIDE_BANNER_WIDTH}×${SLIDE_BANNER_HEIGHT}px so it fills the banner on phone and desktop. Keep important text and buttons on the left half.`;

/** Fill the banner canvas edge-to-edge (cover). Keeps the left side visible for mobile. */
export function normalizeSlideImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SLIDE_BANNER_WIDTH;
        canvas.height = SLIDE_BANNER_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare slide image'));
          return;
        }

        const scale = Math.max(
          canvas.width / image.naturalWidth,
          canvas.height / image.naturalHeight,
        );
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        // Prefer left edge (copy) and slightly lower vertical bias so CTA bands stay visible.
        const x = 0;
        const y = (canvas.height - height) * 0.35;
        ctx.drawImage(image, x, y, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.9 : undefined));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file'));
    };

    image.src = objectUrl;
  });
}
