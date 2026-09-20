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

const closeStudyDialog = () => {
  if (!studyDialog) return;
  studyDialog.classList.add('hidden');
  studyDialog.classList.remove('flex');
  if (startStudyButton) startStudyButton.textContent = 'Start study →';
};

themeToggle?.addEventListener('click', () => {
  root.classList.toggle('dark-mode');
  themeToggle.setAttribute('aria-label', root.classList.contains('dark-mode') ? 'Switch to day mode' : 'Switch to night mode');
});

menuToggle?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('!flex');
  navigation.classList.toggle('absolute', isOpen);
  navigation.classList.toggle('right-5', isOpen);
  navigation.classList.toggle('top-20', isOpen);
  navigation.classList.toggle('flex-col', isOpen);
  navigation.classList.toggle('bg-background', isOpen);
  navigation.classList.toggle('p-3', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
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
  if (event.key === 'Escape') closeStudyDialog();
});
startStudyButton?.addEventListener('click', () => {
  closeStudyDialog();
  document.querySelector('[data-testid="progress-path-progress"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

restartButton?.addEventListener('click', () => {
  document.querySelectorAll('[data-testid^="progress-"] .bg-accent').forEach((bar) => { bar.style.width = '0%'; });
  restartButton.textContent = 'Progress restarted';
});
