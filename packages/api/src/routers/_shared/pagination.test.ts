import { expect, it } from "vitest";
import { decodeCursor, encodeCursor, paginate } from "./pagination";

it("round-trips an offset through encode/decode", () => {
  expect(decodeCursor(encodeCursor(40))).toBe(40);
});

it("decodes a missing cursor to offset 0", () => {
  expect(decodeCursor(undefined)).toBe(0);
  expect(decodeCursor("")).toBe(0);
});

it("decodes garbage / negative / non-integer cursors to offset 0", () => {
  expect(decodeCursor("!!!not-base64!!!")).toBe(0);
  expect(decodeCursor(encodeCursor(-5))).toBe(0);
  expect(decodeCursor(Buffer.from("3.5").toString("base64url"))).toBe(0);
  expect(decodeCursor(Buffer.from("abc").toString("base64url"))).toBe(0);
});

it("emits a nextCursor only when the page is full", () => {
  const full = paginate([1, 2, 3], 3, 0);
  expect(full.nextCursor).toBe(encodeCursor(3));
  expect(decodeCursor(full.nextCursor ?? undefined)).toBe(3);

  const short = paginate([1, 2], 3, 0);
  expect(short.nextCursor).toBeNull();
});
