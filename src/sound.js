/* Chân Kinh Lộ · sound. Direction: Mystical + Ethereal + Organic + Magical Progression.
   Three layers, used where they fit:  air (energy moving) → crystal shimmer (opening) → resonant chime (confirmed).
   Everything is synthesised with Web Audio, so it works with no files. If assets/sfx/manifest.json maps a cue
   to an audio file (e.g. one licensed from Epidemic Sound), that file is played instead of the synthesis.

   Cues and the state each one marks:
     tap      soft confirmation in the UI           (one crystal tink, very quiet)
     open     entering a tier                       (short air + the tier's note)
     lesson   opening a lesson                      (single bowl chime)
     start    entering a trial                      (two bamboo chimes)
     right    a correct answer                      (cleanse shimmer + chime that climbs with progress)
     wrong    a wrong answer                        (low breath, no harshness)
     pass     trial passed ≥80: awakening, release  (air rise → shimmer reveal → resonant chord)
     full     100 points: high achievement          (energy gathers 2.6s → release → angelic swell under the verse)
     rank     realm breakthrough                    (deep energy rise → deep chime → shimmer crown)
     levelup  skill upgrade (for Cành, later)       (shimmer converges → opens into a chime)
     fail     trial not passed                      (descending breath, low bowl)
   Ambient "linh khí": mountain wind with distant bamboo chimes, optional, very low. */
(function () {
  const CKL = (window.CKL = window.CKL || {});
  const KEY = 'ckl-sound', AKEY = 'ckl-ambient';
  const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === 'on'; } catch (e) { return d; } };
  let on = read(KEY, true), amb = read(AKEY, false);
  let ctx = null, master, dry, wet, white, brown, cur = null, files = {}, ambNode = null;

  // Chinese pentatonic, gong mode on D, from D3 upward.
  const NOTES = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.26, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0, 1975.53, 2349.32, 2637.02, 2959.96, 3520.0];
  const note = i => NOTES[Math.max(0, Math.min(NOTES.length - 1, Math.round(i)))];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function boot() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); const sr = ctx.sampleRate;
    master = ctx.createGain(); master.gain.value = 0.85;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 11000; // keep the top end silky
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.4;
    master.connect(lp).connect(comp).connect(ctx.destination);
    dry = ctx.createGain(); dry.connect(master);
    // A long, airy hall: bright early, darker tail.
    const len = Math.floor(sr * 4.2), ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lpv = 0; for (let i = 0; i < len; i++) { const k = i / len; lpv += (Math.random() * 2 - 1 - lpv) * (0.55 - 0.45 * k); d[i] = lpv * Math.pow(1 - k, 2.2) * Math.min(1, i / (sr * 0.02)); } }
    const conv = ctx.createConvolver(); conv.buffer = ir; wet = ctx.createGain(); wet.gain.value = 0.6; wet.connect(conv).connect(master);
    white = ctx.createBuffer(1, sr * 2, sr); const w = white.getChannelData(0); for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
    brown = ctx.createBuffer(1, sr * 4, sr); const b = brown.getChannelData(0); let last = 0; for (let i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.2; }
    loadFiles(); if (amb) ambientStart();
    return true;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (on) boot(); }, { passive: true }));

  /* Optional recorded sounds: assets/sfx/manifest.json → {"pass": "pass.mp3", ...} */
  function loadFiles() {
    if (!/^https?:/.test(location.protocol)) return;
    fetch('assets/sfx/manifest.json').then(r => (r.ok ? r.json() : {})).then(m => {
      Object.entries(m || {}).forEach(([cue, f]) => { if (typeof f !== 'string' || !f) return; fetch('assets/sfx/' + f).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(buf => (files[cue] = buf)).catch(() => {}); });
    }).catch(() => {});
  }

  const T = (d = 0) => ctx.currentTime + d;
  function out(node, send, bus, pan) {
    const g = ctx.createGain(), s = ctx.createGain(); s.gain.value = send ?? 0.4; let src = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); src = p; }
    src.connect(g); src.connect(s); g.connect(bus || dry); s.connect(bus ? bus._w : wet); return node;
  }
  function noise(buf, t, dur, loop) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; s.start(t, Math.random() * (buf.duration - dur > 0 ? buf.duration - dur : 0.01)); s.stop(t + dur + 0.05); return s; }

  /* Layer 1 · air: breath of energy moving. dir 'up' rises, 'down' settles. */
  function air(t, dur, o = {}) {
    const rel = o.rel ?? Math.max(0.35, dur * 0.4); // let the breath dissolve into what follows instead of cutting
    const n = noise(o.dark ? brown : white, t, dur + rel, true), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    const f0 = o.from || 300, f1 = o.to || 2200; bp.type = 'bandpass'; bp.Q.value = o.q || 0.8;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
    lp.type = 'lowpass'; lp.frequency.value = 4200;
    const G = o.gain ?? 0.08, pk = t + dur * (o.peak ?? 0.7); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(G, pk); g.gain.setTargetAtTime(0.0001, Math.max(pk, t + dur - 0.05), rel / 3.5);
    n.connect(bp).connect(lp).connect(g); out(g, o.send ?? 0.45, o.bus);
  }
  /* Layer 2 · crystal shimmer: scattered glass glints. dens per second; rise > 0 lifts pitch over time. */
  function shimmer(t, dur, o = {}) {
    const n = Math.max(1, Math.round((o.dens || 18) * dur)), lo = o.lo ?? 13, hi = o.hi ?? 22, G = o.gain ?? 0.016;
    for (let i = 0; i < n; i++) {
      const u = o.even ? i / n : Math.random(), when = t + u * dur, shape = o.shape === 'in' ? u : o.shape === 'out' ? 1 - u : Math.sin(Math.PI * u);
      const idx = lo + (hi - lo) * (o.rise ? Math.min(1, u * o.rise + Math.random() * 0.4) : Math.random());
      const os = ctx.createOscillator(), g = ctx.createGain(), d = rnd(0.25, 0.9); os.type = 'sine'; os.frequency.value = note(idx) * (1 + rnd(-0.002, 0.002));
      g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(G * (0.35 + 0.65 * shape) * rnd(0.6, 1), when + rnd(0.003, 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      os.connect(g); out(g, o.send ?? 0.7, o.bus, rnd(-0.7, 0.7)); os.start(when); os.stop(when + d + 0.05);
    }
  }
  /* Layer 3 · resonant chime: a crystal singing-bowl tone with slow beating. */
  function chime(f, t, o = {}) {
    const L = o.len || 3, G = o.gain ?? 0.09, soft = o.soft ? 0.03 : 0.006;
    [[1, 1, 1], [1.0035, 0.45, 0.9], [2.005, 0.42, 0.7], [2.76, 0.22, 0.5], [4.07, 0.1, 0.32], [5.4, 0.05, 0.22]].forEach(([r, a, d]) => {
      const os = ctx.createOscillator(), g = ctx.createGain(); os.type = 'sine'; os.frequency.value = f * r;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(G * a, t + soft); g.gain.exponentialRampToValueAtTime(0.0001, t + L * d);
      os.connect(g); out(g, o.send ?? 0.55, o.bus, o.pan); os.start(t); os.stop(t + L * d + 0.05);
    });
  }
  /* Ethereal swell: an airy chord that opens like light through mist. */
  function swell(t, dur, o = {}) {
    const f = o.f || note(5), G = o.gain ?? 0.035, lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.setValueAtTime(o.fromHz || 350, t); lp.frequency.exponentialRampToValueAtTime(o.toHz || 3200, t + dur * (o.peak ?? 0.75));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(G, t + dur * (o.peak ?? 0.75)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); out(g, 0.7, o.bus);
    (o.ratios || [1, 1.5, 2, 3]).forEach((r, i) => [-1, 1].forEach(sd => {
      const os = ctx.createOscillator(), og = ctx.createGain(); os.type = i ? 'sine' : 'triangle'; os.frequency.value = f * r; os.detune.value = sd * 5;
      og.gain.value = 1 / (i + 1.5); os.connect(og).connect(lp); os.start(t); os.stop(t + dur + 0.1);
    }));
  }
  /* Deep energy rising from below (breakthrough). */
  function rise(t, dur, o = {}) {
    const os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); os.type = 'sine';
    os.frequency.setValueAtTime(o.from || 46, t); os.frequency.exponentialRampToValueAtTime(o.to || 92, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = 400; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain ?? 0.12, t + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    os.connect(lp).connect(g); out(g, 0.3, o.bus); os.start(t); os.stop(t + dur + 0.5);
  }
  /* Bamboo chime: hollow, woody, short. */
  function bamboo(f, t, o = {}) {
    const G = o.gain ?? 0.06;
    [[1, 1, 0.35], [2.92, 0.28, 0.12], [5.1, 0.08, 0.06]].forEach(([r, a, d]) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.frequency.value = f * r; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(G * a, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d); os.connect(g); out(g, o.send ?? 0.6, o.bus, o.pan); os.start(t); os.stop(t + d + 0.05); });
  }

  function newScene() { const g = ctx.createGain(), w = ctx.createGain(); g.connect(dry); w.connect(wet); g._w = w; return g; }
  function stop(fade = 0.5) { if (!ctx || !cur) return; const g = cur; cur = null; for (const x of [g, g._w]) { x.gain.cancelScheduledValues(T()); x.gain.setValueAtTime(x.gain.value, T()); x.gain.linearRampToValueAtTime(0.0001, T(fade)); } setTimeout(() => { try { g.disconnect(); g._w.disconnect(); } catch (e) {} }, fade * 1000 + 200); }
  const scene = () => { stop(0.12); return (cur = newScene()); };

  const cues = {
    tap() { chime(note(17), T(), { gain: 0.055, len: 1.1 }); },
    open(o = {}) { const t = T(), n = 8 + (o.n || 1); air(t, 0.45, { from: 500, to: 2600, gain: 0.05, peak: 0.55 }); chime(note(n), t + 0.18, { gain: 0.07, len: 2.4, soft: true }); shimmer(t + 0.16, 0.5, { dens: 10, lo: 16, hi: 21, gain: 0.008 }); },
    lesson() { chime(note(12), T(), { gain: 0.08, len: 2.2, soft: true }); },
    start() { const t = T(); bamboo(note(11), t, { gain: 0.13, pan: -0.2 }); bamboo(note(13), t + 0.13, { gain: 0.09, pan: 0.2 }); },
    right(o = {}) { const t = T(), n = 12 + Math.min(7, o.i || 0); shimmer(t, 0.35, { dens: 26, lo: n + 3, hi: n + 9, gain: 0.016, shape: 'out' }); chime(note(n), t + 0.02, { gain: 0.09, len: 2 }); },
    wrong() { const t = T(); air(t, 0.5, { from: 900, to: 250, gain: 0.05, dark: true, peak: 0.25 }); chime(note(3), t + 0.04, { gain: 0.06, len: 1.2, soft: true, send: 0.3 }); },
    pass() {
      const bus = scene(), t = T();
      air(t, 1.1, { from: 260, to: 3200, gain: 0.07, peak: 0.85, bus });                          // energy gathers with the brush
      shimmer(t + 0.3, 0.8, { dens: 22, lo: 13, hi: 20, rise: 1.2, shape: 'in', gain: 0.009, bus });
      shimmer(t + 1.05, 1.4, { dens: 30, lo: 15, hi: 23, shape: 'out', gain: 0.016, bus });        // reveal
      [10, 12, 14].forEach((n, i) => chime(note(n), t + 1.05 + i * 0.06, { gain: 0.075 - i * 0.012, len: 4.2, pan: (i - 1) * 0.3, bus })); // awakening chord
      swell(t + 1.0, 3.6, { f: note(5), gain: 0.022, peak: 0.25, bus });
    },
    full() {
      const bus = scene(), t = T();
      // 0 → 2.6s: energy converging
      air(t, 2.7, { from: 180, to: 3600, gain: 0.075, peak: 0.95, dark: true, bus });
      swell(t, 2.7, { f: note(5), gain: 0.03, fromHz: 250, toHz: 2600, peak: 0.97, bus });
      shimmer(t + 0.4, 2.2, { dens: 26, lo: 12, hi: 22, rise: 1, shape: 'in', gain: 0.012, bus });
      // 2.6s: release
      [5, 10, 12, 14, 17].forEach((n, i) => chime(note(n), t + 2.6 + i * 0.05, { gain: [0.09, 0.08, 0.07, 0.055, 0.04][i], len: 6, pan: (i - 2) * 0.25, bus }));
      shimmer(t + 2.6, 2.4, { dens: 40, lo: 14, hi: 23, shape: 'out', gain: 0.02, bus });
      air(t + 2.6, 2.2, { from: 3000, to: 700, gain: 0.04, peak: 0.08, bus });
      // 4.2s →: angelic swell under the verse, distant bamboo chimes
      swell(t + 4.0, 6.6, { f: note(5), ratios: [1, 1.5, 2, 2.5, 3], gain: 0.03, fromHz: 600, toHz: 2400, peak: 0.35, bus });
      for (let i = 0; i < 9; i++) bamboo(note(10 + ((Math.random() * 7) | 0)), t + 4.4 + i * rnd(0.45, 0.75), { gain: rnd(0.02, 0.04), pan: rnd(-0.7, 0.7), bus });
    },
    rank() {
      const bus = scene(), t = T();
      rise(t, 1.6, { from: 44, to: 88, gain: 0.13, bus }); air(t, 1.7, { from: 150, to: 2400, gain: 0.07, dark: true, peak: 0.95, bus });
      shimmer(t + 0.5, 1.2, { dens: 24, lo: 12, hi: 20, rise: 1.3, shape: 'in', gain: 0.011, bus });
      chime(note(0), t + 1.65, { gain: 0.11, len: 7, bus }); chime(note(5), t + 1.67, { gain: 0.08, len: 6, bus });
      [12, 14, 15, 17].forEach((n, i) => chime(note(n), t + 1.8 + i * 0.22, { gain: 0.05, len: 4, pan: (i - 1.5) * 0.3, bus }));
      shimmer(t + 1.65, 2.6, { dens: 34, lo: 15, hi: 23, shape: 'out', gain: 0.018, bus }); swell(t + 1.5, 5, { f: note(0) * 2, gain: 0.028, peak: 0.3, bus });
    },
    levelup() {
      const bus = scene(), t = T();
      shimmer(t, 0.7, { dens: 30, lo: 18, hi: 23, shape: 'in', gain: 0.01, bus }); air(t, 0.75, { from: 2600, to: 900, gain: 0.04, peak: 0.9, bus }); // converge
      chime(note(12), t + 0.72, { gain: 0.08, len: 3.4, bus }); chime(note(15), t + 0.76, { gain: 0.05, len: 3, bus }); shimmer(t + 0.72, 1, { dens: 22, lo: 14, hi: 21, shape: 'out', gain: 0.012, bus }); // open
    },
    fail() { const bus = scene(), t = T(); air(t, 1.6, { from: 1200, to: 200, gain: 0.05, dark: true, peak: 0.2, bus }); chime(note(0), t + 0.1, { gain: 0.06, len: 3, soft: true, send: 0.4, bus }); chime(note(3), t + 0.5, { gain: 0.03, len: 2.4, soft: true, bus }); }
  };

  /* Linh khí ambience: wind breathing through bamboo, a chime now and then. */
  function ambientStart() {
    if (!ctx || ambNode) return; const g = ctx.createGain(), w = ctx.createGain(); g.connect(dry); w.connect(wet); g._w = w; g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(1, T(3));
    const n = ctx.createBufferSource(); n.buffer = brown; n.loop = true; const bp = ctx.createBiquadFilter(), ng = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.6; l.frequency.value = 0.07; lg.gain.value = 200; l.connect(lg).connect(bp.frequency); ng.gain.value = 0.035;
    n.connect(bp).connect(ng); out(ng, 0.3, g); n.start(); l.start();
    const tick = () => { if (!ambNode) return; if (!document.hidden) { const k = 1 + ((Math.random() * 3) | 0); for (let i = 0; i < k; i++) bamboo(note(10 + ((Math.random() * 8) | 0)), T(i * rnd(0.12, 0.35)), { gain: rnd(0.008, 0.02), pan: rnd(-0.8, 0.8), bus: g }); } ambNode.timer = setTimeout(tick, rnd(4000, 9000)); };
    ambNode = { g, n, l, timer: setTimeout(tick, 2500) };
  }
  function ambientStop() { if (!ambNode) return; const a = ambNode; ambNode = null; clearTimeout(a.timer); a.g.gain.cancelScheduledValues(T()); a.g.gain.setValueAtTime(a.g.gain.value, T()); a.g.gain.linearRampToValueAtTime(0.0001, T(1.2)); setTimeout(() => { try { a.n.stop(); a.l.stop(); a.g.disconnect(); a.g._w.disconnect(); } catch (e) {} }, 1400); }

  function play(name, o) {
    if (!on || !boot()) return;
    try {
      if (files[name]) { const bus = ['pass', 'full', 'rank', 'fail', 'levelup'].includes(name) ? scene() : null; const s = ctx.createBufferSource(); s.buffer = files[name]; const g = ctx.createGain(); g.gain.value = 0.9; s.connect(g).connect(bus || dry); s.start(); return; }
      cues[name] && cues[name](o);
    } catch (e) { console.warn('sound', e); }
  }
  function save(k, v) { try { localStorage.setItem(k, v ? 'on' : 'off'); } catch (e) {} }
  function setOn(v) { on = !!v; save(KEY, on); if (!on) { stop(0.2); ambientStop(); } else if (boot() && amb) ambientStart(); }
  function setAmbient(v) { amb = !!v; save(AKEY, amb); if (amb && on && boot()) ambientStart(); else ambientStop(); }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });
  CKL.sfx = { play, stop, setOn, setAmbient, get on() { return on; }, get ambient() { return amb; } };
})();
