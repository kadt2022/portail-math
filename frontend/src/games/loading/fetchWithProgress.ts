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
 * Téléchargements simultanés au plus, par défaut. Le site est servi en HTTP/1.1 : le navigateur n'ouvre que 6 connexions par
 * serveur. En restant en dessous, chaque fichier demandé a vraiment sa connexion (le délai d'inactivité ne mesure jamais
 * une attente dans la file du navigateur) et une connexion reste libre pour le reste de la page. Valeur retenue après
 * comparaison de 2, 4 et 6 sur un build de production à 250 kbit/s, 500 kbit/s, 1 Mbit/s et sans limite.
 */
export const DOWNLOAD_CONCURRENCY = 4;

export interface DownloadAllOptions {
  priority?: "high" | "low";
  /** Abandon d'un fichier actif qui ne reçoit plus rien pendant ce délai (voir fetchWithProgress). */
  stallTimeoutMs?: number;
  concurrency?: number;
}

/**
 * Télécharge plusieurs fichiers, `concurrency` à la fois dans l'ordre donné, et annonce la progression de l'ensemble
 * (octets reçus / octets attendus, total connu seulement quand chaque fichier a annoncé sa taille). Aucune durée totale
 * maximale : un fichier qui reçoit encore des octets n'est jamais coupé, même au bout de plusieurs minutes. Ne rejette
 * jamais : un fichier en échec, ou bloqué plus de `stallTimeoutMs` sans rien recevoir, est simplement absent du résultat
 * (celui qui l'utilise le redemandera et gérera l'erreur). Renvoie les octets reçus par adresse.
 */
export async function fetchAllWithProgress(urls: readonly string[], onProgress?: DownloadProgress, options: DownloadAllOptions = {}): Promise<Map<string, ArrayBuffer>> {
  const { priority, stallTimeoutMs, concurrency = DOWNLOAD_CONCURRENCY } = options;
  const files = urls.map(() => ({ loaded: 0, total: null as number | null }));
  const received = new Map<string, ArrayBuffer>();
  const emit = () => {
    const loaded = files.reduce((sum, file) => sum + file.loaded, 0);
    const known = files.every((file) => file.total !== null);
    onProgress?.(loaded, known ? files.reduce((sum, file) => sum + (file.total ?? 0), 0) : null);
  };
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const index = next;
      next += 1;
      const url = urls[index];
      try {
        const data = await fetchWithProgress(
          url,
          (loaded, total) => {
            files[index] = { loaded, total };
            emit();
          },
          priority,
          stallTimeoutMs,
        );
        received.set(url, data);
      } catch {
        files[index] = { loaded: files[index].loaded, total: files[index].loaded };
        emit();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, urls.length)) }, worker));
  return received;
}
