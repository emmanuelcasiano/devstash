// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Navbar opacity on scroll
const navbar = document.getElementById("navbar");
function updateNavbar() {
  if (window.scrollY > 8) {
    navbar.classList.add("is-scrolled");
  } else {
    navbar.classList.remove("is-scrolled");
  }
}
updateNavbar();
window.addEventListener("scroll", updateNavbar, { passive: true });

// Scroll fade-in
const fadeEls = document.querySelectorAll(".fade-in");
const fadeObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        fadeObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 },
);
fadeEls.forEach((el) => fadeObserver.observe(el));

// Pricing monthly/yearly toggle
const pricingToggle = document.getElementById("pricingToggle");
const monthlyLabel = document.querySelector('[data-period-label="monthly"]');
const yearlyLabel = document.querySelector('[data-period-label="yearly"]');
const priceAmount = document.querySelector("[data-price-monthly]");
const pricePeriod = document.querySelector("[data-period-monthly]");

function setPricingPeriod(isYearly) {
  pricingToggle.setAttribute("aria-checked", String(isYearly));
  monthlyLabel.classList.toggle("is-active", !isYearly);
  yearlyLabel.classList.toggle("is-active", isYearly);

  if (priceAmount && pricePeriod) {
    priceAmount.textContent = isYearly
      ? priceAmount.dataset.priceYearly
      : priceAmount.dataset.priceMonthly;
    pricePeriod.textContent = isYearly
      ? pricePeriod.dataset.periodYearly
      : pricePeriod.dataset.periodMonthly;
  }
}

setPricingPeriod(false);

pricingToggle.addEventListener("click", () => {
  const isYearly = pricingToggle.getAttribute("aria-checked") !== "true";
  setPricingPeriod(isYearly);
});

// Chaos icon animation: drift, bounce off walls, pulse, repel from cursor
const chaosBox = document.getElementById("chaosBox");
const chaosIconsContainer = document.getElementById("chaosIcons");

if (chaosBox && chaosIconsContainer) {
  const iconEls = Array.from(chaosIconsContainer.querySelectorAll(".chaos-icon"));
  const ICON_SIZE = 52;
  const REPEL_RADIUS = 60;
  const REPEL_STRENGTH = 2.5;

  let bounds = { width: 0, height: 0 };
  let mouse = { x: -9999, y: -9999, active: false };

  function refreshBounds() {
    bounds = {
      width: chaosIconsContainer.clientWidth,
      height: chaosIconsContainer.clientHeight,
    };
  }
  refreshBounds();
  window.addEventListener("resize", refreshBounds);

  const icons = iconEls.map((el, i) => {
    const angle = (i / iconEls.length) * Math.PI * 2;
    return {
      el,
      x: bounds.width / 2 + Math.cos(angle) * (bounds.width / 3),
      y: bounds.height / 2 + Math.sin(angle) * (bounds.height / 3),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      pulsePhase: Math.random() * Math.PI * 2,
    };
  });

  chaosBox.addEventListener("mousemove", (e) => {
    const rect = chaosIconsContainer.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  chaosBox.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  let frame = 0;
  function tick() {
    frame += 1;

    for (const icon of icons) {
      icon.x += icon.vx;
      icon.y += icon.vy;

      // Bounce off walls
      if (icon.x <= 0 || icon.x >= bounds.width - ICON_SIZE) {
        icon.vx *= -1;
        icon.x = Math.max(0, Math.min(icon.x, bounds.width - ICON_SIZE));
      }
      if (icon.y <= 0 || icon.y >= bounds.height - ICON_SIZE) {
        icon.vy *= -1;
        icon.y = Math.max(0, Math.min(icon.y, bounds.height - ICON_SIZE));
      }

      // Repel from mouse cursor
      if (mouse.active) {
        const cx = icon.x + ICON_SIZE / 2;
        const cy = icon.y + ICON_SIZE / 2;
        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS && dist > 0.01) {
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
          icon.vx += (dx / dist) * force * 0.04;
          icon.vy += (dy / dist) * force * 0.04;
        }
      }

      // Gentle speed clamp so repelled icons settle back down
      const speed = Math.hypot(icon.vx, icon.vy);
      const MAX_SPEED = 1.4;
      if (speed > MAX_SPEED) {
        icon.vx = (icon.vx / speed) * MAX_SPEED;
        icon.vy = (icon.vy / speed) * MAX_SPEED;
      }
      icon.vx *= 0.985;
      icon.vy *= 0.985;

      icon.rotation += icon.rotationSpeed;
      const pulse = 1 + Math.sin(frame * 0.02 + icon.pulsePhase) * 0.06;

      icon.el.style.transform = `translate(${icon.x}px, ${icon.y}px) rotate(${icon.rotation}deg) scale(${pulse})`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
