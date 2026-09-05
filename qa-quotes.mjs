export default async function run(page, ui) {
  const log = [];
  page.on("console", (m) => {
    if (m.type() === "error") log.push(`[console.error] ${m.text()}`);
  });
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  page.on("requestfailed", (r) => log.push(`[requestfailed] ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ""}`));
  page.on("response", (r) => {
    if (r.status() >= 400) log.push(`[response ${r.status()}] ${r.request().method()} ${r.url()}`);
  });

  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', "alice@acme.test");
  await page.fill('input[type="password"]', "DemoPass123!");
  await page.click('button[data-testid="login-submit"]');

  // Either navigate to dashboard or show an error notice
  try {
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    log.push("LOGIN OK → dashboard");
  } catch {
    log.push("LOGIN DID NOT NAVIGATE. Current URL: " + page.url());
    const notice = await page.evaluate(() => {
      const n = document.querySelector(".notice.red");
      return n ? n.innerText : "(no red notice found)";
    });
    log.push("Notice: " + notice);
  }
  await page.waitForTimeout(3000);

  const dashboardText = await page.evaluate(() => document.body.innerText.slice(0, 2500));
  log.push("--- DASHBOARD TEXT ---");
  log.push(dashboardText);

  return { log: log.join("\n\n") };
}