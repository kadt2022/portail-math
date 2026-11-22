// Téléchargement qui annonce sa progression (octets reçus / octets attendus) : c'est ce qui permet d'afficher un vrai
// pourcentage de chargement, et non une barre qui avance au hasard.

export type DownloadProgress = (loaded: number, total: number | null) => void;

export async function fetchWithProgress(url: string, onProgress?: DownloadProgress, priority?: "high" | "low"): Promise<ArrayBuffer> {
  const response = priority ? await fetch(url, { priority } as RequestInit) : await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  // Les images et la musique ne sont pas recompressées par le serveur : leur taille annoncée est celle reçue.
  const total = Number(response.headers?.get("content-length")) || null;
  if (!response.body) {
    const whole = await response.arrayBuffer();
    onProgress?.(whole.byteLength, whole.byteLength);
    return whole;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.(loaded, loaded);
  return bytes.buffer;
}
