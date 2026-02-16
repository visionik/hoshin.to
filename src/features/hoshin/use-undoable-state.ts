import { useCallback, useMemo, useState } from "react";

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useUndoableState<T>(initialValue: T) {
  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: clone(initialValue),
    future: []
  });

  const setWithHistory = useCallback((updater: (current: T) => T) => {
    setState((current) => {
      const next = clone(updater(current.present));
      if (JSON.stringify(next) === JSON.stringify(current.present)) {
        return current;
      }
      return {
        past: [...current.past, clone(current.present)],
        present: next,
        future: []
      };
    });
  }, []);

  const replacePresent = useCallback((nextValue: T) => {
    setState({
      past: [],
      present: clone(nextValue),
      future: []
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      if (!previous) {
        return current;
      }
      return {
        past: current.past.slice(0, -1),
        present: clone(previous),
        future: [clone(current.present), ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const next = current.future[0];
      if (!next) {
        return current;
      }
      return {
        past: [...current.past, clone(current.present)],
        present: clone(next),
        future: current.future.slice(1)
      };
    });
  }, []);

  const controls = useMemo(
    () => ({
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0
    }),
    [state.future.length, state.past.length]
  );

  return {
    value: state.present,
    setWithHistory,
    replacePresent,
    undo,
    redo,
    ...controls
  };
}
