import { useCallback, useRef, useState } from "react";
import { Step } from "../types";

export const useSteps = () => {
  const [steps, setSteps] = useState<Step[]>([]);
  const stepQueue = useRef<Step[]>([]);
  const stepProcessingRef = useRef(false);
  const shouldInstallDependencies = useRef(false);

  const addStep = useCallback((step: Step) => {
    setSteps((prevSteps) => {
      const exists = prevSteps.some((existing) => existing.id === step.id);
      if (exists) return prevSteps;
      return [...prevSteps, step];
    });
  }, []);

  const updateStepState = useCallback((stepId: number, state: Partial<Step>) => {
    setSteps((prevSteps) => {
      const stepExists = prevSteps.some((step) => step.id === stepId);
      if (!stepExists) return prevSteps;

      return prevSteps.map((step) => (step.id === stepId ? { ...step, ...state } : step));
    });
  }, []);

  const resetSteps = useCallback(() => {
    setSteps([]);
    stepQueue.current = [];
    stepProcessingRef.current = false;
    shouldInstallDependencies.current = false;
  }, []);

  /**
   * Check if all steps are completed
   */
  const areAllStepsCompleted = useCallback(() => {
    return steps.length > 0 && steps.every((step) => step.status === "completed");
  }, [steps]);

  return {
    steps,
    addStep,
    stepQueue,
    stepProcessingRef,
    shouldInstallDependencies,
    updateStepState,
    resetSteps,
    areAllStepsCompleted,
  };
};
