export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  for (const rawCookie of cookieHeader?.split(';') ?? []) {
    const cookie = rawCookie.trim();
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0 || cookie.slice(0, separatorIndex) !== name)
      continue;

    try {
      return decodeURIComponent(cookie.slice(separatorIndex + 1));
    } catch {
      return undefined;
    }
  }

  return undefined;
}
