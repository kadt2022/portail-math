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

/**
 * Télécharge plusieurs fichiers en parallèle et annonce la progression de l'ensemble (octets reçus / octets attendus,
 * total connu seulement quand chaque fichier a annoncé sa taille). Ne rejette jamais : un fichier en échec est simplement
 * compté comme terminé (celui qui l'utilise le redemandera et gérera l'erreur).
 */
export async function fetchAllWithProgress(urls: readonly string[], onProgress?: DownloadProgress, priority?: "high" | "low"): Promise<void> {
  const files = urls.map(() => ({ loaded: 0, total: null as number | null }));
  const emit = () => {
    const loaded = files.reduce((sum, file) => sum + file.loaded, 0);
    const known = files.every((file) => file.total !== null);
    onProgress?.(loaded, known ? files.reduce((sum, file) => sum + (file.total ?? 0), 0) : null);
  };
  await Promise.all(
    urls.map((url, index) =>
      fetchWithProgress(
        url,
        (loaded, total) => {
          files[index] = { loaded, total };
          emit();
        },
        priority,
      ).catch(() => {
        files[index] = { loaded: files[index].loaded, total: files[index].loaded };
        emit();
      }),
    ),
  );
}
