(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const menu = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");
  const interactive = document.getElementById("mode-interactive");
  const auto = document.getElementById("mode-auto");
  const description = document.getElementById("mode-description");
  const statusLabel = document.getElementById("status-label");
  const statusTag = document.getElementById("status-tag");
  const fileTitle = document.getElementById("status-file-title");
  const fileSubtitle = document.getElementById("status-file-subtitle");
  const statusDetail = document.getElementById("status-detail");
  const progressLabel = document.getElementById("progress-label");

  try {
    const saved = localStorage.getItem("adaassist-site-theme");
    root.dataset.theme = saved === "dark" || saved === "light" ? saved :
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch (_) {
    root.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function updateThemeLabel() {
    toggle.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  updateThemeLabel();
  toggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("adaassist-site-theme", root.dataset.theme); } catch (_) {}
    updateThemeLabel();
  });
  menu.addEventListener("click", () => {
    const opened = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(opened));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }));
  function setMode(mode) {
    const isInteractive = mode === "interactive";
    interactive.classList.toggle("selected", isInteractive);
    auto.classList.toggle("selected", !isInteractive);
    interactive.setAttribute("aria-pressed", String(isInteractive));
    auto.setAttribute("aria-pressed", String(!isInteractive));
    description.innerHTML = isInteractive ?
      '<div class="mode-label">HUMAN-IN-THE-LOOP</div><h3>Pause at the moments that matter.</h3><p>Review generated tests, inspect a candidate, adjust repair plans, and guide the next generation step with your own expertise.</p><ul class="feature-checks"><li>Inspect and edit intermediate artifacts</li><li>Refine public tests and requirements</li><li>Resume the same session after review</li></ul>' :
      '<div class="mode-label">AUTONOMOUS WORKFLOW</div><h3>Focus on the outcome, not every step.</h3><p>Let AdaAssist advance through generation, public-test evaluation, supported shallow fixes, and repair planning automatically within configured limits.</p><ul class="feature-checks"><li>Automated generation and test execution</li><li>Feedback-driven repair cycles</li><li>Pause and switch at supported checkpoints</li></ul>';
    statusLabel.textContent = isInteractive ? "REVIEW CHECKPOINT" : "AUTONOMOUS WORKFLOW";
    statusTag.textContent = isInteractive ? "Waiting for input" : "Auto advancing";
    fileTitle.textContent = isInteractive ? "Repair plan" : "Validation feedback";
    fileSubtitle.textContent = isInteractive ? "Editable before regeneration" : "Recorded in the session history";
    statusDetail.textContent = isInteractive ?
      "Review the feedback and edit the plan to guide the next candidate." :
      "The workflow checks public tests and proceeds to the next repair stage if needed.";
    progressLabel.textContent = isInteractive ? "Review" : "Repair";
  }
  interactive.addEventListener("click", () => setMode("interactive"));
  auto.addEventListener("click", () => setMode("auto"));
  document.getElementById("copyright-year").textContent = String(new Date().getFullYear());
})();