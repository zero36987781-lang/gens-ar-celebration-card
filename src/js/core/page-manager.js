export class PageManager {
  constructor({ containerSelector, pageSelector, dotContainerSelector, prevBtnSelector, nextBtnSelector, onBeforeEnter, onAfterEnter }) {
    this.pages = Array.from(document.querySelectorAll(pageSelector));
    this.dotContainer = document.querySelector(dotContainerSelector);
    this.prevBtn = document.querySelector(prevBtnSelector);
    this.nextBtn = document.querySelector(nextBtnSelector);
    this.onBeforeEnter = onBeforeEnter || (() => Promise.resolve());
    this.onAfterEnter = onAfterEnter || (() => {});
    this.currentIndex = 0;
    this.totalPages = this.pages.length;
    this.transitioning = false;

    this.renderDots();
    this.bindNav();
    this.syncNav();
  }

  renderDots() {
    if (!this.dotContainer) return;
    this.dotContainer.innerHTML = '';
    for (let i = 0; i < this.totalPages; i++) {
      const dot = document.createElement('div');
      dot.className = `nav-dot${i === 0 ? ' active' : ''}`;
      dot.dataset.pageIndex = i;
      dot.addEventListener('click', () => this.goTo(i));
      this.dotContainer.appendChild(dot);
    }
  }

  syncNav() {
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
    if (this.nextBtn) {
      if (this.currentIndex >= this.totalPages - 1) {
        this.nextBtn.textContent = 'Done';
      } else {
        this.nextBtn.textContent = 'Next ▶';
      }
    }
    if (this.dotContainer) {
      Array.from(this.dotContainer.children).forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentIndex);
      });
    }
  }

  bindNav() {
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());
  }

  async goTo(index, skipValidation = false) {
    if (this.transitioning) return;
    if (index < 0 || index >= this.totalPages) return;
    if (index === this.currentIndex) return;

    this.transitioning = true;

    try {
      await this.onBeforeEnter(index, this.currentIndex);
    } catch (e) {
      this.transitioning = false;
      return;
    }

    const leaving = this.pages[this.currentIndex];
    const entering = this.pages[index];

    // Prepare entering page offscreen
    entering.classList.remove('hidden');
    entering.classList.add('page-entering');

    // Wait one frame for the browser to apply opacity:0
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Fade out current
    leaving.classList.add('page-entering');

    await new Promise((r) => setTimeout(r, 220));

    leaving.classList.add('hidden');
    leaving.classList.remove('page-entering');

    // Fade in entering
    entering.classList.remove('page-entering');

    this.currentIndex = index;
    this.syncNav();
    this.onAfterEnter(index);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    await new Promise((r) => setTimeout(r, 220));
    this.transitioning = false;
  }

  prev() { this.goTo(this.currentIndex - 1); }
  next() { this.goTo(this.currentIndex + 1); }
  getCurrent() { return this.currentIndex; }
}
