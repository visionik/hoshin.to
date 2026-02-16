"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyHoshinDocument,
  createEmptyHoshinDocumentWithName
} from "@/src/domain/hoshin/factory";
import {
  FIXED_CONNECTION_PAIRS,
  STATEMENT_IDS,
  type ConnectionPairId,
  type HoshinDocument,
  type StatementId,
  toConnectionPairId
} from "@/src/domain/hoshin/models";
import { calculateRanking } from "@/src/domain/hoshin/ranking";
import { validateDraft, validateForCalculation } from "@/src/domain/hoshin/validation";
import { buildVbriefFilename, toVbrief } from "@/src/infrastructure/export/vbrief";
import { getHoshinRepository } from "@/src/infrastructure/indexeddb/repository-singleton";
import { useUndoableState } from "@/src/features/hoshin/use-undoable-state";

const CARD_POSITIONS: Record<StatementId, { left: string; top: string }> = {
  s1: { left: "39%", top: "4%" },
  s2: { left: "4%", top: "34%" },
  s3: { left: "74%", top: "34%" },
  s4: { left: "19%", top: "70%" },
  s5: { left: "59%", top: "70%" }
};
const PROMPT_PREFIX = "What are the key issues that must be addressed in order for me/us to";
const PROMPT_PLACEHOLDER = "________";
const ADD_NEW_HOSHIN_OPTION = "__add-new-hoshin__";
const DEFAULT_HOSHIN_NAME_PREFIX = "Hoshin";
type AnchorPoint = { x: number; y: number };
type AnchorPosition =
  | "top-left"
  | "top-middle-left"
  | "top-middle"
  | "top-middle-right"
  | "top-right"
  | "middle-upper-left"
  | "middle-upper-right"
  | "right-middle"
  | "bottom-right"
  | "bottom-middle-right"
  | "bottom-middle"
  | "bottom-middle-left"
  | "bottom-left"
  | "left-middle";
type StatementAnchorPoints = Record<AnchorPosition, AnchorPoint>;

const ANCHOR_OFFSETS: Record<AnchorPosition, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  "top-middle-left": { x: 0.35, y: 0 },
  "top-middle": { x: 0.5, y: 0 },
  "top-middle-right": { x: 0.65, y: 0 },
  "top-right": { x: 1, y: 0 },
  "middle-upper-left": { x: 0.25, y: 0.25 },
  "middle-upper-right": { x: 0.75, y: 0.25 },
  "right-middle": { x: 1, y: 0.5 },
  "bottom-right": { x: 1, y: 1 },
  "bottom-middle-right": { x: 0.65, y: 1 },
  "bottom-middle": { x: 0.5, y: 1 },
  "bottom-middle-left": { x: 0.35, y: 1 },
  "bottom-left": { x: 0, y: 1 },
  "left-middle": { x: 0, y: 0.5 }
};

const CONNECTION_ANCHOR_POSITIONS: Partial<
  Record<ConnectionPairId, Partial<Record<StatementId, AnchorPosition>>>
> = {
  "s1-s2": { s1: "left-middle", s2: "top-middle" },
  "s1-s3": { s1: "right-middle", s3: "top-middle" },
  "s1-s4": { s1: "bottom-middle-left", s4: "top-middle-left" },
  "s1-s5": { s1: "bottom-middle-right", s5: "top-middle-right" },
  "s2-s3": { s2: "middle-upper-left", s3: "middle-upper-right" },
  "s2-s4": { s2: "bottom-middle-left", s4: "left-middle" },
  "s2-s5": { s2: "right-middle", s5: "top-middle" },
  "s3-s4": { s3: "left-middle", s4: "top-middle" },
  "s3-s5": { s3: "bottom-middle-right", s5: "right-middle" },
  "s4-s5": { s4: "right-middle", s5: "left-middle" }
};

const FALLBACK_ANCHORS: Record<StatementId, AnchorPoint> = {
  s1: { x: 50, y: 20 },
  s2: { x: 26, y: 42 },
  s3: { x: 74, y: 42 },
  s4: { x: 30, y: 70 },
  s5: { x: 70, y: 70 }
};

let transparentDragImage: HTMLImageElement | null = null;

function getTransparentDragImage(): HTMLImageElement | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!transparentDragImage) {
    transparentDragImage = new Image();
    transparentDragImage.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  }
  return transparentDragImage;
}

function cardCenter(anchors: StatementAnchorPoints): AnchorPoint {
  return {
    x: (anchors["left-middle"].x + anchors["right-middle"].x) / 2,
    y: (anchors["top-middle"].y + anchors["bottom-middle"].y) / 2
  };
}

function createFallbackStatementAnchors(): Record<StatementId, StatementAnchorPoints> {
  return STATEMENT_IDS.reduce(
    (accumulator, statementId) => {
      const center = FALLBACK_ANCHORS[statementId];
      const anchors = {} as StatementAnchorPoints;
      for (const [anchorPosition] of Object.entries(ANCHOR_OFFSETS) as [
        AnchorPosition,
        { x: number; y: number }
      ][]) {
        anchors[anchorPosition] = center;
      }
      accumulator[statementId] = anchors;
      return accumulator;
    },
    {} as Record<StatementId, StatementAnchorPoints>
  );
}

function connectionEndpoint(
  anchorPointsByStatement: Record<StatementId, StatementAnchorPoints>,
  pairId: ConnectionPairId,
  statementId: StatementId
): AnchorPoint {
  const anchorPosition = CONNECTION_ANCHOR_POSITIONS[pairId]?.[statementId] ?? "bottom-middle";
  return anchorPointsByStatement[statementId][anchorPosition];
}

function hasPair(source: StatementId, target: StatementId): boolean {
  return FIXED_CONNECTION_PAIRS.some((pair) => pair.includes(source) && pair.includes(target));
}

function extractPromptBlank(promptQuestion: string): string {
  const trimmed = promptQuestion.trim();
  if (!trimmed) {
    return "";
  }
  const normalizedPrefix = `${PROMPT_PREFIX} `;
  if (trimmed.startsWith(normalizedPrefix) && trimmed.endsWith("?")) {
    const blank = trimmed.slice(normalizedPrefix.length, -1);
    return blank.trim() === PROMPT_PLACEHOLDER ? "" : blank;
  }
  return trimmed;
}

function composePromptQuestion(blank: string): string {
  return `${PROMPT_PREFIX} ${blank === "" ? PROMPT_PLACEHOLDER : blank}?`;
}
function parseDefaultHoshinNumber(name: string): number | null {
  const match = /^Hoshin\s+(\d+)$/.exec(name.trim());
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function nextDefaultHoshinName(documents: HoshinDocument[]): string {
  const usedNumbers = new Set<number>();
  for (const document of documents) {
    const parsed = parseDefaultHoshinNumber(document.name ?? "");
    if (parsed !== null) {
      usedNumbers.add(parsed);
    }
  }
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }
  return `${DEFAULT_HOSHIN_NAME_PREFIX} ${nextNumber}`;
}

function normalizeDocumentNames(documents: HoshinDocument[]): {
  normalizedDocuments: HoshinDocument[];
  didChange: boolean;
} {
  const normalizedDocuments: HoshinDocument[] = [];
  let didChange = false;
  for (const document of documents) {
    const rawName = document.name ?? "";
    const name = rawName.trim();
    if (name) {
      normalizedDocuments.push({ ...document, name });
      if (name !== rawName) {
        didChange = true;
      }
      continue;
    }
    const fallbackName = nextDefaultHoshinName(normalizedDocuments);
    normalizedDocuments.push({ ...document, name: fallbackName });
    didChange = true;
  }
  return { normalizedDocuments, didChange };
}

function upsertDocumentInList(
  documents: HoshinDocument[],
  nextDocument: HoshinDocument
): HoshinDocument[] {
  return [...documents.filter((item) => item.id !== nextDocument.id), nextDocument].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

function hoshinOptionLabel(document: HoshinDocument, index: number): string {
  const name = document.name.trim();
  if (name) {
    return name.length > 80 ? `${name.slice(0, 80)}…` : name;
  }
  return `Hoshin ${index + 1}`;
}

export function HoshinEditor() {
  const repository = useMemo(() => getHoshinRepository(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<StatementId, HTMLElement | null>>({
    s1: null,
    s2: null,
    s3: null,
    s4: null,
    s5: null
  });
  const {
    value: document,
    setWithHistory,
    replacePresent,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoableState(createEmptyHoshinDocument());
  const [loaded, setLoaded] = useState(false);
  const [documents, setDocuments] = useState<HoshinDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(ADD_NEW_HOSHIN_OPTION);
  const [loadingMessage, setLoadingMessage] = useState("Loading local draft...");
  const [saveMessage, setSaveMessage] = useState("Not saved yet.");
  const [dragSource, setDragSource] = useState<StatementId | null>(null);
  const [dragPointer, setDragPointer] = useState<AnchorPoint | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [calculatedAtLeastOnce, setCalculatedAtLeastOnce] = useState(false);
  const [anchorPointsByStatement, setAnchorPointsByStatement] = useState<
    Record<StatementId, StatementAnchorPoints>
  >(createFallbackStatementAnchors);

  const draftValidation = useMemo(() => validateDraft(document), [document]);
  const calculationValidation = useMemo(() => validateForCalculation(document), [document]);
  const rankingResult = useMemo(() => {
    if (!calculationValidation.isValid || !calculatedAtLeastOnce) {
      return null;
    }
    return calculateRanking(document);
  }, [calculationValidation.isValid, calculatedAtLeastOnce, document]);

  const applyDocumentUpdate = useCallback(
    (updater: (current: HoshinDocument) => HoshinDocument) => {
      setWithHistory((current) => {
        const next = updater(current);
        return {
          ...next,
          updatedAt: new Date().toISOString()
        };
      });
    },
    [setWithHistory]
  );

  const recomputeAnchorPoints = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) {
      return;
    }

    const nextPoints = createFallbackStatementAnchors();
    for (const id of STATEMENT_IDS) {
      const cardElement = cardRefs.current[id];
      if (!cardElement) {
        continue;
      }

      const rect = cardElement.getBoundingClientRect();
      const anchors = {} as StatementAnchorPoints;
      for (const [anchorPosition, offset] of Object.entries(ANCHOR_OFFSETS) as [
        AnchorPosition,
        { x: number; y: number }
      ][]) {
        const anchorX = rect.left + rect.width * offset.x;
        const anchorY = rect.top + rect.height * offset.y;
        anchors[anchorPosition] = {
          x: ((anchorX - containerRect.left) / containerRect.width) * 100,
          y: ((anchorY - containerRect.top) / containerRect.height) * 100
        };
      }
      nextPoints[id] = anchors;
    }

    setAnchorPointsByStatement(nextPoints);
  }, []);

  const setConnectionDirection = useCallback(
    (pairId: ConnectionPairId, from: StatementId, to: StatementId) => {
      applyDocumentUpdate((current) => ({
        ...current,
        connections: current.connections.map((connection) => {
          if (connection.id !== pairId) {
            return connection;
          }
          return {
            ...connection,
            direction: { from, to }
          };
        })
      }));
    },
    [applyDocumentUpdate]
  );

  useEffect(() => {
    const run = async () => {
      try {
        const listedDocuments = await repository.list();
        const { normalizedDocuments, didChange } = normalizeDocumentNames(listedDocuments);
        if (didChange) {
          await Promise.all(normalizedDocuments.map((item) => repository.upsert(item)));
        }
        const latest = normalizedDocuments[0];
        if (latest) {
          setDocuments(normalizedDocuments);
          setSelectedDocumentId(latest.id);
          replacePresent(latest);
          setLoadingMessage("Loaded latest local draft.");
        } else {
          const initial = createEmptyHoshinDocumentWithName("Hoshin 1");
          await repository.upsert(initial);
          setDocuments([initial]);
          setSelectedDocumentId(initial.id);
          replacePresent(initial);
          setLoadingMessage("Created initial local draft.");
        }
      } catch (error) {
        setLoadingMessage(
          `Local storage unavailable (${error instanceof Error ? error.message : "unknown error"}).`
        );
      } finally {
        setLoaded(true);
      }
    };

    void run();
  }, [replacePresent, repository]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await repository.upsert(document);
        setDocuments((current) => upsertDocumentInList(current, document));
        setSelectedDocumentId(document.id);
        setSaveMessage(`Autosaved at ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        setSaveMessage(
          `Autosave failed: ${error instanceof Error ? error.message : "unknown repository error"}`
        );
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [document, loaded, repository]);

  const handleSelectHoshin = useCallback(
    async (nextSelection: string) => {
      try {
        await repository.upsert(document);
        setDocuments((current) => upsertDocumentInList(current, document));

        if (nextSelection === ADD_NEW_HOSHIN_OPTION) {
          const nextDocument = createEmptyHoshinDocumentWithName(
            nextDefaultHoshinName(upsertDocumentInList(documents, document))
          );
          await repository.upsert(nextDocument);
          setDocuments((current) => upsertDocumentInList(current, nextDocument));
          setSelectedDocumentId(nextDocument.id);
          replacePresent(nextDocument);
          setLoadingMessage("Created new Hoshin draft.");
          return;
        }

        const selectedDocument =
          (await repository.getById(nextSelection)) ??
          documents.find((item) => item.id === nextSelection) ??
          null;
        if (!selectedDocument) {
          setLoadingMessage("Unable to find selected Hoshin draft.");
          return;
        }

        setSelectedDocumentId(selectedDocument.id);
        replacePresent(selectedDocument);
        setLoadingMessage("Loaded selected Hoshin draft.");
      } catch (error) {
        setLoadingMessage(
          `Unable to switch Hoshins (${error instanceof Error ? error.message : "unknown error"}).`
        );
      }
    },
    [document, documents, replacePresent, repository]
  );

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
      const isRedo =
        (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z";

      if (isUndo) {
        event.preventDefault();
        undo();
      } else if (isRedo) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [redo, undo]);

  useEffect(() => {
    recomputeAnchorPoints();
    const onResize = () => recomputeAnchorPoints();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recomputeAnchorPoints]);

  useEffect(() => {
    if (loaded) {
      recomputeAnchorPoints();
    }
  }, [loaded, recomputeAnchorPoints]);

  const topTwo = rankingResult?.focusTopTwo ?? null;
  const promptBlank = extractPromptBlank(document.promptQuestion);

  return (
    <section className="space-y-4">
      <header className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="hoshin-selector">
          Hoshin
        </label>
        <select
          id="hoshin-selector"
          className="mb-3 w-full rounded border border-slate-300 p-2 text-sm"
          value={selectedDocumentId}
          onChange={(event) => void handleSelectHoshin(event.target.value)}
          disabled={!loaded}
        >
          <option value={ADD_NEW_HOSHIN_OPTION}>Add a new Hoshin...</option>
          {documents.map((item, index) => (
            <option key={item.id} value={item.id}>
              {hoshinOptionLabel(item, index)}
            </option>
          ))}
        </select>
        <label
          className="mb-1 block text-xs font-medium text-slate-700"
          htmlFor="hoshin-name-input"
        >
          Hoshin name
        </label>
        <input
          id="hoshin-name-input"
          type="text"
          className="mb-3 w-full rounded border border-slate-300 p-2 text-sm"
          value={document.name}
          placeholder="Hoshin name"
          onChange={(event) =>
            applyDocumentUpdate((current) => ({
              ...current,
              name: event.target.value
            }))
          }
        />
        <h1 className="text-xl font-semibold">Hoshin Success Compass Editor</h1>
        <p className="mt-1 text-sm text-slate-700">
          Fixed 5-statement template with 10 directional links and PDF-accurate arrows-out ranking.
        </p>
        <p className="mt-2 text-xs text-slate-600">{loadingMessage}</p>
        <p className="text-xs text-slate-600">{saveMessage}</p>
      </header>

      <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium" htmlFor="question-input">
          Prompt question
        </label>
        <p className="text-sm text-slate-700">{PROMPT_PREFIX}</p>
        <input
          id="question-input"
          type="text"
          className="mt-2 block w-full min-w-[80ch] rounded border border-slate-300 p-2 text-sm"
          value={promptBlank}
          placeholder="Enter the objective/outcome"
          onChange={(event) =>
            applyDocumentUpdate((current) => ({
              ...current,
              promptQuestion: composePromptQuestion(event.target.value)
            }))
          }
        />
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <div
          ref={containerRef}
          className="relative h-[720px] rounded-lg border border-slate-300 bg-slate-50 p-2 md:h-[640px]"
          onDragOver={(event) => {
            event.preventDefault();
            if (!dragSource || !containerRef.current) {
              return;
            }
            const rect = containerRef.current.getBoundingClientRect();
            if (!rect.width || !rect.height) {
              return;
            }
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            setDragPointer({
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y))
            });
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragSource(null);
            setDragPointer(null);
          }}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrow-head"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L4,2 L0,4 Z" fill="#374151" />
              </marker>
            </defs>
            {FIXED_CONNECTION_PAIRS.map(([a, b]) => {
              const pairId = toConnectionPairId(a, b);
              const connection = document.connections.find((item) => item.id === pairId);
              const direction = connection?.direction;
              const aPos = connectionEndpoint(anchorPointsByStatement, pairId, a);
              const bPos = connectionEndpoint(anchorPointsByStatement, pairId, b);
              const start = direction?.from === b ? bPos : aPos;
              const end = direction?.from === b ? aPos : bPos;
              return (
                <line
                  key={pairId}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={direction ? "#111827" : "#9ca3af"}
                  strokeWidth={direction ? 0.35 : 0.2}
                  markerEnd={direction ? "url(#arrow-head)" : undefined}
                />
              );
            })}
            {dragSource && dragPointer && (
              <line
                key="drag-preview-line"
                x1={cardCenter(anchorPointsByStatement[dragSource]).x}
                y1={cardCenter(anchorPointsByStatement[dragSource]).y}
                x2={dragPointer.x}
                y2={dragPointer.y}
                stroke="#2563eb"
                strokeWidth={0.3}
                strokeDasharray="1.2 0.8"
                markerEnd="url(#arrow-head)"
              />
            )}
          </svg>

          {STATEMENT_IDS.map((id) => {
            const statement = document.statements.find((item) => item.id === id);
            if (!statement) {
              return null;
            }

            const isTop = topTwo?.includes(id);
            return (
              <article
                key={id}
                ref={(element) => {
                  cardRefs.current[id] = element;
                }}
                className={`absolute z-30 w-[36%] cursor-grab rounded border bg-white p-2 shadow-sm md:w-[22%] ${
                  isTop ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-300"
                }`}
                style={CARD_POSITIONS[id]}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", id);
                  event.dataTransfer.effectAllowed = "move";
                  const dragImage = getTransparentDragImage();
                  if (dragImage) {
                    event.dataTransfer.setDragImage(dragImage, 0, 0);
                  }
                  setDragSource(id);
                  setDragPointer(cardCenter(anchorPointsByStatement[id]));
                }}
                onDragEnd={() => {
                  setDragSource(null);
                  setDragPointer(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!dragSource || dragSource === id || !hasPair(dragSource, id)) {
                    return;
                  }
                  setConnectionDirection(toConnectionPairId(dragSource, id), dragSource, id);
                  setDragSource(null);
                  setDragPointer(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
              >
                <header className="mb-1 flex items-center justify-between">
                  <strong className="text-xs uppercase tracking-wide">{id}</strong>
                  {topTwo && (
                    <span className="rounded bg-blue-100 px-1.5 py-[1px] text-[10px] font-medium text-blue-800">
                      {topTwo[0] === id ? "#1 focus" : topTwo[1] === id ? "#2 focus" : ""}
                    </span>
                  )}
                </header>
                <textarea
                  aria-label={`Statement text for ${id}`}
                  className="mb-1 h-20 w-full rounded border border-slate-300 p-1 text-xs"
                  placeholder="I/We must ..."
                  value={statement.text}
                  onChange={(event) =>
                    applyDocumentUpdate((current) => ({
                      ...current,
                      statements: current.statements.map((item) =>
                        item.id === id ? { ...item, text: event.target.value } : item
                      )
                    }))
                  }
                />
                <div className="flex items-center gap-1 text-xs">
                  <span>Order</span>
                  {[1, 2, 3, 4, 5].map((order) => {
                    const isSelected = statement.initialOrder === order;
                    return (
                      <button
                        key={order}
                        type="button"
                        aria-label={`Set order ${order} for ${id}`}
                        aria-pressed={isSelected}
                        className={`h-5 w-5 rounded text-[10px] font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                        onClick={() => {
                          applyDocumentUpdate((current) => ({
                            ...current,
                            statements: current.statements.map((item) => {
                              if (item.id === id) {
                                return { ...item, initialOrder: isSelected ? null : order };
                              }
                              if (item.initialOrder === order) {
                                return { ...item, initialOrder: null };
                              }
                              return item;
                            })
                          }));
                        }}
                      >
                        {order}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </button>
          <button
            type="button"
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            disabled={!loaded || !calculationValidation.isValid}
            onClick={() => setCalculatedAtLeastOnce(true)}
          >
            Calculate ranking
          </button>
          <button
            type="button"
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            disabled={!loaded || !calculationValidation.isValid}
            onClick={() => {
              setExportError(null);
              try {
                const vbrief = toVbrief(document);
                const content = JSON.stringify(vbrief, null, 2);
                const blob = new Blob([content], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = window.document.createElement("a");
                link.href = url;
                link.download = buildVbriefFilename(document);
                link.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                setExportError(error instanceof Error ? error.message : "Export failed.");
              }
            }}
          >
            Download vbrief
          </button>
        </div>
        {!calculationValidation.isValid && (
          <p className="mt-2 text-xs text-amber-700">
            Action blocked: {calculationValidation.issues[0]?.message}
          </p>
        )}
        {exportError && (
          <p className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {exportError}
          </p>
        )}

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-300 p-3">
            <h2 className="mb-2 text-sm font-semibold">Validation status</h2>
            {draftValidation.issues.length === 0 ? (
              <p className="text-xs text-emerald-700">All constraints satisfied.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                {draftValidation.issues.slice(0, 12).map((issue) => (
                  <li key={`${issue.code}-${issue.path}`}>
                    <strong>{issue.path}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-slate-300 p-3">
            <h2 className="mb-2 text-sm font-semibold">Ranking result</h2>
            {!rankingResult ? (
              <p className="text-xs text-slate-600">
                Run calculate after completing all required fields and directions.
              </p>
            ) : (
              <ol className="space-y-1 text-xs">
                {rankingResult.ranking.map((row) => (
                  <li
                    key={row.statementId}
                    className={`rounded p-1 ${
                      row.rank <= 2 ? "bg-blue-50 text-blue-900" : "bg-slate-50 text-slate-800"
                    }`}
                  >
                    #{row.rank} {row.statementId} ({row.arrowsOut} arrows out)
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
