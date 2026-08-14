import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const targetUrl = process.argv[2];
if (!targetUrl) {
  throw new Error("Informe a URL da aplicação a ser auditada.");
}

const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: axeSource });

  const landmarks = await page.evaluate(() => ({
    main: document.querySelectorAll("main").length,
    nav: document.querySelectorAll("nav").length,
    buttons: document.querySelectorAll("button").length,
    labeledInputs: [...document.querySelectorAll("input, textarea, select")].filter(element => element.getAttribute("aria-label") || element.id && document.querySelector(`label[for="${element.id}"]`)).length,
  }));
  const studioLoaded = await page.locator("textarea").count() > 0;
  await page.keyboard.press("Tab");
  const focusable = page.locator(":focus");
  const focusStyle = await focusable.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset };
  });
  const activeElement = await page.evaluate(() => ({ tag: document.activeElement?.tagName, ariaLabel: document.activeElement?.getAttribute("aria-label") }));
  const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }));
  const blocking = results.violations.filter(issue => ["critical", "serious"].includes(issue.impact || ""));

  const report = { studioLoaded, landmarks, focusStyle, activeElement, violationCount: results.violations.length, blocking: blocking.map(issue => ({ id: issue.id, impact: issue.impact, help: issue.help, nodes: issue.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) };
  console.log(JSON.stringify(report, null, 2));

  if (landmarks.main < 1 || (studioLoaded && (landmarks.nav < 1 || landmarks.labeledInputs < 1)) || focusStyle.outlineStyle === "none" || focusStyle.outlineWidth === "0px" || !["BUTTON", "TEXTAREA", "INPUT", "SELECT", "A"].includes(activeElement.tag || "") || blocking.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
