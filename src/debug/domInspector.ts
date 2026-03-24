export function installDomInspector() {
  // Create overlay style
  const style = document.createElement("style");
  style.innerHTML = `
    [data-dom-ui="true"] {
      outline: 2px solid rgba(0,255,255,0.7) !important;
    }
    .__dom-blocker {
      outline: 2px dashed red !important;
      background: rgba(255,0,0,0.05);
    }
  `;
  document.head.appendChild(style);

  // Scan DOM every 800ms
  setInterval(() => {
    document.querySelectorAll(".__dom-blocker")
      .forEach(el => el.classList.remove("__dom-blocker"));

    const all = document.querySelectorAll("body *");

    all.forEach((el: any) => {
      const cs = window.getComputedStyle(el);
      const pe = cs.pointerEvents;

      // Mark suspicious elements
      if (
        pe !== "none" &&
        !el.hasAttribute("data-dom-ui") &&
        el.tagName !== "CANVAS"
      ) {
        el.classList.add("__dom-blocker");
      }
    });
  }, 800);
}

