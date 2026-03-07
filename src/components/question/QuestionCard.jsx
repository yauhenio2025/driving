import { useState } from 'react'
import { Badge } from '../shared/Badge'
import { getImagePath } from '../../data/questions'

export function QuestionCard({ question, index, total }) {
  const [enlarged, setEnlarged] = useState(false)
  const imgPath = getImagePath(question)

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Badge color="blue">{question.category}</Badge>
        {total && (
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
            {index + 1} / {total}
          </span>
        )}
      </div>
      <p className="text-lg font-medium text-slate-900 dark:text-white mb-4 leading-relaxed">
        {question.text}
      </p>
      {imgPath && (
        <>
          <img
            src={imgPath}
            alt="Question illustration"
            className="rounded-lg max-w-full max-h-64 cursor-pointer hover:opacity-90 transition mb-4"
            onClick={() => setEnlarged(true)}
          />
          {enlarged && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setEnlarged(false)}
            >
              <img src={imgPath} alt="Question illustration" className="max-w-full max-h-[90vh] rounded-lg" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
