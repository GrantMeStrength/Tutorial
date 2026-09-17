/* =========================================================================
   provider.js  —  the PAGE PROVIDER seam.

   The engine is a director: it decides pacing and which room + level to show,
   then asks a provider for the actual page. TODAY that provider reads a
   pre-authored, verified library (composition). TOMORROW the same interface
   is fulfilled by an LLM that generates the page on the fly, validates the
   code, and falls back to the library if it can't.

   The engine never changes. Only the provider does.

       provider.getRoom(spec) -> Promise<Page>

   spec  = { stageIndex, stage:{id,title,concept,variants}, level,
             history[], projectState }
   Page  = { eyebrow, title, html, checkpoint:{q,hint}, source, verified }
             source: "library" | "generated" | "fallback"
   ========================================================================= */

window.Providers = (function () {
  "use strict";

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function roomEyebrow(spec) {
    return "Room " + (spec.stageIndex + 1) + " &middot; " + LEVEL_LABEL[spec.level] + " path";
  }

  /* ------------------------------------------------------------------ TODAY
     Composition over generation. Instant, deterministic, always correct.
     This is exactly what shipped in the static demo. */
  const StaticPageProvider = {
    id: "static",
    synchronous: true,
    async getRoom(spec) {
      const v = spec.stage.variants[spec.level];
      return {
        eyebrow: roomEyebrow(spec),
        title: spec.stage.title,
        html: v.html,
        checkpoint: v.checkpoint,
        source: "library",
        verified: true
      };
    }
  };

  /* --------------------------------------------------------------- TOMORROW
     A MOCK of the on-the-fly generator. It performs the real *shape* of the
     pipeline — build a GenSpec, retrieve grounded snippets, generate under a
     JSON schema, validate the emitted code, repair-or-fall-back — and streams
     each step to the UI via onStep. What it does NOT do is actually call a
     model; to keep the demo correct it re-uses the verified library body as
     the "generated" page. The SEAM is real; the author is stubbed.

       Swap this single object for a real client (GitHub Models / Copilot,
       plus a Roslyn/dotnet-build validator) and the app becomes dynamic —
       no engine changes. */
  function MockLLMPageProvider(opts) {
    opts = opts || {};
    const onStep = opts.onStep || function () {};
    const failRate = typeof opts.failRate === "number" ? opts.failRate : 0.35;

    return {
      id: "mock-llm",
      synchronous: false,
      async getRoom(spec) {
        const step = async (msg, ms) => { onStep(msg); await wait(ms); };

        await step("Building <b>GenSpec</b> &mdash; concept: &ldquo;" + spec.stage.concept +
                   "&rdquo; &middot; level: " + LEVEL_LABEL[spec.level] +
                   " &middot; history: " + spec.history.length + " rooms", 300);
        await step("Retrieving grounded snippets from the WinUI&nbsp;3 corpus&hellip;", 460);
        await step("Generating page under JSON schema (constrained decoding)&hellip;", 680);
        await step("Validating emitted code &mdash; <code>dotnet build</code>&hellip;", 560);

        // Show the safety loop: a build failure triggers a repair + re-validate.
        if (Math.random() < failRate) {
          await step("<span class='bad'>&#10007; build failed</span> (CS0246: type not found) &mdash; sending repair prompt&hellip;", 620);
          await step("Re-validating &mdash; <code>dotnet build</code>&hellip;", 520);
        }

        const v = spec.stage.variants[spec.level];

        // Genuine miss (no content for this slot) -> honest fallback to library.
        if (!v) {
          await step("<span class='warn'>&#9888; low confidence</span> &mdash; falling back to nearest library page", 420);
          const fb = spec.stage.variants.standard;
          return {
            eyebrow: roomEyebrow(spec),
            title: spec.stage.title,
            html: fb.html,
            checkpoint: fb.checkpoint,
            source: "fallback",
            verified: true
          };
        }

        await step("<span class='ok'>&#10003; build succeeded</span> &mdash; schema valid, emitting page", 320);
        return {
          eyebrow: roomEyebrow(spec),
          title: spec.stage.title,
          html: v.html,
          checkpoint: v.checkpoint,
          source: "generated",
          verified: true
        };
      }
    };
  }

  /* ---------------------------------------------------------- TOMORROW, REAL
     A REAL on-the-fly generator against any OpenAI-compatible chat endpoint
     (OpenAI, Azure OpenAI, Groq, Together, GitHub Models, a local llama.cpp
     server, ...). Same seam, same streamed pipeline as the mock — but this one
     actually calls a model.

       - grounds the prompt on the VERIFIED library page for this room
       - asks for constrained JSON (we assemble + escape the HTML ourselves,
         so the model can never break the page or inject markup)
       - statically validates the emitted page, and falls back to the library
         on any network / parse / validation failure

     Honesty: we can't run `dotnet build` in a browser, so "verified" here means
     schema + static code sanity, plus the grounding that keeps the API usage
     accurate. Point `endpoint` at a proxy to keep the key server-side.

       key    : ?key=... | localStorage.cyoa_llm_key | one-time prompt()
       model  : ?model=...   (default gpt-4o-mini)
       endpoint: ?endpoint=... (default OpenAI /v1/chat/completions) */
  function LLMPageProvider(opts) {
    opts = opts || {};
    const onStep = opts.onStep || function () {};
    const endpoint = opts.endpoint || "https://api.openai.com/v1/chat/completions";
    const model = opts.model || "gpt-4o-mini";
    let apiKey = opts.apiKey || null;

    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    function resolveKey() {
      if (apiKey) return apiKey;
      try { apiKey = localStorage.getItem("cyoa_llm_key"); } catch (e) {}
      if (!apiKey && typeof window.prompt === "function") {
        apiKey = (window.prompt("Paste an OpenAI-compatible API key.\nIt stays in THIS browser only (localStorage) and is sent straight to " + endpoint + ".") || "").trim();
      }
      if (apiKey) { try { localStorage.setItem("cyoa_llm_key", apiKey); } catch (e) {} }
      return apiKey;
    }

    function levelBrief(level) {
      if (level === "gentle") return "a nervous beginner who needs plain language, extra context, and small steps";
      if (level === "challenge") return "an experienced developer who wants a terse, fast, expert-level explanation";
      return "a typical developer who wants a clear, standard-paced explanation";
    }

    function buildMessages(spec) {
      const ref = spec.stage.variants.standard || spec.stage.variants[spec.level] || {};
      const refText = String(ref.html || "")
        .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        .replace(/\s+/g, " ").trim().slice(0, 1400);
      const sys =
        "You are a WinUI 3 (Windows App SDK, C#) tutorial author. You write ONE short room of a " +
        "build-along tutorial for a minimal 'hello world' WinUI 3 desktop app. " +
        "Return ONLY a JSON object with EXACTLY these keys and no others: " +
        '{"intro": string, "steps": string[], "code": {"lang": "xml"|"csharp", "content": string}, "note": string, "checkpoint": {"q": string, "hint": string}}. ' +
        "intro = 1-2 sentences, plain text (no HTML, no markdown). " +
        "steps = 2-4 short plain-text instructions. " +
        "code.content = RAW source only (do NOT HTML-escape, do NOT wrap in backticks); use real, current WinUI 3 / Windows App SDK APIs. " +
        "note = one short tip or empty string. checkpoint.q = one-line comprehension question; hint = one sentence. " +
        "Be correct and minimal. Output nothing outside the JSON object.";
      const usr =
        "Room " + (spec.stageIndex + 1) + " of " + QUEST.stages.length + ".\n" +
        "Concept: " + spec.stage.concept + ".\n" +
        "Room title: " + spec.stage.title + ".\n" +
        "Audience: " + levelBrief(spec.level) + ".\n" +
        "Rooms completed so far: " + spec.history.length + ".\n" +
        "Ground your explanation in this VERIFIED reference (rewrite it for the audience; keep the API usage accurate, do not invent APIs):\n" +
        refText;
      return [{ role: "system", content: sys }, { role: "user", content: usr }];
    }

    function assembleHtml(d) {
      let h = "";
      if (d.intro) h += "<p>" + esc(d.intro) + "</p>";
      if (Array.isArray(d.steps) && d.steps.length) {
        h += "<ol>" + d.steps.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>";
      }
      if (d.code && d.code.content) h += "<pre><code>" + esc(d.code.content) + "</code></pre>";
      if (d.note) h += '<p class="tip">' + esc(d.note) + "</p>";
      return h;
    }

    function lint(d) {
      if (!d || typeof d !== "object") return "not an object";
      if (typeof d.intro !== "string" || !d.intro.trim()) return "missing intro";
      if (!d.code || typeof d.code.content !== "string" || d.code.content.trim().length < 10) return "missing / empty code";
      if (!d.checkpoint || !d.checkpoint.q) return "missing checkpoint";
      if (/\bTODO\b|lorem ipsum|your code here|\.\.\./i.test(JSON.stringify(d))) return "placeholder text";
      return null;
    }

    function libraryFallback(spec) {
      const v = spec.stage.variants[spec.level] || spec.stage.variants.standard;
      return {
        eyebrow: roomEyebrow(spec), title: spec.stage.title,
        html: v.html, checkpoint: v.checkpoint, source: "fallback", verified: true
      };
    }

    return {
      id: "llm",
      synchronous: false,
      async getRoom(spec) {
        const step = async (m, ms) => { onStep(m); if (ms) await wait(ms); };

        await step("Building <b>GenSpec</b> &mdash; concept: &ldquo;" + spec.stage.concept +
                   "&rdquo; &middot; level: " + LEVEL_LABEL[spec.level] +
                   " &middot; history: " + spec.history.length + " rooms", 260);

        const key = resolveKey();
        if (!key) {
          await step("<span class='warn'>&#9888; no API key</span> &mdash; falling back to the library", 360);
          return libraryFallback(spec);
        }

        await step("Grounding on the verified library reference for this room&hellip;", 240);
        await step("Calling <code>" + esc(model) + "</code> under JSON schema (constrained decoding)&hellip;", 0);

        let data;
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
            body: JSON.stringify({
              model: model,
              messages: buildMessages(spec),
              temperature: 0.4,
              response_format: { type: "json_object" }
            })
          });
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            throw new Error("HTTP " + res.status + (t ? " &mdash; " + t.slice(0, 120) : ""));
          }
          const json = await res.json();
          const content = json && json.choices && json.choices[0] &&
                          json.choices[0].message && json.choices[0].message.content;
          if (!content) throw new Error("empty completion");
          data = JSON.parse(content);
        } catch (err) {
          await step("<span class='bad'>&#10007; generation failed</span> &mdash; " +
                     esc(String((err && err.message) || err)).slice(0, 140) +
                     " &middot; falling back to library", 380);
          return libraryFallback(spec);
        }

        await step("Validating emitted page &mdash; schema + code sanity checks&hellip;", 420);
        const problem = lint(data);
        if (problem) {
          await step("<span class='warn'>&#9888; validation: " + esc(problem) +
                     "</span> &mdash; falling back to library", 360);
          return libraryFallback(spec);
        }

        await step("<span class='ok'>&#10003; valid</span> &mdash; emitting generated page", 240);
        return {
          eyebrow: roomEyebrow(spec),
          title: spec.stage.title,
          html: assembleHtml(data),
          checkpoint: { q: data.checkpoint.q, hint: data.checkpoint.hint || "" },
          source: "generated",
          verified: true
        };
      }
    };
  }

  /* Pick a provider from the URL so the demo can show all three:
       (default)            -> StaticPageProvider   (instant library)
       ?ai=1  or ?provider=mock -> MockLLMPageProvider (live generation)
       &fail=1 force the repair loop, &fail=0 disable it. */
  function fromQuery(opts) {
    return build(queryChoice() || "static", opts);
  }

  // Was a provider explicitly requested in the URL? (null => show the gateway)
  function queryChoice() {
    const q = new URLSearchParams(location.search);
    if (q.get("provider") === "llm" || q.get("llm") === "1" || q.get("key")) return "llm";
    if (q.get("provider") === "mock" || q.get("ai") === "1") return "mock";
    if (q.get("provider") === "static" || q.get("static") === "1") return "static";
    return null;
  }

  // Construct a provider by kind ("static" | "mock" | "llm").
  function build(kind, opts) {
    opts = opts || {};
    const q = new URLSearchParams(location.search);
    if (kind === "llm") {
      return LLMPageProvider({
        onStep: opts.onStep,
        apiKey: q.get("key") || undefined,
        model: q.get("model") || undefined,
        endpoint: q.get("endpoint") || undefined
      });
    }
    if (kind !== "mock") return StaticPageProvider;
    let failRate = 0.35;
    if (q.get("fail") === "1") failRate = 1;
    if (q.get("fail") === "0") failRate = 0;
    return MockLLMPageProvider({ onStep: opts.onStep, failRate: failRate });
  }

  return { StaticPageProvider, MockLLMPageProvider, LLMPageProvider, fromQuery, queryChoice, build, roomEyebrow };
})();
