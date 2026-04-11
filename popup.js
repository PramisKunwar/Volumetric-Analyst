// --- Accordion logic ---
document.querySelectorAll('.section-header').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    btn.nextElementSibling.classList.toggle('open');
  });
});

// --- Utility ---
function showResult(id, text, isError = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'result-box' + (isError ? ' error' : '');
}

function copyResult(id) {
  const text = document.getElementById(id).textContent;
  if (text) navigator.clipboard.writeText(text);
}

function saveInputs() {
  const inputs = document.querySelectorAll('input, select');
  const data = {};
  inputs.forEach(el => { if (el.id) data[el.id] = el.value; });
  try { localStorage.setItem('va_data', JSON.stringify(data)); } catch(e) {}
}

function loadInputs() {
  try {
    const data = JSON.parse(localStorage.getItem('va_data') || '{}');
    Object.entries(data).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.value = val; el.dispatchEvent(new Event('change')); }
    });
  } catch(e) {}
}

// --- Unit Converter ---
const ucUnits = ['M', 'N', 'g/L', '%(w/v)', 'ppm'];
const needsMM = (from, to) => {
  const simple = ['g/L', '%(w/v)', 'ppm'];
  if (simple.includes(from) && simple.includes(to)) return false;
  return true;
};
const needsNF = (from, to) => (from === 'M' && to === 'N') || (from === 'N' && to === 'M');

function updateUCConditionals() {
  const from = document.getElementById('uc-from').value;
  const to = document.getElementById('uc-to').value;
  document.getElementById('uc-mm-wrap').className = 'conditional' + (needsMM(from, to) ? ' show' : '');
  document.getElementById('uc-nf-wrap').className = 'conditional' + (needsNF(from, to) ? ' show' : '');
}

document.getElementById('uc-from').addEventListener('change', updateUCConditionals);
document.getElementById('uc-to').addEventListener('change', updateUCConditionals);

function toGperL(val, unit, mm, nf) {
  switch(unit) {
    case 'M': return val * mm;
    case 'N': return val * (mm / nf);
    case 'g/L': return val;
    case '%(w/v)': return val * 10;
    case 'ppm': return val / 1000;
  }
}

function fromGperL(gpl, unit, mm, nf) {
  switch(unit) {
    case 'M': return gpl / mm;
    case 'N': return gpl / (mm / nf);
    case 'g/L': return gpl;
    case '%(w/v)': return gpl / 10;
    case 'ppm': return gpl * 1000;
  }
}

document.getElementById('uc-convert').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('uc-val').value);
  const from = document.getElementById('uc-from').value;
  const to = document.getElementById('uc-to').value;
  const mm = parseFloat(document.getElementById('uc-mm').value);
  const nf = parseFloat(document.getElementById('uc-nf').value);

  if (isNaN(val) || val < 0) return showResult('uc-result', 'Invalid input', true);
  if (from === to) return showResult('uc-result', val + ' ' + to);
  if (needsMM(from, to) && (isNaN(mm) || mm <= 0)) return showResult('uc-result', 'Enter molar mass', true);
  if (needsNF(from, to) && (isNaN(nf) || nf <= 0)) return showResult('uc-result', 'Enter n-factor', true);

  const gpl = toGperL(val, from, mm, nf);
  const result = fromGperL(gpl, to, mm, nf);
  showResult('uc-result', result.toFixed(4) + ' ' + to);
  saveInputs();
});

document.getElementById('uc-clear').addEventListener('click', () => {
  ['uc-val','uc-mm','uc-nf'].forEach(id => document.getElementById(id).value = '');
  showResult('uc-result', '');
});

// --- Titration Calculator ---
function updateTitConditionals() {
  const u1 = document.getElementById('tit-u1').value;
  const u2 = document.getElementById('tit-u2').value;
  document.getElementById('tit-nf1-wrap').className = 'conditional' + (u1 === 'M' ? ' show' : '');
  document.getElementById('tit-nf2-wrap').className = 'conditional' + (u2 === 'M' ? ' show' : '');
}
document.getElementById('tit-u1').addEventListener('change', updateTitConditionals);
document.getElementById('tit-u2').addEventListener('change', updateTitConditionals);

document.getElementById('tit-solve').addEventListener('click', () => {
  let c1 = document.getElementById('tit-c1').value.trim();
  let v1 = document.getElementById('tit-v1').value.trim();
  let c2 = document.getElementById('tit-c2').value.trim();
  let v2 = document.getElementById('tit-v2').value.trim();
  const u1 = document.getElementById('tit-u1').value;
  const u2 = document.getElementById('tit-u2').value;
  const nf1 = parseFloat(document.getElementById('tit-nf1').value);
  const nf2 = parseFloat(document.getElementById('tit-nf2').value);

  // Count blanks
  const fields = [c1, v1, c2, v2];
  const blanks = fields.filter(f => f === '').length;
  if (blanks !== 1) return showResult('tit-result', 'Leave exactly ONE field empty to solve', true);

  // Parse
  c1 = c1 === '' ? null : parseFloat(c1);
  v1 = v1 === '' ? null : parseFloat(v1);
  c2 = c2 === '' ? null : parseFloat(c2);
  v2 = v2 === '' ? null : parseFloat(v2);

  // Validate
  for (const v of [c1,v1,c2,v2]) {
    if (v !== null && (isNaN(v) || v < 0)) return showResult('tit-result', 'Invalid input', true);
  }

  if (u1 === 'M' && (c1 !== null) && (isNaN(nf1) || nf1 <= 0)) return showResult('tit-result', 'Enter n-factor for Solution 1', true);
  if (u2 === 'M' && (c2 !== null) && (isNaN(nf2) || nf2 <= 0)) return showResult('tit-result', 'Enter n-factor for Solution 2', true);
  // If solving for c1 and u1=M, we need nf1
  if (c1 === null && u1 === 'M' && (isNaN(nf1) || nf1 <= 0)) return showResult('tit-result', 'Enter n-factor for Solution 1', true);
  if (c2 === null && u2 === 'M' && (isNaN(nf2) || nf2 <= 0)) return showResult('tit-result', 'Enter n-factor for Solution 2', true);

  // Convert to normality
  let N1 = c1 !== null ? (u1 === 'M' ? c1 * nf1 : c1) : null;
  let N2 = c2 !== null ? (u2 === 'M' ? c2 * nf2 : c2) : null;

  let steps = [];
  let answer = '';

  // N1*V1 = N2*V2, solve for unknown
  if (N1 === null) {
    // solving for c1
    N1 = (N2 * v2) / v1;
    const display = u1 === 'M' ? (N1 / nf1) : N1;
    const displayUnit = u1 === 'M' ? 'M' : 'N';
    if (u2 === 'M') steps.push(`N₂ = ${c2} × ${nf2} = ${N2} N`);
    steps.push(`N₁ × ${v1} = ${N2} × ${v2}`);
    steps.push(`N₁ = ${(N2*v2).toFixed(4)} / ${v1} = ${N1.toFixed(4)} N`);
    if (u1 === 'M') steps.push(`M₁ = ${N1.toFixed(4)} / ${nf1} = ${display.toFixed(4)} M`);
    answer = `${display.toFixed(4)} ${displayUnit}`;
  } else if (v1 === null) {
    v1 = (N2 * v2) / N1;
    if (u1 === 'M') steps.push(`N₁ = ${c1} × ${nf1} = ${N1} N`);
    if (u2 === 'M') steps.push(`N₂ = ${c2} × ${nf2} = ${N2} N`);
    steps.push(`${N1} × V₁ = ${N2} × ${v2}`);
    steps.push(`V₁ = ${(N2*v2).toFixed(4)} / ${N1} = ${v1.toFixed(4)}`);
    answer = `V₁ = ${v1.toFixed(4)}`;
  } else if (N2 === null) {
    N2 = (N1 * v1) / v2;
    const display = u2 === 'M' ? (N2 / nf2) : N2;
    const displayUnit = u2 === 'M' ? 'M' : 'N';
    if (u1 === 'M') steps.push(`N₁ = ${c1} × ${nf1} = ${N1} N`);
    steps.push(`${N1} × ${v1} = N₂ × ${v2}`);
    steps.push(`N₂ = ${(N1*v1).toFixed(4)} / ${v2} = ${N2.toFixed(4)} N`);
    if (u2 === 'M') steps.push(`M₂ = ${N2.toFixed(4)} / ${nf2} = ${display.toFixed(4)} M`);
    answer = `${display.toFixed(4)} ${displayUnit}`;
  } else {
    v2 = (N1 * v1) / N2;
    if (u1 === 'M') steps.push(`N₁ = ${c1} × ${nf1} = ${N1} N`);
    if (u2 === 'M') steps.push(`N₂ = ${c2} × ${nf2} = ${N2} N`);
    steps.push(`${N1} × ${v1} = ${N2} × V₂`);
    steps.push(`V₂ = ${(N1*v1).toFixed(4)} / ${N2} = ${v2.toFixed(4)}`);
    answer = `V₂ = ${v2.toFixed(4)}`;
  }

  showResult('tit-result', '▸ ' + answer);
  document.getElementById('tit-steps').textContent = steps.join('\n');
  document.getElementById('tit-steps').style.display = 'block';
  saveInputs();
});

document.getElementById('tit-clear').addEventListener('click', () => {
  ['tit-c1','tit-v1','tit-c2','tit-v2','tit-nf1','tit-nf2'].forEach(id => document.getElementById(id).value = '');
  showResult('tit-result', '');
  document.getElementById('tit-steps').style.display = 'none';
  document.getElementById('tit-steps').textContent = '';
});

// --- Equivalent Weight ---
document.getElementById('ew-calc').addEventListener('click', () => {
  const mm = parseFloat(document.getElementById('ew-mm').value);
  const nf = parseFloat(document.getElementById('ew-nf').value);
  if (isNaN(mm) || mm <= 0) return showResult('ew-result', 'Enter valid molar mass', true);
  if (isNaN(nf) || nf <= 0) return showResult('ew-result', 'Enter valid n-factor', true);
  const ew = mm / nf;
  showResult('ew-result', ew.toFixed(4) + ' g/eq');
  saveInputs();
});

document.getElementById('ew-clear').addEventListener('click', () => {
  ['ew-mm','ew-nf'].forEach(id => document.getElementById(id).value = '');
  showResult('ew-result', '');
});

// Load saved inputs on start
updateUCConditionals();
updateTitConditionals();
loadInputs();
