export enum StepType {
  CREATE_FILE = "CreateFile",
  CREATE_FOLDER = "CreateFolder",
  EDIT_FILE = "EditFile",
  DELETE_FILE = "DeleteFile",
  DELETE_FOLDER = "DeleteFolder",
  RUN_SCRIPT = "RunScript",
}

export interface FileItem {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileItem[];
  isOpen?: boolean;
  path?: string;
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
