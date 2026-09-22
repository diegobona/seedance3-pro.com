import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function assertTrialResolutionControl(markup, shellName) {
  const select = markup.match(/<select\b(?=[^>]*\bid=["']image-quality["'])[^>]*>[\s\S]*?<\/select>/i)?.[0];
  assert.ok(select, `${shellName} should use a resolution dropdown`);
  assert.match(select, /<option\b(?=[^>]*\bvalue=["']1K["'])[^>]*\bselected\b[^>]*>\s*1K\s*<\/option>|<option\b(?=[^>]*\bvalue=["']1K["'])[^>]*>\s*1K\s*<\/option>/i);
  assert.match(select, /<option\b(?=[^>]*\bvalue=["']2K["'])(?=[^>]*\bdisabled\b)[^>]*>[^<]*2K[^<]*Locked[^<]*<\/option>/i);
  assert.match(select, /<option\b(?=[^>]*\bvalue=["']4K["'])(?=[^>]*\bdisabled\b)[^>]*>[^<]*4K[^<]*Locked[^<]*<\/option>/i);
  assert.doesNotMatch(markup, /id=["']image-resolution-options["']/i, `${shellName} should remove resolution buttons`);
  assert.match(markup, /TRIAL\s*·\s*1K ONLY/i, `${shellName} should explain the trial limit`);
  assert.match(markup, /<label[^>]*>[\s\S]*Resolution[\s\S]*id=["']image-quality["']/i, `${shellName} should label the dropdown`);
}

function assertVisibleCreditSummary(markup, shellName) {
  const opening = markup.match(
    /<section\b(?=[^>]*\bid=["']credit-summary["'])(?=[^>]*\bclass(?:Name)?=["'][^"']*\bcredit-summary\b[^"']*["'])(?![^>]*\bhidden\b)[^>]*>/i
  );
  assert.ok(opening, `${shellName} should keep the credit summary section visible`);
  const contentStart = opening.index + opening[0].length;
  const contentEnd = markup.indexOf("</section>", contentStart);
  assert.ok(contentEnd > contentStart, `${shellName} should close the credit summary section`);
  const summary = markup.slice(contentStart, contentEnd);

  for (const [id, description] of [
    ["generation-credit-cost", "this generation's cost"],
    ["current-credit-balance", "the current balance"]
  ]) {
    assert.match(
      summary,
      new RegExp(`<[^>]+(?=[^>]*\\bid=["']${id}["'])(?=[^>]*\\bclass(?:Name)?=["'][^"']*\\bcredit-summary-value\\b[^"']*["'])[^>]*>`, "i"),
      `${shellName} should show ${description} with shared value styling`
    );
  }
  assert.match(summary, /THIS GENERATION/i, `${shellName} should label the generation cost`);
  assert.match(summary, /YOUR BALANCE/i, `${shellName} should label the current balance`);
  assert.doesNotMatch(summary, /After generation|after-generation-credit-balance/i, `${shellName} should not show projected balance`);
}

function boundElementName(script, id) {
  const binding = script.match(new RegExp(
    `\\b([a-z_$][\\w$]*)\\s*=\\s*document\\.getElementById\\(\\s*["']${id}["']\\s*\\)`,
    "i"
  ));
  assert.ok(binding, `expected controller binding for #${id}`);
  return binding[1];
}

function modelButtonMarkup(markup, modelId) {
  const start = markup.indexOf(`data-model="${modelId}"`);
  assert.ok(start >= 0, `expected ${modelId} model button`);
  const opening = markup.lastIndexOf("<button", start);
  const end = markup.indexOf("</button>", start);
  assert.ok(opening >= 0 && end > start, `expected complete ${modelId} model button`);
  return markup.slice(opening, end + "</button>".length);
}

function assertNonEmptyCssValue(styles, property, description) {
  const declaration = styles.match(new RegExp(`\\b${property}\\s*:\\s*([^;}]*)`, "i"));
  assert.ok(declaration, `expected ${description}`);
  const value = declaration[1].trim();
  assert.doesNotMatch(value, /\btransparent\b/i, `${description} must not be transparent`);
  assert.doesNotMatch(value, /^(?:none|(?:0(?:px|rem|em|%)?\s*)+)$/i, `${description} must be visibly non-empty`);
  if (property.startsWith("border")) {
    assert.doesNotMatch(value, /^0(?:px|rem|em|%)?\b/i, `${description} must have non-zero width`);
  }
}

test("studio model URLs use the selected model while preserving other URL state", async () => {
  const { buildModelUrl, normalizeModelId } = await import("../app/model-routing.mjs");
  const available = new Set(["minimax-h3", "seedance-3", "pose-to-image", "nano-banana-2-lite", "gpt-image-2"]);

  assert.equal(normalizeModelId("nano-banana-2-lite", available), "nano-banana-2-lite");
  assert.equal(normalizeModelId("pose-to-image", available), "pose-to-image");
  assert.equal(normalizeModelId("unknown", available), "gpt-image-2");
  assert.equal(
    buildModelUrl("https://www.seedance3-pro.com/app/?model=minimax-h3&ref=showcase#editor", "gpt-image-2"),
    "/app/?model=gpt-image-2&ref=showcase#editor"
  );
});

test("studio clicks push model URLs and browser history restores model state", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(html, /<script type="module" src="\.\/studio\.js"><\/script>/i);
  assert.match(script, /history\.pushState\([^;]+buildModelUrl\(window\.location\.href,\s*normalizedModelId\)/i);
  assert.match(script, /modelButtons\.forEach\([\s\S]*selectModel\(button\.dataset\.model,\s*\{\s*syncUrl:\s*true\s*\}\)/i);
  assert.match(
    script,
    /(?:window\.addEventListener\(\s*["']popstate["']|listen\(\s*window\s*,\s*["']popstate["'])[\s\S]*selectModel\(modelFromLocation\(\)\)/i
  );
});

test("studio initialization is explicit, repeatable, and cleaned up by React", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(script, /export\s+function\s+initializeStudio\s*\(/i);
  assert.match(script, /return\s*\(\s*\)\s*=>\s*\{[\s\S]*?(?:cleanup|destroy)/i);

  const effect = route.match(/useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},\s*\[\]\)/i);
  assert.ok(effect, "expected a mount-scoped studio effect");
  assert.match(effect[1], /import\(["']\.\.\/\.\.\/app\/studio\.js["']\)\.then\s*\(/i);
  const cleanupAssignment = effect[1].match(/\b([a-z_$][\w$]*)\s*=\s*initializeStudio\(\s*\)/i);
  assert.ok(cleanupAssignment, "React should call initializeStudio after the module resolves");
  assert.match(effect[1], /\bdisposed\b[\s\S]*?return/i, "late imports should not initialize an unmounted route");
  assert.match(
    effect[1],
    new RegExp(`\\b${cleanupAssignment[1]}\\?\\.\\(\\s*\\)`, "i"),
    "React should invoke studio cleanup on unmount"
  );
  assert.doesNotMatch(route, /studio\.js[^"']*\?/i, "module cache busting should not be used");

  assert.match(html, /\bdata-studio-auto-init\b/i, "legacy preview should explicitly opt into auto-init");
  assert.doesNotMatch(route, /\bdata-studio-auto-init\b/i, "React shell must not opt into module auto-init");
  assert.match(script, /data-studio-auto-init/i);
  assert.match(script, /["']pagehide["'][\s\S]*?(?:cleanup|destroy)/i);
  assert.match(script, /["']pageshow["'][\s\S]*?persisted[\s\S]*?initializeStudio/i);
});

test("H3 is text-to-video only in TanStack while legacy preview keeps it disabled", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  const poseEntry = html.indexOf('data-model="pose-to-image"');
  const imageModelsHeading = html.indexOf("IMAGE MODELS");

  assert.ok(poseEntry >= 0, "expected a Pose to Image navigation entry");
  assert.ok(imageModelsHeading > poseEntry, "expected Pose to Image before the image model list");
  assert.match(html, /<div class="section-heading"><span>AI IMAGE<\/span><\/div>/i);
  assert.match(html, /<div class="section-heading image-models-heading"><span>IMAGE MODELS<\/span><span>02<\/span><\/div>/i);
  assert.match(html, /class="model-button pose-workflow-button"[^>]+data-model="pose-to-image"/i);
  for (const modelId of ["seedance-3", "nano-banana-2-lite"]) {
    const disabledModel = new RegExp(`data-model=["']${modelId}["'][^>]*disabled`, "i");
    const comingSoon = new RegExp(`data-model=["']${modelId}["'][\\s\\S]*?Coming Soon[\\s\\S]*?<\\/button>`, "i");
    assert.match(html, disabledModel, `${modelId} should be disabled in the legacy preview`);
    assert.match(route, disabledModel, `${modelId} should be disabled in the TanStack route`);
    assert.match(html, comingSoon, `${modelId} should display Coming Soon`);
    assert.match(route, comingSoon, `${modelId} should display Coming Soon in the TanStack route`);
  }
  assert.match(route, /data-model=["']pose-to-image["'](?![^>]*disabled)/i);
  assert.doesNotMatch(modelButtonMarkup(route, "pose-to-image"), /Coming Soon/i);
  assert.match(modelButtonMarkup(route, "pose-to-image"), /Open Pose Studio/i);
  assert.match(html, /data-model=["']minimax-h3["'][^>]*disabled/i);
  assert.match(modelButtonMarkup(html, "minimax-h3"), /Coming Soon/i);
  assert.match(route, /data-model=["']minimax-h3["'](?![^>]*disabled)/i);
  assert.match(modelButtonMarkup(route, "minimax-h3"), /Text-to-video/i);
  assert.doesNotMatch(modelButtonMarkup(route, "minimax-h3"), /Coming Soon/i);
  assert.match(html, /data-model="gpt-image-2"[^>]*class="model-button is-active"|class="model-button is-active"[^>]*data-model="gpt-image-2"/i);
  assert.doesNotMatch(html, /data-model="gpt-image-2"[^>]*disabled/i);
  assert.match(script, /"pose-to-image"\s*:\s*\{[\s\S]*?status:\s*"Ragdoll IK"[\s\S]*?type:\s*"pose"[\s\S]*?\}/i);
  assert.match(css, /\.pose-workflow-button\s*\{/i);
  assert.match(css, /\.model-button:disabled/i);
  assert.match(css, /\.settings-grid\[hidden\]\s*\{\s*display:\s*none/i);
});

test("available model detection follows the rendered enabled buttons", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(script, /modelButtons[\s\S]*filter\([\s\S]*!button\.disabled[\s\S]*new Set/i);
  assert.doesNotMatch(script, /const availableModelIds\s*=\s*new Set\(\["gpt-image-2"\]\)/i);
  assert.match(script, /normalizeModelId\(modelId,\s*availableModelIds\)/i);
});

test("H3 trial controls expose only text, 5\/10\/15 seconds, 480p, and safe aspect ratios", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const videoSettings = route.match(/<div[^>]+id="video-settings"[\s\S]*?<\/div>/i)?.[0] || "";

  assert.match(videoSettings, /id="video-duration"/i);
  for (const duration of ["5", "10", "15"]) {
    assert.match(videoSettings, new RegExp(`value=["']${duration}["']`));
  }
  assert.match(videoSettings, /id="video-resolution"[^>]*disabled/i);
  assert.match(videoSettings, /value="480p"/i);
  assert.doesNotMatch(videoSettings, /768p/i);
  assert.match(videoSettings, /id="video-aspect-ratio"/i);
  for (const ratio of ["9:16", "16:9", "1:1"]) assert.match(videoSettings, new RegExp(`value=["']${ratio}["']`));

  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  assert.match(script, /uploadGroup\.hidden\s*=\s*[^;]*type\s*===\s*["']video["']/i);
  assert.match(script, /modeGroup\.hidden\s*=\s*true|modeGroup\.hidden\s*=\s*[^;]*type\s*===\s*["']video["']/i);
});

test("studio routes H3 through the video client and renders an accessible video result", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const clientPath = resolve(root, "app", "video-generation.mjs");

  assert.ok(existsSync(clientPath));
  assert.match(script, /from\s+["']\.\/video-generation\.mjs["']/i);
  assert.match(script, /requestVideoGeneration/);
  assert.match(script, /pollVideoGenerationTask/);
  assert.match(script, /sessionStorage/);
  assert.match(script, /seedance:auth-required/);
  assert.match(script, /document\.createElement\(["']video["']\)/i);
  assert.match(script, /\.controls\s*=\s*true/i);
  assert.match(script, /\.playsInline\s*=\s*true/i);
  assert.match(script, /Open or download generated video/i);
  assert.match(route, /id="result-heading-label"[^>]*>GENERATED IMAGES/i);
  assert.match(route, /id="result-model-label"[^>]*>GPT Image 2/i);
});

test("H3 duration drives credit and generate labels without changing GPT Image behavior", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(script, /creditCostForDuration/);
  assert.match(script, /Generate video\s*·\s*\$\{[^}]+\}\s*credits/i);
  assert.match(script, /Generate image\s*·\s*5 credits/i);
  assert.match(script, /requestImageGeneration/);
  assert.match(script, /quantity:\s*normalizeImageQuantity\(imageQuantity\.value\)/i);
  assert.match(script, /resolution:\s*imageQuality\.value/i);
});

test("GPT Image 2 appears before Nano Banana 2 Lite in both studio sidebars", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");

  for (const [shellName, markup] of [["legacy studio", html], ["TanStack studio", route]]) {
    const gptImage = markup.indexOf('data-model="gpt-image-2"');
    const nanoBanana = markup.indexOf('data-model="nano-banana-2-lite"');
    assert.ok(gptImage >= 0 && nanoBanana >= 0, `${shellName} should contain both image models`);
    assert.ok(gptImage < nanoBanana, `${shellName} should place GPT Image 2 first`);
  }
});

test("available paid models highlight the $0.01 entry price in the studio sidebar", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  assert.match(route, /data-model=["']minimax-h3["'][^>]*>[\s\S]*?<em className=["']price-badge["']>FROM <b>\$0\.01<\/b><\/em>[\s\S]*?<\/button>/i);
  assert.match(route, /data-model=["']gpt-image-2["'][^>]*>[\s\S]*?<em className=["']price-badge["']>FROM <b>\$0\.01<\/b><\/em>[\s\S]*?<\/button>/i);
  assert.equal((route.match(/className=["']price-badge["']/g) || []).length, 2);
  assert.match(css, /\.model-button\.price-model/);
  assert.match(css, /\.price-badge/);
});

test("selected reference images use a prominent ready-state card", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  assert.match(route, /className=["']reference-attached-badge["']>REFERENCE READY</i);
  assert.match(css, /\.reference-preview\s*\{[^}]*grid-template-columns:92px/i);
  assert.match(css, /\.reference-attached-badge/);
});

test("empty studios expose a three-image interactive example carousel", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  for (const [shellName, markup] of [["legacy studio", html], ["TanStack studio", route]]) {
    assert.match(markup, /id=["']example-carousel["'](?![^>]*hidden)/i, `${shellName} should show the empty-state carousel`);
    const slides = markup.match(/class(?:Name)?=["'][^"']*\bexample-carousel-slide\b[^"']*["']/gi) || [];
    assert.equal(slides.length, 3, `${shellName} should provide three example slides`);
    for (const asset of ["editorial-fashion", "lunar-garden", "floating-city"]) {
      assert.match(markup, new RegExp(`/assets/gpt-image-2-${asset}\\.webp`, "i"));
    }
    assert.match(markup, /id=["']example-carousel-previous["']/i);
    assert.match(markup, /id=["']example-carousel-next["']/i);
    assert.equal((markup.match(/data-carousel-dot/gi) || []).length, 3, `${shellName} should provide three carousel dots`);
  }

  assert.match(script, /\bcreateExampleCarouselController\b/);
  assert.match(script, /exampleCarousel\.hidden\s*=\s*true/i, "generated results should replace the empty-state carousel");
  assert.match(script, /exampleCarousel\.hidden\s*=\s*false/i, "starting a new generation should restore the empty state until results arrive");
  assert.ok(
    script.indexOf("selectModel(modelFromLocation())") < script.indexOf("createExampleCarouselController({"),
    "the selected model should initialize before the carousel writes its first caption"
  );
  assert.doesNotMatch(
    script,
    /examplePrompt\.textContent\s*=\s*value/i,
    "loading a prompt should not overwrite the active carousel caption"
  );
});

test("studio removes the model note card", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.doesNotMatch(html, /MODEL NOTE|context-title|context-card spotlight/i);
  assert.doesNotMatch(route, /MODEL NOTE|context-title|context-card spotlight/i);
  assert.doesNotMatch(script, /contextTitle|context-title/i);
});

test("trial studios use a 1K-only resolution dropdown", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");

  assertTrialResolutionControl(html, "legacy studio");
  assertTrialResolutionControl(route, "TanStack studio");
});

test("credit summaries stay visible and visually prominent in both studio shells", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  assertVisibleCreditSummary(html, "legacy studio");
  assertVisibleCreditSummary(route, "TanStack studio");

  const summaryRule = css.match(/\.credit-summary\s*\{([^}]*)\}/i);
  assert.ok(summaryRule, "expected credit summary styling");
  assertNonEmptyCssValue(summaryRule[1], "border(?:-[a-z-]+)?", "a high-contrast credit summary border");
  assertNonEmptyCssValue(summaryRule[1], "background(?:-image)?", "a contrasting credit summary background or gradient");
  assertNonEmptyCssValue(summaryRule[1], "box-shadow", "a credit summary accent shadow");

  const valueRule = css.match(/[^{}]*\.credit-summary-value[^{}]*\{([^}]*)\}/i);
  assert.ok(valueRule, "expected dedicated credit value styling");
  const fontSize = valueRule[1].match(/\bfont-size\s*:\s*([^;}]+)/i);
  assert.ok(fontSize, "credit values should declare a prominent font size");
  const minimumSize = fontSize[1].match(/(?:^|clamp\(\s*)([\d.]+)(px|rem)\b/i);
  assert.ok(minimumSize, "credit value font size should use px/rem or a px/rem clamp minimum");
  const pixels = minimumSize[2].toLowerCase() === "rem"
    ? Number(minimumSize[1]) * 16
    : Number(minimumSize[1]);
  assert.ok(pixels >= 20, `credit value font size should be at least 20px, got ${pixels}px`);

  const trialCompleteMessage = "Your free trial is complete. Full launch is coming soon — video generation from $0.01/sec.";
  assert.match(readFileSync(resolve(root, "app", "studio.js"), "utf8"), new RegExp(trialCompleteMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(css, /\.credit-summary\.is-exhausted::after/i, "the real waitlist panel should replace generated pseudo-content");
});

test("Pose Studio exposes only the focused ragdoll IK workspace in the TanStack app", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(route, /id=["']pose-studio["']/i);
  assert.match(route, /id=["']pose-canvas["']/i);
  for (const action of ["undo", "redo", "reset"]) {
    assert.match(route, new RegExp(`data-pose-action=["']${action}["']`, "i"));
  }
  for (const preset of ["crossed-arms", "kneeling", "jogging"]) {
    assert.match(route, new RegExp(`data-pose-preset=["']${preset}["']`, "i"));
  }
  assert.match(route, /anyposes-crossed-arms\.png/i);
  assert.match(route, /anyposes-kneeling\.png/i);
  assert.match(route, /anyposes-jogging\.png/i);
  assert.match(route, /Ragdoll IK/i);
  assert.doesNotMatch(route, /FK mode|OpenPose settings|joint hierarchy/i);
  assert.match(script, /import\(["']\.\/pose-studio\.mjs["']\)/i);
  assert.match(script, /initializePoseStudio/i);
});

test("Use this pose captures the clean mannequin and transfers it into GPT Image 2", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const studio = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const poseStudio = readFileSync(resolve(root, "app", "pose-studio.mjs"), "utf8");

  assert.match(route, /data-pose-action=["']use["'](?![^>]*disabled)/i);
  assert.doesNotMatch(route, /Pose capture and AI generation arrive in the next build step/i);
  assert.match(poseStudio, /capturePoseReference/);
  assert.match(poseStudio, /onUsePose/);
  assert.match(poseStudio, /handles\.forEach[\s\S]*visible\s*=\s*false/i);
  assert.match(poseStudio, /grid\.visible\s*=\s*false/i);
  assert.match(studio, /onUsePose\s*:\s*async/i);
  assert.match(studio, /selectModel\(["']gpt-image-2["'][\s\S]*syncUrl\s*:\s*true/i);
  assert.match(studio, /setReferenceImage\(/i);
  assert.match(studio, /buildPoseReferencePrompt/);
});

test("pose-guided results can return to the preserved pose or generate again", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const studio = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  assert.match(route, /id=["']pose-result-actions["'][^>]*hidden/i);
  assert.match(route, /POSE GUIDED/i);
  assert.match(route, /id=["']edit-pose-button["']/i);
  assert.match(route, /id=["']generate-again-button["']/i);
  assert.match(studio, /createPoseResultActionsController/);
  assert.match(studio, /selectModel\(["']pose-to-image["'][\s\S]*syncUrl\s*:\s*true/i);
  assert.match(studio, /onGenerateAgain\s*:\s*\(\)\s*=>\s*runImageGeneration\(\)/i);
  assert.match(studio, /generationUsedPoseReference[\s\S]*setVisible\(generationUsedPoseReference\)/i);
  assert.match(css, /\.pose-result-actions\s*\{/i);
});

test("studio wires the credit summary controller to its actual DOM nodes", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  const containerNode = boundElementName(script, "credit-summary");
  const costNode = boundElementName(script, "generation-credit-cost");
  const currentNode = boundElementName(script, "current-credit-balance");
  const quantityNode = boundElementName(script, "image-quantity");

  assert.match(
    script,
    /import\s*\{[\s\S]*?\bcreateCreditSummaryController\b[\s\S]*?\}\s*from\s*["']\.\/studio-controls\.mjs["']/i
  );
  const controllerCall = script.match(
    /\b([a-z_$][\w$]*)\s*=\s*createCreditSummaryController\(\s*\{([\s\S]*?)\}\s*\)/i
  );
  assert.ok(controllerCall, "expected studio to create and retain the credit summary controller");
  for (const nodeName of [containerNode, costNode, currentNode, quantityNode]) {
    assert.match(controllerCall[2], new RegExp(`\\b${nodeName}\\b`), `expected controller to receive ${nodeName}`);
  }
  assert.match(script, new RegExp(`\\b${controllerCall[1]}\\.loadBalance\\s*\\(`, "i"));
  assert.match(controllerCall[2], /\bonChange\s*:/i, "expected credit state changes to reach the studio");
  assert.match(
    script,
    /generateButton\.disabled\s*=\s*[^;]*\bcreditInsufficient\b/i,
    "known credit insufficiency should disable generation"
  );
});

test("exhausted trials offer one-click launch notification and five bonus credits", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  for (const markup of [html, route]) {
    assert.match(markup, /id=["']launch-waitlist["'][^>]*hidden/i);
    assert.match(markup, /from\s*<strong>\$0\.01\/sec<\/strong>/i);
    assert.match(markup, /5 bonus credits/i);
    assert.match(markup, /id=["']launch-waitlist-button["']/i);
    assert.match(markup, /Notify me &amp; claim 5 credits/i);
  }
  assert.match(script, /createLaunchWaitlistController/);
  assert.match(script, /setVisible\(summary\.currentBalance\s*===\s*0\)/);
  assert.match(css, /\.launch-waitlist\s*\{/);
});

test("successful email authentication tells the studio to refresh its credit balance", () => {
  const route = readFileSync(resolve(root, "src", "routes", "app.tsx"), "utf8");

  assert.match(route, /onAuthenticated=\{[^}]*\}/i);
  assert.match(route, /seedance:auth-changed/i);
});

test("GPT Image 2 exposes first-party text and reference-image generation controls", () => {
  const html = readFileSync(resolve(root, "app", "legacy-preview.html"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const clientPath = resolve(root, "app", "image-generation.mjs");
  assert.ok(existsSync(clientPath), "expected app/image-generation.mjs");
  const client = readFileSync(clientPath, "utf8");

  assert.match(html, /<input[^>]+id="reference-input"[^>]+type="file"[^>]+accept="image\/png,image\/jpeg,image\/webp"/i);
  assert.match(html, /id="generation-status"/i);
  assert.match(html, /id="result-card"[^>]+hidden/i);
  assert.match(html, /id="result-gallery"/i);
  assert.match(html, /class="generate-button"[^>]+id="generate-button"[^>]*>[\s\S]*id="generate-button-label"/i);
  assert.match(html, /id="prompt-structure-button"/i);
  assert.match(html, /id="example-prompt-button"/i);
  assert.match(html, /id="image-quantity"(?![^>]*disabled)/i);
  assert.match(html, /<select[^>]*id="image-quality"[^>]*>[\s\S]*value="1K"[\s\S]*<\/select>/i);
  assert.match(html, /id="image-aspect-ratio"(?![^>]*disabled)/i);
  assert.match(script, /import\s+\{\s*requestImageGeneration\s*\}\s+from\s+"\.\/image-generation\.mjs"/i);
  assert.match(script, /applyPromptStructure/);
  assert.match(script, /examplePromptAt/);
  assert.match(script, /creditCostForQuantity/);
  assert.match(script, /sizeForAspectRatio/);
  assert.match(script, /"gpt-image-2"\s*:\s*\{[\s\S]*?canGenerate:\s*true/i);
  assert.match(script, /Generate image\s*·\s*5 credits/i);
  assert.match(script, /INSUFFICIENT_CREDITS/);
  assert.match(script, /seedance:credits-updated/);
  assert.match(script, /result\.images/);
  assert.match(script, /resultGallery\.replaceChildren/);
  assert.match(client, /fetchImpl\("\/api\/images\/generate"/i);
  assert.doesNotMatch(`${html}\n${script}\n${client}`, /TUZI_API_KEY|Bearer\s+[A-Za-z0-9_-]{8,}/i);
});

test("studio initializes prompt controls before selecting the initial model", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const promptInitialization = script.indexOf('const prompt = document.getElementById("studio-prompt")');
  const initialModelSelection = script.indexOf("selectModel(modelFromLocation())");

  assert.ok(promptInitialization >= 0, "expected prompt initialization");
  assert.ok(initialModelSelection > promptInitialization, "prompt must exist before selectModel updates the generate button");
});
