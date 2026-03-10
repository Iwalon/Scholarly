// ─────────────────────────────────────────────────────────────────────
// LOCAL DEV SHIM — replaces window.storage (only available in claude.ai)
// ─────────────────────────────────────────────────────────────────────
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v ? { key, value: v } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, String(value));
      return { key, value };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    list: async (prefix = '') => ({
      keys: Object.keys(localStorage).filter(k => k.startsWith(prefix))
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────
// REACT HOOKS
// ─────────────────────────────────────────────────────────────────────
const { useState, useRef, useEffect } = React;

// ─────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────
const storage = window.storage;
const hashPw  = s => btoa(s + "_scholarly_salt");
const uid     = () => Math.random().toString(36).slice(2, 10);
const dateStr = (d = new Date()) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return dateStr(x); };
const today   = () => dateStr();

// Ebbinghaus forgetting curve intervals: review at 1, 3, 7, 14, 30 days
// 30 problems per lesson are spread across these intervals (6 per interval)
const FORGETTING_CURVE = [1, 3, 7, 14, 30];
function forgettingCurveDates(n = 30) {
  const dates = [];
  const perInterval = Math.ceil(n / FORGETTING_CURVE.length);
  FORGETTING_CURVE.forEach(days => {
    for (let i = 0; i < perInterval && dates.length < n; i++) {
      dates.push(addDays(today(), days));
    }
  });
  return dates;
}

async function storeGet(key, shared = false) {
  try { const r = await storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function storeSet(key, val, shared = false) {
  try { await storage.set(key, JSON.stringify(val), shared); } catch {}
}



// ─────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Source+Sans+3:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#141418;--paper:#f5f2ec;--cream:#ede8de;
  --gold:#c8861a;--gold-lt:#e8a832;--gold-pale:#fdf4e3;
  --pine:#1a5c4a;--pine-lt:#2a7a62;--pine-pale:#e3f4ee;
  --rust:#9e3a1a;--rust-pale:#fde8e0;
  --slate:#3a4a5c;--slate-pale:#e8edf4;
  --muted:#6a6560;--border:#d4cdc0;
  --serif:'Lora',Georgia,serif;--sans:'Source Sans 3',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --r:10px;--r-lg:18px;--s1:0 2px 8px rgba(20,20,24,.07);--s2:0 8px 28px rgba(20,20,24,.13)
}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.6}
.app{min-height:100vh;display:flex;flex-direction:column}

/* NAV */
.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:var(--ink);position:sticky;top:0;z-index:300;border-bottom:2px solid var(--gold);gap:10px;flex-wrap:wrap}
.logo{font-family:var(--serif);font-size:20px;color:var(--paper);display:flex;align-items:center;gap:8px}
.logo em{color:var(--gold);font-style:italic}
.nav-tabs{display:flex;gap:2px;flex-wrap:wrap}
.ntab{padding:6px 12px;border:none;background:transparent;color:rgba(245,242,236,.42);font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;border-radius:6px;transition:all .2s}
.ntab:hover{background:rgba(245,242,236,.08);color:var(--paper)}
.ntab.on{background:var(--gold);color:var(--ink);font-weight:600}
.nav-right{display:flex;align-items:center;gap:8px}
.timer-pill{font-family:var(--mono);font-size:11px;color:var(--gold);background:rgba(200,134,26,.13);padding:5px 11px;border-radius:20px;border:1px solid rgba(200,134,26,.28);display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
.t-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:blink 1.4s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.nav-user{display:flex;align-items:center;gap:7px;font-size:12px;color:rgba(245,242,236,.7);cursor:pointer}
.nav-avatar{width:28px;height:28px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:11px;color:var(--ink);font-weight:700}
.nav-badge{background:var(--pine);color:#fff;font-size:10px;font-family:var(--mono);padding:1px 6px;border-radius:10px;letter-spacing:.5px}

/* LAYOUT */
.page{flex:1;padding:32px 24px;max-width:920px;width:100%;margin:0 auto}
.page-wide{flex:1;padding:32px 24px;max-width:1060px;width:100%;margin:0 auto}
.page-full{flex:1;padding:32px 24px;width:100%;margin:0 auto}

/* TYPE */
.eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.display{font-family:var(--serif);font-size:46px;line-height:1.1;letter-spacing:-1px;margin-bottom:12px}
.display em{font-style:italic;color:var(--gold)}
.sec-h{font-family:var(--serif);font-size:23px;letter-spacing:-.3px;margin-bottom:6px}
.sec-sub{font-size:13px;color:var(--muted);line-height:1.65;margin-bottom:20px}
.divider{height:1.5px;background:var(--border);margin:24px 0}
.muted{color:var(--muted);font-size:13px}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:8px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:none;white-space:nowrap}
.btn-dark{background:var(--ink);color:var(--paper)}.btn-dark:hover{background:#222;transform:translateY(-1px);box-shadow:var(--s2)}
.btn-gold{background:var(--gold);color:#fff}.btn-gold:hover{background:var(--gold-lt);transform:translateY(-1px)}
.btn-pine{background:var(--pine);color:#fff}.btn-pine:hover{background:var(--pine-lt);transform:translateY(-1px)}
.btn-outline{background:transparent;color:var(--ink);border:1.5px solid var(--border)}.btn-outline:hover{border-color:var(--ink)}
.btn-rust{background:var(--rust);color:#fff}.btn-rust:hover{opacity:.88}
.btn-sm{padding:6px 12px;font-size:12px}.btn-lg{padding:13px 28px;font-size:15px}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
.btn-ghost{background:transparent;border:none;color:var(--muted);cursor:pointer;font-family:var(--sans);font-size:13px;padding:6px 10px;border-radius:6px}.btn-ghost:hover{background:var(--cream)}

/* INPUTS */
.inp{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--r);font-family:var(--sans);font-size:14px;background:#fff;color:var(--ink);outline:none;transition:border-color .2s}
.inp:focus{border-color:var(--gold)}
textarea.inp{resize:vertical;line-height:1.65}
.field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.field label{font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.3px}

/* TAGS */
.tag{display:inline-flex;align-items:center;font-family:var(--mono);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;padding:3px 9px;border-radius:5px;font-weight:500}
.tag-gold{background:var(--gold-pale);color:var(--gold)}.tag-pine{background:var(--pine-pale);color:var(--pine)}
.tag-rust{background:var(--rust-pale);color:var(--rust)}.tag-slate{background:var(--slate-pale);color:var(--slate)}

/* SPINNER */
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:14px}
.spinner{width:30px;height:30px;border:3px solid var(--cream);border-top-color:var(--gold);border-radius:50%;animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.loading-msg{font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;text-align:center}
.loading-sub{font-size:13px;color:var(--muted);text-align:center;max-width:360px;line-height:1.65}

/* ══ AUTH ══ */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ink);padding:20px}
.auth-card{background:var(--paper);border-radius:var(--r-lg);padding:40px 36px;max-width:420px;width:100%;box-shadow:0 24px 72px rgba(0,0,0,.4)}
.auth-logo{font-family:var(--serif);font-size:26px;text-align:center;margin-bottom:24px}
.auth-logo em{color:var(--gold);font-style:italic}
.auth-tabs{display:flex;background:var(--cream);border-radius:var(--r);padding:3px;margin-bottom:24px}
.auth-tab{flex:1;padding:8px;border:none;background:transparent;border-radius:8px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;color:var(--muted)}
.auth-tab.on{background:#fff;color:var(--ink);box-shadow:var(--s1)}
.auth-divider{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--muted);font-size:12px}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--border)}
.auth-err{background:var(--rust-pale);border:1px solid rgba(158,58,26,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--rust);margin-bottom:12px}
.auth-link{color:var(--gold);cursor:pointer;font-size:13px;text-align:center;display:block;margin-top:14px}
.auth-link:hover{text-decoration:underline}

/* ══ PLANS / PAYMENT ══ */
.plans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin:20px 0}
.plan-card{background:#fff;border:2px solid var(--border);border-radius:var(--r-lg);padding:24px;position:relative;transition:all .2s}
.plan-card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:var(--s2)}
.plan-card.popular{border-color:var(--gold)}
.plan-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:1px;padding:3px 12px;border-radius:20px;white-space:nowrap}
.plan-name{font-family:var(--serif);font-size:20px;font-weight:700;margin-bottom:6px}
.plan-price{font-family:var(--serif);font-size:36px;font-weight:700;color:var(--gold);line-height:1;margin-bottom:4px}
.plan-price span{font-size:14px;color:var(--muted);font-family:var(--sans);font-weight:400}
.plan-desc{font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.55}
.plan-feats{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:18px}
.plan-feats li{font-size:13px;display:flex;gap:8px;align-items:flex-start;line-height:1.45}
.plan-feats li::before{content:'✓';color:var(--pine);font-weight:700;flex-shrink:0}
.pay-wrap{max-width:480px;margin:0 auto}
.pay-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:24px;margin-top:16px}
.pay-row{display:flex;gap:12px}
.pay-row .field{flex:1}
.pay-secure{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-top:10px}

/* ══ SUBJECT TREE MODAL ══ */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:400;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto}
.tree-modal{background:var(--paper);border-radius:var(--r-lg);width:100%;max-width:900px;box-shadow:0 32px 80px rgba(0,0,0,.4);overflow:hidden}
.tree-modal-hdr{background:var(--ink);padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--gold)}
.tree-modal-title{font-family:var(--serif);font-size:22px;color:var(--paper)}
.tree-modal-title em{color:var(--gold);font-style:italic}
.tree-modal-body{padding:24px;overflow-x:auto}
.tree-legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px;font-size:12px;font-family:var(--mono)}
.tree-legend-item{display:flex;align-items:center;gap:5px}
.tl-dot{width:10px;height:10px;border-radius:50%}
/* SVG tree styles injected via dangerouslySetInnerHTML */
.tree-actions{padding:16px 24px;border-top:1.5px solid var(--border);display:flex;gap:10px;flex-wrap:wrap}

/* ══ SUBJECTS ══ */
.subj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-bottom:20px}
.subj-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r);padding:15px;cursor:pointer;transition:all .2s;position:relative}
.subj-card:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:var(--s1)}
.subj-card.sel{border-color:var(--gold);background:var(--gold-pale)}
.subj-card-inner{text-align:center}
.si{font-size:26px;margin-bottom:7px}
.sn{font-family:var(--serif);font-size:13px;font-weight:600}
.sl{font-size:10px;color:var(--muted);margin-top:2px;font-family:var(--mono)}
.subj-tree-btn{position:absolute;top:6px;right:6px;background:var(--gold-pale);border:none;border-radius:5px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;color:var(--gold);opacity:0;transition:opacity .2s}
.subj-card:hover .subj-tree-btn{opacity:1}


/* ══ AI VIDEO PLAYER (slide presentation) ══ */
.aivid-modal{background:#fff;border-radius:var(--r-lg);width:100%;max-width:820px;box-shadow:0 32px 80px rgba(0,0,0,.5);overflow:hidden}
.aivid-hdr{background:var(--ink);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--gold)}
.aivid-hdr h3{font-family:var(--serif);font-size:17px;color:var(--paper)}
.aivid-slide{min-height:380px;padding:32px 36px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}
.aivid-slide.style-dark{background:var(--ink);color:var(--paper)}
.aivid-slide.style-gold{background:var(--gold-pale);border-bottom:2px solid var(--gold)}
.aivid-slide.style-pine{background:var(--pine-pale);border-bottom:2px solid var(--pine)}
.aivid-slide.style-light{background:#fff}
.aivid-slide-num{font-family:var(--mono);font-size:10px;letter-spacing:2px;opacity:.5;margin-bottom:12px;text-transform:uppercase}
.aivid-slide-title{font-family:var(--serif);font-size:28px;line-height:1.2;margin-bottom:14px;letter-spacing:-.3px}
.aivid-slide.style-dark .aivid-slide-title{color:var(--paper)}
.aivid-narration{font-size:15px;line-height:1.85;max-width:680px}
.aivid-slide.style-dark .aivid-narration{color:rgba(245,242,236,.85)}
.aivid-visual{margin-top:16px;overflow-x:auto}
.aivid-progress{height:4px;background:var(--cream);position:relative}
.aivid-progress-bar{height:100%;background:var(--gold);transition:width .4s}
.aivid-controls{padding:13px 20px;display:flex;align-items:center;gap:10px;border-top:1.5px solid var(--border);background:#fff}
.aivid-slide-dots{display:flex;gap:5px;flex:1;justify-content:center;flex-wrap:wrap}
.aivid-dot{width:8px;height:8px;border-radius:50%;background:var(--border);cursor:pointer;transition:all .2s}
.aivid-dot.on{background:var(--gold);transform:scale(1.3)}
.aivid-loading{min-height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--ink)}
.aivid-loading .spinner{border-top-color:var(--gold)}
.aivid-loading p{color:rgba(245,242,236,.6);font-family:var(--mono);font-size:11px;letter-spacing:2px;text-transform:uppercase}

/* ══ DIAGNOSTIC ══ */
.diag-wrap{max-width:700px;margin:0 auto}
.diag-prog{display:flex;gap:5px;margin-bottom:20px}
.dp-seg{flex:1;height:4px;border-radius:2px;background:var(--cream)}
.dp-seg.done{background:var(--pine)}.dp-seg.act{background:var(--gold)}
.q-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:22px}
.q-num{font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;margin-bottom:8px}
.q-text{font-family:var(--serif);font-size:17px;line-height:1.5;margin-bottom:14px}
.q-opts{display:flex;flex-direction:column;gap:6px}
.q-opt{padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;transition:all .15s;font-size:14px;display:flex;gap:10px;align-items:flex-start;background:#fff;text-align:left;width:100%;font-family:var(--sans);color:var(--ink)}
.q-opt:hover{border-color:var(--gold);background:var(--gold-pale)}
.q-opt.chosen{border-color:var(--gold);background:var(--gold-pale)}
.q-opt.correct{border-color:var(--pine)!important;background:var(--pine-pale)!important}
.q-opt.wrong{border-color:var(--rust)!important;background:var(--rust-pale)!important}
.opt-lbl{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);min-width:14px;margin-top:1px;flex-shrink:0}
.score-card{background:#fff;border:2px solid var(--gold);border-radius:var(--r-lg);padding:26px;text-align:center}
.score-big{font-family:var(--serif);font-size:52px;color:var(--gold);line-height:1;margin:6px 0}
.score-dots{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0}
.sdot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff}
.sdot-p{background:var(--pine)}.sdot-f{background:var(--rust)}.sdot-s{background:var(--slate)}

/* ══ ROADMAP ══ */
.rm-outer{display:flex;flex-direction:column}
.rm-phase{position:relative}
.rm-phase::before{content:'';position:absolute;left:19px;top:44px;bottom:0;width:2px;background:var(--border)}
.rm-phase:last-child::before{display:none}
.ph-hdr{display:flex;align-items:center;gap:12px;padding:4px 0 10px}
.ph-num{width:38px;height:38px;border-radius:50%;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:11px;font-weight:700;flex-shrink:0;z-index:1;position:relative;border:3px solid var(--paper);box-shadow:var(--s1)}
.ph-num.done{background:var(--pine)}.ph-num.curr{background:var(--gold);color:var(--ink)}.ph-num.lk{background:var(--cream);color:var(--muted)}
.ph-title{font-family:var(--serif);font-size:15px;font-weight:700}
.ph-meta{font-size:11px;color:var(--muted);font-family:var(--mono)}
.lessons-list{margin-left:52px;margin-bottom:16px;display:flex;flex-direction:column;gap:5px}
.lr{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#fff;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;transition:all .15s;font-size:13px}
.lr:hover:not(.lr-lk){border-color:var(--gold);background:var(--gold-pale)}
.lr.lr-mast{border-color:var(--pine);background:var(--pine-pale)}
.lr.lr-skip{border-color:var(--slate);background:var(--slate-pale)}
.lr.lr-act{border-color:var(--gold);background:var(--gold-pale)}
.lr.lr-lk{opacity:.35;cursor:not-allowed}
.l-dot{width:7px;height:7px;border-radius:50%;background:var(--border);flex-shrink:0}
.l-dot.done{background:var(--pine)}.l-dot.skip{background:var(--slate)}.l-dot.act{background:var(--gold)}
.l-name{flex:1;font-weight:500}
.lb{font-family:var(--mono);font-size:9px;letter-spacing:.7px;padding:2px 7px;border-radius:4px;text-transform:uppercase;flex-shrink:0}
.lb-m{background:var(--pine-pale);color:var(--pine)}.lb-s{background:var(--slate-pale);color:var(--slate)}.lb-a{background:var(--gold-pale);color:var(--gold)}.lb-lk{background:var(--cream);color:var(--muted)}

/* ══ LESSON ══ */
.lesson-view{display:flex;flex-direction:column;gap:20px}
.lesson-hdr{padding-bottom:14px;border-bottom:1.5px solid var(--border)}
.lesson-title{font-family:var(--serif);font-size:30px;letter-spacing:-.5px;line-height:1.15;margin-top:8px}
.lbody{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);padding:26px 30px;font-size:15px;color:#252525;line-height:1.9}
.lbody>*+*{margin-top:13px}
.lbody h3{font-family:var(--serif);font-size:18px;color:var(--ink);letter-spacing:-.2px;margin-top:26px!important;margin-bottom:0}
.lbody h3:first-child{margin-top:0!important}
.lbody p{margin:0}
.lbody ul,.lbody ol{padding-left:22px}
.lbody li{margin-bottom:5px;line-height:1.75}
.hl-block{background:var(--gold-pale);border-left:3px solid var(--gold);padding:11px 15px;border-radius:0 8px 8px 0;font-size:14px}
.concept-block{background:var(--pine-pale);border:1.5px solid rgba(26,92,74,.2);border-radius:9px;padding:13px 17px;font-size:14px}
.concept-block .cb-lbl{color:var(--pine);font-size:10px;font-family:var(--mono);letter-spacing:1.5px;display:block;margin-bottom:6px;text-transform:uppercase;font-weight:700}
.examtip-block{background:var(--slate-pale);border-left:3px solid var(--slate);padding:11px 15px;border-radius:0 8px 8px 0;font-size:14px}
.examtip-block .et-lbl{font-family:var(--mono);font-size:10px;letter-spacing:1px;color:var(--slate);font-weight:700;display:block;margin-bottom:5px;text-transform:uppercase}
.math-display{background:var(--cream);border-radius:8px;padding:13px 16px;text-align:center;overflow-x:auto}
.math-inline{display:inline}
.svg-block{border:1.5px solid var(--border);border-radius:10px;background:#f8fffe;padding:10px;text-align:center;overflow:auto}
.svg-block svg{max-width:100%;height:auto}
.err-box{background:var(--rust-pale);border:1.5px solid rgba(158,58,26,.25);border-radius:9px;padding:11px 15px;font-size:14px;color:var(--rust)}
.skip-banner{background:var(--slate-pale);border:1.5px solid rgba(58,74,92,.2);border-radius:9px;padding:12px 16px;font-size:13px;color:var(--slate);margin:10px 0}
.skip-banner strong{font-family:var(--serif);font-size:15px;display:block;margin-bottom:2px}
.break-bar{background:var(--pine);color:#fff;padding:9px 24px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:13px;font-weight:500}
.break-bar strong{font-family:var(--mono);font-size:14px}

/* ══ WHITEBOARD ══ */
.wb-outer{border:2px solid var(--border);border-radius:var(--r-lg);overflow:hidden;background:#fff}
.wb-toolbar{background:var(--ink);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px}
.wb-title{color:var(--paper);font-family:var(--serif);font-size:15px}
.wb-tools{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.wbt{width:28px;height:28px;border:1.5px solid rgba(245,242,236,.18);background:transparent;color:rgba(245,242,236,.6);border-radius:6px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.wbt:hover,.wbt.on{border-color:var(--gold);color:var(--gold);background:rgba(200,134,26,.15)}
.wb-swatch{width:16px;height:16px;border-radius:50%;cursor:pointer;border:2px solid transparent;flex-shrink:0}
.wb-swatch.on{border-color:#fff;transform:scale(1.2)}
.wb-sep{width:1px;height:18px;background:rgba(245,242,236,.14);margin:0 2px}
.wb-prompt-box{padding:12px 16px;background:var(--gold-pale);border-top:1.5px solid rgba(200,134,26,.2)}
.wb-prompt-box .wbp-lbl{font-family:var(--serif);font-size:14px;color:var(--gold);display:block;margin-bottom:3px;font-weight:600}
.wb-prompt-box p{font-size:13px;color:var(--ink)}
.wb-paper{position:relative;min-height:300px;background:#fafafa;cursor:crosshair}
.wb-paper canvas{position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;touch-action:none}
.wb-notes-layer{position:relative;z-index:1;min-height:300px;padding:16px 20px;display:flex;flex-direction:column;gap:9px;pointer-events:none}
.wbn-empty{color:var(--muted);font-style:italic;font-size:13px;padding:40px 0;text-align:center;pointer-events:none;user-select:none}
.wbn-el{animation:nb-in .3s ease;pointer-events:none}
@keyframes nb-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.wbn-heading{font-family:var(--serif);font-size:20px;font-weight:700;border-bottom:2px solid var(--border);padding-bottom:5px}
.wbn-subheading{font-family:var(--serif);font-size:16px;font-weight:600}
.wbn-text{font-size:14px;line-height:1.8;color:#252525}
.wbn-math{background:var(--cream);border-radius:8px;padding:11px 15px;text-align:center;overflow-x:auto}
.wbn-bullet ul{padding-left:20px}
.wbn-bullet li{font-size:13px;line-height:1.75;margin-bottom:3px;list-style:disc}
.wbn-shape{background:var(--pine-pale);border:1.5px solid rgba(26,92,74,.18);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--pine);font-family:var(--mono)}
.wbn-divider{height:1.5px;background:var(--border)}
.wb-recognizing{position:absolute;inset:0;z-index:3;background:rgba(253,244,227,.55);display:flex;align-items:center;justify-content:center;gap:10px;font-family:var(--mono);font-size:11px;color:var(--gold);letter-spacing:1.5px;pointer-events:none;backdrop-filter:blur(1px)}
.wb-recog-spinner{width:18px;height:18px;border:2.5px solid rgba(200,134,26,.3);border-top-color:var(--gold);border-radius:50%;animation:spin .6s linear infinite}
.wb-status{padding:7px 16px;background:#f0f0f0;border-top:1px solid var(--border);font-size:11px;font-family:var(--mono);color:var(--muted);display:flex;align-items:center;gap:7px;min-height:32px}
.ws-dot{width:6px;height:6px;border-radius:50%;background:var(--muted);flex-shrink:0}
.ws-dot.drawing{background:var(--gold);animation:blink 1s infinite}.ws-dot.done{background:var(--pine)}
.wb-footer{padding:11px 16px;display:flex;gap:8px;align-items:center;border-top:1.5px solid var(--border);flex-wrap:wrap}
.wb-hint{font-size:11px;color:var(--muted);margin-left:auto;text-align:right;line-height:1.4}

/* ══ MASTERY RESULT ══ */
.mr{border-radius:var(--r-lg);padding:22px}
.mr-pass{background:var(--pine-pale);border:2px solid rgba(26,92,74,.24)}
.mr-fail{background:var(--rust-pale);border:2px solid rgba(158,58,26,.2)}
.mr h3{font-family:var(--serif);font-size:20px;margin-bottom:8px}
.mr-pass h3{color:var(--pine)}.mr-fail h3{color:var(--rust)}
.mr-pill{display:inline-flex;align-items:center;font-family:var(--mono);font-size:11px;padding:4px 12px;border-radius:6px;margin-bottom:11px}
.mrp-pass{background:var(--pine);color:#fff}.mrp-fail{background:var(--rust);color:#fff}
.mr-feedback{font-size:14px;line-height:1.85;color:#252525;margin-bottom:11px}
.mr-reflect{background:rgba(0,0,0,.04);padding:11px 15px;border-radius:8px;font-size:13px;font-style:italic;line-height:1.65}
.ep{margin-top:11px;background:#fff;border:2px solid var(--pine);border-radius:var(--r-lg);overflow:hidden}
.ep-hdr{background:var(--pine);color:#fff;padding:9px 16px;font-family:var(--serif);font-size:14px}
.ep-body{padding:14px;display:flex;gap:14px;flex-wrap:wrap}
.ep-col{flex:1;min-width:220px}
.ep-lbl{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.ep-svg-wrap{border:1.5px solid var(--border);border-radius:8px;background:#f6fff8;padding:7px;overflow:auto}
.ep-svg-wrap svg{max-width:100%;height:auto}

/* ══ WORKBOOK ══ */
.wb-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:20px}
.wb-stats{display:flex;gap:12px;flex-wrap:wrap}
.wb-stat{background:#fff;border:1.5px solid var(--border);border-radius:var(--r);padding:12px 16px;text-align:center;min-width:90px}
.wb-stat-n{font-family:var(--serif);font-size:26px;font-weight:700;color:var(--gold);line-height:1}
.wb-stat-l{font-size:11px;color:var(--muted);font-family:var(--mono);letter-spacing:.5px;margin-top:3px}
.problems-list{display:flex;flex-direction:column;gap:10px}
.prob-card{background:#fff;border:1.5px solid var(--border);border-radius:var(--r-lg);overflow:hidden;transition:all .2s}
.prob-card.due{border-color:var(--gold)}
.prob-card.overdue{border-color:var(--rust)}
.prob-card.upcoming{opacity:.75}
.prob-card.done{border-color:var(--pine);background:var(--pine-pale)}
.prob-hdr{padding:13px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
.prob-num{font-family:var(--mono);font-size:11px;color:var(--muted);min-width:28px}
.prob-title{font-family:var(--serif);font-size:15px;font-weight:600;flex:1}
.prob-meta{display:flex;align-items:center;gap:7px;flex-shrink:0}
.prob-due{font-family:var(--mono);font-size:10px;padding:2px 8px;border-radius:4px;letter-spacing:.5px}
.pd-due{background:var(--gold-pale);color:var(--gold)}
.pd-over{background:var(--rust-pale);color:var(--rust)}
.pd-soon{background:var(--slate-pale);color:var(--slate)}
.pd-done{background:var(--pine-pale);color:var(--pine)}
.prob-body{padding:0 16px 15px}
.prob-question{font-size:14px;line-height:1.8;margin-bottom:12px;color:#252525}
.prob-answer-wrap{background:var(--cream);border-radius:8px;padding:12px 15px;font-size:13px;line-height:1.65;color:#333}
.prob-answer-lbl{font-family:var(--mono);font-size:10px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;display:block}
.wb-sections{display:flex;flex-direction:column;gap:22px}
.wb-section-title{font-family:var(--serif);font-size:17px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.wb-empty{text-align:center;padding:40px;color:var(--muted);font-size:14px}
.wb-gen-btn{margin-top:12px}

/* TECHNIQUES */
.tech-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-bottom:32px}
.tc{background:#fff;border:1.5px solid var(--border);border-radius:var(--r);padding:16px;transition:all .2s}
.tc:hover{border-color:var(--gold);transform:translateY(-2px);box-shadow:var(--s1)}
.tc-i{font-size:20px;margin-bottom:7px}.tc-n{font-family:var(--serif);font-size:14px;font-weight:700;margin-bottom:4px}
.tc-d{font-size:12px;color:var(--muted);line-height:1.6;margin-top:6px}.tc-s{font-family:var(--mono);font-size:10px;color:var(--gold);margin-top:5px}

/* UTILS */
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:8px}
.mt1{margin-top:5px}.mt2{margin-top:11px}.mt3{margin-top:18px}.mt4{margin-top:24px}
.mb1{margin-bottom:5px}.mb2{margin-bottom:11px}.mb3{margin-bottom:16px}
.center{text-align:center}
.katex-display{overflow-x:auto;padding:3px 0;margin:0!important}
`;

// ─────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  {id:"apcalc",  name:"AP Calculus AB/BC",icon:"∫",  level:"HS → College"},
  {id:"physics", name:"Physics",           icon:"⚛️",level:"Beginner → Expert"},
  {id:"biology", name:"Biology",           icon:"🧬",level:"Beginner → Expert"},
  {id:"chem",    name:"Chemistry",         icon:"⚗️",level:"Beginner → Expert"},
  {id:"stats",   name:"Statistics",        icon:"📊",level:"Beginner → Expert"},
  {id:"cs",      name:"Computer Science",  icon:"💻",level:"Beginner → Expert"},
  {id:"history", name:"History",           icon:"📜",level:"Beginner → Expert"},
  {id:"econ",    name:"Economics",         icon:"📈",level:"Beginner → Expert"},
  {id:"linear",  name:"Linear Algebra",    icon:"⊞", level:"HS → College"},
  {id:"astro",   name:"Astronomy",         icon:"🔭",level:"Beginner → Expert"},
  {id:"orgo",    name:"Organic Chem",      icon:"🔬",level:"College"},
  {id:"micro",   name:"Microeconomics",    icon:"🏪",level:"HS → College"},
];

// ─────────────────────────────────────────────────────────────────────
// OPENSTAX CURRICULUM REQUIREMENTS
// Maps each subject to its OpenStax textbook + required problem types
// per topic cluster. The workbook engine uses these to generate
// problems that match the style, depth, and notation of the real textbook.
// ─────────────────────────────────────────────────────────────────────
const OPENSTAX = {
  apcalc: {
    textbook: "OpenStax Calculus Volume 1 (Herman & Strang, 2016)",
    isbn: "978-1-938168-02-4",
    problemTypes: [
      "Limit evaluation using algebraic manipulation and L'Hôpital's Rule",
      "Epsilon-delta proofs of limits",
      "Derivative from the limit definition (difference quotient)",
      "Chain rule, product rule, quotient rule application",
      "Implicit differentiation with related rates",
      "Optimization problems (find absolute/local extrema with justification)",
      "Riemann sum setup and evaluation (left, right, midpoint)",
      "Definite integral evaluation using FTC Part 1 & 2",
      "u-substitution and integration by parts",
      "Differential equation separation of variables with initial conditions",
      "Slope field sketching and solution curve analysis",
    ],
    chapterMap: {
      "Limits & Continuity": "Ch 2 (Limits) — §2.1–2.5",
      "Derivatives": "Ch 3 (Derivatives) — §3.1–3.9",
      "Applications of Derivatives": "Ch 4 (Applications) — §4.1–4.8",
      "Integration": "Ch 5 (Integration) — §5.1–5.7",
      "Differential Equations": "Ch 4 §4.8 + Ch 5 §5.6",
    },
    style: "Show all algebraic steps. Box final answers. Use Leibniz notation for derivatives. Label axes on any graph.",
  },
  physics: {
    textbook: "OpenStax University Physics Volume 1 (Ling, Sanny & Moebs, 2016)",
    isbn: "978-1-938168-27-7",
    problemTypes: [
      "Kinematics: derive position/velocity/acceleration from equations of motion",
      "Newton's laws: free-body diagrams with net force equations",
      "Work-energy theorem: calculate work done and kinetic energy changes",
      "Conservation of momentum: collisions (elastic & inelastic)",
      "Rotational kinematics: torque, angular momentum, moment of inertia",
      "Simple harmonic motion: period, frequency, amplitude equations",
      "Fluid statics: pressure, buoyancy, Archimedes' principle",
      "Thermodynamics: heat transfer, first law, PV diagrams",
      "Waves: wavelength, frequency, superposition problems",
    ],
    chapterMap: {
      "Kinematics": "Ch 3–4 (Motion in 1D/2D)",
      "Forces": "Ch 5–6 (Newton's Laws)",
      "Energy": "Ch 7–8 (Work, Energy, Conservation)",
      "Momentum": "Ch 9 (Linear Momentum)",
      "Rotation": "Ch 10–11 (Rotational Motion)",
      "Waves": "Ch 16–17 (Oscillations & Waves)",
    },
    style: "Draw and label free-body diagrams. Show unit conversions. Use SI units throughout. State the law/principle used.",
  },
  biology: {
    textbook: "OpenStax Biology 2e (Clark, Douglas & Choi, 2018)",
    isbn: "978-1-947172-52-4",
    problemTypes: [
      "Cell structure: match organelle to function with justification",
      "Mitosis vs meiosis: compare stages and outcomes (diploid/haploid)",
      "Mendelian genetics: Punnett square with phenotype/genotype ratios",
      "DNA replication: sequence of events and enzyme roles",
      "Transcription & translation: base-pair a given DNA sequence through to protein",
      "Photosynthesis: light-dependent vs light-independent reactions (inputs/outputs)",
      "Cellular respiration: ATP yield, location of each stage (glycolysis/Krebs/ETC)",
      "Natural selection: apply Hardy-Weinberg to a given scenario",
      "Ecology: calculate population growth rate (r) and carrying capacity",
    ],
    chapterMap: {
      "Cell Biology": "Ch 4–5 (Cell Structure & Membranes)",
      "Genetics": "Ch 12–15 (Cell Division & Mendelian Genetics)",
      "Molecular Biology": "Ch 14–16 (DNA, RNA, Protein Synthesis)",
      "Evolution": "Ch 18–20 (Evolution & Systematics)",
      "Ecology": "Ch 44–47 (Ecology)",
    },
    style: "Diagrams required for cell/process questions. Show Punnett squares completely. Cite the specific biological process by name.",
  },
  chem: {
    textbook: "OpenStax Chemistry 2e (Flowers, Theopold & Langley, 2019)",
    isbn: "978-1-947172-61-6",
    problemTypes: [
      "Stoichiometry: mole-to-mole and mass-to-mass conversions with limiting reagent",
      "Gas laws: PV=nRT, combined gas law, Dalton's Law of partial pressures",
      "Thermochemistry: Hess's Law, ΔH calculations, calorimetry",
      "Electron configuration and periodic trends",
      "Acid-base equilibrium: Ka/Kb, pH/pOH, buffer calculations",
      "Equilibrium: write Keq expression, ICE table, Le Chatelier's principle",
      "Redox & electrochemistry: balance half-reactions, calculate cell potential E°",
      "Nuclear chemistry: write nuclear equations, half-life calculations",
    ],
    chapterMap: {
      "Stoichiometry": "Ch 4 (Stoichiometry of Chemical Reactions)",
      "Thermodynamics": "Ch 5 (Thermochemistry) + Ch 16 (Thermodynamics)",
      "Equilibrium": "Ch 13 (Fundamental Equilibrium Concepts)",
      "Acids & Bases": "Ch 14–15 (Acid-Base Equilibria & Buffers)",
      "Electrochemistry": "Ch 17 (Electrochemistry)",
    },
    style: "Balance all equations. Show dimensional analysis for unit conversions. Include phase notation (s/l/g/aq) in equations.",
  },
  stats: {
    textbook: "OpenStax Introductory Statistics (Illowsky & Dean, 2013)",
    isbn: "978-1-938168-20-8",
    problemTypes: [
      "Descriptive statistics: calculate mean, median, mode, standard deviation from a dataset",
      "Probability: apply addition rule, multiplication rule, conditional probability",
      "Normal distribution: find z-scores and probabilities using standard tables",
      "Confidence intervals: construct CI for population mean/proportion, interpret margin of error",
      "Hypothesis testing: state H0/Ha, find test statistic, p-value, draw conclusion",
      "Chi-square test: goodness-of-fit and test of independence with contingency tables",
      "Linear regression: find least-squares line, interpret slope and r²",
      "ANOVA: one-way analysis of variance setup and interpretation",
    ],
    chapterMap: {
      "Descriptive Statistics": "Ch 2–3 (Descriptive Statistics & Probability Topics)",
      "Probability": "Ch 3–4 (Probability Topics & Discrete Random Variables)",
      "Distributions": "Ch 6–7 (Normal & Central Limit Theorem)",
      "Inference": "Ch 8–10 (Confidence Intervals & Hypothesis Testing)",
      "Regression": "Ch 12–13 (Linear Regression & ANOVA)",
    },
    style: "Always state distribution used. Show calculator input (normalcdf, invNorm, etc.). Include a sketch of the distribution for all probability/CI problems.",
  },
  econ: {
    textbook: "OpenStax Principles of Economics 3e (Greenlaw & Shapiro, 2017)",
    isbn: "978-1-947172-36-4",
    problemTypes: [
      "Supply & demand: draw shifts, identify new equilibrium price and quantity",
      "Price elasticity: calculate PED, interpret elastic vs inelastic, total revenue test",
      "Consumer theory: budget constraint, indifference curves, utility maximization",
      "Production & costs: calculate TC, VC, FC, MC, ATC; find profit-maximizing output",
      "Market structures: compare perfect competition, monopoly, oligopoly outcomes",
      "GDP calculation: expenditure approach (C+I+G+NX)",
      "Money & banking: money multiplier, Fed policy tools",
      "International trade: comparative advantage, gains from trade calculation",
    ],
    chapterMap: {
      "Supply & Demand": "Ch 3–4 (Supply, Demand & Equilibrium)",
      "Elasticity": "Ch 5 (Elasticity)",
      "Production": "Ch 7–8 (Cost & Production)",
      "Market Structures": "Ch 9–11 (Perfect Competition to Monopoly)",
      "Macroeconomics": "Ch 19–26 (GDP, Unemployment, Inflation, Monetary Policy)",
    },
    style: "Draw fully labeled supply/demand diagrams for all market problems. Show all calculation steps. Identify the market structure explicitly.",
  },
  micro: {
    textbook: "OpenStax Principles of Microeconomics 3e (Greenlaw & Shapiro, 2017)",
    isbn: "978-1-947172-34-0",
    problemTypes: [
      "Supply & demand equilibrium and shifts with diagram",
      "Price elasticity: PED, PES, cross-price, income elasticity calculations",
      "Consumer surplus and producer surplus: calculate from diagram",
      "Production function: TP, MP, AP with diminishing marginal returns",
      "Cost curves: MC=MR profit maximization, shutdown condition",
      "Monopoly: find MR, deadweight loss, compare to competitive outcome",
      "Game theory: dominant strategy, Nash equilibrium in payoff matrix",
      "Externalities: Coase theorem, Pigouvian tax/subsidy calculation",
    ],
    chapterMap: {
      "Markets": "Ch 3–5 (Markets, Equilibrium & Elasticity)",
      "Consumer Theory": "Ch 6 (Consumer Choices)",
      "Production": "Ch 7–8 (Production, Costs & Profit)",
      "Market Power": "Ch 9–11 (Monopoly & Oligopoly)",
      "Market Failures": "Ch 12–13 (Externalities & Public Goods)",
    },
    style: "Draw supply/demand or cost curves for every relevant problem. Calculate consumer/producer surplus as triangles. Label all intercepts.",
  },
  linear: {
    textbook: "Linear Algebra and its Applications — Gilbert Strang (widely open-access)",
    problemTypes: [
      "Matrix multiplication, transpose, inverse by row reduction (Gaussian elimination)",
      "Solving Ax=b: row echelon form, particular + null space solutions",
      "Determinants: cofactor expansion, properties, geometric interpretation",
      "Eigenvalues and eigenvectors: characteristic polynomial, diagonalization",
      "Vector spaces: span, linear independence, basis, dimension",
      "Orthogonality: dot product, Gram-Schmidt, QR decomposition",
      "Least squares: normal equation (AᵀA)x = Aᵀb for overdetermined systems",
      "Singular value decomposition: interpret U, Σ, V",
    ],
    chapterMap: {
      "Systems of Equations": "Ch 1 (Matrices, Vectors & Systems)",
      "Matrix Operations": "Ch 2 (Matrix Algebra)",
      "Determinants": "Ch 3 (Determinants)",
      "Vector Spaces": "Ch 4 (Vector Spaces)",
      "Eigenvalues": "Ch 5 (Eigenvalues & Eigenvectors)",
      "Orthogonality": "Ch 6 (Orthogonality)",
    },
    style: "Show all row operations explicitly with R notation. Box pivot positions. Verify solutions by substitution where reasonable.",
  },
  astro: {
    textbook: "OpenStax Astronomy 2e (Fraknoi, Morrison & Wolff, 2022)",
    isbn: "978-1-951693-50-3",
    problemTypes: [
      "Kepler's laws: calculate orbital period from semi-major axis (P²=a³)",
      "Inverse square law: calculate flux/intensity at different distances",
      "Stellar classification: place a star on HR diagram from given L and T",
      "Blackbody radiation: Wien's law for peak wavelength, Stefan-Boltzmann for luminosity",
      "Doppler shift: calculate recession velocity from spectral line shift",
      "Parallax: calculate distance in parsecs from measured parallax angle",
      "Hubble's Law: calculate recession velocity or distance from v=H₀d",
      "Nuclear fusion: proton-proton chain energy balance",
    ],
    chapterMap: {
      "Solar System": "Ch 7–12 (Planets, Moons & Formation)",
      "Stars": "Ch 17–22 (Stellar Properties, Evolution)",
      "Galaxies": "Ch 25–27 (Milky Way & External Galaxies)",
      "Cosmology": "Ch 29–30 (Big Bang, Dark Matter & Energy)",
    },
    style: "Always include units (AU, ly, pc, M☉, L☉). Use scientific notation. Show dimensional analysis for all calculations.",
  },
  orgo: {
    textbook: "OpenStax Organic Chemistry (Smith, 2023 — open-access edition)",
    problemTypes: [
      "IUPAC nomenclature: name or draw structure from name (functional group priority)",
      "Stereochemistry: assign R/S configuration, draw enantiomers/diastereomers",
      "SN1 vs SN2: predict mechanism from substrate, nucleophile strength & solvent",
      "E1 vs E2: predict product regiochemistry (Zaitsev vs Hofmann) and stereochemistry",
      "Addition reactions: electrophilic addition to alkenes (Markovnikov, anti-Markovnikov)",
      "Aromatic substitution: EAS directing effects, predict major product",
      "Carbonyl chemistry: nucleophilic addition, aldol condensation mechanism",
      "Spectroscopy: interpret ¹H-NMR chemical shifts and splitting patterns",
    ],
    chapterMap: {
      "Structure & Bonding": "Ch 1–2 (Structure, Bonding & Acids/Bases)",
      "Stereochemistry": "Ch 5 (Stereochemistry at Tetrahedral Centers)",
      "Substitution/Elimination": "Ch 7–9 (SN1, SN2, E1, E2)",
      "Addition Reactions": "Ch 6 + Ch 11–12 (Alkenes & Alkynes)",
      "Carbonyls": "Ch 18–22 (Aldehydes, Ketones, Carboxylic Acids)",
    },
    style: "Draw full arrow-pushing mechanisms. Show all stereochemistry with wedge-dash bonds. Name all intermediates and transition states.",
  },
  cs: {
    textbook: "OpenStax Introduction to Computer Science (custom) + Think Python 2e (Downey, open-access)",
    problemTypes: [
      "Algorithm analysis: determine Big-O time and space complexity with justification",
      "Data structures: implement or trace through stack/queue/linked list/tree operations",
      "Sorting algorithms: trace bubble sort, merge sort, quicksort — count comparisons",
      "Graph algorithms: BFS/DFS traversal order, Dijkstra's shortest path trace",
      "Recursion: write recursive function with base case, trace call stack",
      "OOP design: design a class hierarchy for a given scenario with methods/attributes",
      "Boolean logic & gates: simplify boolean expression with De Morgan's laws",
      "Database queries: write SQL SELECT with JOIN, WHERE, GROUP BY, HAVING",
    ],
    chapterMap: {
      "Python Basics": "Think Python Ch 1–8 (Variables, Functions, Loops)",
      "Algorithms": "CLRS Ch 1–4 (Algorithm Basics & Big-O)",
      "Data Structures": "CLRS Ch 10–13 (Lists, Trees, Hash Tables)",
      "OOP": "Think Python Ch 15–18 (Classes & Objects)",
    },
    style: "Write code in Python unless otherwise specified. Include docstrings. Show trace tables for algorithm questions. Big-O must be justified.",
  },
  history: {
    textbook: "OpenStax U.S. History (Corbett et al., 2014)",
    isbn: "978-1-938168-36-9",
    problemTypes: [
      "Primary source analysis: identify author's purpose, audience, and argument",
      "Cause & effect essay outline: identify 3 causes and 3 effects of a given event",
      "Compare & contrast: compare two historical periods/events on 3 criteria",
      "Timeline construction: sequence 6 events with accurate dates and significance",
      "DBQ-style question: use evidence from a given document to support an argument",
      "Historical significance: argue why a specific event changed American history",
      "Map analysis: describe geographic factors that influenced a historical event",
    ],
    chapterMap: {
      "Colonial America": "Ch 1–4 (From Columbus to Revolution)",
      "New Nation": "Ch 7–9 (Constitution & Early Republic)",
      "Antebellum": "Ch 12–15 (Sectionalism & Civil War)",
      "Reconstruction": "Ch 16–17 (Reconstruction Era)",
      "Industrial Age": "Ch 18–20 (Gilded Age to Progressive Era)",
    },
    style: "All arguments must cite specific events, dates, and actors by name. Use HIPPO for primary source analysis (Historical context, Intended audience, Purpose, Point of view, Outside knowledge).",
  },
};

// Get OpenStax context for a subject (works for both preset and custom)
function getOpenStaxContext(subjectId, subjectName) {
  const os = OPENSTAX[subjectId];
  if (os) return os;
  // For custom subjects, return a minimal structure
  return {
    textbook: `Standard academic curriculum for ${subjectName}`,
    problemTypes: [
      "Conceptual explanation with example",
      "Calculation or derivation from first principles",
      "Application problem in a real-world context",
      "Compare and contrast two related concepts",
      "Multi-step problem requiring synthesis of several concepts",
    ],
    style: "Show all work. Clearly state which concept or formula is being applied.",
  };
}


// Subject prerequisite trees — shown in the tree modal
const SUBJECT_TREES = {
  physics:{
    name:"Physics",
    desc:"The recommended path through physics, from mechanics to quantum fields.",
    nodes:[
      {id:"prereq",label:"Algebra & Trig",type:"prereq",x:360,y:30},
      {id:"calc",label:"Calculus I",type:"prereq",x:180,y:30},
      {id:"cm",label:"Classical Mechanics",type:"core",x:270,y:120,desc:"Newton's laws, kinematics, energy, momentum"},
      {id:"thermo",label:"Thermodynamics",type:"core",x:460,y:200,desc:"Heat, entropy, thermodynamic laws"},
      {id:"waves",label:"Waves & Optics",type:"core",x:100,y:200,desc:"Wave mechanics, interference, light"},
      {id:"em",label:"Electromagnetism",type:"core",x:270,y:290,desc:"Maxwell's equations, circuits, fields"},
      {id:"modern",label:"Modern Physics",type:"advanced",x:140,y:380,desc:"Special relativity, photoelectric effect"},
      {id:"qm",label:"Quantum Mechanics",type:"advanced",x:380,y:380,desc:"Schrödinger equation, wavefunctions"},
      {id:"stat",label:"Statistical Mechanics",type:"advanced",x:600,y:290,desc:"Partition functions, entropy"},
      {id:"qft",label:"Quantum Field Theory",type:"expert",x:280,y:470,desc:"Path integrals, gauge theories"},
    ],
    edges:[["prereq","cm"],["calc","cm"],["cm","thermo"],["cm","waves"],["cm","em"],["waves","modern"],["em","modern"],["em","qm"],["modern","qm"],["thermo","stat"],["qm","qft"],["stat","qft"]],
  },
  cs:{
    name:"Computer Science",
    desc:"The recommended path through CS fundamentals to specializations.",
    nodes:[
      {id:"math",label:"Discrete Math",type:"prereq",x:180,y:30},
      {id:"prog",label:"Programming Basics",type:"prereq",x:380,y:30},
      {id:"dsa",label:"Data Structures & Algorithms",type:"core",x:280,y:120,desc:"Arrays, trees, sorting, O-notation"},
      {id:"sys",label:"Systems Programming",type:"core",x:100,y:220,desc:"Memory, pointers, OS concepts"},
      {id:"db",label:"Databases",type:"core",x:280,y:220,desc:"SQL, normalization, indexing"},
      {id:"net",label:"Networking",type:"core",x:460,y:220,desc:"TCP/IP, HTTP, DNS, sockets"},
      {id:"os",label:"Operating Systems",type:"advanced",x:100,y:330,desc:"Scheduling, memory management"},
      {id:"ml",label:"Machine Learning",type:"advanced",x:300,y:330,desc:"Linear models, neural nets"},
      {id:"sec",label:"Security",type:"advanced",x:490,y:330,desc:"Cryptography, vulnerabilities"},
      {id:"dist",label:"Distributed Systems",type:"expert",x:280,y:430,desc:"Consensus, replication, CAP"},
    ],
    edges:[["math","dsa"],["prog","dsa"],["dsa","sys"],["dsa","db"],["dsa","net"],["sys","os"],["db","ml"],["net","sec"],["os","dist"],["ml","dist"]],
  },
  apcalc:{
    name:"AP Calculus",
    desc:"The sequence through calculus topics as required by the AP curriculum.",
    nodes:[
      {id:"pre",label:"Precalculus & Limits Intuition",type:"prereq",x:300,y:30},
      {id:"lim",label:"Limits & Continuity",type:"core",x:300,y:120,desc:"Epsilon-delta, L'Hôpital, IVT"},
      {id:"deriv",label:"Definition of Derivative",type:"core",x:160,y:210,desc:"Limit definition, tangent lines"},
      {id:"rules",label:"Derivative Rules",type:"core",x:440,y:210,desc:"Product, chain, quotient, trig"},
      {id:"apps",label:"Applications of Derivatives",type:"core",x:160,y:300,desc:"Optimization, related rates, MVT"},
      {id:"anal",label:"Analytical Applications",type:"core",x:440,y:300,desc:"Curve sketching, concavity"},
      {id:"integ",label:"Integration Basics",type:"core",x:300,y:390,desc:"Riemann sums, antiderivatives"},
      {id:"ftc",label:"Fundamental Theorem",type:"advanced",x:150,y:480,desc:"FTC Part 1 & 2"},
      {id:"tech",label:"Integration Techniques",type:"advanced",x:450,y:480,desc:"u-sub, integration by parts"},
      {id:"de",label:"Differential Equations",type:"advanced",x:300,y:560,desc:"Separation of variables, slope fields"},
    ],
    edges:[["pre","lim"],["lim","deriv"],["lim","rules"],["deriv","apps"],["rules","apps"],["rules","anal"],["apps","integ"],["anal","integ"],["integ","ftc"],["integ","tech"],["ftc","de"],["tech","de"]],
  },
  biology:{
    name:"Biology",
    desc:"From cell biology to ecology and evolution — the recommended path.",
    nodes:[
      {id:"chem",label:"Basic Chemistry",type:"prereq",x:300,y:30},
      {id:"cell",label:"Cell Biology",type:"core",x:300,y:120,desc:"Organelles, membranes, cell division"},
      {id:"mol",label:"Molecular Biology",type:"core",x:140,y:220,desc:"DNA, RNA, protein synthesis"},
      {id:"genet",label:"Genetics",type:"core",x:460,y:220,desc:"Mendelian, chromosomal, population"},
      {id:"metab",label:"Metabolism",type:"core",x:300,y:220,desc:"Glycolysis, Krebs, photosynthesis"},
      {id:"evo",label:"Evolution",type:"advanced",x:140,y:330,desc:"Natural selection, speciation"},
      {id:"eco",label:"Ecology",type:"advanced",x:460,y:330,desc:"Populations, communities, biomes"},
      {id:"dev",label:"Development & Anatomy",type:"advanced",x:300,y:330,desc:"Embryology, organ systems"},
    ],
    edges:[["chem","cell"],["cell","mol"],["cell","genet"],["cell","metab"],["mol","evo"],["genet","evo"],["metab","dev"],["evo","eco"],["dev","eco"]],
  },
};


const FEATURES_NOW = [
  { icon: "🗺️", title: "AI-Generated Roadmaps", desc: "45-lesson roadmaps across 9 progressive phases, built specifically for your subject and goal." },
  { icon: "📊", title: "Placement Diagnostic", desc: "8-question test that figures out what you already know and skips you ahead automatically." },
  { icon: "✏️", title: "Smart Whiteboard", desc: "Draw diagrams and notes on a canvas. AI reads your work and gives mastery feedback." },
  { icon: "🔒", title: "Mastery Gating", desc: "Each lesson unlocks only after you pass the whiteboard challenge — no skipping ahead." },
  { icon: "📋", title: "Spaced Repetition Workbook", desc: "AI-generated practice problems scheduled at 1, 3, and 7-day intervals for long-term retention." },
  { icon: "⚡", title: "Lesson Caching", desc: "Generated lessons are saved locally — instant on repeat visits, works offline after first load." },
  { icon: "⏱️", title: "Session Timer", desc: "90-minute ultradian rhythm tracker with break alerts to keep you in peak focus." },
  { icon: "📐", title: "KaTeX Math Rendering", desc: "Inline and display equations rendered beautifully for math, physics, and chemistry subjects." },
  { icon: "🌐", title: "12 Subjects + Custom", desc: "AP Calculus, Physics, Biology, Chemistry, CS, Statistics, and more — or type any subject you want." },
  { icon: "🌳", title: "Prerequisite Trees", desc: "SVG dependency graphs showing what you need to know before each topic." },
];

const FEATURES_SOON = [
  { icon: "📄", title: "Export Lessons as PDF", desc: "Save any lesson or your full roadmap as a formatted PDF." },
  { icon: "📈", title: "Progress Analytics", desc: "Charts and stats tracking your mastery over time across all subjects." },
  { icon: "🔔", title: "Study Reminders", desc: "Scheduled notifications when workbook problems are due." },
  { icon: "🤝", title: "Shared Roadmaps", desc: "Share your learning roadmap with friends or study groups." },
  { icon: "🌙", title: "Dark Mode", desc: "A dark theme for late-night study sessions." },
  { icon: "📱", title: "Mobile App", desc: "Native iOS and Android apps with offline support." },
];

const TECHNIQUES = [
  {i:"⏱️",n:"90-Min Ultradian",t:"tag-gold",d:"Brain cycles in 90-min waves of alertness. Session timer built in.",s:"↑ 50% less fatigue"},
  {i:"🔁",n:"Spaced Repetition",t:"tag-pine",d:"Workbook problems arrive at 1→3→7→14→30 day intervals.",s:"↑ 2–3× retention"},
  {i:"🧠",n:"Active Recall",t:"tag-gold",d:"Whiteboard mastery challenges force retrieval — desirable difficulty.",s:"↑ Far better than re-reading"},
  {i:"🎓",n:"Feynman Technique",t:"tag-pine",d:"Mastery = model it from scratch on the smart whiteboard.",s:"↑ Reveals hidden gaps"},
  {i:"🏆",n:"Mastery Learning",t:"tag-rust",d:"Don't advance until you prove understanding. Same bar, your pace.",s:"↑ Durable comprehension"},
  {i:"🪜",n:"Concrete → Abstract",t:"tag-gold",d:"Real example first, then theory. Concreteness fading in every lesson.",s:"↑ Better integration"},
  {i:"🍅",n:"Pomodoro / Ultradian",t:"tag-rust",d:"25-min sprints or 90-min sessions — timer tracks rest.",s:"↑ Sustained focus"},
  {i:"🪞",n:"Metacognition",t:"tag-pine",d:"Reflection prompt after every whiteboard challenge.",s:"↑ Faster improvement"},
];

// ─────────────────────────────────────────────────────────────────────
// KaTeX
// ─────────────────────────────────────────────────────────────────────
function useKatex() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}
function KMath({ m, display = false }) {
  const ready = useKatex();
  const ref = useRef(null);
  useEffect(() => {
    if (!ready || !ref.current) return;
    try { window.katex.render(String(m), ref.current, { displayMode: display, throwOnError: false }); } catch {}
  }, [m, display, ready]);
  return display ? <div className="math-display" ref={ref} /> : <span className="math-inline" ref={ref} />;
}

// ─────────────────────────────────────────────────────────────────────
// CONTENT PARSER
// ─────────────────────────────────────────────────────────────────────
function renderInline(text) {
  if (!text || typeof text !== "string") return text;
  const result = []; let i = 0, k = 0;
  while (i < text.length) {
    if (text.slice(i, i+2) === "$$") { const e = text.indexOf("$$", i+2); if (e > -1) { result.push(<KMath key={k++} m={text.slice(i+2, e)} display />); i = e+2; continue; } }
    if (text[i] === "$") { const e = text.indexOf("$", i+1); if (e > -1) { result.push(<KMath key={k++} m={text.slice(i+1, e)} />); i = e+1; continue; } }
    let j = i+1; while (j < text.length && text[j] !== "$") j++;
    if (i < j) result.push(<span key={k++}>{text.slice(i, j)}</span>);
    i = j;
  }
  return result.length ? result : text;
}

// ─────────────────────────────────────────────────────────────────────

function parseContent(raw) {
  if (!raw || typeof raw !== "string") return <p className="muted">Content unavailable.</p>;
  const MARKERS = ["H3","HIGHLIGHT","EXAMTIP","CONCEPT","DISPMATH","SVG","FLUXIMG"];
  const spans = [];
  for (const m of MARKERS) {
    const o = `[${m}]`, c = `[/${m}]`;
    let idx = 0;
    while (true) {
      const si = raw.indexOf(o, idx); if (si === -1) break;
      const ei = raw.indexOf(c, si + o.length); if (ei === -1) { idx = si + o.length; continue; }
      spans.push({ type: m, start: si, end: ei + c.length, inner: raw.slice(si + o.length, ei) });
      idx = ei + c.length;
    }
  }
  spans.sort((a, b) => a.start - b.start);
  const elements = []; let k = 0, pos = 0;
  const emitText = txt => {
    const clean = txt.replace(/\[[A-Z0-9/]+\]/g, " ").trim();
    if (!clean) return;
    // Split on newlines OR double-space after sentence end
    const paras = clean.split(/\n+/).flatMap(p =>
      p.trim().split(/(?<=[.!?])\s{2,}(?=[A-Z])/)
    ).map(p => p.trim()).filter(Boolean);
    paras.forEach(p => elements.push(<p key={k++}>{renderInline(p)}</p>));
  };
  for (const span of spans) {
    if (pos < span.start) emitText(raw.slice(pos, span.start));
    pos = span.end;
    const inn = span.inner.trim();
    if (span.type === "H3") elements.push(<h3 key={k++}>{inn}</h3>);
    else if (span.type === "HIGHLIGHT") elements.push(<div key={k++} className="hl-block">{renderInline(inn)}</div>);
    else if (span.type === "EXAMTIP") elements.push(<div key={k++} className="examtip-block"><span className="et-lbl">📝 AP Exam Tip</span>{renderInline(inn)}</div>);
    else if (span.type === "CONCEPT") { const sep = inn.indexOf("||"); const lbl = sep > -1 ? inn.slice(0,sep).trim() : "Concept"; const body = sep > -1 ? inn.slice(sep+2).trim() : inn; elements.push(<div key={k++} className="concept-block"><span className="cb-lbl">{lbl}</span>{renderInline(body)}</div>); }
    else if (span.type === "DISPMATH") elements.push(<KMath key={k++} m={inn} display />);
    else if (span.type === "FLUXIMG") { /* images removed */ }
    else if (span.type === "SVG") { /* SVG graphs removed */ }
    else elements.push(<p key={k++}>{renderInline(inn)}</p>);
  }
  if (pos < raw.length) emitText(raw.slice(pos));
  return elements.length > 0 ? elements : <p className="muted">Lesson loaded.</p>;
}

function robustJSON(text) {
  if (!text) return null;
  
  // Remove markdown code blocks
  let s = text.replace(/```json\s*/gi,"").replace(/```\s*/gi,"").trim();
  
  // Try to extract JSON array or object
  const extract = (o, c) => {
    const si = s.indexOf(o); if (si === -1) return null;
    let d = 0, ei = -1;
    for (let i = si; i < s.length; i++) { 
      if (s[i]===o) d++; 
      else if (s[i]===c) { 
        d--; 
        if (d===0){ei=i;break;} 
      } 
    }
    if (ei === -1) return null;
    try { 
      const parsed = JSON.parse(s.slice(si, ei+1)); 
      return parsed;
    } catch (e) { 
      console.error("JSON parse error:", e.message, "Raw text:", s.slice(si, ei+1).substring(0, 200));
      return null; 
    }
  };
  
  // Try array first, then object
  let result = extract("[","]");
  if (result) return result;
  
  result = extract("{","}");
  if (result) return result;
  
  // Last resort: try parsing the whole string
  try {
    return JSON.parse(s);
  } catch (e) {
    console.error("Failed to parse JSON from AI response. First 500 chars:", s.substring(0, 500));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
// AI ROUTING — Groq (Llama 3.3) for all text, notes-only for whiteboard
// ─────────────────────────────────────────────────────────────────────
class CreditsExhaustedError extends Error {
  constructor(msg) { super(msg); this.isCredits = true; }
}

// All text generation goes through Groq API directly
// Using provided API key for standalone deployment
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

async function ai(messages, system = "", maxTok = 8192, jsonMode = false) {
  // Strip any image blocks — Groq has no vision support
  const cleaned = messages.map(m => ({
    ...m,
    content: Array.isArray(m.content)
      ? m.content
          .filter(b => b.type !== "image")
          .map(b => b.type === "text" ? b.text : "")
          .join("\n")
      : m.content
  }));

  // Groq requires "json" in the system prompt when using json_object mode
  let effectiveSystem = system;
  if (jsonMode && !effectiveSystem.toLowerCase().includes("json")) {
    effectiveSystem = effectiveSystem + " Respond in JSON.";
  }

  const msgs = effectiveSystem
    ? [{ role: "system", content: effectiveSystem }, ...cleaned]
    : cleaned;

  const body = { 
    model: "llama-3.3-70b-versatile", 
    messages: msgs, 
    max_tokens: Math.min(maxTok, 8192),
    temperature: jsonMode ? 0 : 0.7,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {})
  };

  let r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  // If json_object mode caused a 400, retry without it
  if (r.status === 400 && jsonMode) {
    const fallbackBody = { ...body };
    delete fallbackBody.response_format;
    fallbackBody.temperature = 0.3;
    r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(fallbackBody)
    });
  }

  if (r.status === 429) throw new CreditsExhaustedError(
    "Groq's free tier is temporarily rate-limited. Limits reset every hour — come back shortly or reload to try again."
  );
  if (r.status === 401) throw new Error(
    "Your Groq API key was rejected. Please check the API key."
  );
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || `Server error ${r.status} — please try again.`);
  }

  const d = await r.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response. Please try again in a moment.");
  return text;
}

// Web-search-enabled AI using Groq compound-beta model
// Returns text; searches the web automatically for real practice problems
async function aiSearch(messages, system = "", maxTok = 8192) {
  const cleaned = messages.map(m => ({
    ...m,
    content: Array.isArray(m.content)
      ? m.content.filter(b => b.type !== "image").map(b => b.type === "text" ? b.text : "").join("\n")
      : m.content
  }));
  const effectiveSystem = system + (system.toLowerCase().includes("json") ? "" : " Return results as JSON.");
  const msgs = effectiveSystem
    ? [{ role: "system", content: effectiveSystem }, ...cleaned]
    : cleaned;

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "compound-beta",
      messages: msgs,
      max_tokens: Math.min(maxTok, 8192),
      temperature: 0
    })
  });
  if (r.status === 429) throw new CreditsExhaustedError("Rate limited — try again shortly.");
  if (!r.ok) {
    // Fallback to regular ai() if compound-beta unavailable
    return ai(messages, system, maxTok, true);
  }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

// ─────────────────────────────────────────────────────────────────────
// LESSON CACHE (v7)
// ─────────────────────────────────────────────────────────────────────
const sanitizeKey = t => t.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
const cacheKey    = (sId, title) => `lesson_cache:${sId}:${sanitizeKey(title)}`;

async function getCachedLesson(sId, title) {
  return storeGet(cacheKey(sId, title));
}
async function setCachedLesson(sId, title, content, masteryPrompt) {
  await storeSet(cacheKey(sId, title), { content, masteryPrompt });
}

// ─────────────────────────────────────────────────────────────────────
// CREDITS EXHAUSTED PAGE (v7)
// ─────────────────────────────────────────────────────────────────────
function CreditsPage({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", padding: 20 }}>
      <div style={{ background: "var(--paper)", borderRadius: "var(--r-lg)", padding: "40px 36px", maxWidth: 480, width: "100%", border: "2px solid var(--gold)", boxShadow: "0 24px 72px rgba(0,0,0,.4)", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⚡</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Rate Limit Reached</div>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.75, marginBottom: 12 }}>
          The AI service is temporarily rate-limited. This usually clears within <strong>a minute or two</strong> — no data has been lost.
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.75, marginBottom: 24 }}>
          Your lesson progress and cached content are saved. Hit <strong>Go Back</strong> to return to where you were, or <strong>Reload</strong> to start fresh.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={onBack}>← Go Back</button>
          <button className="btn btn-gold" onClick={() => window.location.reload()}>🔄 Reload & Retry</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUBJECT TREE MODAL
// ─────────────────────────────────────────────────────────────────────
function SubjectTree({ sid, sname, onClose, onStart }) {
  const tree = SUBJECT_TREES[sid];
  const [aiTree, setAiTree] = useState(null);
  const [loading, setLoading] = useState(!tree);

  useEffect(() => {
    if (tree || aiTree) return;
    (async () => {
      setLoading(true);
      try {
        const txt = await ai([{ role: "user", content:
          `Create a prerequisite learning tree for "${sname}". Show the recommended order of sub-topics.\n` +
          `Return ONLY raw JSON: {"name":"...","desc":"...","nodes":[{"id":"a","label":"Topic Name","type":"prereq|core|advanced|expert","desc":"one line","x":300,"y":30}],"edges":[["from","to"]]}\n` +
          `Use 8-12 nodes. x ranges 50-600, y ranges 30-500 in steps of ~90. Type: prereq=required background, core=fundamental, advanced=upper level, expert=graduate.`
        }], "Return ONLY raw JSON. No backticks.", 1200, true);
        const p = robustJSON(txt);
        if (p?.nodes) setAiTree(p);
      } catch {}
      setLoading(false);
    })();
  }, [sid, sname, tree, aiTree]);

  const data = tree || aiTree;
  const TYPE_COLORS = { prereq: "#6a6560", core: "#1a5c4a", advanced: "#c8861a", expert: "#9e3a1a" };
  const TYPE_LABELS = { prereq: "Prerequisite", core: "Core Topic", advanced: "Advanced", expert: "Expert" };

  const renderSVG = (d) => {
    if (!d) return null;
    const W = 700, H = 540;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxHeight: 540, display: "block" }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#d4cdc0" />
          </marker>
        </defs>
        {/* Edges */}
        {d.edges.map(([from, to], i) => {
          const a = d.nodes.find(n => n.id === from), b = d.nodes.find(n => n.id === to);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y + 20} x2={b.x} y2={b.y - 20}
            stroke="#d4cdc0" strokeWidth="1.5" markerEnd="url(#arrowhead)" />;
        })}
        {/* Nodes */}
        {d.nodes.map(n => {
          const col = TYPE_COLORS[n.type] || "#3a4a5c";
          const rx = 70, ry = 20;
          return (
            <g key={n.id}>
              <ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={col} opacity="0.15" stroke={col} strokeWidth="1.5" rx={8} />
              <rect x={n.x - rx} y={n.y - ry} width={rx*2} height={ry*2} rx={8} fill="white" stroke={col} strokeWidth="1.5" />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fontFamily="var(--sans)" fontWeight="600" fill={col}>
                {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
              </text>
              {n.desc && <title>{n.desc}</title>}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="tree-modal" onClick={e => e.stopPropagation()}>
        <div className="tree-modal-hdr">
          <div className="tree-modal-title">🗺️ <em>{data?.name || sname}</em> Learning Path</div>
          <button className="btn-ghost" style={{ color: "rgba(245,242,236,.6)" }} onClick={onClose}>✕</button>
        </div>
        <div className="tree-modal-body">
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>{data?.desc || "Hover nodes for details. Follow the arrows for the recommended order."}</p>
          <div className="tree-legend">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <div key={k} className="tree-legend-item">
                <div className="tl-dot" style={{ background: TYPE_COLORS[k], opacity: 0.8 }} />
                <span style={{ color: "var(--muted)" }}>{v}</span>
              </div>
            ))}
          </div>
          {loading && <div className="loading"><div className="spinner" /><div className="loading-msg">Generating Tree</div></div>}
          {data && renderSVG(data)}
        </div>
        <div className="tree-actions">
          <button className="btn btn-gold" onClick={() => { onClose(); onStart(); }}>Start Learning {sname} →</button>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// AI VIDEO PLAYER — animated slides generated by Claude
// ─────────────────────────────────────────────────────────────────────
// DIAGNOSTIC
// ─────────────────────────────────────────────────────────────────────
function Diagnostic({ subject, purpose, onComplete }) {
  const [qs, setQs]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]   = useState("");
  const [cur, setCur]   = useState(0);
  const [ans, setAns]   = useState({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const txt = await ai([{ role: "user", content:
          `Generate 8 MCQ diagnostic questions for "${subject}"${purpose ? ` (goal: ${purpose})` : ""}.\n` +
          `Span basic to advanced. Each tests a different topic.\nReturn ONLY raw JSON array starting with [.\n` +
          `[{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"answer":"a","topic":"...","level":"basic"}]`
        }], "Output ONLY raw JSON array starting with [.", 2400, true);
        const p = robustJSON(txt);
        if (!p || !Array.isArray(p) || p.length < 3) throw new Error("The AI returned an unexpected format for the diagnostic questions. Please try again.");
        setQs(p);
      } catch (e) {
        if (e.isCredits) setErr("credits");
        else setErr(e.message || "Something went wrong generating your diagnostic questions.");
      }
      setLoading(false);
    })();
  }, [subject, purpose]);

  const choose = opt => { if (revealed) return; setAns(a => ({ ...a, [cur]: opt })); setRevealed(true); };
  const next = () => { setRevealed(false); if (cur + 1 >= (qs?.length || 8)) setDone(true); else setCur(c => c + 1); };
  const skip = () => { setAns(a => ({ ...a, [cur]: null })); setRevealed(false); if (cur + 1 >= (qs?.length || 8)) setDone(true); else setCur(c => c + 1); };

  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-msg">Building Diagnostic</div></div>;
  if (err) return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ background: err === "credits" ? "var(--gold-pale)" : "var(--rust-pale)", border: `1.5px solid ${err === "credits" ? "var(--gold)" : "rgba(158,58,26,.25)"}`, borderRadius: "var(--r-lg)", padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          {err === "credits" ? "⚡ Rate Limit Reached" : "😕 Couldn't Load Diagnostic"}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--ink)", marginBottom: 0 }}>
          {err === "credits"
            ? "The AI service is temporarily rate-limited. It should clear in a few minutes. You can skip the diagnostic and jump straight to your roadmap in the meantime."
            : err}
        </p>
      </div>
      <button className="btn btn-gold" onClick={() => onComplete(0, 0, [])}>Skip Diagnostic → Build Roadmap</button>
    </div>
  );
  if (!qs) return <button className="btn btn-gold" onClick={() => onComplete(0, 0, [])}>Start →</button>;

  if (done) {
    const score = qs.filter((_, i) => ans[i] === qs[i].answer).length;
    const pct = score / qs.length;
    const unlocked = pct >= 0.875 ? 8 : pct >= 0.625 ? 4 : pct >= 0.375 ? 2 : 0;
    const msg = pct >= 0.875 ? "Outstanding — jumping to advanced!" : pct >= 0.625 ? "Strong foundation — skipping ahead." : pct >= 0.375 ? "Good start — unlocking phase 1." : "Building from the ground up.";
    return (
      <div className="diag-wrap">
        <div className="score-card">
          <div className="eyebrow center">Diagnostic Complete</div>
          <div className="score-big">{score}/{qs.length}</div>
          <p className="muted" style={{ marginBottom: 10 }}>{msg}</p>
          <div className="score-dots">{qs.map((q, i) => <div key={i} className={`sdot ${ans[i] === q.answer ? "sdot-p" : ans[i] == null ? "sdot-s" : "sdot-f"}`}>{ans[i] === q.answer ? "✓" : ans[i] == null ? "–" : "✗"}</div>)}</div>
          <p className="muted mb2" style={{ fontSize: 12 }}>You know: {qs.filter((_, i) => ans[i] === qs[i].answer).map(q => q.topic).join(", ") || "Starting fresh!"}</p>
          <button className="btn btn-gold" onClick={() => onComplete(score, unlocked, qs)}>Build My Roadmap →</button>
        </div>
      </div>
    );
  }
  const q = qs[cur];
  return (
    <div className="diag-wrap">
      <div className="eyebrow center">Placement Diagnostic · {subject}</div>
      <div className="diag-prog">{qs.map((_, i) => <div key={i} className={`dp-seg${i < cur ? " done" : i === cur ? " act" : ""}`} />)}</div>
      <div className="muted mb2" style={{ textAlign: "right", fontSize: 12 }}>{cur + 1} / {qs.length}</div>
      <div className="q-card">
        <div className="q-num">{q.topic} · <span style={{ textTransform: "capitalize" }}>{q.level}</span></div>
        <div className="q-text">{renderInline(q.question)}</div>
        <div className="q-opts">
          {Object.entries(q.options || {}).map(([k, v]) => {
            let cls = "q-opt";
            if (revealed) { if (k === q.answer) cls += " correct"; else if (k === ans[cur]) cls += " wrong"; }
            else if (k === ans[cur]) cls += " chosen";
            return <button key={k} className={cls} onClick={() => choose(k)}><span className="opt-lbl">{k.toUpperCase()}</span><span>{renderInline(String(v))}</span></button>;
          })}
        </div>
        {revealed && <div className="row mt2">{ans[cur] !== q.answer && <span className="muted" style={{ flex: 1, fontSize: 12 }}>✓ {q.options[q.answer]}</span>}<button className="btn btn-gold btn-sm" onClick={next}>{cur + 1 < qs.length ? "Next →" : "See Results →"}</button></div>}
        {!revealed && <div className="row mt2"><button className="btn btn-outline btn-sm" onClick={skip}>Skip</button></div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SMART WHITEBOARD — with HWR-inspired ink analysis + scrollable notes
// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
// WHITEBOARD VISION — Llama 3.2 Vision via Puter.js (free, no API key)
// ─────────────────────────────────────────────────────────────────────

let puterReady = false;
async function loadPuter() {
  if (puterReady || window.puter) { puterReady = true; return true; }
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://js.puter.com/v2/";
    s.onload = () => { puterReady = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

// Count actual ink pixels on canvas — used to detect blank/near-blank submissions
function countInkPixels(canvas) {
  const ctx = canvas.getContext("2d");
  const { width: W, height: H } = canvas;
  const data = ctx.getImageData(0, 0, W, H).data;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
    if (data[i+3] > 30 && brightness < 210) ink++;
  }
  return ink;
}

// Send canvas image to Llama 3.2 Vision via Puter — returns text description
async function visionAnalyzeCanvas(canvas, challengePrompt) {
  // Hard check: if canvas is nearly blank, skip vision API entirely
  const inkPixels = countInkPixels(canvas);
  if (inkPixels < 300) {
    return `CANVAS IS BLANK OR NEARLY BLANK — only ${inkPixels} ink pixels detected. The student drew nothing meaningful.`;
  }

  const ok = await loadPuter();
  if (!ok || !window.puter?.ai?.chat) {
    throw new Error("Puter.js failed to load — check your internet connection.");
  }

  // Downsample to 800px wide for speed, keep white background
  const scale = Math.min(1, 800 / canvas.width);
  const oc    = document.createElement("canvas");
  oc.width    = Math.round(canvas.width  * scale);
  oc.height   = Math.round(canvas.height * scale);
  const octx  = oc.getContext("2d");
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, oc.width, oc.height);
  octx.drawImage(canvas, 0, 0, oc.width, oc.height);
  const dataUrl = oc.toDataURL("image/jpeg", 0.90); // higher quality than before

  const response = await window.puter.ai.chat(
    [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: dataUrl } },
        {
          type: "text",
          text:
            `You are a STRICT grading assistant examining a student's whiteboard image.\n` +
            `Challenge given to student: "${challengePrompt}"\n` +
            `Canvas ink pixel count: ${inkPixels} (meaningful work requires >2000 pixels)\n\n` +
            `CRITICAL INSTRUCTIONS:\n` +
            `- If the image looks white/blank or only has random scribbles, say so CLEARLY\n` +
            `- Do NOT assume the student drew something correct if you cannot clearly see it\n` +
            `- Do NOT be generous — report exactly what you see, nothing more\n\n` +
            `Report the following:\n` +
            `1. DRAWN ELEMENTS: List every specific thing visible (axes with labels, specific curves, equations/formulas readable text, shapes). If blank, say "BLANK".\n` +
            `2. STRUCTURE TYPE: graph / derivation / diagram / labeled sketch / random marks / blank\n` +
            `3. ACCURACY vs CHALLENGE: Does what's drawn correctly answer the challenge? Be specific about what IS and ISN'T correct.\n` +
            `4. MISSING: What required elements from the challenge are NOT present?\n` +
            `5. OVERALL QUALITY: poor / partial / good / excellent — based only on what you can actually see`,
        },
      ],
    }],
    { model: "meta-llama/llama-3.2-11b-vision-instruct", stream: false }
  );

  const text = response?.message?.content || response?.text || (typeof response === "string" ? response : "");
  if (!text) return `Vision returned no result. Canvas had ${inkPixels} ink pixels.`;
  return `[Llama 3.2 Vision — ${inkPixels} ink pixels on canvas]\n\n${text}`;
}

// ─────────────────────────────────────────────────────────────────────
// FLUX IMAGE GENERATION via Puter.js — for educational diagrams







// ─────────────────────────────────────────────────────────────────────
// SMART WHITEBOARD — with full client-side vision (Tesseract + shape detection)
// ─────────────────────────────────────────────────────────────────────
function SmartWhiteboard({ prompt, onSubmit, evaluating }) {
  const canvasRef   = useRef(null);
  const drawing     = useRef(false);
  const lastPt      = useRef(null);
  const idleTimer   = useRef(null);
  const strokeCount = useRef(0);
  const [color, setColor]           = useState("#141418");
  const [sz, setSz]                 = useState(2); // Thinner default
  const [mode, setMode]             = useState("pen");
  const [noteBlocks, setNoteBlocks] = useState([]);
  const [genLoading, setGenLoading] = useState(false);
  const [isDrawing, setIsDrawing]   = useState(false);
  const [showNotes, setShowNotes]   = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [visionResult, setVisionResult] = useState("");
  const [visionStatus, setVisionStatus] = useState("");

  const W = 1200, H = 600;
  const COLORS = ["#141418","#c8861a","#1a5c4a","#9e3a1a","#3a4a5c","#2244cc","#883399","#888"];
  const SIZES = [1, 2, 3, 5, 8]; // Thinner pencil options

  // Pre-load Puter.js in background when component mounts
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, W, H);
    loadPuter().catch(() => {});
  }, []);

  // Run Llama 3.2 Vision after drawing pauses for 2s
  const triggerScan = () => {
    clearTimeout(idleTimer.current);
    if (strokeCount.current < 2) return;
    idleTimer.current = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setScanning(true);
      setVisionStatus("👁 Llama 3.2 Vision analyzing…");
      try {
        const result = await visionAnalyzeCanvas(canvas, prompt);
        setVisionResult(result);
        // Parse the 4-section response for a short status badge
        const hasGraph   = /graph|axes|axis|curve|line/i.test(result);
        const hasEq      = /equation|formula|expression|\$|=\s*[a-z0-9]/i.test(result);
        const hasDiagram = /diagram|label|arrow|shape|circle|box/i.test(result);
        const hasText    = /wrote|text|word|letter/i.test(result);
        const parts = [];
        if (hasGraph)   parts.push("graph");
        if (hasEq)      parts.push("equations");
        if (hasDiagram) parts.push("diagram");
        if (hasText)    parts.push("labels");
        setVisionStatus(parts.length > 0 ? `✅ Saw: ${parts.join(", ")}` : "✅ Canvas read");
      } catch (e) {
        setVisionStatus(`⚠️ Vision error: ${e.message?.slice(0,60) || "check connection"}`);
        setVisionResult("");
      }
      setScanning(false);
    }, 2000);
  };

  const getXY = e => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const scX = W / r.width, scY = H / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * scX, y: (src.clientY - r.top) * scY };
  };

  const startDraw = e => {
    if (e.touches) e.preventDefault();
    drawing.current = true; setIsDrawing(true);
    lastPt.current = getXY(e);
  };

  const onMove = e => {
    if (!drawing.current) return;
    if (e.touches) e.preventDefault();
    const p = getXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = mode === "eraser" ? "#fdfaf5" : color;
    ctx.lineWidth   = mode === "eraser" ? 40 : sz * 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    lastPt.current = p;
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false; setIsDrawing(false);
    strokeCount.current++;
    triggerScan();
  };

  const generateNotes = async () => {
    setGenLoading(true);
    try {
      const txt = await ai([{ role: "user", content:
        `A student is working on this whiteboard challenge: "${prompt}"\n` +
        `Generate structured reference notes they can consult while drawing their answer.\n` +
        `Return ONLY raw JSON array:\n` +
        `[{"type":"heading","text":"..."},{"type":"text","text":"..."},{"type":"math","latex":"..."},{"type":"bullet","items":["..."]},{"type":"divider"}]`
      }], "Return ONLY raw JSON array starting with [.", 1400, true);
      const p = robustJSON(txt);
      if (p && Array.isArray(p) && p.length > 0) { setNoteBlocks(p); setShowNotes(true); }
    } catch {}
    setGenLoading(false);
  };

  const clearCanvas = () => {
    canvasRef.current?.getContext("2d").clearRect(0, 0, W, H);
    strokeCount.current = 0;
    setVisionResult(""); setVisionStatus("");
    clearTimeout(idleTimer.current);
  };
  const clearAll = () => { clearCanvas(); setNoteBlocks([]); setShowNotes(false); };

  const submit = async () => {
    const flat = document.createElement("canvas");
    flat.width = W; flat.height = H;
    const fctx = flat.getContext("2d");
    fctx.fillStyle = "#fff"; fctx.fillRect(0, 0, W, H);
    fctx.drawImage(canvasRef.current, 0, 0);

    // If vision hasn't run yet (e.g. student drew then immediately submitted), run it now
    let finalVision = visionResult;
    if (!finalVision && strokeCount.current > 0) {
      setScanning(true); setVisionStatus("👁 Llama 3.2 Vision reading canvas…");
      try {
        finalVision = await visionAnalyzeCanvas(flat, prompt);
        setVisionResult(finalVision);
        setVisionStatus("✅ Done");
      } catch (e) {
        finalVision = `Vision unavailable (${e.message?.slice(0,60)}). Student drew ${strokeCount.current} strokes.`;
        setVisionStatus("⚠️ Vision error");
      }
      setScanning(false);
    }

    const notesSummary = noteBlocks.map(n =>
      n.type === "math" ? `EQUATION: ${n.latex}` : n.text || (n.items||[]).join("; ")
    ).filter(Boolean).join("\n");

    const fullSummary = [
      `=== LLAMA 3.2 VISION ANALYSIS ===`,
      finalVision || `[No vision result — student drew ${strokeCount.current} strokes]`,
      notesSummary ? `\n=== REFERENCE NOTES ===\n${notesSummary}` : ""
    ].filter(Boolean).join("\n");

    onSubmit(flat.toDataURL("image/png"), fullSummary, noteBlocks);
  };

  const renderNote = (el, i) => {
    if (!el) return null;
    switch (el.type) {
      case "heading": return <div key={i} style={{ fontFamily:"var(--serif)", fontSize:15, fontWeight:700, marginBottom:4 }}>{el.text}</div>;
      case "text":    return <div key={i} style={{ fontSize:12, lineHeight:1.6, marginBottom:3 }}>{renderInline(el.text||"")}</div>;
      case "math":    return <div key={i} style={{ marginBottom:4 }}><KMath m={el.latex||""} display /></div>;
      case "bullet":  return <ul key={i} style={{ paddingLeft:16, marginBottom:4 }}>{(el.items||[]).map((it,j) => <li key={j} style={{ fontSize:12, lineHeight:1.55 }}>{renderInline(it)}</li>)}</ul>;
      case "divider": return <hr key={i} style={{ border:"none", borderTop:"1px solid var(--border)", margin:"6px 0" }} />;
      default:        return el.text ? <div key={i} style={{ fontSize:12, lineHeight:1.6 }}>{renderInline(el.text)}</div> : null;
    }
  };

  return (
    <div className="wb-outer">
      {/* ── TOOLBAR ── */}
      <div className="wb-toolbar">
        <div className="wb-title">✏️ Whiteboard</div>
        <div className="wb-tools">
          {COLORS.map(c => (
            <div key={c} className={`wb-swatch${color===c && mode==="pen" ? " on" : ""}`}
              style={{ background: c }} onClick={() => { setColor(c); setMode("pen"); }} />
          ))}
          <div className="wb-sep" />
          <button className={`wbt${mode==="pen" ? " on" : ""}`} onClick={() => setMode("pen")} title="Pen">✏️</button>
          <button className={`wbt${mode==="eraser" ? " on" : ""}`} onClick={() => setMode("eraser")} title="Eraser">🧹</button>
          <div className="wb-sep" />
          {SIZES.map(s => (
            <button key={s} className={`wbt${sz===s && mode==="pen" ? " on" : ""}`}
              onClick={() => { setSz(s); setMode("pen"); }}
              title={`Size ${s}`}
              style={{ fontSize: 6 + s * 1.5, lineHeight: 1 }}>●</button>
          ))}
          <div className="wb-sep" />
          <button className="wbt" title="Clear canvas" onClick={clearCanvas}>🗑️</button>
        </div>
      </div>

      {/* ── CHALLENGE PROMPT ── */}
      <div className="wb-prompt-box">
        <span className="wbp-lbl">🎯 Challenge</span>
        <p>{prompt}</p>
      </div>

      {/* ── REFERENCE NOTES (collapsible, above canvas) ── */}
      {noteBlocks.length > 0 && (
        <div style={{ maxHeight: showNotes ? 240 : 0, overflow:"hidden", transition:"max-height .3s ease", background:"#fff", borderBottom: showNotes ? "1.5px solid var(--border)" : "none" }}>
          <div style={{ maxHeight:240, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:5 }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>Reference Notes</span>
              <button onClick={() => setShowNotes(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:13 }}>✕</button>
            </div>
            {noteBlocks.map((el, i) => renderNote(el, i))}
          </div>
        </div>
      )}

      {/* ── CANVAS ── */}
      <div style={{ position:"relative", width:"100%", background:"#fdfaf5", height:360, flexShrink:0 }}>
        <canvas
          ref={canvasRef} width={W} height={H}
          style={{ display:"block", width:"100%", height:"100%", cursor: mode==="eraser" ? "cell" : "crosshair", touchAction: isDrawing ? "none" : "pan-y" }}
          onMouseDown={startDraw} onMouseMove={onMove} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={onMove} onTouchEnd={endDraw}
        />
        {/* Vision status badge */}
        {(scanning || visionStatus) && (
          <div style={{ position:"absolute", bottom:8, right:10, display:"flex", alignItems:"center", gap:6, background:"rgba(20,20,24,.82)", borderRadius:20, padding:"5px 13px", fontSize:11, fontFamily:"var(--mono)", color: scanning ? "var(--gold)" : visionStatus.startsWith("✅") ? "#6fcf97" : "#f2994a", pointerEvents:"none" }}>
            {scanning && <div style={{ width:9, height:9, border:"2px solid rgba(200,134,26,.4)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin .6s linear infinite", flexShrink:0 }} />}
            {visionStatus || "Scanning…"}
          </div>
        )}
      </div>

      {/* ── VISION READOUT — what the AI can see ── */}
      {visionResult && !scanning && (
        <details style={{ borderTop:"1px solid var(--border)", background:"var(--cream)" }}>
          <summary style={{ padding:"8px 14px", cursor:"pointer", fontSize:11, fontFamily:"var(--mono)", color:"var(--pine)", letterSpacing:1, textTransform:"uppercase", userSelect:"none" }}>
            👁 What Llama 3.2 Vision Sees (click to expand)
          </summary>
          <pre style={{ padding:"10px 14px 14px", fontSize:11, color:"var(--muted)", lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:200, overflowY:"auto", margin:0 }}>
            {visionResult}
          </pre>
        </details>
      )}

      {/* ── FOOTER ACTIONS ── */}
      <div style={{ display:"flex", gap:8, padding:"10px 14px", flexWrap:"wrap", alignItems:"center", borderTop:"1px solid var(--border)", background:"#fff" }}>
        <button className="btn btn-gold" onClick={submit} disabled={evaluating || scanning}>
          {evaluating ? "⏳ Reviewing…" : scanning ? "⏳ Scanning…" : "✨ Submit for Review"}
        </button>
        <button className="btn btn-outline btn-sm" onClick={generateNotes} disabled={genLoading}>
          {genLoading ? "⏳…" : noteBlocks.length > 0 ? (showNotes ? "📝 Hide Notes" : "📝 Show Notes") : "📝 Reference Notes"}
        </button>
        <button className="btn btn-outline btn-sm" onClick={clearAll}>🗑️ Clear</button>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)", lineHeight:1.5 }}>
            Llama 3.2 Vision · Puter.js · free
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WORKBOOK
// ─────────────────────────────────────────────────────────────────────
function Workbook({ user, masteredLessons, subject, subjectId, refreshKey }) {
  const [problems, setProblems]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [genLoading, setGenLoading]   = useState(false);
  const [genError, setGenError]       = useState("");
  // Problem set mode: { setProbs, lessonTitle, difficulty, idx }
  const [activeSet, setActiveSet]     = useState(null);
  const [answerInput, setAnswerInput] = useState("");
  const [checking, setChecking]       = useState(false);
  const [result, setResult]           = useState(null); // { passed, feedback, aiExplanation }
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const KEY = `workbook:${user?.id || "guest"}`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const saved = await storeGet(KEY);
      setProblems(Array.isArray(saved) ? saved : []);
      setLoading(false);
    })();
  }, [KEY, refreshKey]);

  const generateProblems = async () => {
    if (!subject) return;
    setGenLoading(true); setGenError("");
    const lessons = Array.from(masteredLessons).filter(l => !l.endsWith("__s"));
    if (lessons.length === 0) {
      setGenError("Master at least one lesson first.");
      setGenLoading(false); return;
    }
    const focusLesson = lessons[lessons.length - 1];
    const os = getOpenStaxContext(subjectId, subject);
    const dueDates = forgettingCurveDates(30);
    try {
      const txt = await aiSearch([{ role: "user", content:
        `Search for practice problems about "${focusLesson}" in ${subject}.\n` +
        `Look for questions from Khan Academy, OpenStax, MIT OCW, and similar sites.\n\n` +
        `Generate exactly 30 problems testing "${focusLesson}". Show blanks as "_____" (five underscores) — never write the word blank.\n` +
        `Only use concepts from: ${lessons.join(", ")}.\n` +
        `Each answer must be SHORT (number, word, or phrase).\n` +
        `Mix: 10 easy, 10 medium, 10 hard. Use $...$ for LaTeX math.\n\n` +
        `Return ONLY a JSON array of 30 objects:\n` +
        `[{"topic":"${focusLesson}","question":"...","correctAnswer":"short answer","explanation":"brief explanation","difficulty":"easy|medium|hard","status":"pending","source":"${os.textbook}"}]`
      }], `You are a ${subject} curriculum expert. Search for real practice problems. Return ONLY a raw JSON array.`, 8000);
      let p = robustJSON(txt);
      if (!p || !Array.isArray(p) || p.length === 0) throw new Error("Couldn't generate problems.");
      p = p.slice(0, 30);
      const setId = `manual_${Date.now()}`;
      const newProbs = p.map((prob, i) => ({
        ...prob, id: `p${Date.now()}${i}`, status: "pending",
        topic: prob.topic || focusLesson, lessonSource: focusLesson, setId,
        dueDate: dueDates[i] || addDays(today(), 1),
        reviewInterval: FORGETTING_CURVE[Math.floor(i / 6)] || 30,
        source: prob.source || os.textbook, userAnswer: "",
      }));
      setProblems(prev => { const m = [...prev, ...newProbs]; storeSet(KEY, m); return m; });
    } catch (e) { setGenError(e.message || "Something went wrong."); }
    setGenLoading(false);
  };

  const getDueStatus = (p) => {
    if (p.status === "done") return "done";
    if (!p.dueDate) return "due";
    const d = p.dueDate, t = today();
    if (d < t) return "overdue"; if (d === t) return "due"; return "upcoming";
  };

  const markDone = (id) => {
    setProblems(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: "done", doneDate: today() } : p);
      storeSet(KEY, updated); return updated;
    });
  };

  const deleteProblem = (id) => {
    setProblems(prev => { const f = prev.filter(p => p.id !== id); storeSet(KEY, f); return f; });
  };

  // ── PROBLEM SET SESSION ──
  const startSet = (probs, lessonTitle, difficulty) => {
    const pending = probs.filter(p => p.status !== "done");
    if (pending.length === 0) return;
    setActiveSet({ setProbs: pending, lessonTitle, difficulty, idx: 0 });
    setAnswerInput(""); setResult(null); setShowSolution(false);
  };

  const exitSet = () => { setActiveSet(null); setResult(null); setAnswerInput(""); setShowSolution(false); };

  const advanceSet = () => {
    if (!activeSet) return;
    const next = activeSet.idx + 1;
    if (next >= activeSet.setProbs.length) { exitSet(); return; }
    setActiveSet(s => ({ ...s, idx: next }));
    setAnswerInput(""); setResult(null); setShowSolution(false);
  };

  const skipProblem = () => advanceSet();

  const checkAnswer = async () => {
    if (!activeSet || checking) return;
    const prob = activeSet.setProbs[activeSet.idx];
    const userAns = answerInput.trim();
    if (!userAns) return;
    setChecking(true); setResult(null);
    try {
      const txt = await ai([{ role: "user", content:
        `Question: ${prob.question}\nCorrect answer: ${prob.correctAnswer}\nStudent's answer: ${userAns}\n\n` +
        `Is the student's answer correct or equivalent? Accept minor spelling errors, equivalent math expressions, synonyms.\n` +
        `Return JSON: {"passed":true,"feedback":"1 sentence"} or {"passed":false,"feedback":"1 sentence pointing out the error"}`
      }], "You are grading a fill-in-the-blank answer. Be concise and fair. Return ONLY JSON.", 200, true);
      let r = robustJSON(txt);
      if (!r || typeof r.passed !== "boolean") {
        const ul = userAns.toLowerCase(), cl = (prob.correctAnswer||"").trim().toLowerCase();
        r = { passed: ul === cl || ul.replace(/\s+/g,"") === cl.replace(/\s+/g,""),
              feedback: ul === cl ? "Correct!" : `Expected: ${prob.correctAnswer}` };
      }
      setResult({ ...r, correctAnswer: prob.correctAnswer });
      if (r.passed) markDone(prob.id);
      // If wrong, auto-fetch AI explanation
      if (!r.passed) {
        setLoadingExplanation(true);
        try {
          const expTxt = await ai([{ role: "user", content:
            `A student answered a ${subject} practice problem wrong.\n\n` +
            `Question: ${prob.question}\n` +
            `Correct answer: ${prob.correctAnswer}\n` +
            `Student answered: ${userAns}\n` +
            `Textbook explanation: ${prob.explanation || "N/A"}\n\n` +
            `Write a clear, friendly 3-5 sentence explanation of:\n` +
            `1. Why the correct answer is right\n` +
            `2. What concept the student may have missed\n` +
            `3. A memory tip or shortcut for next time\n` +
            `Be encouraging. Use plain text, no markdown headers.`
          }], `You are a helpful ${subject} tutor giving a warm, clear explanation.`, 400);
          setResult(r2 => ({ ...r2, aiExplanation: expTxt }));
        } catch { /* skip explanation if it fails */ }
        setLoadingExplanation(false);
      }
    } catch (e) {
      const ul = answerInput.trim().toLowerCase(), cl = (prob.correctAnswer||"").trim().toLowerCase();
      const passed = ul === cl;
      setResult({ passed, feedback: passed ? "Correct!" : `Expected: ${prob.correctAnswer}`, correctAnswer: prob.correctAnswer });
      if (passed) markDone(prob.id);
    }
    setChecking(false);
  };

  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-msg">Loading Workbook</div></div>;

  // ── PROBLEM SET SESSION VIEW ──
  if (activeSet) {
    const { setProbs, lessonTitle, difficulty, idx } = activeSet;
    const prob = setProbs[idx];
    const progress = idx / setProbs.length;
    const diffColor = difficulty === "easy" ? "var(--pine)" : difficulty === "hard" ? "var(--rust)" : "var(--gold)";
    const diffEmoji = difficulty === "easy" ? "🟢" : difficulty === "hard" ? "🔴" : "🟡";

    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 4px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button className="btn btn-outline btn-sm" onClick={exitSet}>✕ Exit</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", letterSpacing:1, textTransform:"uppercase" }}>
              {diffEmoji} {difficulty} · {lessonTitle}
            </div>
          </div>
          <div style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--muted)" }}>{idx + 1} / {setProbs.length}</div>
        </div>

        {/* Progress bar */}
        <div style={{ height:6, background:"var(--border)", borderRadius:99, marginBottom:32, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(idx/setProbs.length)*100}%`, background: diffColor, borderRadius:99, transition:"width 0.4s ease" }} />
        </div>

        {/* Question card */}
        <div style={{ background:"#fff", border:"1.5px solid var(--border)", borderRadius:"var(--r-lg)", padding:"32px 28px", marginBottom:20 }}>
          <div style={{ fontSize:11, fontFamily:"var(--mono)", color: diffColor, letterSpacing:2, textTransform:"uppercase", marginBottom:16, fontWeight:700 }}>
            Question {idx + 1}
          </div>
          <div style={{ fontSize:17, lineHeight:1.75, fontFamily:"var(--serif)", fontWeight:500, marginBottom:28 }}>
            {renderInline(prob.question)}
          </div>

          {/* Answer input (only when no result yet) */}
          {!result && (
            <div>
              <input
                type="text"
                className="inp"
                value={answerInput}
                onChange={e => setAnswerInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !checking && answerInput.trim() && checkAnswer()}
                placeholder="Type your answer…"
                autoFocus
                disabled={checking}
                style={{ marginBottom:12 }}
              />
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-gold" onClick={checkAnswer} disabled={!answerInput.trim() || checking}>
                  {checking ? "⏳ Checking…" : "Check Answer →"}
                </button>
                <button className="btn btn-outline btn-sm" onClick={skipProblem} disabled={checking}>Skip</button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowSolution(s => !s)} style={{ marginLeft:"auto" }}>
                  {showSolution ? "Hide hint" : "Hint"}
                </button>
              </div>
              {showSolution && prob.explanation && (
                <div style={{ marginTop:12, padding:"12px 14px", background:"var(--gold-pale)", border:"1px solid var(--gold)", borderRadius:"var(--r)", fontSize:13, lineHeight:1.7, color:"var(--ink)" }}>
                  💡 {renderInline(prob.explanation)}
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              {/* Pass / Fail banner */}
              <div style={{
                padding:"16px 18px", borderRadius:"var(--r)", marginBottom:16,
                background: result.passed ? "var(--pine-pale)" : "var(--rust-pale)",
                border: `2px solid ${result.passed ? "rgba(26,92,74,.25)" : "rgba(158,58,26,.25)"}`,
                display:"flex", alignItems:"flex-start", gap:12
              }}>
                <span style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>{result.passed ? "✅" : "❌"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color: result.passed ? "var(--pine)" : "var(--rust)", marginBottom:4 }}>
                    {result.passed ? "Correct!" : "Not quite"}
                  </div>
                  <div style={{ fontSize:13, color:"#333", lineHeight:1.6 }}>{result.feedback}</div>
                  {!result.passed && (
                    <div style={{ marginTop:8, fontSize:13, fontFamily:"var(--mono)", color:"var(--pine)", background:"var(--pine-pale)", display:"inline-block", padding:"3px 10px", borderRadius:6 }}>
                      ✓ Answer: {result.correctAnswer}
                    </div>
                  )}
                </div>
              </div>

              {/* AI explanation for wrong answers */}
              {!result.passed && (
                <div style={{ marginBottom:16, padding:"16px 18px", background:"#fafaf8", border:"1.5px solid var(--border)", borderRadius:"var(--r)", minHeight:64 }}>
                  <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--gold)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>
                    🤖 AI Explanation
                  </div>
                  {loadingExplanation ? (
                    <div style={{ display:"flex", alignItems:"center", gap:10, color:"var(--muted)", fontSize:13 }}>
                      <div style={{ width:14, height:14, border:"2px solid rgba(200,134,26,.3)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                      Generating explanation…
                    </div>
                  ) : result.aiExplanation ? (
                    <div style={{ fontSize:14, lineHeight:1.8, color:"var(--ink)" }}>{result.aiExplanation}</div>
                  ) : (
                    <div style={{ fontSize:13, color:"var(--muted)" }}>{prob.explanation || "Review the concept in your lesson notes."}</div>
                  )}
                </div>
              )}

              {/* Source */}
              {prob.source && (
                <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)", marginBottom:16 }}>
                  📖 {prob.source.slice(0, 60)}
                </div>
              )}

              {/* Next button */}
              <div style={{ display:"flex", gap:8 }}>
                {result.passed ? (
                  <button className="btn btn-pine" onClick={advanceSet}>
                    {idx + 1 >= setProbs.length ? "Finish Set ✓" : "Next Problem →"}
                  </button>
                ) : (
                  <>
                    <button className="btn btn-gold" onClick={() => { setResult(null); setAnswerInput(""); }}>Try Again ↩</button>
                    <button className="btn btn-outline btn-sm" onClick={advanceSet}>
                      {idx + 1 >= setProbs.length ? "Finish" : "Skip →"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mini progress dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:5, flexWrap:"wrap", marginTop:8 }}>
          {setProbs.map((p, i) => (
            <div key={p.id} style={{
              width:8, height:8, borderRadius:"50%",
              background: i < idx ? "var(--pine)" : i === idx ? diffColor : "var(--border)",
              transition:"background 0.3s"
            }} />
          ))}
        </div>
      </div>
    );
  }

  // ── WORKBOOK OVERVIEW ──
  const doneProbsList = problems.filter(p => p.status === "done");
  const byLesson = {};
  problems.forEach(p => {
    if (p.status === "done") return;
    const lesson = p.lessonSource || p.topic || "General";
    if (!byLesson[lesson]) byLesson[lesson] = { easy: [], medium: [], hard: [] };
    const diff = (p.difficulty || "medium").toLowerCase();
    if (diff === "easy") byLesson[lesson].easy.push(p);
    else if (diff === "hard") byLesson[lesson].hard.push(p);
    else byLesson[lesson].medium.push(p);
  });

  const sortedLessons = Object.entries(byLesson).sort(([, a], [, b]) => {
    const allA = [...a.easy, ...a.medium, ...a.hard];
    const allB = [...b.easy, ...b.medium, ...b.hard];
    const urgA = allA.some(p => ["due","overdue"].includes(getDueStatus(p))) ? 0 : 1;
    const urgB = allB.some(p => ["due","overdue"].includes(getDueStatus(p))) ? 0 : 1;
    if (urgA !== urgB) return urgA - urgB;
    const minDateA = allA.reduce((m, p) => p.dueDate < m ? p.dueDate : m, "9999");
    const minDateB = allB.reduce((m, p) => p.dueDate < m ? p.dueDate : m, "9999");
    return minDateA.localeCompare(minDateB);
  });

  const totalDue = problems.filter(p => ["due","overdue"].includes(getDueStatus(p))).length;
  const totalUpcoming = problems.filter(p => getDueStatus(p) === "upcoming").length;

  // Difficulty set card
  const DiffSetCard = ({ label, emoji, accent, probs, lessonTitle }) => {
    if (probs.length === 0) return null;
    const pendingCount = probs.filter(p => p.status !== "done").length;
    const doneCount = probs.length - pendingCount;
    const dueCount = probs.filter(p => ["due","overdue"].includes(getDueStatus(p))).length;
    const nextDue = probs.filter(p => p.status !== "done").reduce((m, p) => (!m || p.dueDate < m) ? p.dueDate : m, null);
    const isOverdue = probs.some(p => getDueStatus(p) === "overdue");
    const isDue = probs.some(p => getDueStatus(p) === "due");
    const pct = probs.length > 0 ? Math.round((doneCount / probs.length) * 100) : 0;

    return (
      <div style={{
        border:`1.5px solid ${isOverdue ? "var(--rust)" : isDue ? accent : "var(--border)"}`,
        borderRadius:"var(--r)", padding:"16px 18px",
        background: isOverdue ? "rgba(158,58,26,.04)" : isDue ? `rgba(${accent === "var(--pine)" ? "26,92,74" : accent === "var(--rust)" ? "158,58,26" : "200,134,26"},.04)` : "#fff",
        display:"flex", alignItems:"center", gap:14
      }}>
        {/* Radial progress */}
        <div style={{ flexShrink:0, position:"relative", width:48, height:48 }}>
          <svg width="48" height="48" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke={accent} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct/100)}`}
              strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontFamily:"var(--mono)", fontWeight:700, color: accent }}>{pct}%</div>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:700, color: accent }}>{emoji} {label}</span>
            {dueCount > 0 && <span style={{ fontSize:10, background: accent, color:"#fff", padding:"1px 7px", borderRadius:99, fontFamily:"var(--mono)", fontWeight:700 }}>{dueCount} due</span>}
            {dueCount === 0 && nextDue && <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)" }}>next {nextDue}</span>}
          </div>
          <div style={{ fontSize:12, color:"var(--muted)" }}>{doneCount}/{probs.length} complete</div>
        </div>

        {pendingCount > 0 ? (
          <button className="btn btn-gold btn-sm" style={{ flexShrink:0 }}
            onClick={() => startSet(probs, lessonTitle, label.toLowerCase())}>
            Practice →
          </button>
        ) : (
          <span style={{ fontSize:11, color:"var(--pine)", fontFamily:"var(--mono)", fontWeight:700, flexShrink:0 }}>✓ Done</span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="wb-header">
        <div>
          <div className="sec-h">📋 Workbook</div>
          <p className="muted">30 problems per lesson · spaced over 1, 3, 7, 14, 30 days · auto-assigned on mastery.</p>
        </div>
        <div className="wb-stats">
          <div className="wb-stat"><div className="wb-stat-n">{totalDue}</div><div className="wb-stat-l">Due Now</div></div>
          <div className="wb-stat"><div className="wb-stat-n">{totalUpcoming}</div><div className="wb-stat-l">Upcoming</div></div>
          <div className="wb-stat"><div className="wb-stat-n">{doneProbsList.length}</div><div className="wb-stat-l">Done</div></div>
        </div>
      </div>

      {problems.length === 0 ? (
        <div className="wb-empty">
          <div style={{ fontSize:36, marginBottom:12 }}>📝</div>
          <p style={{ fontFamily:"var(--serif)", fontSize:16, marginBottom:8 }}>No problems yet.</p>
          <p className="muted mb3">Master a lesson and 30 problems will be auto-assigned here, spaced across 30 days.</p>
          {genError && <div style={{ background:"var(--gold-pale)", border:"1.5px solid var(--gold)", borderRadius:"var(--r)", padding:"10px 14px", margin:"12px 0", fontSize:13 }}>⚠️ {genError}</div>}
          <button className="btn btn-gold wb-gen-btn" disabled={!subject || genLoading} onClick={generateProblems}>
            {genLoading ? "⏳ Generating…" : "Generate Problems Now"}
          </button>
        </div>
      ) : (
        <>
          <div className="row mb3" style={{ flexWrap:"wrap", gap:8 }}>
            <button className="btn btn-gold btn-sm" disabled={!subject || genLoading} onClick={generateProblems}>
              {genLoading ? "⏳ Generating…" : "+ 30 More Problems"}
            </button>
            {genError && <span style={{ fontSize:12, color:"var(--rust)", alignSelf:"center" }}>⚠️ {genError}</span>}
          </div>

          {/* Lesson cards */}
          {sortedLessons.map(([lessonTitle, buckets]) => {
            const allProbs = [...buckets.easy, ...buckets.medium, ...buckets.hard];
            const hasOverdue = allProbs.some(p => getDueStatus(p) === "overdue");
            const hasDue = allProbs.some(p => getDueStatus(p) === "due");
            const doneHere = problems.filter(p => (p.lessonSource || p.topic || "General") === lessonTitle && p.status === "done").length;
            const totalHere = allProbs.length + doneHere;
            const borderColor = hasOverdue ? "var(--rust)" : hasDue ? "var(--gold)" : "var(--border)";
            const headerBg = hasOverdue ? "rgba(158,58,26,.06)" : hasDue ? "var(--gold-pale)" : "var(--bg)";

            return (
              <div key={lessonTitle} style={{ border:`1.5px solid ${borderColor}`, borderRadius:"var(--r-lg)", marginBottom:16, overflow:"hidden" }}>
                {/* Lesson header */}
                <div style={{ background:headerBg, padding:"14px 18px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${borderColor}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:"var(--serif)" }}>{lessonTitle}</div>
                    <div style={{ fontSize:11, color:"var(--muted)", marginTop:2, fontFamily:"var(--mono)" }}>
                      {hasOverdue ? "⚠️ Overdue" : hasDue ? "🔥 Due today" : "📅 Upcoming"} · {doneHere}/{totalHere} done
                    </div>
                  </div>
                  {(buckets.easy.length + buckets.medium.length + buckets.hard.length > 0) && (
                    <button className="btn btn-pine btn-sm" onClick={() => startSet(allProbs, lessonTitle, "mixed")}>
                      Start All →
                    </button>
                  )}
                </div>

                {/* Difficulty set cards */}
                <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                  <DiffSetCard label="Easy" emoji="🟢" accent="var(--pine)" probs={buckets.easy} lessonTitle={lessonTitle} />
                  <DiffSetCard label="Medium" emoji="🟡" accent="var(--gold)" probs={buckets.medium} lessonTitle={lessonTitle} />
                  <DiffSetCard label="Hard" emoji="🔴" accent="var(--rust)" probs={buckets.hard} lessonTitle={lessonTitle} />
                </div>
              </div>
            );
          })}

          {/* Completed problems */}
          {doneProbsList.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div className="wb-section-title">✅ Completed <span className="tag tag-pine">{doneProbsList.length}</span></div>
              <div style={{ fontSize:13, color:"var(--muted)", padding:"8px 4px" }}>
                {doneProbsList.length} problem{doneProbsList.length !== 1 ? "s" : ""} completed across all lessons.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────
// CHALLENGE PROBLEMS — whiteboard-based real-world & derivation challenges
// Different from Workbook: these require the student to DRAW/DERIVE on the
// whiteboard, not just solve on paper. Focused on application & synthesis.
// ─────────────────────────────────────────────────────────────────────
function ChallengeProblems({ user, masteredLessons, subject, subjectId, refreshKey }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState(null); // currently open challenge
  const [evaluating, setEvaluating] = useState(false);
  const [challengeResult, setChallengeResult] = useState(null);
  const [genError, setGenError]     = useState("");

  const KEY = `challenges:${user?.id || "guest"}`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const saved = await storeGet(KEY);
      setChallenges(Array.isArray(saved) ? saved : []);
      setLoading(false);
    })();
  }, [KEY, refreshKey]);

  const generateChallenges = async () => {
    if (!subject) { setGenError("Select a subject first."); return; }
    setGenLoading(true); setGenError("");

    const lessons = Array.from(masteredLessons).filter(l => !l.endsWith("__s"));
    if (lessons.length === 0) {
      setGenError("Master at least one lesson before generating challenges.");
      setGenLoading(false); return;
    }

    // Focus on most recently mastered lesson — don't use future topics
    const focusLesson = lessons[lessons.length - 1];
    const os = getOpenStaxContext(subjectId, subject);
    // Spaced due dates for new manual challenges
    const dueDates = [addDays(today(), 1), addDays(today(), 7), addDays(today(), 14), addDays(today(), 21)];

    try {
      const txt = await ai([{ role: "user", content:
        `Create 4 whiteboard challenge problems for a student studying ${subject}.\n\n` +
        `MASTERED LESSONS (use ONLY these topics): ${lessons.join(", ")}.\n` +
        `Focus primarily on: "${focusLesson}".\n` +
        `DO NOT reference topics not in the mastered list above.\n\n` +
        `These require drawing/deriving on a whiteboard — not just writing an answer.\n` +
        `Mix one of each type:\n` +
        `1. Real-world application of "${focusLesson}" — scenario + labeled diagram\n` +
        `2. Derivation — show step-by-step work for a key result from "${focusLesson}"\n` +
        `3. Concept synthesis — connect "${focusLesson}" to another mastered topic\n` +
        `4. Visual model — build a labeled diagram or graph for "${focusLesson}"\n\n` +
        `Based on: ${os.textbook}\n\n` +
        `Return ONLY a raw JSON array of 4 objects:\n` +
        `[{"title":"...","type":"application|derivation|synthesis|diagram","context":"2-3 sentence real-world setup","prompt":"Clear whiteboard instructions","idealAnswer":"What a complete answer includes","difficulty":"medium|hard","lessonLinks":["${focusLesson}"],"source":"${os.textbook}"}]`
      }], `You are a ${subject} challenge designer creating problems only from mastered topics. Return ONLY a raw JSON array.`, 3000, true);

      const p = robustJSON(txt);
      if (!p || !Array.isArray(p)) throw new Error("Unexpected format — try again.");

      const newChallenges = p.slice(0, 4).map((c, i) => ({
        ...c,
        id: `ch_${Date.now()}_${i}`,
        status: "pending",
        createdAt: today(),
        dueDate: dueDates[i] || addDays(today(), 7),
        fromLesson: focusLesson,
      }));

      setChallenges(prev => {
        const merged = [...prev, ...newChallenges];
        storeSet(KEY, merged);
        return merged;
      });
    } catch (e) {
      setGenError(e.message || "Failed to generate challenges.");
    }
    setGenLoading(false);
  };

  const evaluateChallenge = async (canvasDataUrl, visionSummary) => {
    if (!activeChallenge) return;
    setEvaluating(true); setChallengeResult(null);
    try {
      const hasContent = visionSummary?.trim().length > 20 && !visionSummary.includes("BLANK OR NEARLY BLANK");

      const result = await ai([{ role: "user", content:
        `Grade this student's whiteboard response to a challenge problem.\n\n` +
        `CHALLENGE: "${activeChallenge.title}"\n` +
        `TYPE: ${activeChallenge.type}\n` +
        `PROMPT GIVEN: ${activeChallenge.prompt}\n` +
        `IDEAL ANSWER INCLUDES: ${activeChallenge.idealAnswer}\n\n` +
        `LLAMA VISION REPORT:\n` +
        (hasContent ? visionSummary : "[BLANK OR INCOMPLETE — nothing meaningful drawn]") +
        `\n\n` +
        `GRADING:\n` +
        `- This is a challenge problem (harder than mastery checks) — be appropriately rigorous\n` +
        `- PASS if the student demonstrates the core concept with reasonable accuracy\n` +
        `- Explain specifically what was correct, what was wrong, and what the correct answer should be\n` +
        `- Be encouraging but honest\n\n` +
        `Return ONLY raw JSON:\n` +
        `{"passed":true_or_false,"score":"X/10","feedback":"specific 2-3 sentence feedback explaining what was right/wrong","correction":"brief explanation of the ideal answer","encouragement":"one encouraging sentence"}`
      }], "Grade the challenge. Return ONLY raw JSON.", 1200, true);

      const r = robustJSON(result);
      if (r) {
        setChallengeResult(r);
        if (r.passed) {
          setChallenges(prev => {
            const updated = prev.map(c => c.id === activeChallenge.id ? { ...c, status: "completed", score: r.score } : c);
            storeSet(KEY, updated);
            return updated;
          });
        }
      }
    } catch (e) {
      setChallengeResult({ passed: false, score: "—", feedback: "Evaluation error — try again.", correction: "", encouragement: "" });
    }
    setEvaluating(false);
  };

  const deleteChallenge = (id) => {
    setChallenges(prev => {
      const filtered = prev.filter(c => c.id !== id);
      storeSet(KEY, filtered);
      return filtered;
    });
  };

  const typeIcon = { application: "🌍", derivation: "📐", synthesis: "🔗", diagram: "🗺️" };
  const typeColor = { application: "var(--gold)", derivation: "var(--pine)", synthesis: "#5b4fcf", diagram: "var(--rust)" };

  if (loading) return <div className="loading"><div className="spinner" /><div className="loading-msg">Loading Challenges</div></div>;

  // If a challenge is open, show its whiteboard
  if (activeChallenge) {
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setActiveChallenge(null); setChallengeResult(null); }}>← Back</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontFamily:"var(--mono)", color:"var(--muted)", letterSpacing:1, textTransform:"uppercase" }}>
              {typeIcon[activeChallenge.type]} {activeChallenge.type} challenge
            </div>
            <div style={{ fontSize:17, fontWeight:700, fontFamily:"var(--serif)", marginTop:2 }}>{activeChallenge.title}</div>
          </div>
        </div>

        {/* Context / motivation */}
        <div style={{ background:"var(--gold-pale)", border:"1.5px solid var(--gold)", borderRadius:"var(--r)", padding:"12px 16px", marginBottom:16, fontSize:14, lineHeight:1.7 }}>
          <div style={{ fontSize:10, fontFamily:"var(--mono)", color:"var(--gold)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6, fontWeight:700 }}>📖 Context</div>
          {activeChallenge.context}
        </div>

        {/* Whiteboard */}
        <SmartWhiteboard
          prompt={activeChallenge.prompt}
          onSubmit={(dataUrl, vision) => evaluateChallenge(dataUrl, vision)}
          evaluating={evaluating}
        />

        {evaluating && <div className="loading mt2"><div className="spinner" /><div className="loading-msg">Grading Challenge</div></div>}

        {challengeResult && !evaluating && (
          <div className={`mr ${challengeResult.passed ? "mr-pass" : "mr-fail"}`} style={{ marginTop:16 }}>
            <h3>{challengeResult.passed ? "🎉 Challenge Complete!" : "📚 Keep Working"}</h3>
            <div className={`mr-pill ${challengeResult.passed ? "mrp-pass" : "mrp-fail"}`}>Score: {challengeResult.score}</div>
            <div className="mr-feedback">{challengeResult.feedback}</div>
            {challengeResult.correction && (
              <div style={{ background:"rgba(26,92,74,.06)", border:"1px solid var(--pine)", borderRadius:"var(--r)", padding:"10px 14px", marginTop:10, fontSize:13, lineHeight:1.7 }}>
                <strong>✅ Ideal Answer:</strong> {challengeResult.correction}
              </div>
            )}
            {challengeResult.encouragement && <div className="mr-reflect">💪 {challengeResult.encouragement}</div>}
            <div className="row mt3">
              {!challengeResult.passed && <button className="btn btn-gold" onClick={() => setChallengeResult(null)}>Try Again ↩</button>}
              <button className="btn btn-outline btn-sm" onClick={() => { setActiveChallenge(null); setChallengeResult(null); }}>Back to Challenges</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Challenge list view
  const pending   = challenges.filter(c => c.status !== "completed");
  const completed = challenges.filter(c => c.status === "completed");

  return (
    <div>
      <div className="wb-header">
        <div>
          <div className="sec-h">🔥 Challenge Problems</div>
          <p className="muted">3 challenges auto-assigned per mastered lesson · spaced at 1, 7, 14 days · only covers topics you've learned.</p>
        </div>
        <div className="wb-stats">
          <div className="wb-stat"><div className="wb-stat-n">{pending.length}</div><div className="wb-stat-l">Open</div></div>
          <div className="wb-stat"><div className="wb-stat-n">{completed.length}</div><div className="wb-stat-l">Done</div></div>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="wb-empty">
          <div style={{ fontSize:40, marginBottom:12 }}>🔥</div>
          <p style={{ fontFamily:"var(--serif)", fontSize:16, marginBottom:8 }}>No challenges yet.</p>
          <p className="muted mb3">Master a lesson and 3 challenges will be auto-assigned here, spaced over 14 days using the forgetting curve.</p>
          {genError && <div style={{ color:"var(--rust)", fontSize:13, marginBottom:12 }}>⚠️ {genError}</div>}
          <button className="btn btn-gold" disabled={!subject || genLoading} onClick={generateChallenges}>
            {genLoading ? "⏳ Generating…" : "Generate Challenges"}
          </button>
        </div>
      ) : (
        <>
          <div className="row mb3" style={{ flexWrap:"wrap", gap:8 }}>
            <button className="btn btn-gold btn-sm" disabled={!subject || genLoading} onClick={generateChallenges}>
              {genLoading ? "⏳ Generating…" : "+ More Challenges"}
            </button>
            {genError && <span style={{ fontSize:12, color:"var(--rust)", alignSelf:"center" }}>⚠️ {genError}</span>}
          </div>

          {pending.length > 0 && (
            <div style={{ marginBottom:24 }}>
              {pending.map(c => {
                const isOverdue = c.dueDate && c.dueDate < today();
                const isDueToday = c.dueDate === today();
                const dueBadgeColor = isOverdue ? "var(--rust)" : isDueToday ? "var(--gold)" : "var(--muted)";
                const dueBadge = isOverdue ? `⚠️ Overdue (${c.dueDate})` : isDueToday ? "🔥 Due Today" : c.dueDate ? `📅 Due ${c.dueDate}` : null;
                return (
                <div key={c.id} style={{ border:`1.5px solid ${isOverdue ? "var(--rust)" : isDueToday ? "var(--gold)" : "var(--border)"}`, borderRadius:"var(--r-lg)", marginBottom:12, overflow:"hidden", background: isOverdue ? "rgba(158,58,26,.04)" : isDueToday ? "var(--gold-pale)" : "#fff" }}>
                  <div style={{ padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ fontSize:28, lineHeight:1, flexShrink:0 }}>{typeIcon[c.type] || "🔥"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontFamily:"var(--mono)", fontWeight:700, color: typeColor[c.type] || "var(--gold)", textTransform:"uppercase", letterSpacing:1 }}>{c.type}</span>
                        <span style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--mono)" }}>{c.difficulty === "hard" ? "🔴 Hard" : "🟡 Medium"}</span>
                        {dueBadge && <span style={{ fontSize:10, fontFamily:"var(--mono)", color: dueBadgeColor, fontWeight:700 }}>{dueBadge}</span>}
                        {c.fromLesson && <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--mono)" }}>from: {c.fromLesson.slice(0,30)}</span>}
                      </div>
                      <div style={{ fontSize:16, fontWeight:700, fontFamily:"var(--serif)", marginBottom:6 }}>{c.title}</div>
                      <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6, marginBottom:10 }}>{c.context?.slice(0,140)}{c.context?.length > 140 ? "…" : ""}</div>
                      {c.source && <div style={{ fontSize:10, color:"var(--pine)", fontFamily:"var(--mono)" }}>📖 {c.source.split("(")[0].trim()}</div>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                      <button className="btn btn-gold btn-sm" onClick={() => { setActiveChallenge(c); setChallengeResult(null); }}>
                        Start →
                      </button>
                      <button style={{ fontSize:11, color:"var(--rust)", background:"none", border:"none", cursor:"pointer", textAlign:"right" }} onClick={() => deleteChallenge(c.id)}>Delete</button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <div className="wb-section-title">✅ Completed <span className="tag tag-pine">{completed.length}</span></div>
              {completed.map(c => (
                <div key={c.id} style={{ border:"1.5px solid var(--border)", borderRadius:"var(--r)", marginBottom:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, opacity:0.7, background:"#fafaf8" }}>
                  <span style={{ fontSize:20 }}>{typeIcon[c.type] || "✅"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{c.title}</div>
                    <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--mono)" }}>{c.type} · score {c.score || "—"}</div>
                  </div>
                  <button style={{ fontSize:11, color:"var(--rust)", background:"none", border:"none", cursor:"pointer" }} onClick={() => deleteChallenge(c.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [authTab, setAuthTab] = useState("in");
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [name, setName]       = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email || !pw) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    const users = await storeGet("users_db", true) || {};
    const user = users[email.toLowerCase()];
    if (!user) { setErr("No account found. Please sign up."); setLoading(false); return; }
    if (user.pw !== hashPw(pw)) { setErr("Incorrect password."); setLoading(false); return; }
    onAuth(user);
    setLoading(false);
  };

  const signUp = async () => {
    if (!email || !pw || !name) { setErr("Please fill in all fields."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr("");
    const users = await storeGet("users_db", true) || {};
    if (users[email.toLowerCase()]) { setErr("Email already registered. Please sign in."); setLoading(false); return; }
    const user = { id: uid(), email: email.toLowerCase(), name, pw: hashPw(pw), plan: "free", joined: today() };
    users[email.toLowerCase()] = user;
    await storeSet("users_db", users, true);
    onAuth(user);
    setLoading(false);
  };

  const continueGuest = () => onAuth({ id: "guest", name: "Guest", email: "", plan: "free", joined: today() });

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">📖 <em>Scholarly</em></div>
        <div className="auth-tabs">
          <button className={`auth-tab${authTab === "in" ? " on" : ""}`} onClick={() => { setAuthTab("in"); setErr(""); }}>Sign In</button>
          <button className={`auth-tab${authTab === "up" ? " on" : ""}`} onClick={() => { setAuthTab("up"); setErr(""); }}>Sign Up</button>
        </div>
        {err && <div className="auth-err">{err}</div>}
        {authTab === "up" && (
          <div className="field"><label>Full Name</label><input className="inp" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>
        )}
        <div className="field"><label>Email</label><input className="inp" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input className="inp" type="password" placeholder={authTab === "up" ? "Min 6 characters" : "Your password"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && (authTab === "in" ? signIn() : signUp())} /></div>
        <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}
          disabled={loading} onClick={authTab === "in" ? signIn : signUp}>
          {loading ? "⏳ Please wait…" : authTab === "in" ? "Sign In →" : "Create Account →"}
        </button>
        <div className="auth-divider">or</div>
        <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={continueGuest}>Continue as Guest</button>
        {authTab === "in" && <a className="auth-link" onClick={() => setAuthTab("up")}>No account? Sign up free →</a>}
        {authTab === "up" && <a className="auth-link" onClick={() => setAuthTab("in")}>Already have an account? Sign in →</a>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// PAYMENT / PLANS PAGE
// ─────────────────────────────────────────────────────────────────────
function PlansPage({ user, onUpgrade, onBack }) {
  return (
    <div className="page">
      <button className="btn-ghost mb2" onClick={onBack}>← Back</button>
      <div className="eyebrow">Features</div>
      <div className="sec-h">Everything Scholarly can do</div>
      <p className="sec-sub">All features below are free and available right now, powered by Groq + Llama 3.3. More features are actively being built.</p>

      {/* Available Now */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "var(--pine)", background: "var(--pine-pale)", padding: "4px 12px", borderRadius: 20 }}>
            ✓ Available Now
          </div>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {FEATURES_NOW.map((f, i) => (
            <div key={i} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "var(--slate)", background: "var(--slate-pale)", padding: "4px 12px", borderRadius: 20 }}>
            🔒 Coming Soon
          </div>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {FEATURES_SOON.map((f, i) => (
            <div key={i} style={{ background: "var(--cream)", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start", opacity: 0.65 }}>
              <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--gold-pale)", border: "1.5px solid var(--gold)", borderRadius: "var(--r)", padding: "16px 20px", fontSize: 13, lineHeight: 1.85, color: "var(--ink)" }}>
        <strong>⚡ Powered by Groq + Llama 3.3</strong> — one of the fastest open-source models available, completely free to use. All current features are fully available with no limits beyond Groq's hourly rate limit (resets automatically).
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────
function Scholarly() {
  useKatex();
  const [user, setUser]           = useState({ id: "guest", name: "Guest", email: "", plan: "free", joined: today() });
  const [tab, setTab]             = useState("home");
  const [subj, setSubj]           = useState(null);
  const [customSubj, setCustomSubj] = useState("");
  const [purpose, setPurpose]     = useState("");
  const [diagStarted, setDiagStarted] = useState(false);
  const [roadmap, setRoadmap]     = useState(null);
  const [loadingRM, setLoadingRM] = useState(false);
  const [rmErr, setRmErr]         = useState("");
  const [unlockedN, setUnlockedN] = useState(0);
  const [diagQ, setDiagQ]         = useState([]);
  const [diagScore, setDiagScore] = useState(0);
  const [activeLesson, setActiveLesson] = useState(null);
  const [lessonTxt, setLessonTxt]   = useState("");
  const [masteryPrompt, setMasteryPrompt] = useState("");
  const [masteryQuestion, setMasteryQuestion] = useState(null); // MC question with options
  const [selectedAnswer, setSelectedAnswer] = useState(null); // User's selected option
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false); // MC loading after lesson shows
  const [mastered, setMastered]   = useState(new Set());
  const [evaluating, setEvaluating] = useState(false);
  const [masteryResult, setMasteryResult] = useState(null);
  const [enhancedSVG, setEnhancedSVG] = useState("");
  const [timerMode, setTimerMode] = useState("work");
  const [timerSecs, setTimerSecs] = useState(90 * 60);
  const [timerOn, setTimerOn]     = useState(false);
  const [treeSubj, setTreeSubj]   = useState(null);  // {id, name} for tree modal
  // (AI video feature removed)
  const [showPlans, setShowPlans] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [autoGenBanner, setAutoGenBanner] = useState("");
  const [wbRefresh, setWbRefresh] = useState(0);
  const [chRefresh, setChRefresh] = useState(0);



  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setTimerSecs(s => { if (s <= 1) { setTimerMode(m => m === "work" ? "break" : "work"); return timerMode === "work" ? 20 * 60 : 90 * 60; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [timerOn, timerMode]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const sName = subj?.name || customSubj || "Your Subject";
  const sId   = subj?.id || "default";
  const isMath = ["calc","math","physics","stat","linear","chem","orgo","astro"].some(k => sName.toLowerCase().includes(k));
  const isAP   = sName.toLowerCase().includes("ap");

  const handleDiagDone = async (score, unlocked, questions) => {
    setDiagScore(score); setUnlockedN(unlocked); setDiagQ(questions);
    await buildRoadmap(unlocked, questions, score);
  };

  const buildRoadmap = async (unlocked = 0, questions = [], score = 0) => {
    setLoadingRM(true); setRoadmap(null); setRmErr(""); setTab("learn");
    const known = questions.filter((_, i) => i < score).map(q => q.topic).join(", ");
    try {
      const txt = await ai([{ role: "user", content:
        `Create a COMPREHENSIVE, university-quality learning roadmap for "${sName}"` +
        (purpose ? ` specifically tailored for: "${purpose}"` : "") +
        (known ? `. This student already knows: ${known}. Skip or compress those areas.` : "") + `\n\n` +

        `STRUCTURE: Exactly 9 phases, 5 lessons each = 45 lessons total.\n\n` +

        `CRITICAL — PHASE NAMES must be SPECIFIC to "${sName}", not generic:\n` +
        `❌ BAD phase names: "Foundations", "Core Concepts", "Advanced Topics", "Mastery"\n` +
        `✅ GOOD phase names (examples for different subjects):\n` +
        `   Calculus: "Limits & Continuity", "Differential Calculus", "Integral Calculus", "Series & Sequences"\n` +
        `   Biology: "Cell Structure & Function", "Genetics & Heredity", "Evolution & Natural Selection"\n` +
        `   Economics: "Supply & Demand", "Market Structures", "Macroeconomic Indicators"\n` +
        `   History: "Colonial Era & Revolution", "Civil War & Reconstruction", "Industrial Age"\n` +
        `   Python: "Syntax & Data Types", "Functions & Scope", "OOP & Classes", "Libraries & APIs"\n` +
        `Name every phase after the ACTUAL TOPIC CLUSTER it covers in ${sName}.\n\n` +

        `LESSON TITLE RULES:\n` +
        `• Every title must name the EXACT concept — never vague like "Introduction" or "Advanced Topics"\n` +
        `• Good: "The Epsilon-Delta Definition of a Limit", "Mitosis vs Meiosis: A Comparison", "Dijkstra's Shortest Path Algorithm"\n` +
        `• 4–10 words, sounds like a real lecture title\n\n` +

        (isAP && sName.toLowerCase().includes("calc") ? `MANDATORY FOR AP CALCULUS AB: Cover all 8 College Board units: Limits & Continuity, Differentiation (definition & rules), Differentiation (composite & implicit), Contextual Applications, Analytical Applications, Integration & Accumulation, Differential Equations, Applications of Integration.\n\n` : "") +
        (isAP ? `Phase 9 must cover AP Exam FRQ strategies and timed practice.\n\n` : "") +

        `MASTERY TYPE — pick one per lesson:\n` +
        `"graph", "derive", "diagram", "solve", "explain", "compare"\n\n` +

        `Return ONLY a raw JSON array starting with [. No markdown, no backticks:\n` +
        `[{"phase":"Topic-Specific Phase Name","weeks":"Weeks X–Y","description":"What the student can DO after this phase","lessons":[{"title":"Exact Concept Title","mastery":"graph|derive|diagram|solve|explain|compare"}]}]`
      }], `You are a world-class curriculum designer. Return ONLY a raw JSON array.`, 8000, true);

      const parsed = robustJSON(txt);
      if (!parsed || !Array.isArray(parsed) || parsed.length < 3) {
        // One retry with simpler prompt
        const txt2 = await ai([{ role: "user", content:
          `Create a 9-phase learning roadmap for "${sName}". Name each phase after the actual topics — NOT generic names like "Foundations" or "Core Concepts".\n` +
          `Each phase: 5 lessons. Use specific topic names for both phases and lessons.\n` +
          `Return ONLY raw JSON: [{"phase":"specific topic name","weeks":"Weeks X-Y","description":"...","lessons":[{"title":"specific lesson","mastery":"explain"}]}]`
        }], "Return ONLY raw JSON array starting with [. Phase names must be specific to the subject.", 6000, true);
        const parsed2 = robustJSON(txt2);
        if (!parsed2 || !Array.isArray(parsed2) || parsed2.length < 3) throw new Error("The AI returned an incomplete roadmap. Please try again.");
        const cleaned2 = parsed2.map((phase, pi) => ({
          ...phase,
          lessons: (phase.lessons || []).map((l, li) => ({
            ...l,
            title: l.title || `${phase.phase} — Lesson ${li + 1}`,
            mastery: l.mastery || "diagram"
          }))
        }));
        setRoadmap(cleaned2);
        if (unlocked > 0) {
          const skip = new Set(); let count = 0;
          for (const p of cleaned2) for (const l of p.lessons) { if (count < unlocked * 4) { skip.add(l.title + "__s"); count++; } }
          setMastered(skip);
        }
        setLoadingRM(false);
        return;
      }

      const cleaned = parsed.map((phase, pi) => ({
        ...phase,
        lessons: (phase.lessons || []).map((l, li) => ({
          ...l,
          title: l.title || `${phase.phase} — Lesson ${li + 1}`,
          mastery: l.mastery || "diagram"
        }))
      }));

      setRoadmap(cleaned);
      if (unlocked > 0) {
        const skip = new Set(); let count = 0;
        for (const p of cleaned) for (const l of p.lessons) { if (count < unlocked * 4) { skip.add(l.title + "__s"); count++; } }
        setMastered(skip);
      }
    } catch (e) {
      if (e.isCredits) { setOutOfCredits(true); setLoadingRM(false); return; }
      setRmErr(e.message);
      // Subject-specific fallback using sName
      setRoadmap([
        { phase: `${sName}: Foundations`, weeks: "Weeks 1–2", description: `Core vocabulary and prerequisites for ${sName}.`, lessons: [{ title: `Key Definitions and Terminology in ${sName}`, mastery: "explain" }, { title: `Historical Background and Motivation`, mastery: "diagram" }, { title: `Core Assumptions and Axioms`, mastery: "explain" }, { title: `Notation, Tools, and Conventions`, mastery: "diagram" }, { title: `Simplest Non-Trivial Example`, mastery: "solve" }] },
        { phase: `${sName}: Core Ideas`, weeks: "Weeks 3–4", description: `The central ideas the entire subject is built around.`, lessons: [{ title: `The Central Problem ${sName} Solves`, mastery: "explain" }, { title: `The Primary Framework or Model`, mastery: "diagram" }, { title: `Key Relationships Between Core Concepts`, mastery: "compare" }, { title: `Worked Examples of the Main Idea`, mastery: "solve" }, { title: `Common Misconceptions and Corrections`, mastery: "explain" }] },
        { phase: `${sName}: Techniques`, weeks: "Weeks 5–6", description: `Fundamental methods and procedures in the field.`, lessons: [{ title: `Primary Technique: Step-by-Step`, mastery: "solve" }, { title: `Applying the Technique to Standard Problems`, mastery: "solve" }, { title: `Edge Cases and Failure Modes`, mastery: "explain" }, { title: `Alternative Methods Compared`, mastery: "compare" }, { title: `Choosing the Right Approach`, mastery: "diagram" }] },
        { phase: `${sName}: Intermediate Theory`, weeks: "Weeks 7–8", description: `Theoretical underpinnings and proofs.`, lessons: [{ title: `Proofs and Derivations of Main Results`, mastery: "derive" }, { title: `Generalizations and Extensions`, mastery: "explain" }, { title: `Cross-Topic Connections`, mastery: "diagram" }, { title: `Abstract Structures and Patterns`, mastery: "compare" }, { title: `Boundary Conditions and Limits`, mastery: "explain" }] },
        { phase: `${sName}: Applications`, weeks: "Weeks 9–10", description: `Real-world and interdisciplinary applications.`, lessons: [{ title: `Real-World Problem Formulation`, mastery: "diagram" }, { title: `Industry and Professional Use Cases`, mastery: "explain" }, { title: `Cross-Disciplinary Applications`, mastery: "compare" }, { title: `Famous Problem: Case Study`, mastery: "solve" }, { title: `Building Intuition Through Examples`, mastery: "diagram" }] },
        { phase: `${sName}: Advanced Topics`, weeks: "Weeks 11–12", description: `Frontier concepts specialists work with.`, lessons: [{ title: `Next Level of Abstraction`, mastery: "explain" }, { title: `Open Problems in the Field`, mastery: "explain" }, { title: `Computational and Algorithmic Aspects`, mastery: "solve" }, { title: `Expert-Level Techniques`, mastery: "derive" }, { title: `Graduate-Level Connections`, mastery: "compare" }] },
        { phase: `${sName}: Synthesis`, weeks: "Weeks 13–14", description: `Unifying everything into a coherent whole.`, lessons: [{ title: `The Big Picture: How It All Connects`, mastery: "diagram" }, { title: `Multi-Step Complex Problem Solving`, mastery: "solve" }, { title: `Selecting the Right Tool`, mastery: "explain" }, { title: `Creating Your Own Examples`, mastery: "derive" }, { title: `Teaching It Back: The Feynman Test`, mastery: "explain" }] },
        { phase: `${sName}: Mastery & Review`, weeks: "Weeks 15–16", description: `Consolidate and prepare for high-stakes assessment.`, lessons: [{ title: `Comprehensive Review of All Major Themes`, mastery: "diagram" }, { title: `Timed Practice Under Exam Conditions`, mastery: "solve" }, { title: `Most Commonly Tested Traps`, mastery: "explain" }, { title: `Error Analysis: Learning from Mistakes`, mastery: "compare" }, { title: `Final Synthesis and Self-Assessment`, mastery: "explain" }] },
      ]);
    }
    setLoadingRM(false);
  };

  const loadLesson = async (lesson, phaseTitle) => {
    setActiveLesson({ ...lesson, phase: phaseTitle });
    setLessonTxt(""); setMasteryPrompt(""); setMasteryQuestion(null); setSelectedAnswer(null);
    setMasteryResult(null); setEnhancedSVG(""); setLoadingQuestion(false);
    setLoadingLesson(true); setTab("lesson");
    const lvl = mastered.size < 8 ? "beginner" : mastered.size < 22 ? "intermediate" : "advanced";
    const os = getOpenStaxContext(sId, sName);
    const chapterHint = Object.entries(os.chapterMap || {}).find(([topic]) =>
      lesson.title.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().split(" ").some(w => w.length > 4 && lesson.title.toLowerCase().includes(w))
    );
    const chapterRef = chapterHint ? ` (${chapterHint[1]})` : "";
    try {
      const cached = await getCachedLesson(sId, lesson.title);
      let lessonContent = null;

      if (cached) {
        setLessonTxt(cached.content);
        lessonContent = cached.content;
        // Try to use cached MC question if it's valid
        try {
          const mcData = JSON.parse(cached.masteryPrompt);
          if (mcData.question && Array.isArray(mcData.options) && mcData.options.length === 4 &&
              typeof mcData.correctIndex === 'number' && mcData.correctIndex >= 0 && mcData.correctIndex <= 3 &&
              mcData.options.every(o => o && !o.startsWith("Concept ") && !o.startsWith("Option "))) {
            setMasteryQuestion(mcData);
            setMasteryPrompt(mcData.question);
            setLoadingLesson(false);
            return;
          }
          console.log("Cached MC invalid, regenerating...");
        } catch {
          console.log("Old cache format, regenerating MC...");
        }
        // Show lesson immediately while MC regenerates in background
        setLoadingLesson(false);
      } else {
        // Fetch lesson content fresh
        const content = await ai([{ role: "user", content:
          `You are teaching "${lesson.title}" in ${sName}${chapterRef}, phase: "${phaseTitle}".\n` +
          `Base this lesson on "${os.textbook}" — draw on the textbook's explanations, notation, and examples.\n` +
          `DO NOT search the web. Use your training knowledge of the textbook content.\n` +
          (purpose ? `Connect examples to: "${purpose}".\n` : "") +
          `Level: ${lvl}.\n\n` +
          `MARKERS (wrap real content, each on its own line):\n[H3]Your Section Heading[/H3]\n[HIGHLIGHT]Key insight here[/HIGHLIGHT]\n[CONCEPT]Term||Definition here[/CONCEPT]\n` +
          (isAP ? `[EXAMTIP]tip[/EXAMTIP]\n` : "") +
          (isMath ? `[DISPMATH]LaTeX[/DISPMATH]\nUse $inline$ for inline math\n` : "") +
          `800–1000 words, 4–5 sections, real-world example first, practice problem at end.\n` +
          (isMath ? `Show all algebraic steps, 2–3 worked examples. Use same notation as ${os.textbook}.\n` : "") +
          (isAP ? `2 [EXAMTIP] boxes with AP FRQ strategy.\n` : "") +
          `Style requirements: ${os.style}`
        }], `You are Scholarly, expert tutor grounding lessons in "${os.textbook}". Each marker on its own line.`, 5000);
        setLessonTxt(content);
        lessonContent = content;
      }

      // Show the lesson immediately, generate MC question in background
      setLoadingLesson(false);
      setLoadingQuestion(true);

      // Generate multiple choice mastery question
      try {
      const mcTxt = await ai([{ role: "user", content:
        `Create a multiple choice question for "${lesson.title}" in ${sName}.\n\n` +
        `Return a JSON object with exactly these fields:\n` +
        `- question: string (the question text)\n` +
        `- options: array of exactly 4 strings (the answer choices)\n` +
        `- correctIndex: number 0-3 (index of correct answer)\n` +
        `- explanation: string (why the answer is correct)\n\n` +
        `The question should test core understanding and take about 30 seconds to answer.\n` +
        `Make the 3 wrong answers plausible but clearly incorrect to someone who studied.\n` +
        `Topic: "${lesson.title}" in ${sName}`
      }], "You are a quiz writer. Return a JSON object with fields: question, options (array of 4 strings), correctIndex (0-3), explanation.", 600, true);

      console.log("MC raw response:", mcTxt?.substring(0, 300));
      const mcData = robustJSON(mcTxt);
      console.log("MC parsed:", mcData);
      const validMC = mcData && mcData.question &&
        Array.isArray(mcData.options) && mcData.options.length === 4 &&
        typeof mcData.correctIndex === 'number' &&
        mcData.correctIndex >= 0 && mcData.correctIndex <= 3;
      if (validMC) {
        setMasteryQuestion(mcData);
        setMasteryPrompt(mcData.question);
        await setCachedLesson(sId, lesson.title, lessonContent, JSON.stringify(mcData));
      } else {
        console.warn("MC validation failed:", mcData);
        // Build a fallback from the raw text if possible, or use hardcoded structure
        // Try one more time with an even simpler prompt
        const retryTxt = await ai([{ role: "user", content:
          `Write a quiz question about: "${lesson.title}"\n` +
          `Return JSON with: question (string), options (4-item array), correctIndex (0-3), explanation (string)`
        }], "Return JSON only.", 400, true);
        const retryData = robustJSON(retryTxt);
        if (retryData && retryData.question && Array.isArray(retryData.options) && retryData.options.length === 4 && typeof retryData.correctIndex === 'number') {
          setMasteryQuestion(retryData);
          setMasteryPrompt(retryData.question);
          await setCachedLesson(sId, lesson.title, lessonContent, JSON.stringify(retryData));
        } else {
          console.error("Both MC attempts failed. retryData:", retryData);
        }
      }
      } catch (mcErr) {
        console.error("MC generation error:", mcErr);
      } finally {
        setLoadingQuestion(false);
      }
    } catch (e) {
      setLoadingLesson(false);
      if (e.isCredits) { setOutOfCredits(true); }
      else { setLessonTxt(`[H3]Something Went Wrong[/H3]\n[HIGHLIGHT]${e.message || "An unexpected error occurred while loading this lesson."}[/HIGHLIGHT]\nPlease go back and try opening the lesson again.`); }
    }
    setLoadingLesson(false);
  };

  // Auto-called when a lesson is mastered — generates a problem set for that lesson
  const autoGenerateWorkbookProblem = async (lessonTitle, allMasteredSet) => {
    const wbKey = `workbook:${user?.id || "guest"}`;
    try {
      const os = getOpenStaxContext(sId, sName);
      const masteredList = allMasteredSet
        ? Array.from(allMasteredSet).filter(l => !l.endsWith("__s"))
        : [lessonTitle];

      const dueDates = forgettingCurveDates(30);

      const chapterHint = Object.entries(os.chapterMap || {}).find(([topic]) =>
        lessonTitle.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().split(" ").some(w => w.length > 4 && lessonTitle.toLowerCase().includes(w))
      );
      const chapterRef = chapterHint ? `(${chapterHint[1]})` : "";

      const txt = await aiSearch([{ role: "user", content:
        `Search the web for practice problems about "${lessonTitle}" in ${sName} ${chapterRef}.\n` +
        `Look for questions from Khan Academy, OpenStax, MIT OCW, and other academic sources.\n\n` +
        `Generate exactly 30 practice problems testing ONLY "${lessonTitle}". Show blanks as "_____" (five underscores) — never write the word blank.\n` +
        `IMPORTANT: Only use concepts from these already-learned lessons: ${masteredList.join(", ")}.\n` +
        `Do NOT include problems requiring knowledge the student has not yet learned.\n\n` +
        `Each problem must have a SHORT ANSWER (number, word, or short phrase — not an essay).\n` +
        `Mix: 10 easy, 10 medium, 10 hard.\n` +
        `Use $...$  for LaTeX math.\n\n` +
        `Return ONLY a JSON array of exactly 30 objects:\n` +
        `[{"topic":"${lessonTitle}","question":"...","correctAnswer":"short answer","explanation":"brief explanation","difficulty":"easy|medium|hard","status":"pending","source":"${os.textbook}"}]`
      }], `You are a ${sName} curriculum expert. Search for real practice problems. Return ONLY a raw JSON array.`, 8000);

      let p = robustJSON(txt);
      if (!p || !Array.isArray(p) || p.length === 0) return;
      p = p.slice(0, 30);

      const setId = `set_${Date.now()}`;
      const newProbs = p.map((prob, i) => ({
        ...prob,
        id: `auto_${Date.now()}_${i}`,
        status: "pending",
        topic: prob.topic || lessonTitle,
        lessonSource: lessonTitle,
        dueDate: dueDates[i] || addDays(today(), 1),
        reviewInterval: FORGETTING_CURVE[Math.floor(i / 6)] || 30,
        source: prob.source || os.textbook,
        setId,
        userAnswer: "",
      }));

      const existing = await storeGet(wbKey);
      const all = [...(Array.isArray(existing) ? existing : []), ...newProbs];
      await storeSet(wbKey, all);

      const dueToday = newProbs.filter(p => p.dueDate === today()).length;
      setAutoGenBanner(`✨ "${lessonTitle}" → ${newProbs.length} problems assigned (${dueToday} due today, rest spaced over 30 days)`);
      setTimeout(() => setAutoGenBanner(""), 9000);
      setWbRefresh(n => n + 1); // Force Workbook to reload from storage
    } catch (err) {
      console.error("autoGenerateWorkbookProblem failed:", err);
    }
  };

  // Auto-generate challenge problems when a lesson is mastered
  const autoGenerateChallenge = async (lessonTitle, allMasteredSet) => {
    const chKey = `challenges:${user?.id || "guest"}`;
    try {
      const os = getOpenStaxContext(sId, sName);
      const masteredList = allMasteredSet
        ? Array.from(allMasteredSet).filter(l => !l.endsWith("__s"))
        : [lessonTitle];

      const chapterHint = Object.entries(os.chapterMap || {}).find(([topic]) =>
        lessonTitle.toLowerCase().includes(topic.toLowerCase()) ||
        topic.toLowerCase().split(" ").some(w => w.length > 4 && lessonTitle.toLowerCase().includes(w))
      );
      const chapterRef = chapterHint ? `(${chapterHint[1]})` : "";

      // Due dates for 3 challenges: spaced at 1, 7, 14 days
      const challengeDueDates = [addDays(today(), 1), addDays(today(), 7), addDays(today(), 14)];

      const txt = await ai([{ role: "user", content:
        `Create 3 whiteboard challenge problems for a student who just mastered "${lessonTitle}" in ${sName} ${chapterRef}.\n\n` +
        `CRITICAL: Only use concepts from lessons the student has already mastered: ${masteredList.join(", ")}.\n` +
        `Do NOT reference topics not yet learned.\n\n` +
        `These require the student to DRAW or DERIVE on a whiteboard — not just write an answer.\n` +
        `Mix one of each:\n` +
        `1. Real-world application — apply "${lessonTitle}" to a concrete scenario, draw a labeled diagram\n` +
        `2. Derivation — show step-by-step work to derive a key result from "${lessonTitle}"\n` +
        `3. Concept synthesis — connect "${lessonTitle}" to another mastered topic\n\n` +
        `Based on: ${os.textbook}\n\n` +
        `Return ONLY a raw JSON array of 3 objects:\n` +
        `[{"title":"...","type":"application|derivation|synthesis","context":"2-3 sentence real-world setup","prompt":"Clear whiteboard instructions","idealAnswer":"What a complete answer includes","difficulty":"medium|hard","lessonLinks":["${lessonTitle}"],"source":"${os.textbook}"}]`
      }], `You are a ${sName} challenge designer. Create whiteboard challenges using only mastered topics. Return ONLY a raw JSON array.`, 2000, true);

      const p = robustJSON(txt);
      if (!p || !Array.isArray(p) || p.length === 0) return;

      const newChallenges = p.slice(0, 3).map((c, i) => ({
        ...c,
        id: `auto_ch_${Date.now()}_${i}`,
        status: "pending",
        createdAt: today(),
        dueDate: challengeDueDates[i],
        autoGenerated: true,
        fromLesson: lessonTitle,
      }));

      const existing = await storeGet(chKey);
      const all = [...(Array.isArray(existing) ? existing : []), ...newChallenges];
      await storeSet(chKey, all);
      setChRefresh(n => n + 1); // Force ChallengeProblems to reload
    } catch (err) {
      console.error("autoGenerateChallenge failed:", err);
    }
  };

  // Evaluate multiple choice answer
  const evaluateMCAnswer = async () => {
    if (selectedAnswer === null || !masteryQuestion) return;
    
    setEvaluating(true);
    setMasteryResult(null);
    
    const isCorrect = selectedAnswer === masteryQuestion.correctIndex;
    const letters = ['A', 'B', 'C', 'D'];
    
    setMasteryResult({
      passed: isCorrect,
      score: isCorrect ? "10/10" : "0/10",
      feedback: isCorrect 
        ? `Correct! ${masteryQuestion.explanation || ''}`
        : `Not quite. You selected ${letters[selectedAnswer]}: "${masteryQuestion.options[selectedAnswer]}". The correct answer is ${letters[masteryQuestion.correctIndex]}: "${masteryQuestion.options[masteryQuestion.correctIndex]}". ${masteryQuestion.explanation || ''}`,
      whatTheyAnswered: `Selected ${letters[selectedAnswer]}`
    });
    
    if (isCorrect && activeLesson) {
      const newMastered = new Set([...mastered, activeLesson.title]);
      setMastered(newMastered);
      // Auto-generate workbook problems and challenges for this specific lesson
      autoGenerateWorkbookProblem(activeLesson.title, newMastered);
      autoGenerateChallenge(activeLesson.title, newMastered);
    }
    
    setEvaluating(false);
  };

  const evaluateMastery = async (canvasDataUrl, notesSummary, notesArr) => {
    setEvaluating(true); setMasteryResult(null); setEnhancedSVG("");
    try {
      const hasSubmission = notesSummary?.trim().length > 20 &&
        !notesSummary.includes("BLANK OR NEARLY BLANK");

      const gradingTxt = await ai([{ role: "user", content:
        `You are grading a student's whiteboard mastery check. Be FAIR but HONEST.\n\n` +
        `LESSON: "${activeLesson?.title}"\n` +
        `CHALLENGE: "${masteryPrompt}"\n\n` +
        `LLAMA 3.2 VISION REPORT (what was actually on the canvas):\n` +
        (hasSubmission ? notesSummary : `[BLANK — vision confirmed the canvas was empty or nearly empty]`) +
        `\n\n` +
        `GRADING PHILOSOPHY:\n` +
        `- This is a simple quiz-style check (multiple choice, fill-in-blank, T/F, or matching)\n` +
        `- Look for: Did they write an answer? Did they circle/box something?\n` +
        `- PASS if they provided a reasonable answer, even if not perfectly written\n` +
        `- PASS for partial credit answers (e.g., circled "2x" when answer includes "2x + C")\n` +
        `- FAIL only if: canvas blank, completely wrong answer, or didn't circle/box anything\n` +
        `- Be lenient with spelling, notation, and handwriting\n\n` +
        `FEEDBACK REQUIREMENTS:\n` +
        `- State what answer they gave (from vision report)\n` +
        `- Say whether it's correct or incorrect\n` +
        `- If wrong, give the correct answer clearly\n` +
        `- Keep it very brief (1-2 sentences max)\n\n` +
        `Answer ALL of these:\n` +
        `1. What answer did they write/circle? (quote from vision report)\n` +
        `2. Is it correct? (yes/no)\n` +
        `3. If wrong, what is the correct answer?\n` +
        `4. VERDICT: PASS or FAIL\n` +
        `5. Score: X/10\n` +
        `6. Feedback (1-2 sentences, very brief)`
      }], "You are grading a quiz-style question. Be lenient with notation and partial answers. Keep feedback brief.", 800, true);

      const txt = await ai([
        { role: "user", content:
          `Convert this grading assessment to JSON.\n\nASSESSMENT:\n${gradingTxt}\n\n` +
          `Return ONLY raw JSON starting with {:\n` +
          `{"passed":true_or_false,"score":"X/10","feedback":"1-2 sentence feedback","whatTheyAnswered":"what they wrote/circled according to vision"}`
        }
      ], "Return ONLY valid raw JSON starting with {.", 600, true);

      const p = robustJSON(txt);
      if (p && typeof p.passed !== "undefined") {
        setMasteryResult(p);
        if (p.passed && activeLesson) {
          const newMastered = new Set([...mastered, activeLesson.title]);
          setMastered(newMastered);
          autoGenerateWorkbookProblem(activeLesson.title, newMastered);
          autoGenerateChallenge(activeLesson.title, newMastered);
        }
      } else {
        setMasteryResult({ passed: false, score: "—", feedback: "Couldn't parse the evaluation. Please try submitting again.", reflection: "", whatTheyDrew: "", enhancedSVG: "" });
      }
    } catch (e) {
      if (e.isCredits) { setOutOfCredits(true); }
      else { setMasteryResult({ passed: false, score: "—", feedback: `Evaluation error: ${e.message || "please try again."}`, reflection: "", whatTheyDrew: "" }); }
    }
    setEvaluating(false);
  };

  // If not logged in, show auth
  if (outOfCredits) return (
    <>
      <style>{CSS}</style>
      <CreditsPage onBack={() => setOutOfCredits(false)} />
    </>
  );

  if (showPlans) return (
    <>
      <style>{CSS}</style>
      <PlansPage user={user} onUpgrade={u => { setUser(u); setShowPlans(false); }} onBack={() => setShowPlans(false)} />
    </>
  );

  const tabs = [
    { id: "home",       label: "📚 Home" },
    { id: "start",      label: "🚀 Learn" },
    { id: "workbook",   label: "📋 Workbook" },
    { id: "challenges", label: "🔥 Challenges" },
    ...(diagStarted || diagQ.length > 0 ? [{ id: "diag", label: "📊 Diagnostic" }] : []),
    ...(roadmap ? [{ id: "learn", label: "🗺️ Roadmap" }] : []),
    ...(activeLesson ? [{ id: "lesson", label: "📖 Lesson" }] : []),
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* MODALS */}
        {treeSubj && <SubjectTree sid={treeSubj.id} sname={treeSubj.name} onClose={() => setTreeSubj(null)} onStart={() => { setSubj(treeSubj); setCustomSubj(""); setTreeSubj(null); setTab("start"); }} />}


        {/* NAV */}
        <nav className="nav">
          <div className="logo">📖 <em>Scholarly</em></div>
          <div className="nav-tabs">{tabs.map(t => <button key={t.id} className={`ntab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
          <div className="nav-right">
            <div className="timer-pill" onClick={() => setTimerOn(o => !o)}>
              {timerOn && <div className="t-dot" />}{timerMode === "work" ? "🧠" : "☕"} {fmt(timerSecs)}
            </div>
            <div className="nav-user" onClick={() => setShowPlans(true)}>
              <div className="nav-avatar">{user.name?.[0]?.toUpperCase() || "G"}</div>
              <span className="nav-badge">FREE</span>
            </div>
          </div>
        </nav>
        {timerOn && timerSecs < 300 && timerMode === "work" && <div className="break-bar">⏰ Ending — <strong>{fmt(timerSecs)}</strong></div>}
        {timerOn && timerMode === "break" && <div className="break-bar">☕ Break! <strong>{fmt(timerSecs)}</strong> — step away</div>}
        {autoGenBanner && (
          <div style={{ background:"var(--pine)", color:"#fff", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, fontWeight:500, gap:12 }}>
            <span>{autoGenBanner}</span>
            <button onClick={() => { setAutoGenBanner(""); setTab("workbook"); }} style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:6, color:"#fff", padding:"4px 12px", cursor:"pointer", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>View Workbook →</button>
          </div>
        )}

        {/* ── HOME ── */}
        {tab === "home" && (
          <div className="page">
            <div style={{ padding: "40px 0 26px" }}>
              <div className="eyebrow">Welcome, {user.name}</div>
              <div className="display">Learn by <em>doing</em>,<br />master by <em>proving it</em></div>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.75, fontWeight: 300, maxWidth: 580, marginBottom: 20 }}>
                Placement diagnostics skip what you know. Real LaTeX for math. Whiteboard drawings auto-convert to notes.
                AI videos explain every lesson. Workbook delivers problems on the perfect review schedule.
              </p>
              <div className="row">
                <button className="btn btn-dark" onClick={() => setTab("start")}>Start Learning →</button>
                <button className="btn btn-outline" onClick={() => setShowPlans(true)}>
                  {"📋 Features"}
                </button>
              </div>
            </div>
            <div className="divider" />
            <div className="sec-h">8 Evidence-Based Techniques</div>
            <div className="sec-sub">Every feature is grounded in peer-reviewed cognitive science.</div>
            <div className="tech-grid">
              {TECHNIQUES.map(t => (
                <div className="tc" key={t.n}>
                  <div className="tc-i">{t.i}</div><div className="tc-n">{t.n}</div>
                  <span className={`tag ${t.t}`}>{t.t.replace("tag-", "")}</span>
                  <div className="tc-d">{t.d}</div><div className="tc-s">{t.s}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── START / SUBJECT SELECTION ── */}
        {tab === "start" && (
          <div className="page">
            <div className="sec-h">Choose Your Subject</div>
            <p className="sec-sub">Click a subject to select it. Press the <strong>🗺️ button</strong> on any tile to see the full learning path tree before you start.</p>
            <div className="subj-grid">
              {SUBJECTS.map(s => (
                <div key={s.id} className={`subj-card${subj?.id === s.id ? " sel" : ""}`} onClick={() => { setSubj(s); setCustomSubj(""); }}>
                  <button className="subj-tree-btn" title="View learning path" onClick={e => { e.stopPropagation(); setTreeSubj(s); }}>🗺️</button>
                  <div className="subj-card-inner">
                    <div className="si">{s.icon}</div><div className="sn">{s.name}</div><div className="sl">{s.level}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="muted mb1">Or enter a custom subject:</p>
            <input className="inp mb3" placeholder="e.g. Quantum Mechanics, Byzantine History…" value={customSubj} onChange={e => { setCustomSubj(e.target.value); setSubj(null); }} />


            <div className="divider" />
            <div className="sec-h" style={{ fontSize: 18, marginBottom: 5 }}>Why do you want to learn this?</div>
            <p className="muted mb2">Personalizes roadmap, examples, and every lesson toward your real goal.</p>
            <textarea className="inp mb3" rows={4} placeholder={"• Preparing for the AP Calculus AB exam in May\n• Need physics for engineering\n• Pre-med studying cell biology\n• Building ML models — need math foundation"} value={purpose} onChange={e => setPurpose(e.target.value)} />

            <div className="divider" />
            <div className="sec-h" style={{ fontSize: 18, marginBottom: 5 }}>Placement Diagnostic</div>
            <p className="muted mb2">8 questions to skip what you already know.</p>
            <div className="row mt2">
              <button className="btn btn-gold" disabled={!subj && !customSubj.trim()} onClick={() => { setDiagStarted(true); setTab("diag"); }}>Take Placement Test →</button>
              <button className="btn btn-outline" disabled={!subj && !customSubj.trim()} onClick={() => buildRoadmap()}>Skip — Build Roadmap</button>
            </div>
            {loadingRM && <div className="loading mt3"><div className="spinner" /><div className="loading-msg">Generating Roadmap</div><div className="loading-sub">Building 8–10 phases for {sName}…</div></div>}
          </div>
        )}

        {/* ── WORKBOOK ── */}
        {tab === "workbook" && (
          <div className="page">
            <Workbook user={user} masteredLessons={mastered} subject={subj ? sName : null} subjectId={subj?.id || null} refreshKey={`${tab}:${wbRefresh}`} />
          </div>
        )}

        {/* ── CHALLENGE PROBLEMS ── */}
        {tab === "challenges" && (
          <div className="page">
            <ChallengeProblems user={user} masteredLessons={mastered} subject={subj ? sName : null} subjectId={subj?.id || null} refreshKey={`${tab}:${chRefresh}`} />
          </div>
        )}

        {/* ── DIAGNOSTIC ── */}
        {tab === "diag" && (
          <div className="page">
            <Diagnostic subject={sName} purpose={purpose} onComplete={handleDiagDone} />
            {loadingRM && <div className="loading mt3"><div className="spinner" /><div className="loading-msg">Building Roadmap</div></div>}
          </div>
        )}

        {/* ── ROADMAP ── */}
        {tab === "learn" && (
          <div className="page">
            {loadingRM ? (
              <div className="loading"><div className="spinner" /><div className="loading-msg">Generating Roadmap</div><div className="loading-sub">Creating 8–10 phases for {sName}…</div></div>
            ) : roadmap && (
              <>
                <div className="sec-h">{sName}</div>
                {purpose && <p className="muted mb2">🎯 <em>{purpose}</em></p>}
                {rmErr && (
                  <div style={{ background: "var(--gold-pale)", border: "1.5px solid var(--gold)", borderRadius: "var(--r)", padding: "12px 16px", marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
                    <strong>⚠️ Couldn't generate your full roadmap</strong><br />
                    {rmErr}<br />
                    <span style={{ color: "var(--muted)" }}>A starter roadmap is shown below. You can regenerate once the issue is resolved.</span>
                  </div>
                )}
                {diagScore > 0 && <div className="skip-banner mt1"><strong>🎓 Diagnostic Applied — {diagScore}/{diagQ.length} correct</strong>{unlockedN > 0 ? ` First ${unlockedN * 4} lessons skipped.` : " Starting from foundations."}</div>}
                <p className="muted mb3" style={{ fontSize: 11, marginTop: 8 }}>{roadmap.reduce((a, p) => a + p.lessons.length, 0)} lessons · {roadmap.length} phases</p>
                <div className="rm-outer">
                  {roadmap.map((phase, pi) => {
                    const fi = roadmap.slice(0, pi).reduce((a, p) => a + p.lessons.length, 0);
                    const all = roadmap.flatMap(p => p.lessons);
                    const pDone = phase.lessons.every(l => mastered.has(l.title) || mastered.has(l.title + "__s"));
                    const pCurr = !pDone && (pi === 0 || roadmap.slice(0, pi).every(pp => pp.lessons.every(l => mastered.has(l.title) || mastered.has(l.title + "__s"))));
                    return (
                      <div className="rm-phase" key={pi}>
                        <div className="ph-hdr">
                          <div className={`ph-num${pDone ? " done" : pCurr ? " curr" : " lk"}`}>{pDone ? "✓" : pi + 1}</div>
                          <div><div className="ph-title">{phase.phase}</div><div className="ph-meta">{phase.weeks} · {phase.lessons.length} lessons · {phase.description}</div></div>
                        </div>
                        <div className="lessons-list">
                          {phase.lessons.map((lesson, li) => {
                            const gi = fi + li;
                            const prev = gi > 0 ? all[gi - 1].title : null;
                            const locked = gi > 0 && prev && !mastered.has(prev) && !mastered.has(prev + "__s");
                            const isMast = mastered.has(lesson.title);
                            const isSkip = mastered.has(lesson.title + "__s");
                            const isAct  = activeLesson?.title === lesson.title;
                            let cls = "lr";
                            if (locked) cls += " lr-lk"; else if (isMast) cls += " lr-mast"; else if (isSkip) cls += " lr-skip"; else if (isAct) cls += " lr-act";
                            return (
                              <div key={li} className={cls} onClick={() => !locked && loadLesson(lesson, phase.phase)}>
                                <div className={`l-dot${isMast ? " done" : isSkip ? " skip" : isAct ? " act" : ""}`} />
                                <div className="l-name">{lesson.title}</div>
                                <div className={`lb${isMast ? " lb-m" : isSkip ? " lb-s" : isAct ? " lb-a" : " lb-lk"}`}>
                                  {isMast ? "✓ Mastered" : isSkip ? "⏭ Skipped" : isAct ? "Active" : locked ? "🔒" : "Open"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LESSON ── */}
        {tab === "lesson" && (
          <div className="page-wide">
            {loadingLesson ? (
              <div className="loading"><div className="spinner" /><div className="loading-msg">Preparing Lesson</div><div className="loading-sub">Generating content with examples and practice problems…</div></div>
            ) : (
              <div className="lesson-view">
                <div className="lesson-hdr">
                  <div className="row mb1">
                    <span className="tag tag-gold">{sName}</span>
                    <span className="tag tag-slate">{activeLesson?.phase}</span>
                    {mastered.has(activeLesson?.title) && <span className="tag tag-pine">✓ Mastered</span>}
                  </div>
                  <div className="lesson-title">{activeLesson?.title}</div>
                  <div className="row mt2">
                    <button className="btn btn-outline btn-sm" onClick={() => setTab("learn")}>← Roadmap</button>
                    {purpose && <span className="muted" style={{ fontSize: 11 }}>🎯 {purpose}</span>}
                  </div>
                </div>
                <div className="lbody">{parseContent(lessonTxt)}</div>
                <div className="divider" />
                
                {/* Multiple Choice Mastery Check */}
                {loadingQuestion && !masteryQuestion && (
                  <div style={{ border: "1.5px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(200,134,26,.3)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                    Generating mastery question…
                  </div>
                )}

                {masteryQuestion && !masteryResult && (
                  <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px", marginBottom: 20 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>
                      📝 Mastery Check
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, lineHeight: 1.6 }}>
                      {masteryQuestion.question}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                      {masteryQuestion.options.map((option, idx) => {
                        const letters = ['A', 'B', 'C', 'D'];
                        const isSelected = selectedAnswer === idx;
                        return (
                          <button key={idx} onClick={() => setSelectedAnswer(idx)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `2px solid ${isSelected ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--r)", background: isSelected ? "var(--gold-pale)" : "#fff", cursor: "pointer", transition: "all 0.2s", fontSize: 14, textAlign: "left", fontFamily: "var(--sans)" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${isSelected ? "var(--gold)" : "var(--border)"}`, background: isSelected ? "var(--gold)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: isSelected ? "#fff" : "var(--muted)", flexShrink: 0 }}>
                              {letters[idx]}
                            </div>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button className="btn btn-gold" onClick={evaluateMCAnswer} disabled={selectedAnswer === null || evaluating}>
                      {evaluating ? "⏳ Checking..." : "Submit Answer"}
                    </button>
                  </div>
                )}

                {evaluating && <div className="loading"><div className="spinner" /><div className="loading-msg">Checking Answer</div><div className="loading-sub">Evaluating your response...</div></div>}

                {masteryResult && !evaluating && (
                  <div className={`mr ${masteryResult.passed ? "mr-pass" : "mr-fail"}`}>
                    <h3>{masteryResult.passed ? "🎉 Mastery Confirmed!" : "📚 Not Quite"}</h3>
                    <div className={`mr-pill ${masteryResult.passed ? "mrp-pass" : "mrp-fail"}`}>Score: {masteryResult.score}</div>
                    <div className="mr-feedback">{masteryResult.feedback}</div>
                    <div className="row mt3">
                      {masteryResult.passed && <button className="btn btn-pine" onClick={() => setTab("learn")}>Next Lesson →</button>}
                      {!masteryResult.passed && <button className="btn btn-gold" onClick={() => { setMasteryResult(null); setSelectedAnswer(null); }}>Try Again ↩</button>}
                      <button className="btn btn-outline btn-sm" onClick={() => setTab("learn")}>Back to Roadmap</button>
                    </div>
                  </div>
                )}

                {/* Always-visible bottom nav — never leave user stuck */}
                {!masteryResult && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 12px", borderTop: "1.5px solid var(--border)", marginTop: 16 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setTab("learn")}>← Roadmap</button>
                    <button className="btn btn-pine" onClick={() => {
                      if (activeLesson) {
                        const newMastered = new Set([...mastered, activeLesson.title]);
                        setMastered(newMastered);
                        autoGenerateWorkbookProblem(activeLesson.title, newMastered);
                        autoGenerateChallenge(activeLesson.title, newMastered);
                      }
                      setTab("learn");
                    }}>
                      ✓ Mark Done &amp; Continue →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}


// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Scholarly />);
