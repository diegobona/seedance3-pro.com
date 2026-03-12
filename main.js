const uploadInput = document.getElementById("asset-upload");
const uploadStatus = document.getElementById("upload-status");
const promptInput = document.getElementById("prompt");
const promptCount = document.getElementById("prompt-count");
const form = document.getElementById("video-form");
const feedback = document.getElementById("form-feedback");
const counters = document.querySelectorAll("[data-counter]");

function animateCounter(element, target) {
  let current = 0;
  const duration = 1200;
  const increment = Math.max(1, Math.floor(target / (duration / 16)));
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = current.toString();
  }, 16);
}

if (uploadInput && uploadStatus) {
  uploadInput.addEventListener("change", () => {
    const files = Array.from(uploadInput.files || []);
    if (!files.length) {
      uploadStatus.textContent = "No files selected";
      return;
    }
    if (files.length > 12) {
      uploadStatus.textContent = `You selected ${files.length} files. Please keep it to 12 or fewer.`;
      return;
    }
    const totalSizeMB = (files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1);
    uploadStatus.textContent = `${files.length} file(s) selected · ${totalSizeMB} MB total`;
  });
}

if (promptInput && promptCount) {
  promptInput.addEventListener("input", () => {
    promptCount.textContent = promptInput.value.length.toString();
  });
}

if (form && feedback) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = promptInput?.value.trim() || "";
    if (!text) {
      feedback.classList.remove("hidden", "border-emerald-400/30", "bg-emerald-500/10", "text-emerald-200");
      feedback.classList.add("border-rose-400/30", "bg-rose-500/10", "text-rose-200");
      feedback.textContent = "Please add a prompt before generating a video.";
      return;
    }
    feedback.classList.remove("hidden", "border-rose-400/30", "bg-rose-500/10", "text-rose-200");
    feedback.classList.add("border-emerald-400/30", "bg-emerald-500/10", "text-emerald-200");
    feedback.textContent = "Request captured successfully. Your generated video preview will appear here after API processing.";
  });
}

const counterObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }
    const target = Number(entry.target.getAttribute("data-counter"));
    if (!Number.isNaN(target)) {
      animateCounter(entry.target, target);
    }
    observer.unobserve(entry.target);
  });
}, { threshold: 0.6 });

counters.forEach((counter) => counterObserver.observe(counter));
