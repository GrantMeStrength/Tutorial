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

  /* Pick a provider from the URL so the demo can show both:
       (default)            -> StaticPageProvider   (instant library)
       ?ai=1  or ?provider=mock -> MockLLMPageProvider (live generation)
       &fail=1 force the repair loop, &fail=0 disable it. */
  function fromQuery(opts) {
    opts = opts || {};
    const q = new URLSearchParams(location.search);
    const useMock = q.get("provider") === "mock" || q.get("ai") === "1";
    if (!useMock) return StaticPageProvider;
    let failRate = 0.35;
    if (q.get("fail") === "1") failRate = 1;
    if (q.get("fail") === "0") failRate = 0;
    return MockLLMPageProvider({ onStep: opts.onStep, failRate: failRate });
  }

  return { StaticPageProvider, MockLLMPageProvider, fromQuery, roomEyebrow };
})();
