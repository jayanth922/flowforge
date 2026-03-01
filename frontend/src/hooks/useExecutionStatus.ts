import { useEffect, useRef, useState } from "react";
import { getExecutionStatus } from "../services/api";
import type {
  ExecutionStep,
  ExecutionStatusResponse,
} from "../types/api";

const POLL_INTERVAL_MS = 1000;

const isTerminal = (status: ExecutionStatusResponse["status"]) =>
  status === "completed" || status === "failed";

export const useExecutionStatus = (executionId: string | null) => {
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatusResponse["status"] | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!executionId) {
      setExecutionStatus(null);
      setSteps([]);
      return;
    }

    const poll = async () => {
      try {
        const data = await getExecutionStatus(executionId);
        setExecutionStatus(data.status);
        setSteps(data.steps);

        if (isTerminal(data.status) && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // keep polling on transient errors
      }
    };

    void poll();
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [executionId]);

  const isRunning =
    executionId !== null &&
    executionStatus !== null &&
    !isTerminal(executionStatus);

  return { executionStatus, steps, isRunning };
};
