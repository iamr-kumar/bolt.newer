import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { DirectoryNode, FileSystemTree } from "@webcontainer/api";
import axios from "axios";
import { CheckCircle, ChevronDown, ChevronRight, Code2, Eye, FileIcon, FolderIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PreviewTab } from "../components/PreviewTab";
import { BACKEND_URL } from "../config";
import { useWebContainer } from "../hooks/useWebContainer";
import { FileItem, Step, StepType } from "../types";
import { parseXmlStreaming } from "../utils/parseXmlStreaming";

interface TemplateResponse {
  prompts: string[];
  uiPrompts: string[];
}

export default function EditorPage() {
  const location = useLocation();
  const { prompt } = location.state || { prompt: "" };

  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const { webContainer } = useWebContainer();
  const stepQueue = useRef<Step[]>([]);
  const processingRef = useRef(false);

  const init = async () => {
    try {
      const response = await axios.post<TemplateResponse>(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });
      const { prompts, uiPrompts } = response.data;
      const { steps: parsedSteps } = parseXmlStreaming(uiPrompts[0]);
      setSteps(parsedSteps);

      const res = await fetch(`${BACKEND_URL}/chat-test`, {
        method: "POST",
        body: JSON.stringify({ prompts }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { steps: parsedSteps, remaining } = parseXmlStreaming(buffer);
        buffer = remaining;

        stepQueue.current.push(...parsedSteps);
        processNextStep();
      }

      const { steps: finalSteps } = parseXmlStreaming(buffer);
      stepQueue.current.push(...finalSteps);
      processNextStep();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const processNextStep = async () => {
    if (processingRef.current || stepQueue.current.length === 0) return;
    processingRef.current = true;
    let updatedFiles = [...files];
    while (stepQueue.current.length > 0) {
      const step = stepQueue.current.shift()!;
      if (step.type === StepType.CREATE_FILE && step.path) {
        const { updatedFiles: newFiles, file } = handleCreateFileStep(step, updatedFiles);
        updatedFiles = newFiles;
        setSelectedFile(file);
        setFiles(updatedFiles);
        setSteps((prev) => [...prev, { ...step, status: "loading" }]);
        await typingEffect(step.code || "", file);
        setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, status: "completed" } : s)));
      }
    }
    processingRef.current = false;
  };

  const handleCreateFileStep = (
    step: Step,
    currSetOfFiles: FileItem[]
  ): { file: FileItem; updatedFiles: FileItem[] } => {
    const pathParts = step.path?.split("/").filter((path) => path.length > 0) ?? [];
    const fileName = pathParts?.pop() || "";

    let currentLevel = [...currSetOfFiles];
    let currentFolderPath = "";
    const updatedFiles = currentLevel;
    for (const folder of pathParts) {
      currentFolderPath = `${currentFolderPath}/${folder}`;
      const folderNode = currentLevel.find((node) => node.name === folder && node.type === "folder");
      if (!folderNode) {
        const newFolder: FileItem = {
          name: folder,
          type: "folder",
          path: currentFolderPath,
          children: [],
        };
        currentLevel.push(newFolder);
      }
      currentLevel = currentLevel.find((currLevel) => currLevel.path === currentFolderPath)!.children!;
    }
    const file = currentLevel.find((currFile) => currFile.name === fileName && currFile.type === "file");
    if (!file) {
      const newFile: FileItem = {
        name: fileName,
        type: "file",
        path: `${currentFolderPath}/${fileName}`,
        content: "",
      };
      currentLevel.push(newFile);
    } else {
      file.content = "";
    }
    return {
      file: currentLevel.find((currFile) => currFile.name === fileName && currFile.type === "file")!,
      updatedFiles,
    };
  };

  const typingEffect = (fullText: string, file: FileItem): Promise<void> => {
    return new Promise((resolve) => {
      let index = 0;
      file.content = "";
      const interval = setInterval(() => {
        file.content += fullText[index++];
        setFiles((prev) => [...prev]);
        if (index >= fullText.length) {
          clearInterval(interval);
          resolve();
        }
      }, 0.1);
    });
  };

  useEffect(() => {
    const mountFiles = async () => {
      if (webContainer) {
        try {
          const fileSystemTree = convertFilesToFileSystemTree(files);
          await webContainer.mount(fileSystemTree);
          console.log("Files mounted successfully");
        } catch (error) {
          console.error("Error mounting files:", error);
        }
      }
    };

    if (files.length > 0) {
      mountFiles();
    }
  }, [files, webContainer]);

  const convertFilesToFileSystemTree = (files: FileItem[]): FileSystemTree => {
    const fileSystemTree: FileSystemTree = {};

    const processNodes = (nodes: FileItem[], parentTree: FileSystemTree = fileSystemTree) => {
      for (const node of nodes) {
        if (node.type === "file") {
          // Add file to current level of tree
          parentTree[node.name] = {
            file: {
              contents: node.content || "",
            },
          };
        } else if (node.type === "folder" && node.children) {
          // Create directory entry
          const directoryNode: DirectoryNode = {
            directory: {},
          };

          // Add directory to current level of tree
          parentTree[node.name] = directoryNode;

          // Process all children of the folder within the directory object
          processNodes(node.children, directoryNode.directory);
        }
      }
    };

    // Process all root nodes
    processNodes(files);

    return fileSystemTree;
  };

  const toggleFolder = (node: FileItem) => {
    if (node.type === "folder") {
      node.isOpen = !node.isOpen;
      setFiles([...files]);
    }
  };

  const handleStepClick = (stepId: number) => {
    setSelectedStep(stepId);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
    }
  };

  const renderFileTree = (nodes: FileItem[], level = 0) => {
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name); // Optional: Sort alphabetically within the same type
    });
    return sortedNodes.map((node) => (
      <div key={node.name} style={{ paddingLeft: `${level * 20}px` }}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-800 cursor-pointer ${
            selectedFile === node ? "bg-gray-800" : ""
          }`}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(node);
            } else {
              setSelectedFile(node);
            }
          }}
        >
          {node.type === "folder" &&
            (node.isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            ))}
          {node.type === "folder" ? (
            <FolderIcon className="w-4 h-4 text-yellow-500 ml-1" />
          ) : (
            <FileIcon className="w-4 h-4 text-blue-500 ml-1" />
          )}
          <span className="ml-2 text-gray-300">{node.name}</span>
        </div>
        {node.type === "folder" && node.isOpen && node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Left Sidebar - Steps */}
      <div className="w-96 bg-gray-900 border-r border-gray-800 p-4">
        <h2 className="text-xl font-semibold mb-4">Steps</h2>
        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                selectedStep === step.id ? "bg-gray-800 border border-gray-700" : "hover:bg-gray-800/50"
              }`}
            >
              {getStepIcon(step.status)}
              <span className="flex-1">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File Explorer */}
      <div className="w-72 bg-gray-900 border-r border-gray-800">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Files</h2>
          {renderFileTree(files)}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-950 p-4">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg ${
                  activeTab === "code" ? "bg-gray-900 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-800/80"
                }`}
              >
                <Code2 className="w-4 h-4" />
                Code
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg ${
                  activeTab === "preview" ? "bg-gray-900 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-800/80"
                }`}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>

            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
              {activeTab === "code" ? (
                <CodeMirror
                  value={selectedFile.content}
                  height="calc(100vh - 200px)"
                  theme={oneDark}
                  extensions={[javascript({ jsx: true })]}
                  onChange={(value) => {
                    selectedFile.content = value;
                    setFiles([...files]);
                  }}
                />
              ) : (
                <div className="h-full bg-white">
                  <PreviewTab webContainer={webContainer} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">Select a file to edit</div>
        )}
      </div>
    </div>
  );
}
