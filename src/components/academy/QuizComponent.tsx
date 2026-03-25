"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Trophy, RotateCcw } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizResult {
  question: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

interface QuizComponentProps {
  quizId: string;
  lessonId: string;
  questions: QuizQuestion[];
  passingScore: number;
}

export default function QuizComponent({ lessonId, questions, passingScore }: QuizComponentProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    results: QuizResult[];
  } | null>(null);

  const handleSelect = (optionIndex: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.some((a) => a === null)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/academy/quiz/${lessonId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setSubmitted(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentQ(0);
    setAnswers(new Array(questions.length).fill(null));
    setSubmitted(false);
    setResult(null);
  };

  if (submitted && result) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            result.passed ? "bg-green-100" : "bg-red-100"
          }`}>
            <Trophy size={36} className={result.passed ? "text-green-600" : "text-red-600"} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {result.passed ? "Tebrikler! Sınavı Geçtiniz!" : "Maalesef Geçemediniz"}
          </h3>
          <p className="text-gray-500 mt-1">
            Puan: <strong className={result.passed ? "text-green-600" : "text-red-600"}>{result.score}/100</strong>
            {" "}| {result.correct}/{result.total} doğru | Geçme notu: {passingScore}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {result.results.map((r, i) => (
            <div key={i} className={`p-4 rounded-lg border ${r.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-start gap-2">
                {r.isCorrect ? (
                  <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm text-gray-900">{r.question}</p>
                  {!r.isCorrect && (
                    <p className="text-xs text-red-600 mt-1">
                      Seçiminiz: {questions[i].options[r.selectedIndex]} | Doğru: {questions[i].options[r.correctIndex]}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{r.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!result.passed && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <RotateCcw size={16} />
            Tekrar Dene
          </button>
        )}
      </div>
    );
  }

  const q = questions[currentQ];
  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Quiz</h3>
        <span className="text-sm text-gray-500">
          Soru {currentQ + 1}/{questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full mb-6">
        <div
          className="h-full bg-blue-600 rounded-full transition-all"
          style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-lg font-medium text-gray-900 mb-4">{q.question}</p>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {q.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              answers[currentQ] === i
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold mr-3 shrink-0">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
        >
          Önceki
        </button>

        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                i === currentQ
                  ? "bg-blue-600 text-white"
                  : answers[i] !== null
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ(currentQ + 1)}
            className="px-4 py-2 text-sm text-blue-600 font-medium hover:text-blue-800"
          >
            Sonraki
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Sınavı Bitir
          </button>
        )}
      </div>
    </div>
  );
}
