import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import axios from "axios";
import { debounce } from "lodash"; // Add this import
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  FileIcon,
  FolderIcon,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PreviewTab } from "../components/PreviewTab";
import { BACKEND_URL } from "../config";
import { useFiles } from "../hooks/useFiles";
import { useSteps } from "../hooks/useSteps";
import { useWebContainer } from "../hooks/useWebContainer";
import { FileItem, Step, StepType } from "../types";
import { parseXml } from "../utils/parseXml";
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isResponseComplete, setIsResponseComplete] = useState<boolean>(false);

  const [chatMessage, setChatMessage] = useState<string>("");
  const chatInputRef = useRef<HTMLInputElement>(null);

  const {
    steps,
    shouldInstallDependencies,
    stepQueue,
    stepProcessingRef,
    updateStepState,
    addStep,
    resetSteps,
  } = useSteps();

  const {
    filesRef,
    filesChangedRef,
    files,
    handleCreateFileStep,
    setFiles,
    convertFilesToFileSystemTree,
    resetFiles,
  } = useFiles();

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const { webContainer } = useWebContainer();

  // Function to reset the editor state
  const resetEditor = useCallback(() => {
    resetSteps();
    resetFiles();
    setSelectedFile(null);
    setActiveTab("code");
    setError(null);
  }, [resetSteps, resetFiles]);

  const handleInitialSteps = useCallback(
    (steps: Step[]) => {
      const pendingSteps = steps.filter(
        (step) => step.status === "pending" && step.type === StepType.CREATE_FILE
      );

      if (pendingSteps.length > 0) {
        let updatedFiles = [...filesRef.current];

        for (const step of pendingSteps) {
          if (step.path) {
            try {
              const result = handleCreateFileStep(step, updatedFiles, true);
              updatedFiles = result.updatedFiles;
            } catch (err) {
              console.error(`Error creating file ${step.path}:`, err);
            }
          }
        }

        setFiles(updatedFiles);
        updateStepState(0, { status: "completed" });
        filesChangedRef.current = true;
      }
    },
    [filesRef, handleCreateFileStep, setFiles, updateStepState]
  );

  // Process the next step in the queue
  const processNextStep = useCallback(async () => {
    if (stepProcessingRef.current || stepQueue.current.length === 0) return;

    stepProcessingRef.current = true;
    let updatedFiles = [...filesRef.current];

    try {
      while (stepQueue.current.length > 0) {
        const step = stepQueue.current.shift()!;

        if (step.type === StepType.CREATE_FILE && step.path) {
          try {
            const result = handleCreateFileStep(step, updatedFiles);
            updatedFiles = result.updatedFiles;
            setSelectedFile(result.file);
            setFiles(updatedFiles);
            filesRef.current = updatedFiles;
            const stepTitle = result.isNewFile ? `Create ${step.path}` : `Update ${step.path}`;
            addStep({ ...step, status: "loading", title: stepTitle });
            setSelectedStep(step.id);
            await typingEffect(step.code || "", result.file);
            updateStepState(step.id, { status: "completed" });
          } catch (err) {
            console.error(`Error processing step ${step.id}:`, err);
            updateStepState(step.id, { status: "error" });
          }
        }
      }
    } finally {
      stepProcessingRef.current = false;
      filesChangedRef.current = true;

      if (stepQueue.current.length === 0 && !shouldInstallDependencies.current) {
        shouldInstallDependencies.current = true;
      }
    }
  }, [addStep, filesRef, handleCreateFileStep, setFiles, setSelectedFile, updateStepState]);

  const init = useCallback(async () => {
    if (!prompt.trim()) {
      setError("No prompt provided");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post<TemplateResponse>(`${BACKEND_URL}/template`, {
        prompt: prompt.trim(),
      });

      const { prompts, uiPrompts } = response.data;

      if (!uiPrompts || uiPrompts.length === 0) {
        throw new Error("No UI prompts received from API");
      }

      // Parse initial steps
      const parsedSteps = parseXml(uiPrompts[0]);
      // Create initial step for file creation
      addStep({
        id: 0,
        title: "Create Initial Files",
        status: "pending",
        type: StepType.CREATE_FILE,
        code: "",
      });
      handleInitialSteps(parsedSteps);

      const messages = [...prompts, prompt].map((content: string) => ({
        role: "user",
        content,
      }));

      // Stream response from chat API
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get reader from response");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsResponseComplete(true);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const { steps: parsedSteps, remaining } = parseXmlStreaming(buffer);
        buffer = remaining;

        if (parsedSteps.length > 0) {
          stepQueue.current.push(...parsedSteps);
          processNextStep();
        }
      }

      // Process any remaining data
      const { steps: finalSteps } = parseXmlStreaming(buffer);
      if (finalSteps.length > 0) {
        stepQueue.current.push(...finalSteps);
        processNextStep();
      }
    } catch (err) {
      console.error("Initialization error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, addStep, resetEditor, handleInitialSteps, processNextStep]);

  useEffect(() => {
    if (prompt) {
      init();
    }
  }, []);

  const typingEffect = useCallback(
    (fullText: string, file: FileItem): Promise<void> => {
      return new Promise((resolve) => {
        const typingSpeed = Math.max(0.1, Math.min(0.1, 5 / fullText.length));
        let index = 0;
        file.content = "";

        const interval = setInterval(() => {
          // Add characters in chunks for better performance with large files
          const chunkSize = fullText.length > 1000 ? 20 : 5;
          const end = Math.min(index + chunkSize, fullText.length);

          file.content += fullText.substring(index, end);
          index = end;

          setFiles((prev) => [...prev]);

          if (index >= fullText.length) {
            clearInterval(interval);
            resolve();
          }
        }, typingSpeed * 1000);
      });
    },
    [setFiles]
  );

  // Install npm dependencies
  const installDependencies = useCallback(async () => {
    if (!webContainer) {
      console.error("WebContainer not available");
      return;
    }

    const lastStepId = steps.length > 0 ? steps[steps.length - 1].id : 0;
    const installStep: Step = {
      id: lastStepId + 1,
      title: "Installing Dependencies",
      status: "loading",
      type: StepType.RUN_SCRIPT,
    };

    addStep(installStep);

    try {
      const installProcess = await webContainer.spawn("npm", ["install"]);
      const exitCode = await installProcess.exit;

      if (exitCode === 0) {
        updateStepState(installStep.id, { status: "completed" });
        console.log("Dependencies installed successfully");
      } else {
        updateStepState(installStep.id, { status: "error" });
        console.error(`Installation failed with exit code ${exitCode}`);
      }
    } catch (error) {
      console.error("Error installing dependencies:", error);
      updateStepState(installStep.id, { status: "error" });
    }
  }, [webContainer, steps, addStep, updateStepState]);

  // Mount files to WebContainer when files change
  useEffect(() => {
    const mountFiles = async () => {
      if (
        webContainer &&
        stepQueue.current.length === 0 &&
        stepProcessingRef.current === false &&
        filesChangedRef.current
      ) {
        try {
          const fileSystemTree = convertFilesToFileSystemTree(files);
          await webContainer.mount(fileSystemTree);
          console.log("Files mounted successfully");
          if (shouldInstallDependencies.current && isResponseComplete) {
            await installDependencies();
            setActiveTab("preview");
            shouldInstallDependencies.current = false;
          }
        } catch (error) {
          console.error("Error mounting files:", error);
        }
        filesChangedRef.current = false;
      }
    };

    if (files.length > 0) {
      mountFiles();
    }
  }, [files, webContainer]);

  // Toggle folder open/closed state
  const toggleFolder = useCallback(
    (node: FileItem) => {
      if (node.type === "folder") {
        node.isOpen = !node.isOpen;
        setFiles([...files]);
      }
    },
    [files, setFiles]
  );

  // Select a step
  const handleStepClick = useCallback((stepId: number) => {
    setSelectedStep(stepId);
  }, []);

  // Get icon for step status
  const getStepIcon = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "error":
        return <Loader2 className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />;
    }
  }, []);

  // Debounced file content change handler
  const handleFileContentChange = useMemo(
    () =>
      debounce((value: string) => {
        if (selectedFile) {
          selectedFile.content = value;
          setFiles([...files]);
          filesChangedRef.current = true;
        }
      }, 300),
    [selectedFile, files, setFiles]
  );

  // Save changes and update preview
  // const handleSaveChanges = useCallback(() => {
  //   if (filesChangedRef.current) {
  //     // Trigger file system update
  //     filesChangedRef.current = true;
  //   }
  // }, []);

  // Render file tree recursively
  const renderFileTree = useCallback(
    (nodes: FileItem[], level = 0) => {
      // Sort folders first, then files, both alphabetically
      const sortedNodes = [...nodes].sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });

      return sortedNodes.map((node) => (
        <div key={`${node.path || node.name}-${level}`} style={{ paddingLeft: `${level * 20}px` }}>
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-800 cursor-pointer rounded ${
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
          {node.type === "folder" &&
            node.isOpen &&
            node.children &&
            renderFileTree(node.children, level + 1)}
        </div>
      ));
    },
    [selectedFile, toggleFolder]
  );

  // Get the appropriate language extension for CodeMirror based on file extension
  const getLanguageExtension = useCallback((filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return javascript({ jsx: true });
      // Add more language extensions as needed
      default:
        return javascript({ jsx: true }); // Default to JavaScript
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // handleSendMessage();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <div className="flex relative">
        {/* Chatbox */}
        <div className="bg-gray-900 h-[48px] absolute w-full border-r border-gray-800 bottom-5">
          <div className="border-t border-gray-800 p-3 flex gap-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => null}
              disabled={!chatMessage.trim() || isLoading}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                !chatMessage.trim() || isLoading
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {/* Left Sidebar - Steps */}
        <div className="w-96 bg-gray-900 border-r border-gray-800 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Steps</h2>
            <button
              onClick={init}
              className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              title="Restart"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                  selectedStep === step.id
                    ? "bg-gray-800 border border-gray-700"
                    : "hover:bg-gray-800/50"
                }`}
              >
                {getStepIcon(step.status)}
                <span className="flex-1">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File Explorer */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Files</h2>
            {files.length > 0 ? (
              renderFileTree(files)
            ) : (
              <div className="text-gray-500 italic">No files created yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-gray-950 p-4 flex flex-col">
        {selectedFile ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg ${
                    activeTab === "code"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-800/80"
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Code
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg ${
                    activeTab === "preview"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-800/80"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
              {activeTab === "code" ? (
                <CodeMirror
                  value={selectedFile.content || ""}
                  height="calc(100vh - 200px)"
                  theme={oneDark}
                  extensions={[getLanguageExtension(selectedFile.name)]}
                  onChange={handleFileContentChange}
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightSpecialChars: true,
                    foldGutter: true,
                    drawSelection: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    syntaxHighlighting: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    rectangularSelection: true,
                    crosshairCursor: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    closeBracketsKeymap: true,
                    searchKeymap: true,
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
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  );
}
