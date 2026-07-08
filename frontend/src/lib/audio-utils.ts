export function validateAudioDuration(
  file: File,
  minSeconds = 1,
  maxSeconds = 45
): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = audio.duration;

      if (!isFinite(duration)) {
        reject(new Error("Could not determine audio duration."));
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
      URL.revokeObjectURL(url);
      reject(new Error("Invalid or unsupported audio file."));
    };
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
