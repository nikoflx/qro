(() => {
  "use strict";

  // DOM
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");
  const previewArea = document.getElementById("previewArea");
  const previewImg = document.getElementById("previewImg");
  const fileName = document.getElementById("fileName");
  const clearBtn = document.getElementById("clearBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const loadingBar = document.getElementById("loadingBar");
  const loadingText = document.getElementById("loadingText");
  const errorMsg = document.getElementById("errorMsg");
  const results = document.getElementById("results");
  const resultHeader = document.getElementById("resultHeader");
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugePercent = document.getElementById("gaugePercent");
  const gaugeSubtext = document.getElementById("gaugeSubtext");
  const resultDetails = document.getElementById("resultDetails");
  const resetBtn = document.getElementById("resetBtn");
  const configBanner = document.getElementById("configBanner");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const CIRCUMFERENCE = 2 * Math.PI * 42; // gauge circle

  let currentFile = null;

  // Show config banner if no API URL
  if (!CONFIG.API_URL) {
    configBanner.classList.add("visible");
  }

  // ---- File handling ----

  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showError("Unsupported format. Please use JPG, PNG, or WEBP.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showError("File too large. Maximum size is 10MB.");
      return;
    }

    currentFile = file;
    hideError();
    hideResults();

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      fileName.textContent = truncate(file.name, 40) + " · " + formatSize(file.size);
      dropZone.style.display = "none";
      previewArea.classList.add("visible");
      previewArea.classList.add("fade-up");
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  clearBtn.addEventListener("click", resetAll);
  resetBtn.addEventListener("click", resetAll);

  function resetAll() {
    currentFile = null;
    fileInput.value = "";
    previewArea.classList.remove("visible");
    dropZone.style.display = "";
    hideResults();
    hideError();
    hideLoading();
    analyzeBtn.disabled = false;
  }

  // ---- Analysis ----

  analyzeBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    hideError();
    hideResults();
    showLoading();

    try {
      const data = await detectImage(currentFile);
      hideLoading();
      showResults(data);
    } catch (err) {
      hideLoading();
      showError(err.message || "Something went wrong. Please try again.");
      analyzeBtn.disabled = false;
    }
  });

  async function detectImage(file) {
    // If no API URL configured, use mock
    if (!CONFIG.API_URL) {
      return mockDetection();
    }

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(CONFIG.API_URL + "/api/detect", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status})`);
    }

    return res.json();
  }

  function mockDetection() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const aiScore = Math.random();
        resolve({
          ai_score: aiScore,
          human_score: 1 - aiScore,
          labels: [
            { label: "artificial", score: aiScore },
            { label: "human", score: 1 - aiScore },
          ],
          model: "umm-maybe/AI-image-detector (mock)",
        });
      }, 1800);
    });
  }

  // ---- Results display ----

  function showResults(data) {
    const aiScore = data.ai_score;
    const humanScore = data.human_score;
    const pct = Math.round(aiScore * 100);

    // Header text
    let headerText, headerClass;
    if (aiScore > 0.7) {
      headerText = "Likely AI-Generated";
      headerClass = "ai";
    } else if (aiScore < 0.3) {
      headerText = "Likely Human-Made";
      headerClass = "human";
    } else {
      headerText = "Inconclusive";
      headerClass = "uncertain";
    }

    resultHeader.textContent = headerText;
    resultHeader.className = "result-header " + headerClass;

    // Gauge
    const offset = CIRCUMFERENCE - (aiScore * CIRCUMFERENCE);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.style.stroke =
      aiScore > 0.7 ? "var(--red)" :
      aiScore < 0.3 ? "var(--green)" :
      "var(--text-dim)";

    gaugePercent.textContent = pct + "%";
    gaugePercent.style.color =
      aiScore > 0.7 ? "var(--red)" :
      aiScore < 0.3 ? "var(--green)" :
      "var(--text-dim)";

    // Detail rows
    resultDetails.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">AI probability</span>
        <div class="detail-bar">
          <div class="mini-bar">
            <div class="mini-bar-fill ai" style="width: ${pct}%"></div>
          </div>
          <span class="detail-value">${pct}%</span>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Human probability</span>
        <div class="detail-bar">
          <div class="mini-bar">
            <div class="mini-bar-fill human" style="width: ${Math.round(humanScore * 100)}%"></div>
          </div>
          <span class="detail-value">${Math.round(humanScore * 100)}%</span>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Confidence</span>
        <span class="detail-value">${getConfidence(aiScore)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Model</span>
        <span class="detail-value" style="color:var(--text-faint);font-size:11px">${data.model || "AI-image-detector"}</span>
      </div>
    `;

    results.classList.add("visible", "fade-up");
    results.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function getConfidence(score) {
    const dist = Math.abs(score - 0.5) * 2; // 0 to 1
    if (dist > 0.8) return "Very high";
    if (dist > 0.5) return "High";
    if (dist > 0.3) return "Moderate";
    return "Low";
  }

  // ---- UI helpers ----

  function showLoading() {
    loadingBar.classList.add("active");
    loadingText.classList.add("active");
    updateLoadingText();
  }

  function hideLoading() {
    loadingBar.classList.remove("active");
    loadingText.classList.remove("active");
  }

  const loadingMessages = [
    "Running inference on model...",
    "Analyzing pixel patterns...",
    "Checking for synthetic artifacts...",
    "Evaluating generation signatures...",
    "Computing confidence scores...",
  ];

  function updateLoadingText() {
    let i = 0;
    const interval = setInterval(() => {
      if (!loadingBar.classList.contains("active")) {
        clearInterval(interval);
        return;
      }
      i = (i + 1) % loadingMessages.length;
      loadingText.textContent = loadingMessages[i];
    }, 2200);
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add("visible");
  }

  function hideError() {
    errorMsg.classList.remove("visible");
  }

  function hideResults() {
    results.classList.remove("visible", "fade-up");
    // Reset gauge
    gaugeFill.style.strokeDashoffset = CIRCUMFERENCE;
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len - 3) + "..." : str;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
})();
