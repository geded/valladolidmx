import { expect, test } from "vitest";
import { sanitizeEditorialHtml, escapeStyleText } from "../../src/lib/security/sanitize-html";
import { isSafePublicUrl } from "../../src/lib/security/safe-fetch";
test("x", () => {
  expect(sanitizeEditorialHtml('<p onclick="x()">Hola <b>a</b><script>alert(1)</script><a href="javascript:alert(1)">l</a></p>')).toBe('<p>Hola <b>a</b><a href>l</a></p>');
  expect(escapeStyleText("a{color:red}</style><script>")).not.toContain("<");
  expect(isSafePublicUrl("https://169.254.169.254/")).toBe(false);
  expect(isSafePublicUrl("https://localhost/")).toBe(false);
  expect(isSafePublicUrl("https://example.com/a.jpg")).toBe(true);
});
