export const normalizeNotificationTitle = (input?: string): string => {
  const raw = String(input ?? "").trim();
  const withoutEmoji = raw.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "");
  const cleaned = withoutEmoji.replace(/[¡!]+/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Notificación";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export const normalizeNotificationMessage = (input?: string): string | undefined => {
  if (input === undefined || input === null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;
  const withoutEmoji = raw.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "");
  let cleaned = withoutEmoji.replace(/[¡!]+/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?…]$/.test(cleaned)) cleaned = `${cleaned}.`;
  return cleaned;
};
