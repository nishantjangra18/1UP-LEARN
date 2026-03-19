import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function FeedbackForm({ onSubmit, onSkip }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    onSubmit({ rating, comment });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-5xl mb-3">🎉</div>
        <p className="font-game text-xl text-green-400">{t('feedback.thanks')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-auto"
    >
      <h3 className="font-game text-xl text-white mb-4 text-center">{t('feedback.title')}</h3>

      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-3xl transition hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-slate-600'}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('feedback.comment')}
        className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm resize-none h-20 outline-none border border-slate-600 focus:border-purple-500"
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={onSkip}
          className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-600 transition"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="flex-1 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition disabled:opacity-40"
        >
          {t('feedback.submit')}
        </button>
      </div>
    </motion.div>
  );
}
