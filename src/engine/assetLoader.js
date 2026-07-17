export function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
    img.src = encodeURI(path);
  });
}

export async function loadImages(pathMap) {
  const entries = Object.entries(pathMap);
  const loaded = await Promise.all(
    entries.map(async ([key, path]) => [key, await loadImage(path)])
  );
  return Object.fromEntries(loaded);
}
