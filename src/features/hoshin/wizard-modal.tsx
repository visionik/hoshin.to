"use client";

import { useCallback, useState } from "react";
import {
  FIXED_CONNECTION_PAIRS,
  type HoshinDocument,
  type StatementId,
  toConnectionPairId
} from "@/src/domain/hoshin/models";
import type { HoshinRepository } from "@/src/application/repository/hoshin-repository";
import { setConnectionDirection } from "@/src/features/hoshin/wizard-logic";

const TOTAL_PAIRS = FIXED_CONNECTION_PAIRS.length;

export interface WizardModalProps {
  document: HoshinDocument;
  repository: HoshinRepository;
  onClose: (updatedDocument: HoshinDocument) => void;
}

export function WizardModal({ document: initialDocument, repository, onClose }: WizardModalProps) {
  const [document, setDocument] = useState<HoshinDocument>(() => ({
    ...initialDocument,
    connections: initialDocument.connections.map((c) => ({ ...c }))
  }));
  const [stepIndex, setStepIndex] = useState(0);

  const currentPair = stepIndex < TOTAL_PAIRS ? FIXED_CONNECTION_PAIRS[stepIndex]! : null;
  const connection = currentPair
    ? document.connections.find((c) => c.id === toConnectionPairId(currentPair[0], currentPair[1]))
    : null;
  const direction = connection?.direction ?? null;
  const isComplete = stepIndex >= TOTAL_PAIRS;

  const handleAnswer = useCallback(
    (from: StatementId, to: StatementId) => {
      if (!currentPair) return;
      const pairId = toConnectionPairId(currentPair[0], currentPair[1]);
      const next = setConnectionDirection(document, pairId, from, to);
      setDocument(next);
      void repository.upsert(next).then(() => {
        if (stepIndex + 1 >= TOTAL_PAIRS) {
          onClose(next);
        } else {
          setStepIndex((i) => i + 1);
        }
      });
    },
    [currentPair, stepIndex, document, repository, onClose]
  );

  const handleNext = useCallback(() => {
    if (stepIndex + 1 >= TOTAL_PAIRS) {
      onClose(document);
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, document, onClose]);

  const handleBackToEditor = useCallback(() => {
    void repository.upsert(document).then(() => onClose(document));
  }, [document, repository, onClose]);

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold">Compare boxes</h2>
          <p className="mb-4 text-sm text-slate-700">
            All connection directions are set. You can run Calculate ranking in the editor.
          </p>
          <button
            type="button"
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => onClose(document)}
          >
            Back to editor
          </button>
        </div>
      </div>
    );
  }

  if (!currentPair) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold">Compare boxes</h2>
          <p className="mb-4 text-sm text-slate-700">No pair to show. Return to the editor.</p>
          <button
            type="button"
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => onClose(document)}
          >
            Back to editor
          </button>
        </div>
      </div>
    );
  }

  const [a, b] = currentPair;
  const statementA = document.statements.find((s) => s.id === a);
  const statementB = document.statements.find((s) => s.id === b);
  const progressLabel = `Step ${stepIndex + 1} of ${TOTAL_PAIRS}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Compare boxes</h2>
        <p className="mb-4 text-xs text-slate-600">{progressLabel}</p>
        <p className="mb-3 text-sm text-slate-700">
          {direction
            ? "This pair is set. Continue to the next."
            : "Which statement best enables or makes the other easier to do?"}
        </p>
        <div className="mb-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
          <div>
            <span className="text-xs font-medium uppercase text-slate-500">{a}</span>
            <p className="text-sm text-slate-800">{statementA?.text ?? ""}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase text-slate-500">{b}</span>
            <p className="text-sm text-slate-800">{statementB?.text ?? ""}</p>
          </div>
        </div>
        {direction ? (
          <div className="mb-4">
            <p className="mb-2 text-sm text-slate-600">
              <strong>{direction.from}</strong> enables <strong>{direction.to}</strong>
            </p>
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={handleNext}
            >
              Next
            </button>
          </div>
        ) : (
          <div className="mb-4 flex flex-col gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              onClick={() => handleAnswer(a, b)}
            >
              <strong>{a}</strong> enables <strong>{b}</strong>
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              onClick={() => handleAnswer(b, a)}
            >
              <strong>{b}</strong> enables <strong>{a}</strong>
            </button>
          </div>
        )}
        <button
          type="button"
          className="text-sm text-slate-600 underline hover:text-slate-800"
          onClick={handleBackToEditor}
        >
          Back to editor (save progress)
        </button>
      </div>
    </div>
  );
}
