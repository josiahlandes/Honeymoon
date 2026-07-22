/* gate.js — the password gate. The itinerary ships encrypted
   (schedule-data.enc.json: AES-256-GCM, key from PBKDF2-SHA256);
   this file holds no secrets. On success the derived key is kept
   in localStorage so each device only asks once; the decrypted
   data script is executed and the page's window.__boot() runs.
   Styled as the site's "ticket check": dusk-skyline backdrop under
   a heavy scrim, ghost ampersand, and an Admit Two stamp on entry. */
(() => {
  const KEY_STORE = "kj-gate-key";
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;

  const CSS = `
  html.kj-locked{overflow:hidden}
  html.kj-locked body > *:not(#kj-gate){visibility:hidden}
  #kj-gate{
    position:fixed;inset:0;z-index:200;background:#0C1116;
    display:grid;place-items:center;padding:24px;
    font-family:'Archivo',system-ui,sans-serif;color:#F2EDE3;
    opacity:1;transition:opacity .7s ease;overflow:hidden;
  }
  #kj-gate.kj-out{opacity:0;pointer-events:none}
  .kj-bg{
    position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    opacity:.55;
  }
  .kj-scrim{
    position:absolute;inset:0;
    background:
      radial-gradient(130% 100% at 50% 115%, rgba(12,17,22,.1), rgba(12,17,22,.82) 72%),
      linear-gradient(180deg, rgba(12,17,22,.88), rgba(12,17,22,.5) 42%, rgba(12,17,22,.9));
  }
  #kj-gate::after{
    content:"";position:absolute;inset:-40px;pointer-events:none;opacity:.05;
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='240'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.9'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='240'%20height='240'%20filter='url(%23n)'/%3E%3C/svg%3E");
    background-size:240px 240px;
  }
  .kj-amp{
    position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;font-weight:500;
    font-size:min(72vh,72vw);line-height:1;
    color:transparent;-webkit-text-stroke:1px rgba(223,174,90,.32);
    user-select:none;pointer-events:none;
  }
  .kj-box{position:relative;z-index:2;text-align:center;max-width:460px;width:100%}
  .kj-eyebrow{
    display:flex;align-items:center;justify-content:center;gap:14px;
    font-size:10px;font-weight:600;letter-spacing:.3em;
    text-transform:uppercase;color:rgba(242,237,227,.6);
  }
  .kj-eyebrow::before,.kj-eyebrow::after{
    content:"";width:34px;height:1px;background:#DFAE5A;flex:none;
  }
  .kj-mark{
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;font-weight:550;
    font-size:clamp(36px,8vw,56px);line-height:1.05;
    margin:16px 0 6px;
  }
  .kj-mark b{color:#DFAE5A;font-weight:550}
  .kj-q{
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;
    font-size:clamp(15px,2vw,18px);color:rgba(242,237,227,.64);
    margin:0 0 34px;
  }
  .kj-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  #kj-pass{
    flex:1;min-width:200px;max-width:280px;
    background:rgba(12,17,22,.55);
    border:1px solid rgba(242,237,227,.24);border-radius:999px;
    color:#F2EDE3;font-family:'Archivo',system-ui,sans-serif;font-size:15px;
    text-align:center;letter-spacing:.08em;padding:13px 20px;outline:none;
    -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
    transition:border-color .3s;
  }
  #kj-pass:focus-visible{border-color:#DFAE5A}
  #kj-go{
    border:none;border-radius:999px;cursor:pointer;
    background:#DFAE5A;color:#0C1116;
    font-family:'Archivo',system-ui,sans-serif;
    font-size:11px;font-weight:650;letter-spacing:.22em;text-transform:uppercase;
    padding:13px 26px;transition:transform .25s;
  }
  #kj-go:hover{transform:translateY(-2px)}
  #kj-go:focus-visible{outline:2px solid #F2EDE3;outline-offset:3px}
  #kj-msg{
    min-height:26px;margin-top:18px;
    font-family:'Bodoni Moda','Didot',serif;font-style:italic;
    font-size:15px;color:#DFAE5A;
  }
  .kj-stamp{
    display:none;margin:26px auto 0;width:max-content;
    font-size:11px;font-weight:650;letter-spacing:.3em;text-transform:uppercase;
    color:#DFAE5A;border:1px solid rgba(223,174,90,.78);border-radius:2px;
    padding:10px 17px 10px 21px;transform:rotate(-3deg);
    background:rgba(12,17,22,.5);
  }
  .kj-success #kj-form,.kj-success #kj-msg{display:none}
  .kj-success .kj-stamp{display:block}
  @media (prefers-reduced-motion: no-preference){
    .kj-bg{animation:kjdrift 16s cubic-bezier(.2,.6,.3,1) both}
    @keyframes kjdrift{from{transform:scale(1.08)}to{transform:scale(1)}}
    .kj-box{animation:kjrise 1s .2s cubic-bezier(.2,.7,.2,1) both}
    @keyframes kjrise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
    .kj-shake{animation:kjshake .4s ease}
    @keyframes kjshake{
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-8px)}
      75%{transform:translateX(8px)}
    }
    .kj-success .kj-stamp{animation:kjstamp .5s cubic-bezier(.34,1.56,.64,1) both}
    @keyframes kjstamp{
      from{opacity:0;transform:rotate(9deg) scale(1.7)}
      to{opacity:1;transform:rotate(-3deg) scale(1)}
    }
  }`;

  const HTML = `
  <img class="kj-bg" src="photos/hero-skyline-dusk.jpg" alt="" aria-hidden="true">
  <div class="kj-scrim" aria-hidden="true"></div>
  <span class="kj-amp" aria-hidden="true">&amp;</span>
  <div class="kj-box">
    <p class="kj-eyebrow">The Official Honeymoon Itinerary</p>
    <h1 class="kj-mark">Katie <b>&amp;</b> Josiah</h1>
    <p class="kj-q">Private showing &mdash; what&rsquo;s the magic word?</p>
    <form class="kj-row" id="kj-form">
      <input id="kj-pass" type="password" autocomplete="current-password"
             aria-label="Site password" placeholder="password">
      <button id="kj-go" type="submit">Unlock</button>
    </form>
    <p class="kj-stamp" aria-hidden="true">Admit Two</p>
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
      setTimeout(() => gate.remove(), 800);
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
    const box = gate.querySelector(".kj-box");

    let enc = null;
    try { enc = await (await fetch("schedule-data.enc.json")).json(); }
    catch (e) {
      msg.textContent = "The itinerary couldn't load — open the site over http, not as a file.";
      return;
    }

    /* silent unlock for a device that has been here before — no stamp,
       no ceremony, straight through the curtain */
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
        /* the Admit Two stamp gets its beat, then the curtain lifts */
        box.classList.add("kj-success");
        setTimeout(() => boot(code, gate), motionOK ? 900 : 0);
      } catch (e) {
        msg.textContent = "Not it — try again.";
        input.select();
        box.classList.remove("kj-shake"); void box.offsetWidth; box.classList.add("kj-shake");
      }
    });
  });
})();
