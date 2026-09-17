/* =========================================================================
   engine.js  —  the "dungeon master". Pure selection + sequencing.
   It owns a single piece of adaptive state: the reader's current PATH
   (gentle → standard → challenge). It renders the matching pre-authored
   variant, then a check-in re-routes the path for what comes next.

   No content is generated here. The engine only chooses which page to show.
   ========================================================================= */

(function () {
  "use strict";

  const stageEl = document.getElementById("stage");
  const hudEl = document.getElementById("hud");
  const hudPage = document.getElementById("hud-page");
  const hudLevel = document.getElementById("hud-level");
  const progressEl = document.getElementById("progress");
  const restartEl = document.getElementById("restart");

  const clampLevel = (i) => Math.max(0, Math.min(LEVELS.length - 1, i));

  const state = {
    levelIdx: 1,          // 0 gentle · 1 standard · 2 challenge
    stage: -1,            // index into QUEST.stages
    phase: "intro",       // intro | stage | outro
    history: []           // [{ id, title, level }]
  };

  // The page source is chosen at the gateway (or pinned via URL). Static
  // library today; the same seam accepts a real LLM client tomorrow.
  let provider = null;
  let renderToken = 0;    // guards against races (fast restart during async gen)
  function setProvider(kind) { provider = Providers.build(kind, { onStep: oracleStep }); }

  /* ------------------------------------------------------------------ util */
  function levelName() { return LEVELS[state.levelIdx]; }

  function setHud() {
    if (state.phase === "intro" || state.phase === "gateway") { hudEl.hidden = true; return; }
    hudEl.hidden = false;
    const shown = state.phase === "outro" ? QUEST.stages.length : state.stage + 1;
    hudPage.textContent = shown + " / " + QUEST.stages.length;
    hudLevel.textContent = LEVEL_LABEL[levelName()];
    hudLevel.className = "level-badge level-" + levelName();
  }

  function setProgress() {
    progressEl.innerHTML = "";
    QUEST.stages.forEach((_, i) => {
      const pip = document.createElement("span");
      pip.className = "pip";
      if (state.phase === "outro" || i < state.stage) pip.classList.add("done");
      else if (i === state.stage) pip.classList.add("current");
      progressEl.appendChild(pip);
    });
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  function makeChoice(label, sub, cls, onClick) {
    const btn = document.createElement("button");
    btn.className = "choice" + (cls ? " " + cls : "");
    btn.type = "button";
    btn.innerHTML =
      '<span class="rune">&#10148;</span><span><span class="c-main">' + label + "</span>" +
      (sub ? '<span class="c-sub">' + sub + "</span>" : "") + "</span>";
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* --------------------------------------------------------------- gateway */
  // First screen: choose WHO writes each room. Three doors, matching the three
  // glowing portals in the hero art — the pre-authored library (red {}), the
  // simulated oracle (green <>), and a real model you bring a key for (blue />).
  function renderGateway() {
    state.phase = "gateway";
    renderToken++;
    setHud();
    setProgress();

    const wrap = document.createElement("div");
    wrap.className = "gateway";
    wrap.innerHTML =
      '<figure class="gateway-hero">' +
        '<img src="media/gateway-hero.jpg" width="1200" height="676" ' +
        'alt="Choose Your Own Codeventure: a hooded coder reads a glowing codebook before three runic dungeon doors." />' +
      "</figure>" +
      '<p class="eyebrow">Before you enter</p>' +
      "<h2>Three doors, one quest</h2>" +
      '<p class="lead">You&rsquo;ll build the same WinUI&nbsp;3 &ldquo;hello&rdquo; app whichever way you go. ' +
      "The only difference is <em>who writes each room</em> as you reach it.</p>";

    const doors = document.createElement("div");
    doors.className = "doors";

    doors.appendChild(gateDoor({
      cls: "door-static", kind: "static", rune: "{&nbsp;}", icon: "&#128220;",
      title: "The Library",
      tag: "Pre-written &middot; instant &middot; always correct",
      body: "Every room is authored ahead of time and code-verified. Turn the pages and the book re-routes to your level. Works offline, never breaks.",
      cta: "Enter the Library"
    }));

    doors.appendChild(gateDoor({
      cls: "door-ai", kind: "mock", rune: "&lt;&#8202;&gt;", icon: "&#128302;",
      title: "The Oracle",
      tag: "Generated on demand &middot; no key needed",
      body: "Watch the real generate-and-verify pipeline stream, room by room, and recover when a build fails &mdash; the safe way to demo the idea.",
      cta: "Summon the Oracle",
      note: "The pipeline is real; the model call is simulated, so the code always stays correct."
    }));

    doors.appendChild(gateDoor({
      cls: "door-live", kind: "llm", rune: "/&#8202;&gt;", icon: "&#128300;",
      title: "The Living Oracle",
      tag: "Real model &middot; bring your own key",
      body: "The same pipeline, but a live OpenAI-compatible model actually writes each room. Grounded on the verified pages, validated, with a library fallback.",
      cta: "Wake the Living Oracle",
      note: "Prompts for an API key, kept only in this browser. Falls back to the library on any error."
    }));

    wrap.appendChild(doors);
    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  function gateDoor(o) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "door " + o.cls;
    btn.innerHTML =
      '<span class="door-rune">' + o.rune + "</span>" +
      '<span class="door-icon">' + o.icon + "</span>" +
      '<span class="door-title">' + o.title + "</span>" +
      '<span class="door-tag">' + o.tag + "</span>" +
      '<span class="door-body">' + o.body + "</span>" +
      (o.note ? '<span class="door-note">' + o.note + "</span>" : "") +
      '<span class="door-cta">' + o.cta + " &#10148;</span>";
    btn.addEventListener("click", () => chooseGate(o.kind));
    return btn;
  }

  function chooseGate(kind) {
    setProvider(kind);
    // reflect the choice in the URL so it's shareable and reload-safe
    const url = kind === "mock" ? "?ai=1" : kind === "llm" ? "?llm=1" : location.pathname;
    history.replaceState({}, "", url);
    renderIntro();
  }

  /* ----------------------------------------------------------------- intro */
  function renderIntro() {
    state.phase = "intro";
    renderToken++;          // cancel any in-flight async room render
    setHud();
    setProgress();

    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<p class="eyebrow">' + QUEST.intro.eyebrow + "</p>" +
      "<h2>" + QUEST.intro.title + "</h2>" +
      QUEST.intro.html;

    const choices = document.createElement("div");
    choices.className = "choices";
    QUEST.intro.choices.forEach((c, i) => {
      choices.appendChild(
        makeChoice(c.label, c.sub, i === 1 ? "choice-primary" : "", () => {
          state.levelIdx = LEVELS.indexOf(c.level);
          state.stage = -1;
          state.history = [];
          nextStage();
        })
      );
    });
    wrap.appendChild(choices);

    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  /* ----------------------------------------------------------------- stage */
  function nextStage() {
    state.stage += 1;
    if (state.stage >= QUEST.stages.length) { renderOutro(); return; }
    renderStage();
  }

  function buildSpec() {
    const stage = QUEST.stages[state.stage];
    return {
      stageIndex: state.stage,
      stage: stage,
      level: levelName(),
      history: state.history.slice(),
      // In a real system this carries the files built so far, so the
      // generator can emit a coherent diff instead of a fresh page.
      projectState: { room: state.stage, note: "files-so-far live here" }
    };
  }

  async function renderStage() {
    state.phase = "stage";
    if (!provider) setProvider("static");   // safety net
    const stage = QUEST.stages[state.stage];

    // record (or update) this room in the history
    const existing = state.history[state.stage];
    if (existing) existing.level = levelName();
    else state.history.push({ id: stage.id, title: stage.title, level: levelName() });

    setHud();
    setProgress();

    const spec = buildSpec();
    const token = ++renderToken;

    // Async providers (the LLM) show a live generation console first.
    if (!provider.synchronous) renderGenerating(spec);

    let page;
    try {
      page = await provider.getRoom(spec);
    } catch (err) {
      page = fallbackPage(spec);
    }
    if (token !== renderToken) return; // a newer render superseded this one
    renderRoomPage(page);
  }

  function renderRoomPage(page) {
    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<p class="eyebrow">' + page.eyebrow + "</p>" +
      "<h2>" + page.title + "</h2>" +
      (page.source && page.source !== "library" ? provenance(page) : "") +
      page.html;
    wrap.appendChild(renderCheckpoint(page.checkpoint));
    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  // Small provenance pill so the audience can see WHERE the page came from.
  function provenance(page) {
    const gen = page.source === "generated";
    return '<div class="provenance ' + (gen ? "gen" : "fb") + '">' +
      '<span class="prov-icon">' + (gen ? "&#9889;" : "&#8618;") + "</span>" +
      (gen ? "Generated on the fly" : "Library fallback") +
      (page.verified ? '<span class="prov-ok">&#10003; code verified</span>' : "") +
      "</div>";
  }

  // The "oracle" console: a live log of the generation + validation pipeline.
  function renderGenerating(spec) {
    const wrap = document.createElement("div");
    wrap.className = "oracle";
    wrap.innerHTML =
      '<p class="eyebrow">Room ' + (spec.stageIndex + 1) + " &middot; " + LEVEL_LABEL[spec.level] + " path</p>" +
      '<h2 class="oracle-title"><span class="orb"></span>Consulting the oracle&hellip;</h2>' +
      '<p class="oracle-sub">Generating this room for the <strong>' + LEVEL_LABEL[spec.level] +
      "</strong> path, then verifying the code before you ever see it.</p>" +
      '<ul class="oracle-log" id="oracle-log"></ul>';
    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  function oracleStep(msg) {
    const log = document.getElementById("oracle-log");
    if (!log) return;
    const li = document.createElement("li");
    li.innerHTML = msg;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  }

  // Last-ditch page if a provider throws outright.
  function fallbackPage(spec) {
    const v = spec.stage.variants.standard || spec.stage.variants[spec.level];
    return {
      eyebrow: Providers.roomEyebrow(spec),
      title: spec.stage.title,
      html: v.html,
      checkpoint: v.checkpoint,
      source: "fallback",
      verified: true
    };
  }

  /* ------------------------------------------------------------ checkpoint */
  function renderCheckpoint(cp) {
    cp = cp || { q: "How did that room feel?", hint: "" };
    const box = document.createElement("div");
    box.className = "checkpoint";
    box.innerHTML =
      '<p class="cp-q">' + cp.q + "</p>" +
      (cp.hint ? '<p class="cp-hint">' + cp.hint + "</p>" : "");

    const choices = document.createElement("div");
    choices.className = "choices";
    const atFloor = state.levelIdx === 0;
    const atCeil = state.levelIdx === LEVELS.length - 1;

    // Too easy → steepen the path
    choices.appendChild(makeChoice(
      atCeil ? "Nailed it &mdash; keep the challenge" : "Too easy &mdash; pick up the pace",
      atCeil ? "Already on the expert path" : "Steepen the next room",
      "",
      () => { state.levelIdx = clampLevel(state.levelIdx + 1); flash("Path steepening…", nextStage); }
    ));

    // Just right → hold
    choices.appendChild(makeChoice(
      "Just right &mdash; continue", "Hold this pace", "choice-primary",
      () => nextStage()
    ));

    // A bit much → ease the NEXT room
    choices.appendChild(makeChoice(
      atFloor ? "Still tricky &mdash; keep it gentle" : "A bit much &mdash; ease up",
      atFloor ? "Already on the gentlest path" : "Gentle the next room",
      "",
      () => { state.levelIdx = clampLevel(state.levelIdx - 1); flash("Easing the path…", nextStage); }
    ));

    // Lost me → RE-READ this same room, one level gentler (no advance)
    if (!atFloor) {
      choices.appendChild(makeChoice(
        "Lost me &mdash; re-explain <em>this</em> room",
        "Re-read Room " + (state.stage + 1) + " a gentler way",
        "",
        () => {
          state.levelIdx = clampLevel(state.levelIdx - 1);
          flash("Re-routing to a gentler path…", renderStage); // same stage index
        }
      ));
    }

    box.appendChild(choices);
    return box;
  }

  // brief transition so the adaptation is felt, not just seen
  function flash(msg, then) {
    const banner = document.createElement("div");
    banner.className = "note";
    banner.innerHTML = '<span class="note-title">Dungeon master</span>' + msg;
    stageEl.replaceChildren(banner);
    scrollTop();
    setTimeout(then, 420);
  }

  /* ----------------------------------------------------------------- outro */
  function renderOutro() {
    state.phase = "outro";
    renderToken++;          // cancel any in-flight async room render
    setHud();
    setProgress();

    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<p class="eyebrow">' + QUEST.outro.eyebrow + "</p>" +
      "<h2>" + QUEST.outro.title + "</h2>" +
      QUEST.outro.html;

    const recap = document.createElement("div");
    recap.className = "recap";
    state.history.forEach((h, i) => {
      const row = document.createElement("div");
      row.className = "recap-step";
      row.innerHTML =
        '<span class="rune" style="color:var(--gold)">&#10148;</span>' +
        '<span class="r-stage">' + h.title + "</span>" +
        '<span class="r-level">&mdash; ' + LEVEL_LABEL[h.level] + " path</span>";
      recap.appendChild(row);
    });
    wrap.appendChild(recap);

    const distinct = new Set(state.history.map((h) => h.level)).size;
    const summary = document.createElement("p");
    summary.innerHTML = distinct > 1
      ? "Notice you shifted paths <strong>" + distinct + " different ways</strong> — that re-routing is the whole idea."
      : "You held one steady path — another reader would have branched somewhere else entirely.";
    wrap.appendChild(summary);

    const choices = document.createElement("div");
    choices.className = "choices";
    choices.appendChild(makeChoice("Run it again, differently", "See how other answers re-route the book", "choice-primary", start));
    wrap.appendChild(choices);

    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  /* ------------------------------------------------------------------ boot */
  function start() {
    state.levelIdx = 1;
    state.stage = -1;
    state.phase = "gateway";
    state.history = [];
    const pinned = Providers.queryChoice();   // ?ai=1 / ?static=1 skip the gateway
    if (pinned) { setProvider(pinned); renderIntro(); }
    else { provider = null; renderGateway(); }
  }

  restartEl.addEventListener("click", (e) => { e.preventDefault(); start(); });
  start();
})();
