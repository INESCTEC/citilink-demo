 export function easeInScrollTo(to, duration = 600) {
  const start = window.scrollY || window.pageYOffset;
  const change = to - start;
  const startTime = performance.now();

  // Ease-in function (cubic)
  const easeIn = t => t * t * t;

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeIn(progress);

    window.scrollTo(0, start + change * ease);

    if (elapsed < duration) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

export function easeInScrollToTarget(target, duration = 600, offset = 0) {
  let targetPosition;

  // Determine target position based on input type
  if (typeof target === 'number') {
    // Direct pixel position
    targetPosition = target;
  } else if (typeof target === 'string') {
    let element;
    
    if (target.startsWith('#')) {
      // Element ID
      element = document.getElementById(target.slice(1));
    } else if (target.startsWith('.')) {
      // Element class (first match)
      element = document.querySelector(target);
    } else {
      // Try as a querySelector
      element = document.querySelector(target);
    }

    if (!element) {
      console.warn(`Scroll target not found: ${target}`);
      return;
    }

    targetPosition = element.offsetTop + offset;
  } else if (target instanceof HTMLElement) {
    // Direct element reference
    targetPosition = target.offsetTop + offset;
  } else {
    console.error('Invalid scroll target. Use a number, element ID (#id), class (.class), or HTMLElement.');
    return;
  }

  const start = window.scrollY || window.pageYOffset;
  const change = targetPosition - start;
  const startTime = performance.now();

  // Ease-in function (cubic)
  const easeIn = t => t * t * t;

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeIn(progress);

    window.scrollTo(0, start + change * ease);

    if (elapsed < duration) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}