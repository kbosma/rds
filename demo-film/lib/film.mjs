// Regie voor het filmpje: ondertitels, titelkaarten, een zichtbare muisaanwijzer en rustig typen.
// Een Playwright-video toont geen cursor en geen uitleg; deze helpers tekenen die in de pagina zelf.

const OVERLAY_SCRIPT = () => {
  // Alleen in het hoofdvenster, niet in iframes (zoals de mailweergave in de postbus).
  if (window.__film || window.top !== window) return;
  const css = `
    #film-caption { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 2147483646;
      max-width: min(1100px, 86vw); background: rgba(16, 24, 32, .88); color: #fff; border-radius: 14px;
      padding: 14px 22px; font: 500 19px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,.25); opacity: 0; transition: opacity .35s; pointer-events: none; }
    #film-caption.on { opacity: 1; }
    #film-caption .step { display: block; font-size: 13px; letter-spacing: .08em; text-transform: uppercase;
      color: #f2c47a; margin-bottom: 3px; font-weight: 700; }
    #film-card { position: fixed; inset: 0; z-index: 2147483647; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center; background: linear-gradient(135deg, #1d2b36, #3a2416);
      color: #fff; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; opacity: 0;
      transition: opacity .5s; pointer-events: none; }
    #film-card.on { opacity: 1; }
    #film-card h1 { font-size: 46px; margin: 0 0 14px; font-weight: 700; }
    #film-card p { font-size: 22px; margin: 0; color: #e7d6c3; max-width: 900px; line-height: 1.45; }
    #film-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
      background: rgba(242, 165, 65, .55); border: 2px solid #c2571a; z-index: 2147483645; pointer-events: none;
      transition: transform .7s cubic-bezier(.4,.0,.2,1); }
    #film-cursor.click { animation: film-click .45s ease-out; }
    @keyframes film-click { 0% { box-shadow: 0 0 0 0 rgba(194,87,26,.6); } 100% { box-shadow: 0 0 0 26px rgba(194,87,26,0); } }
    #film-toast { position: fixed; right: 24px; top: 24px; z-index: 2147483646; width: 380px; background: #fff; color: #1d2b36;
      border-radius: 12px; box-shadow: 0 12px 34px rgba(0,0,0,.25); padding: 14px 16px; font: 14px/1.4 system-ui, sans-serif;
      transform: translateX(440px); transition: transform .45s; }
    #film-toast.on { transform: translateX(0); }
    #film-toast .t-head { font-size: 12px; color: #6b7a86; margin-bottom: 4px; }
    #film-toast .t-subj { font-weight: 700; margin-bottom: 4px; }
    #film-toast .t-code { font-size: 26px; font-weight: 700; letter-spacing: 6px; margin-top: 6px; }
    #film-image { position: fixed; inset: 0; z-index: 2147483644; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; background: rgba(16, 24, 32, .82); opacity: 0; transition: opacity .4s;
      pointer-events: none; }
    #film-image.on { opacity: 1; }
    #film-image img { width: min(1000px, 78vw); height: 70vh; object-fit: cover; object-position: top;
      background: #fff; border-radius: 6px; box-shadow: 0 16px 50px rgba(0,0,0,.45); }
    #film-image .i-title { color: #fff; font: 600 18px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }`;
  const install = () => {
    if (document.getElementById('film-style')) return;
    const style = document.createElement('style');
    style.id = 'film-style';
    style.textContent = css;
    document.head.appendChild(style);
    for (const id of ['film-caption', 'film-card', 'film-cursor', 'film-toast', 'film-image']) {
      const el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
  };
  window.__film = {
    install,
    caption(step, text) {
      install();
      const el = document.getElementById('film-caption');
      if (!text) { el.classList.remove('on'); return; }
      el.innerHTML = (step ? `<span class="step"></span>` : '') + '<span class="txt"></span>';
      if (step) el.querySelector('.step').textContent = step;
      el.querySelector('.txt').textContent = text;
      el.classList.add('on');
    },
    card(title, text) {
      install();
      const el = document.getElementById('film-card');
      if (!title) { el.classList.remove('on'); return; }
      el.innerHTML = '<h1></h1><p></p>';
      el.querySelector('h1').textContent = title;
      el.querySelector('p').textContent = text ?? '';
      el.classList.add('on');
    },
    cursor(x, y, click) {
      install();
      const el = document.getElementById('film-cursor');
      el.style.transform = `translate(${x}px, ${y}px)`;
      if (click) { el.classList.remove('click'); void el.offsetWidth; el.classList.add('click'); }
    },
    image(src, title) {
      install();
      const el = document.getElementById('film-image');
      if (!src) { el.classList.remove('on'); return; }
      el.innerHTML = '<div class="i-title"></div><img alt="">';
      el.querySelector('.i-title').textContent = title ?? '';
      el.querySelector('img').src = src;
      el.classList.add('on');
    },
    toast(head, subject, code) {
      install();
      const el = document.getElementById('film-toast');
      if (!subject) { el.classList.remove('on'); return; }
      el.innerHTML = '<div class="t-head"></div><div class="t-subj"></div>' + (code ? '<div class="t-code"></div>' : '');
      el.querySelector('.t-head').textContent = head;
      el.querySelector('.t-subj').textContent = subject;
      if (code) el.querySelector('.t-code').textContent = code;
      el.classList.add('on');
    },
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
};

export class Film {
  constructor(page, { pace = 1, snapshotDir = null } = {}) {
    this.page = page;
    this.pace = pace;
    // Optioneel: bij elke ondertitel en titelkaart een screenshot (om het filmpje te controleren zonder het af te spelen).
    this.snapshotDir = snapshotDir;
    this.snapshots = 0;
    this.cursorAt = { x: 720, y: 450 };
    this.current = { step: null, text: null };
  }

  /** Eén keer aanroepen vóór de eerste navigatie. */
  async setup() {
    await this.page.addInitScript(OVERLAY_SCRIPT);
    // Na elke paginalading de lopende ondertitel en de cursor terugzetten.
    this.page.on('load', async () => {
      try {
        await this.page.evaluate(OVERLAY_SCRIPT);
        await this.page.evaluate(({ x, y }) => window.__film.cursor(x, y, false), this.cursorAt);
        if (this.current.text) {
          await this.page.evaluate(({ step, text }) => window.__film.caption(step, text), this.current);
        }
      } catch { /* pagina al weer weg */ }
    });
  }

  async wait(ms) {
    await this.page.waitForTimeout(Math.round(ms * this.pace));
  }

  /** Ondertitel onderin; blijft staan tot de volgende. Wacht daarna zo lang als nodig is om hem te lezen. */
  async say(step, text, { minMs = 1800 } = {}) {
    this.current = { step, text };
    await this.page.evaluate(({ step, text }) => window.__film.caption(step, text), this.current);
    await this.snapshot(step);
    // ~ 14 tekens per seconde lezen, met een minimum.
    await this.wait(Math.max(minMs, (text.length / 14) * 1000));
  }

  async snapshot(label) {
    if (!this.snapshotDir) return;
    await this.page.waitForTimeout(400);
    const name = `${String(++this.snapshots).padStart(3, '0')}-${String(label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    await this.page.screenshot({ path: `${this.snapshotDir}/${name}` });
  }

  async unsay() {
    this.current = { step: null, text: null };
    await this.page.evaluate(() => window.__film.caption(null, null));
  }

  /** Titelkaart over het hele scherm. */
  async card(title, text, ms = 3500) {
    await this.page.evaluate(({ title, text }) => window.__film.card(title, text), { title, text });
    await this.wait(600);
    await this.snapshot('kaart');
    await this.wait(Math.max(0, ms - 600));
    await this.page.evaluate(() => window.__film.card(null));
    await this.wait(500);
  }

  /** Melding rechtsboven, zoals een binnenkomende e-mail. */
  async toast(head, subject, code, ms = 4000) {
    await this.page.evaluate(({ head, subject, code }) => window.__film.toast(head, subject, code), { head, subject, code });
    await this.wait(ms);
    await this.page.evaluate(() => window.__film.toast(null, null));
    await this.wait(400);
  }

  /** Een afbeelding groot in beeld (bijvoorbeeld de eerste pagina van een gegenereerde PDF). */
  async image(src, title, ms = 5000) {
    await this.page.evaluate(({ src, title }) => window.__film.image(src, title), { src, title });
    await this.wait(700);
    await this.snapshot('afbeelding');
    await this.wait(Math.max(0, ms - 700));
    await this.page.evaluate(() => window.__film.image(null));
    await this.wait(500);
  }

  /** Typ zichtbaar op de plek van de cursor (bijvoorbeeld in de teksteditor). */
  async keys(text, { delay = 45 } = {}) {
    await this.page.keyboard.type(String(text), { delay: Math.round(delay * this.pace) });
    await this.wait(150);
  }

  async moveTo(locator) {
    await locator.scrollIntoViewIfNeeded();
    // Valt het element (deels) onder de ondertitel, scroll het dan naar het midden van het scherm.
    const viewport = this.page.viewportSize();
    const before = await locator.boundingBox();
    if (before && viewport && before.y + Math.min(before.height, 200) > viewport.height - 150) {
      await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      await this.wait(600);
    }
    const box = await locator.boundingBox();
    if (!box) return;
    this.cursorAt = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    await this.page.evaluate(({ x, y }) => window.__film.cursor(x, y, false), this.cursorAt);
    await this.wait(750);
  }

  async click(locator, { force = false } = {}) {
    await locator.waitFor({ state: 'visible' });
    await this.moveTo(locator);
    await this.page.evaluate(({ x, y }) => window.__film.cursor(x, y, true), this.cursorAt);
    await locator.click({ force });
    await this.wait(450);
  }

  /**
   * Naar een invoerveld "klikken": cursor erheen en focus. Een echte klik kan niet altijd, omdat het zwevende label
   * van een Material-veld boven de input ligt.
   */
  async focus(locator) {
    await locator.waitFor({ state: 'visible' });
    await this.moveTo(locator);
    await this.page.evaluate(({ x, y }) => window.__film.cursor(x, y, true), this.cursorAt);
    await locator.focus();
    await this.wait(250);
  }

  /** Typ zichtbaar in een veld. */
  async type(locator, text, { delay = 55 } = {}) {
    await this.focus(locator);
    await locator.pressSequentially(String(text), { delay: Math.round(delay * this.pace) });
    await this.wait(250);
  }

  /** Datum- en tijdvelden typ je niet teken voor teken; zet de waarde en laat het even zien. */
  async fill(locator, value) {
    await this.focus(locator);
    await locator.fill(String(value));
    await this.wait(350);
  }

  /** Een Material-keuzelijst openen en een optie kiezen. */
  async choose(selectLocator, optionText) {
    // force: het zwevende label van het Material-veld ligt boven de keuzelijst.
    await this.click(selectLocator, { force: true });
    const option = this.page.locator('mat-option').filter({ hasText: optionText }).first();
    await this.click(option);
  }
}
