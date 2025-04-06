export enum StepType {
  CREATE_FILE = "CreateFile",
  CREATE_FOLDER = "CreateFolder",
  EDIT_FILE = "EditFile",
  EDIT_FOLDER = "EditFolder",
  DELETE_FILE = "DeleteFile",
  DELETE_FOLDER = "DeleteFolder",
  RUN_SCRIPT = "RunScript",
}

export interface FileNode {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface Step {
  id: number;
  title: string;
  status: "pending" | "loading" | "completed";
  type: StepType;
  code?: string;
  path?: string;
}

export interface Project {
  prompt: string;
  Steps: Step[];
}
