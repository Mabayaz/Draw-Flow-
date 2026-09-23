const answerKey = { q1: 'B', q2: 'A', q3: 'C', q4: 'D', q5: 'C', q6: 'A', q7: 'C', q8: 'B', q9: 'D', q10: 'C' };
const quizForm = document.getElementById('quiz-form');
const quizProgress = document.getElementById('quiz-progress');
const resultsBox = document.getElementById('results-box');
const scoreText = document.getElementById('score-text');

const updateQuizProgress = () => {
  if (!quizForm || !quizProgress) return;
  const answered = Object.keys(answerKey).filter((question) => quizForm.querySelector(`input[name="${question}"]:checked`)).length;
  quizProgress.textContent = `${answered} / 10 answered`;
};

quizForm?.addEventListener('change', updateQuizProgress);
quizForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(quizForm);
  let score = 0;
  Object.entries(answerKey).forEach(([questionName, correctAnswer]) => {
    const question = quizForm.querySelector(`input[name="${questionName}"]`)?.closest('.space-y-2');
    question?.querySelectorAll('label').forEach((label) => {
      const input = label.querySelector('input');
      label.classList.add('quiz-option');
      label.classList.toggle('is-correct', input?.value === correctAnswer);
      label.classList.toggle('is-incorrect', input?.checked && input.value !== correctAnswer);
    });
    if (formData.get(questionName) === correctAnswer) score += 1;
  });

  const message = score === 10 ? 'Excellent. You have a strong grasp of the foundations.' : score >= 7 ? 'Good work. Review the highlighted answers to sharpen the details.' : 'Keep practicing. Revisit the lessons and try again.';
  scoreText.textContent = `You scored ${score} out of 10. ${message}`;
  resultsBox.classList.remove('hidden');
  resultsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.querySelector('[data-reset-quiz]')?.addEventListener('click', () => {
  quizForm.reset();
  quizForm.querySelectorAll('label').forEach((label) => label.classList.remove('quiz-option', 'is-correct', 'is-incorrect'));
  resultsBox.classList.add('hidden');
  updateQuizProgress();
});

updateQuizProgress();
