import { webkit } from 'playwright';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const port = arg('port', '8767'), only = arg('only', ''), timeout = +arg('timeout', '900') * 1000;
const url = `http://localhost:${port}/tests/?auto${only ? '&only=' + encodeURIComponent(only) : ''}`;

const browser = await webkit.launch();
let code = 1;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', e => console.log('PAGE ERROR ' + e.message));
  await page.goto(url);
  await page.waitForFunction(() => !!window.__result, null, { timeout, polling: 1000 });
  const r = await page.evaluate(() => window.__result);
  for (const l of r.lines) console.log(l);
  console.log('');
  if (r.fail) console.log(`WebKit: не прошло ${r.fail} из ${r.pass + r.fail}`);
  else { console.log(`WebKit: все ${r.pass} проверок прошли`); code = 0; }
} catch (e) {
  console.log(e.name === 'TimeoutError' ? `Тесты не завершились за ${timeout / 1000} с` : String(e));
} finally {
  await browser.close();
}
process.exit(code);
