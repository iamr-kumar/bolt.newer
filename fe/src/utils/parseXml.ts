import { Step, StepType } from "../types";

/*
 * Parse input XML and convert it into steps.
 * Eg: Input -
 * <boltArtifact id=\"project-import\" title=\"Project Files\">
 *  <boltAction type=\"file\" filePath=\"eslint.config.js\">
 *      import js from '@eslint/js';\nimport globals from 'globals';\n
 *  </boltAction>
 * <boltAction type="shell">
 *      node index.js
 * </boltAction>
 * </boltArtifact>
 *
 * Output -
 * [{
 *      title: "Project Files",
 *      status: "Pending"
 * }, {
 *      title: "Create eslint.config.js",
 *      type: StepType.CreateFile,
 *      code: "import js from '@eslint/js';\nimport globals from 'globals';\n"
 * }, {
 *      title: "Run command",
 *      code: "node index.js",
 *      type: StepType.RunScript
 * }]
 *
 * The input can have strings in the middle they need to be ignored
 */
export function parseXml(response: string): Step[] {
  const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);

  if (!xmlMatch) {
    return [];
  }

  const xmlContent = xmlMatch[1];
  const steps: Step[] = [];
  let stepId = 1;

  const titleMatch = response.match(/title="([^"]*)"/);
  const artifactTitle = titleMatch ? titleMatch[1] : "Project Files";

  steps.push({
    id: stepId++,
    title: artifactTitle,
    type: StepType.CREATE_FOLDER,
    status: "pending",
  });

  const actionRegex =
    /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;

  let match;
  while ((match = actionRegex.exec(xmlContent)) !== null) {
    const [, type, filePath, content] = match;

    if (type === "file") {
      steps.push({
        id: stepId++,
        title: `Create ${filePath || "file"}`,
        type: StepType.CREATE_FILE,
        status: "pending",
        code: content.trim(),
        path: filePath,
      });
    } else if (type === "shell") {
      steps.push({
        id: stepId++,
        title: "Run command",
        type: StepType.RUN_SCRIPT,
        status: "pending",
        code: content.trim(),
      });
    }
  }

  return steps;
}
