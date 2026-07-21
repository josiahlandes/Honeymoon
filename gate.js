/* gate.js — the password gate. The itinerary ships encrypted
   (schedule-data.enc.json: AES-256-GCM, key from PBKDF2-SHA256);
   this file holds no secrets. On success the derived key is kept
   in localStorage so each device only asks once; the decrypted
   data script is executed and the page's window.__boot() runs. */
(() => {
  const KEY_STORE = "kj-gate-key";
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));

  const CSS = `
  html.kj-locked{overflow:hidden}
  html.kj-locked body > *:not(#kj-gate){visibility:hidden}
  #kj-gate{
    position:fixed;inset:0;z-index:200;background:#0C1116;
    display:grid;place-items:center;padding:24px;
    font-family:'Archivo',system-ui,sans-serif;color:#F2EDE3;
    opacity:1;transition:opacity .6s ease;
  }
  #kj-gate.kj-out{opacity:0;pointer-events:none}
  #kj-gate::before{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(90% 46% at 50% -6%, rgba(223,174,90,.09), transparent 62%);
  }
  #kj-gate::after{
    content:"";position:absolute;inset:-40px;pointer-events:none;opacity:.05;
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.9'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='240'%20height='240'%20filter='url(%23n)'/%3E%3C/svg%3E");
    background-size:240px 240px;
  }
  .kj-box{position:relative;z-index:2;text-align:center;max-width:420px;width:100%}
  .kj-mark{
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;font-weight:600;
    font-size:20px;letter-spacing:.02em;
  }
  .kj-mark b{color:#DFAE5A;font-weight:600}
  .kj-eyebrow{
    margin-top:26px;font-size:10px;font-weight:600;letter-spacing:.3em;
    text-transform:uppercase;color:rgba(242,237,227,.5);
  }
  .kj-q{
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;font-weight:550;
    font-size:clamp(28px,6vw,40px);line-height:1.1;margin:10px 0 30px;
  }
  .kj-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  #kj-pass{
    flex:1;min-width:200px;max-width:280px;
    background:none;border:1px solid rgba(242,237,227,.22);border-radius:999px;
    color:#F2EDE3;font-family:'Archivo',system-ui,sans-serif;font-size:15px;
    text-align:center;letter-spacing:.08em;padding:13px 20px;outline:none;
  }
  #kj-pass:focus-visible{border-color:#DFAE5A}
  #kj-go{
    border:none;border-radius:999px;cursor:pointer;
    background:#DFAE5A;color:#0C1116;
    font-family:'Archivo',system-ui,sans-serif;
    font-size:11px;font-weight:650;letter-spacing:.22em;text-transform:uppercase;
    padding:13px 26px;
  }
  #kj-go:focus-visible{outline:2px solid #F2EDE3;outline-offset:3px}
  #kj-msg{
    min-height:24px;margin-top:18px;
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;
    font-size:15px;color:#DFAE5A;
  }
  @media (prefers-reduced-motion: no-preference){
    .kj-shake{animation:kjshake .4s ease}
    @keyframes kjshake{
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-8px)}
      75%{transform:translateX(8px)}
    }
  }`;

  const HTML = `
  <div class="kj-box">
    <p class="kj-mark">Katie <b>&amp;</b> Josiah</p>
    <p class="kj-eyebrow">A private itinerary — invitation only</p>
    <p class="kj-q">What&rsquo;s the magic word?</p>
    <form class="kj-row" id="kj-form">
      <input id="kj-pass" type="password" autocomplete="current-password"
             aria-label="Site password" placeholder="password">
      <button id="kj-go" type="submit">Unlock</button>
    </form>
    <p id="kj-msg" aria-live="polite"></p>
  </div>`;

  async function decryptWith(key, enc) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(enc.iv) }, key, b64d(enc.ct));
    return new TextDecoder().decode(pt);
  }
  async function keyFromPassword(pw, enc) {
    const mat = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: b64d(enc.salt), iterations: enc.iter, hash: "SHA-256" },
      mat, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }

  function boot(code, gate) {
    new Function(code)();           // defines window.HONEYMOON
    window.__boot?.();
    document.documentElement.classList.remove("kj-locked");
    if (gate) {
      gate.classList.add("kj-out");
      setTimeout(() => gate.remove(), 700);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    document.documentElement.classList.add("kj-locked");
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const gate = document.createElement("div");
    gate.id = "kj-gate";
    gate.innerHTML = HTML;
    document.body.appendChild(gate);
    const msg = gate.querySelector("#kj-msg");
    const input = gate.querySelector("#kj-pass");

    let enc = null;
    try { enc = await (await fetch("schedule-data.enc.json")).json(); }
    catch (e) {
      msg.textContent = "The itinerary couldn't load — open the site over http, not as a file.";
      return;
    }

    /* silent unlock for a device that has been here before */
    const saved = localStorage.getItem(KEY_STORE);
    if (saved) {
      try {
        const key = await crypto.subtle.importKey("raw", b64d(saved), "AES-GCM", false, ["decrypt"]);
        return boot(await decryptWith(key, enc), gate);
      } catch (e) { localStorage.removeItem(KEY_STORE); }
    }

    input.focus();
    gate.querySelector("#kj-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      msg.textContent = "";
      try {
        const key = await keyFromPassword(input.value, enc);
        const code = await decryptWith(key, enc);   // GCM throws on a wrong key
        try { localStorage.setItem(KEY_STORE, b64e(await crypto.subtle.exportKey("raw", key))); } catch (e) {}
        boot(code, gate);
      } catch (e) {
        msg.textContent = "Not it — try again.";
        input.select();
        const box = gate.querySelector(".kj-box");
        box.classList.remove("kj-shake"); void box.offsetWidth; box.classList.add("kj-shake");
      }
    });
  });
})();
