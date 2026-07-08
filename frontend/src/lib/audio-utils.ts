export function validateAudioDuration(
  file: File,
  minSeconds = 1,
  maxSeconds = 60
): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(url);
      }
    };

    audio.onloadedmetadata = () => {
      cleanup();
      const duration = audio.duration;

      // On mobile, WebM recordings often return Infinity for duration
      if (!isFinite(duration) || duration === 0) {
        // Allow it through — backend pydub will validate the real duration
        resolve(-1);
      } else if (duration < minSeconds) {
        reject(
          new Error(
            `Audio too short (${duration.toFixed(1)}s). Minimum: ${minSeconds}s`
          )
        );
      } else if (duration > maxSeconds) {
        reject(
          new Error(
            `Audio too long (${duration.toFixed(1)}s). Maximum: ${maxSeconds}s`
          )
        );
      } else {
        resolve(duration);
      }
    };

    audio.onerror = () => {
      cleanup();
      // On mobile, some formats can't be decoded client-side — let backend handle it
      resolve(-1);
    };

    // Timeout fallback for mobile browsers that never fire loadedmetadata
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(-1);
      }
    }, 3000);

    audio.preload = "metadata";
    audio.src = url;
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const ACCEPTED_TYPES = [
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
  "audio/webm",
  "audio/x-wav",
  "audio/x-m4a",
];

export function isAcceptedAudioType(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ["wav", "mp3", "m4a", "ogg", "webm", "mp4"].includes(ext || "");
}

export const MAX_FILE_SIZE_MB = 10;
