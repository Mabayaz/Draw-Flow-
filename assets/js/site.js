const root = document.documentElement;
const themeToggle = document.querySelector('[data-testid="button-theme-toggle"]');
const menuToggle = document.querySelector('[data-testid="button-mobile-menu"]');
const navigation = document.querySelector('nav');
const restartButton = document.querySelector('[data-testid="button-restart-progress"]');
const studyDialog = document.querySelector('#study-dialog');
const studyTitle = document.querySelector('#study-dialog-title');
const studyDescription = document.querySelector('#study-dialog-description');
const closeDialogButton = document.querySelector('[data-close-dialog]');
const startStudyButton = document.querySelector('[data-start-study]');
const desktopNavMedia = window.matchMedia('(min-width: 768px)');

const savedTheme = localStorage.getItem('drawflow-theme');
if (savedTheme === 'dark') root.classList.add('dark-mode');

const updatePageProgress = () => {
  const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = pageHeight > 0 ? Math.min(window.scrollY / pageHeight, 1) * 100 : 100;
  root.style.setProperty('--page-progress', `${progress}%`);
};

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 })
  : null;

document.querySelectorAll('main section, main article, main aside').forEach((element) => {
  element.setAttribute('data-reveal', '');
  if (revealObserver) revealObserver.observe(element);
});

window.addEventListener('scroll', updatePageProgress, { passive: true });
window.addEventListener('resize', updatePageProgress);
updatePageProgress();

const closeStudyDialog = () => {
  if (!studyDialog) return;
  studyDialog.classList.add('hidden');
  studyDialog.classList.remove('flex');
  if (startStudyButton) startStudyButton.textContent = 'Start study →';
};

const mobileMenuClasses = ['!flex', 'absolute', 'right-5', 'left-5', 'top-20', 'flex-col', 'items-stretch', 'gap-2', 'rounded-2xl', 'border', 'border-border', 'bg-background', 'p-3', 'shadow-xl'];

const closeMobileMenu = () => {
  if (!menuToggle || !navigation) return;
  navigation.classList.remove(...mobileMenuClasses);
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
  document.body.classList.remove('overflow-hidden');
};

const openMobileMenu = () => {
  if (!menuToggle || !navigation) return;
  navigation.classList.add(...mobileMenuClasses);
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
  document.body.classList.add('overflow-hidden');
};

themeToggle?.addEventListener('click', () => {
  root.classList.toggle('dark-mode');
  const isDark = root.classList.contains('dark-mode');
  localStorage.setItem('drawflow-theme', isDark ? 'dark' : 'light');
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to day mode' : 'Switch to night mode');
  themeToggle.setAttribute('aria-pressed', String(isDark));
});

if (themeToggle) {
  themeToggle.setAttribute('aria-label', root.classList.contains('dark-mode') ? 'Switch to day mode' : 'Switch to night mode');
  themeToggle.setAttribute('aria-pressed', String(root.classList.contains('dark-mode')));
}

if (menuToggle && navigation) {
  navigation.id ||= 'site-navigation';
  menuToggle.setAttribute('aria-controls', navigation.id);
  menuToggle.addEventListener('click', () => {
    const isOpen = navigation.classList.contains('!flex');
    if (isOpen) closeMobileMenu();
    else openMobileMenu();
  });
}

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (!menuToggle || !navigation.classList.contains('!flex')) return;
    closeMobileMenu();
  });
});

window.addEventListener('resize', () => {
  if (desktopNavMedia.matches) closeMobileMenu();
});

document.addEventListener('click', (event) => {
  if (!menuToggle || !navigation || !navigation.classList.contains('!flex')) return;
  if (navigation.contains(event.target) || menuToggle.contains(event.target)) return;
  closeMobileMenu();
});

document.addEventListener('focusin', (event) => {
  if (!menuToggle || !navigation || !navigation.classList.contains('!flex')) return;
  if (navigation.contains(event.target) || menuToggle.contains(event.target)) return;
  closeMobileMenu();
});

document.querySelectorAll('[data-study]').forEach((studyCard) => {
  studyCard.addEventListener('click', (event) => {
    event.preventDefault();
    if (!studyDialog || !studyTitle || !studyDescription) return;
    studyTitle.textContent = studyCard.dataset.study;
    studyDescription.textContent = studyCard.dataset.studyDescription;
    studyDialog.classList.remove('hidden');
    studyDialog.classList.add('flex');
    closeDialogButton?.focus();
  });
});

document.querySelector('[data-coming-soon]')?.addEventListener('click', () => {
  if (!studyDialog || !studyTitle || !studyDescription) return;
  studyTitle.textContent = 'Color in company';
  studyDescription.textContent = 'This study is still being prepared. Check back soon for a guided exploration of tension, harmony, and the colors between colors.';
  if (startStudyButton) startStudyButton.textContent = 'Got it';
  studyDialog.classList.remove('hidden');
  studyDialog.classList.add('flex');
  closeDialogButton?.focus();
});

closeDialogButton?.addEventListener('click', closeStudyDialog);
studyDialog?.addEventListener('click', (event) => {
  if (event.target === studyDialog) closeStudyDialog();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeStudyDialog();
    closeMobileMenu();
  }
});
startStudyButton?.addEventListener('click', () => {
  closeStudyDialog();
  document.querySelector('[data-testid="progress-path-progress"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

restartButton?.addEventListener('click', () => {
  document.querySelectorAll('[data-testid^="progress-"] .bg-accent').forEach((bar) => { bar.style.width = '0%'; });
  restartButton.textContent = 'Progress restarted';
});
