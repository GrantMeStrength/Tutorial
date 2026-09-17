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

  /* ------------------------------------------------------------------ util */
  function levelName() { return LEVELS[state.levelIdx]; }

  function setHud() {
    if (state.phase === "intro") { hudEl.hidden = true; return; }
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

  /* ----------------------------------------------------------------- intro */
  function renderIntro() {
    state.phase = "intro";
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

  function renderStage() {
    state.phase = "stage";
    const stage = QUEST.stages[state.stage];
    const variant = stage.variants[levelName()];

    // record (or update) this room in the history
    const existing = state.history[state.stage];
    if (existing) existing.level = levelName();
    else state.history.push({ id: stage.id, title: stage.title, level: levelName() });

    setHud();
    setProgress();

    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<p class="eyebrow">Room ' + (state.stage + 1) + " &middot; " + LEVEL_LABEL[levelName()] + " path</p>" +
      "<h2>" + stage.title + "</h2>" +
      variant.html;

    wrap.appendChild(renderCheckpoint(stage, variant));
    stageEl.replaceChildren(wrap);
    scrollTop();
  }

  /* ------------------------------------------------------------ checkpoint */
  function renderCheckpoint(stage, variant) {
    const cp = variant.checkpoint || { q: "How did that room feel?", hint: "" };
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
    state.phase = "intro";
    state.history = [];
    renderIntro();
  }

  restartEl.addEventListener("click", (e) => { e.preventDefault(); start(); });
  start();
})();
