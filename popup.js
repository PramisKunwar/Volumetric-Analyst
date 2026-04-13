document.querySelectorAll('.accordion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    const panel = document.getElementById(section);
    const isOpen = panel.style.display === 'block';
    document.querySelectorAll('.accordion-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.accordion-btn').forEach(b => {
      b.classList.remove('active');
      b.textContent = b.textContent.replace('▼', '▶');
    });

    if (!isOpen) {
      panel.style.display = 'block';
      btn.classList.add('active');
      btn.textContent = btn.textContent.replace('▶', '▼');
    }
  });
});
function showResult(el, text, isError) {
  el.textContent = text;
  el.classList.add('visible');
  el.classList.toggle('error', !!isError);
  el.classList.toggle('success', !isError);
}

function showWorking(el, text) {
  el.textContent = text;
  el.classList.add('visible');
}

function val(id) {
  const v = document.getElementById(id).value.trim();
  return v === '' ? null : parseFloat(v);
}

function sel(id) {
  return document.getElementById(id).value;
}

function round(n, d = 6) {
  return parseFloat(n.toFixed(d));
}
const UNIT_LABELS = {
  M: 'M', N: 'N', gL: 'g/L', pctWV: '% (w/v)', pctWW: '% (w/w)',
  ppm: 'ppm', ppb: 'ppb', m: 'mol/kg (m)', F: 'F'
};

function toGL(value, from, mm, density, nf) {
  switch (from) {
    case 'M': return value * mm;
    case 'F': return value * mm; 
    case 'N': return (value / nf) * mm;
    case 'gL': return value;
    case 'pctWV': return value * 10;
    case 'pctWW':
      if (!density) throw 'Density required for % (w/w) conversion';
      return value * density * 10;
    case 'ppm': return value / 1000;
    case 'ppb': return value / 1000000;
    case 'm':
      if (!density) throw 'Density required for molality conversion';
      const M = (value * 1000 * density) / (1000 + value * mm);
      return M * mm;
    default: throw 'Unknown unit: ' + from;
  }
}
function fromGL(gl, to, mm, density, nf) {
  switch (to) {
    case 'M': return gl / mm;
    case 'F': return gl / mm;
    case 'N': return (gl / mm) * nf;
    case 'gL': return gl;
    case 'pctWV': return gl / 10;
    case 'pctWW':
      if (!density) throw 'Density required for % (w/w) conversion';
      return gl / (density * 10);
    case 'ppm': return gl * 1000;
    case 'ppb': return gl * 1000000;
    case 'm':
      if (!density) throw 'Density required for molality conversion';
      const M = gl / mm;
      return (1000 * M) / (1000 * density - M * mm);
    default: throw 'Unknown unit: ' + to;
  }
}

document.getElementById('conv-btn').addEventListener('click', () => {
  const resEl = document.getElementById('conv-result');
  try {
    const v = val('conv-value');
    if (v === null) throw 'Enter a value';
    if (v < 0) throw 'Concentration cannot be negative';

    const from = sel('conv-from');
    const to = sel('conv-to');
    const mm = val('conv-mm');
    const density = val('conv-density');
    const nf = val('conv-nfactor') || 1;

    const needsMM = ['M', 'N', 'm', 'F'];
    if ((needsMM.includes(from) || needsMM.includes(to)) && !mm) {
      throw 'Molar mass required for this conversion';
    }
    if ((from === 'M' && to === 'N') || (from === 'N' && to === 'M')) {
      if (!nf) throw 'n-factor required for M ↔ N conversion';
    }

    const gl = toGL(v, from, mm, density, nf);
    const result = fromGL(gl, to, mm, density, nf);

    showResult(resEl, `${v} ${UNIT_LABELS[from]} = ${round(result, 4)} ${UNIT_LABELS[to]}`, false);
  } catch (e) {
    showResult(resEl, '⚠ ' + e, true);
  }
});

const INDICATOR_NOTES = {
  'sa-sb': 'Any indicator (Methyl orange or Phenolphthalein)',
  'wa-sb': 'Phenolphthalein (pH 8–10)',
  'sa-wb': 'Methyl orange (pH 3–5)',
  'permanganometry': 'Self-indicator — KMnO₄ (pink → colourless)',
  'dichromatometry': 'External indicator needed (orange → light green is hard to see)',
  'iodometry': 'Starch indicator (blue → colourless)',
  'redox': 'Self-indicator (KMnO₄) or Starch (for I₂ titrations)'
};

document.getElementById('titr-btn').addEventListener('click', () => {
  const resEl = document.getElementById('titr-result');
  const workEl = document.getElementById('titr-working');
  workEl.classList.remove('visible');

  try {
    const c1 = val('t-c1');
    const u1 = sel('t-u1');
    const n1 = val('t-n1') || 1;
    const v1 = val('t-v1');
    const c2 = val('t-c2');
    const u2 = sel('t-u2');
    const n2 = val('t-n2') || 1;
    const v2 = val('t-v2');
    const tType = sel('t-type');

    [c1, c2, v1, v2].forEach(x => {
      if (x !== null && x < 0) throw 'Values cannot be negative';
    });

    const fields = [
      { name: 'C₁', val: c1, id: 'c1' },
      { name: 'V₁', val: v1, id: 'v1' },
      { name: 'C₂', val: c2, id: 'c2' },
      { name: 'V₂', val: v2, id: 'v2' }
    ];
    const blanks = fields.filter(f => f.val === null);

    if (blanks.length !== 1) {
      throw 'Leave exactly one field blank. Currently ' + blanks.length + ' blank.';
    }

    const unknown = blanks[0];

    const N1 = c1 !== null ? (u1 === 'M' ? c1 * n1 : c1) : null;
    const N2 = c2 !== null ? (u2 === 'M' ? c2 * n2 : c2) : null;

    let answer, working = [];
    working.push('Using: N₁V₁ = N₂V₂  (Law of Equivalence, 1.6)');

    if (unknown.id === 'c2') {
      const ansN = (N1 * v1) / v2;
      const ansC = u2 === 'M' ? ansN / n2 : ansN;
      answer = round(ansC, 4);
      working.push(`\nStep 1: Convert to Normality (N = M × n-factor)`);
      if (u1 === 'M') working.push(`  N₁ = ${c1} × ${n1} = ${N1} N`);
      else working.push(`  N₁ = ${N1} N`);
      working.push(`\nStep 2: Apply N₁V₁ = N₂V₂`);
      working.push(`  ${N1} × ${v1} = N₂ × ${v2}`);
      working.push(`  N₂ = ${round(ansN, 4)} N`);
      if (u2 === 'M') {
        working.push(`\nStep 3: Convert back to Molarity`);
        working.push(`  M₂ = ${round(ansN, 4)} ÷ ${n2} = ${answer} M`);
      }
      showResult(resEl, `C₂ = ${answer} ${u2}`, false);
    } else if (unknown.id === 'v2') {
      const ansV = (N1 * v1) / N2;
      answer = round(ansV, 4);
      working.push(`\nStep 1: Convert to Normality`);
      if (u1 === 'M') working.push(`  N₁ = ${c1} × ${n1} = ${N1} N`);
      if (u2 === 'M') working.push(`  N₂ = ${c2} × ${n2} = ${N2} N`);
      working.push(`\nStep 2: Apply N₁V₁ = N₂V₂`);
      working.push(`  ${N1} × ${v1} = ${N2} × V₂`);
      working.push(`  V₂ = ${answer} mL`);
      showResult(resEl, `V₂ = ${answer} mL`, false);
    } else if (unknown.id === 'c1') {
      const ansN = (N2 * v2) / v1;
      const ansC = u1 === 'M' ? ansN / n1 : ansN;
      answer = round(ansC, 4);
      working.push(`\nStep 1: Convert to Normality`);
      if (u2 === 'M') working.push(`  N₂ = ${c2} × ${n2} = ${N2} N`);
      working.push(`\nStep 2: Apply N₁V₁ = N₂V₂`);
      working.push(`  N₁ × ${v1} = ${N2} × ${v2}`);
      working.push(`  N₁ = ${round(ansN, 4)} N`);
      if (u1 === 'M') {
        working.push(`\nStep 3: Convert back to Molarity`);
        working.push(`  M₁ = ${round(ansN, 4)} ÷ ${n1} = ${answer} M`);
      }
      showResult(resEl, `C₁ = ${answer} ${u1}`, false);
    } else if (unknown.id === 'v1') {
      const ansV = (N2 * v2) / N1;
      answer = round(ansV, 4);
      working.push(`\nStep 1: Convert to Normality`);
      if (u1 === 'M') working.push(`  N₁ = ${c1} × ${n1} = ${N1} N`);
      if (u2 === 'M') working.push(`  N₂ = ${c2} × ${n2} = ${N2} N`);
      working.push(`\nStep 2: Apply N₁V₁ = N₂V₂`);
      working.push(`  N₁ × V₁ = ${N2} × ${v2}`);
      working.push(`  V₁ = ${answer} mL`);
      showResult(resEl, `V₁ = ${answer} mL`, false);
    }

    working.push(`\nIndicator: ${INDICATOR_NOTES[tType]}`);
    showWorking(workEl, working.join('\n'));

  } catch (e) {
    showResult(resEl, '⚠ ' + e, true);
    workEl.classList.remove('visible');
  }
});

document.getElementById('dil-btn').addEventListener('click', () => {
  const resEl = document.getElementById('dil-result');
  const workEl = document.getElementById('dil-working');
  workEl.classList.remove('visible');

  try {
    const m1 = val('d-m1');
    const v1 = val('d-v1');
    const m2 = val('d-m2');
    const v2 = val('d-v2');

    [m1, m2, v1, v2].forEach(x => {
      if (x !== null && x < 0) throw 'Values cannot be negative';
    });

    const fields = [
      { name: 'M₁', val: m1, id: 'm1' },
      { name: 'V₁', val: v1, id: 'v1' },
      { name: 'M₂', val: m2, id: 'm2' },
      { name: 'V₂', val: v2, id: 'v2' }
    ];
    const blanks = fields.filter(f => f.val === null);

    if (blanks.length !== 1) {
      throw 'Leave exactly one field blank. Currently ' + blanks.length + ' blank.';
    }

    const unknown = blanks[0];
    let answer, working = [];
    working.push('M₁V₁ = M₂V₂  (Moles before = Moles after dilution, 1.6)');

    if (unknown.id === 'm1') {
      answer = round((m2 * v2) / v1, 4);
      working.push(`${answer} × ${v1} = ${m2} × ${v2}`);
      working.push(`M₁ = ${answer} M`);
      showResult(resEl, `M₁ = ${answer} M`, false);
    } else if (unknown.id === 'v1') {
      answer = round((m2 * v2) / m1, 4);
      working.push(`${m1} × V₁ = ${m2} × ${v2}`);
      working.push(`V₁ = ${answer} mL`);
      showResult(resEl, `V₁ = ${answer} mL`, false);
    } else if (unknown.id === 'm2') {
      answer = round((m1 * v1) / v2, 4);
      working.push(`${m1} × ${v1} = M₂ × ${v2}`);
      working.push(`M₂ = ${answer} M`);
      showResult(resEl, `M₂ = ${answer} M`, false);
    } else if (unknown.id === 'v2') {
      answer = round((m1 * v1) / m2, 4);
      working.push(`${m1} × ${v1} = ${m2} × V₂`);
      working.push(`V₂ = ${answer} mL`);
      showResult(resEl, `V₂ = ${answer} mL`, false);
    }

    if (unknown.id === 'v2' && v1 !== null) {
      const waterToAdd = round(answer - v1, 4);
      if (waterToAdd > 0) {
        working.push(`\nWater to add = ${answer} − ${v1} = ${waterToAdd} mL`);
      }
    }

    showWorking(workEl, working.join('\n'));

  } catch (e) {
    showResult(resEl, '⚠ ' + e, true);
    workEl.classList.remove('visible');
  }
});

document.getElementById('eq-btn').addEventListener('click', () => {
  const resEl = document.getElementById('eq-result');
  try {
    const mm = val('eq-mm');
    const nf = val('eq-nf');
    if (!mm) throw 'Enter molar mass';
    if (!nf || nf <= 0) throw 'Enter a valid n-factor (> 0)';
    if (mm < 0) throw 'Molar mass cannot be negative';

    const eqwt = round(mm / nf, 4);
    const type = sel('eq-type');
    const typeLabels = {
      acid: 'basicity', base: 'acidity', salt: 'total charge',
      oxidising: 'electrons gained', reducing: 'electrons lost',
      element: 'valency', radical: 'charge'
    };
    showResult(resEl, `Eq. wt. = ${mm} ÷ ${nf} (${typeLabels[type]}) = ${eqwt} g/eq`, false);
  } catch (e) {
    showResult(resEl, '⚠ ' + e, true);
  }
});

document.getElementById('eq-example-btn').addEventListener('click', () => {
  const box = document.getElementById('eq-examples');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
});
