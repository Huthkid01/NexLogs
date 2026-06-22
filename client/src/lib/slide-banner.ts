/** Standard homepage slide size — keeps banners consistent on mobile and desktop. */
export const SLIDE_BANNER_WIDTH = 1920;
export const SLIDE_BANNER_HEIGHT = 400;
export const SLIDE_BANNER_ASPECT = SLIDE_BANNER_WIDTH / SLIDE_BANNER_HEIGHT;

export const SLIDE_BANNER_GUIDE = `Upload any image — we crop and resize it to ${SLIDE_BANNER_WIDTH}×${SLIDE_BANNER_HEIGHT}px so it fills the banner on phone and desktop. Keep text and buttons on the left or center.`;

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
        const x = 0;
        const y = (canvas.height - height) / 2;
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
