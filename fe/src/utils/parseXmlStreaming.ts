import { Step, StepType } from "../types";

let stepIdCounter = 1;

export function parseXmlStreaming(xmlStr: string): { steps: Step[]; remaining: string } {
  const steps: Step[] = [];
  let remaining = xmlStr;

  const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
  let lastIndex = 0;
  let match;

  while ((match = actionRegex.exec(xmlStr)) !== null) {
    const [, type, filePath, content] = match;

    if (type === "file") {
      steps.push({
        id: stepIdCounter++,
        title: `Create ${filePath || "file"}`,
        type: StepType.CREATE_FILE,
        status: "pending",
        code: content.trim(),
        path: filePath,
      });
    } else if (type === "shell") {
      steps.push({
        id: stepIdCounter++,
        title: "Run command",
        type: StepType.RUN_SCRIPT,
        status: "pending",
        code: content.trim(),
      });
    }

    lastIndex = actionRegex.lastIndex;
  }

  remaining = xmlStr.slice(lastIndex);
  return { steps, remaining };
}
