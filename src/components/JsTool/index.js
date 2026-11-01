import { useEffect, useState } from 'react';
import { parseLicense } from './licenseCore.mjs';
import { jsToString, stringToCharCode, jsToRegex, deepEvalEncrypt } from './converters';
import styles from './styles.module.css';

const LICENSE_KEY = 'jws-js-tool-license';
const TRIAL_KEY = 'jws-js-tool-trial';
const FREE_PER_DAY = 3;

function storageGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function storageSet(k, v) {
  try { localStorage.setItem(k, v); } catch { /* 隐私模式下忽略 */ }
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function readTrialUsed() {
  try {
    const t = JSON.parse(storageGet(TRIAL_KEY) || '{}');
    return t.date === today() ? t.used || 0 : 0;
  } catch { return 0; }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
    return ok;
  }
}

const TOOLS = [
  { id: 'str', title: 'JS → String', placeholder: 'Paste JavaScript code…', run: (v) => jsToString(v) },
  { id: 'charcode', title: 'String → CharCode', placeholder: 'Paste any text…', run: (v) => stringToCharCode(v) },
  { id: 'regex', title: 'JS → Regex', placeholder: 'Paste minified JS snippet…', run: (v) => jsToRegex(v) },
  { id: 'eval', title: 'Multi-layer eval encrypt', placeholder: 'Paste JavaScript code…', depth: true, run: (v, d) => deepEvalEncrypt(d, v) },
];

function ToolCard({ tool, onConvert }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [depth, setDepth] = useState(1);
  return (
    <div className={styles.card}>
      <h3>{tool.title}</h3>
      {tool.depth && (
        <select className={styles.select} value={depth} onChange={(e) => setDepth(+e.target.value)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} layer{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      )}
      <textarea
        className={styles.area}
        spellCheck={false}
        placeholder={tool.placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button className={styles.run} onClick={() => onConvert(() => tool.run(input, depth), setOutput)}>
        Convert &amp; copy
      </button>
      <textarea className={styles.area} readOnly value={output} placeholder="Result" />
    </div>
  );
}

export default function JsTool() {
  const [license, setLicense] = useState(null);
  const [trialUsed, setTrialUsed] = useState(0);
  const [keyInput, setKeyInput] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = storageGet(LICENSE_KEY);
    if (saved) {
      const l = parseLicense(saved);
      if (l.valid) setLicense({ ...l, key: saved });
    }
    setTrialUsed(readTrialUsed());
  }, []);

  function notify(msg, bad = false) {
    setToast({ msg, bad });
    clearTimeout(notify.t);
    notify.t = setTimeout(() => setToast(null), 2200);
  }

  const licensed = license && license.valid && !license.expired;
  const trialLeft = Math.max(0, FREE_PER_DAY - trialUsed);

  function activate() {
    const l = parseLicense(keyInput);
    if (!l.valid) return notify('Invalid activation key.', true);
    if (l.expired) return notify('This key has expired. Please renew.', true);
    const key = keyInput.trim().toUpperCase();
    storageSet(LICENSE_KEY, key);
    setLicense({ ...l, key });
    setKeyInput('');
    notify('Activated — thank you for your purchase!');
  }

  function deactivate() {
    try { localStorage.removeItem(LICENSE_KEY); } catch { /* ignore */ }
    setLicense(null);
  }

  async function handleConvert(compute, setOutput) {
    if (!licensed) {
      if (trialLeft <= 0) {
        notify('Free trial used up for today. Get a license to keep converting.', true);
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const used = trialUsed + 1;
      setTrialUsed(used);
      storageSet(TRIAL_KEY, JSON.stringify({ date: today(), used }));
    }
    const out = compute();
    setOutput(out);
    notify((await copy(out)) ? 'Converted and copied to clipboard.' : 'Converted. Copy failed — please copy manually.');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.licenseBar}>
        {licensed ? (
          <>
            <span className={styles.badgeOk}>Licensed</span>
            <span>Valid until <b>{license.expiry.toLocaleDateString()}</b></span>
            <button className={styles.linkBtn} onClick={deactivate}>Remove key</button>
          </>
        ) : (
          <>
            <span className={styles.badgeTrial}>Free trial</span>
            <span><b>{trialLeft}</b> of {FREE_PER_DAY} free conversions left today</span>
            <span className={styles.spacer} />
            <input
              className={styles.keyInput}
              placeholder="JWS-XXXXXXXX-XXXXX-XXXXXX"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && activate()}
            />
            <button className={styles.activate} onClick={activate}>Activate</button>
            <a className={styles.buy} href="#pricing">Buy a license</a>
          </>
        )}
      </div>

      <div className={styles.grid}>
        {TOOLS.map((t) => (
          <ToolCard key={t.id} tool={t} onConvert={handleConvert} />
        ))}
      </div>

      {toast && <div className={`${styles.toast} ${toast.bad ? styles.toastBad : ''}`}>{toast.msg}</div>}
    </div>
  );
}
