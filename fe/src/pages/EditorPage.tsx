import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  FileIcon,
  FolderIcon,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { parseXml } from "../utils/parseXml";
import { Step } from "../types";

interface FileNode {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

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

  const [fileSystem, setFileSystem] = useState<FileNode[]>([
    {
      name: "src",
      type: "folder",
      isOpen: true,
      children: [
        { name: "App.tsx", type: "file", content: "// Your app code here" },
        { name: "index.css", type: "file", content: "/* Your styles here */" },
      ],
    },
    { name: "package.json", type: "file", content: '{ "name": "my-project" }' },
  ]);

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  async function init() {
    try {
      const response = await axios.post<TemplateResponse>(
        `${BACKEND_URL}/template`,
        {
          prompt: prompt.trim(),
        }
      );
      const { prompts, uiPrompts } = response.data;

      setSteps(parseXml(uiPrompts[0]));

      const stepResposne = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...prompts, prompt].map((content: string) => ({
          role: "user",
          content,
        })),
      });
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    init();
  }, []);

  const toggleFolder = (node: FileNode) => {
    if (node.type === "folder") {
      node.isOpen = !node.isOpen;
      setFileSystem([...fileSystem]);
    }
  };

  const handleStepClick = (stepId: number) => {
    setSelectedStep(stepId);
    // Update step status for demonstration
    setSteps(
      steps.map((step) => ({
        ...step,
        status: step.id === stepId ? "loading" : step.status,
      }))
    );
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
        );
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
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
        {node.type === "folder" &&
          node.isOpen &&
          node.children &&
          renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Left Sidebar - Steps */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-4">
        <h2 className="text-xl font-semibold mb-4">Steps</h2>
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
      <div className="w-64 bg-gray-900 border-r border-gray-800">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Files</h2>
          {renderFileTree(fileSystem)}
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

            <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
              {activeTab === "code" ? (
                <CodeMirror
                  value={selectedFile.content}
                  height="calc(100vh - 200px)"
                  theme={oneDark}
                  extensions={[javascript({ jsx: true })]}
                  onChange={(value) => {
                    selectedFile.content = value;
                    setFileSystem([...fileSystem]);
                  }}
                />
              ) : (
                <div className="h-full bg-white">
                  <iframe
                    title="Preview"
                    srcDoc={selectedFile.content}
                    className="w-full h-full"
                    sandbox="allow-scripts"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
}
