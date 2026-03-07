export function AnswerFeedback({ correct, correctAnswer }) {
  if (correct) {
    return (
      <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 fade-in">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">Correct!</p>
      </div>
    )
  }
  return (
    <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 fade-in">
      <p className="font-semibold text-rose-800 dark:text-rose-200">
        Wrong! The correct answer is: {correctAnswer}
      </p>
    </div>
  )
}
