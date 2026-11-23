// Téléchargement qui annonce sa progression (octets reçus / octets attendus) : c'est ce qui permet d'afficher un vrai
// pourcentage de chargement, et non une barre qui avance au hasard.

export type DownloadProgress = (loaded: number, total: number | null) => void;

/**
 * `stallTimeoutMs` : abandon d'un téléchargement bloqué, qui ne reçoit plus aucun octet pendant ce délai (ni réponse,
 * ni erreur). C'est une inactivité, pas une durée totale : un fichier qui arrive lentement mais sûrement n'est jamais
 * coupé, même sur une connexion très lente.
 */
export async function fetchWithProgress(url: string, onProgress?: DownloadProgress, priority?: "high" | "low", stallTimeoutMs?: number): Promise<ArrayBuffer> {
  const controller = stallTimeoutMs === undefined ? null : new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const stillAlive = () => {
    if (!controller) return;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(new Error(`Téléchargement bloqué : ${url}`)), stallTimeoutMs);
  };
  stillAlive();
  try {
    return await download(url, onProgress, priority, controller?.signal, stillAlive);
  } finally {
    clearTimeout(stallTimer);
  }
}

async function download(url: string, onProgress: DownloadProgress | undefined, priority: "high" | "low" | undefined, signal: AbortSignal | undefined, stillAlive: () => void) {
  const init = { ...(priority ? { priority } : {}), ...(signal ? { signal } : {}) } as RequestInit;
  const response = Object.keys(init).length > 0 ? await fetch(url, init) : await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
  stillAlive();
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
    stillAlive();
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
 * total connu seulement quand chaque fichier a annoncé sa taille). Ne rejette jamais : un fichier en échec, ou bloqué plus
 * de `stallTimeoutMs` sans rien recevoir, est simplement compté comme terminé (celui qui l'utilise le redemandera et gérera
 * l'erreur).
 */
export async function fetchAllWithProgress(urls: readonly string[], onProgress?: DownloadProgress, priority?: "high" | "low", stallTimeoutMs?: number): Promise<void> {
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
        stallTimeoutMs,
      ).catch(() => {
        files[index] = { loaded: files[index].loaded, total: files[index].loaded };
        emit();
      }),
    ),
  );
}
