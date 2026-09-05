// Dev utility: capture a page screenshot for visual verification.
// Usage: node scripts/screenshot.mjs <url> <outfile> [width] [height] [cookie]
import { chromium } from "playwright-core";

const [url, outfile, width = "1440", height = "900", cookie] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: Number(width), height: Number(height) },
});
if (cookie) {
  const [name, value] = cookie.split("=");
  await context.addCookies([{ name, value, url }]);
}
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: outfile, fullPage: false });
await browser.close();
console.log(`saved ${outfile}`);
