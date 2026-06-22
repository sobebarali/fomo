/**
 * Cursor pagination for list routers. The cursor is an opaque base64url offset — clients pass back
 * `nextCursor` verbatim and never construct one. Offset-based because the upstream integrations page
 * by offset and return no reliable total. The first list router (`tokens.trending`) establishes this;
 * other list routers copy it.
 */

export const encodeCursor = (offset: number): string =>
  Buffer.from(String(offset)).toString("base64url");

/**
 * Never throws — any garbage / NaN / negative / non-integer cursor decodes to 0 (start). A bad cursor
 * is client misuse of a value we issued; list routers declare only `RATE_LIMITED`/`UPSTREAM_ERROR`, so
 * it must degrade to page one, not surface `BAD_REQUEST` or a 500.
 */
export function decodeCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }
  const offset = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

/**
 * `nextCursor` is null once a page returns fewer than `limit` items. A full final page yields a
 * non-null cursor whose next page is empty — conventional for offset pagination with no total.
 */
export function paginate<T>(
  items: T[],
  limit: number,
  offset: number
): { items: T[]; nextCursor: string | null } {
  return {
    items,
    nextCursor: items.length === limit ? encodeCursor(offset + limit) : null,
  };
}
