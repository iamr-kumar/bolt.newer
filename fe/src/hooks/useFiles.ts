import { useCallback, useEffect, useRef, useState } from "react";
import { FileItem, Step } from "../types";
import { DirectoryNode, FileSystemTree } from "@webcontainer/api";

export const useFiles = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const filesRef = useRef<FileItem[]>([]);
  const filesChangedRef = useRef(false);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const handleCreateFileStep = useCallback(
    (
      step: Step,
      currSetOfFiles: FileItem[],
      isInitialFileCreation = false
    ): { file: FileItem; updatedFiles: FileItem[]; isNewFile: boolean } => {
      if (!step.path) {
        throw new Error("File path is required for file creation step");
      }

      const pathParts = step.path.split("/").filter((path) => path.length > 0);
      const fileName = pathParts.pop() || "";

      if (!fileName) {
        throw new Error("Invalid file path: filename is missing");
      }

      // Create a new copy of the files array to avoid mutation
      const updatedFiles = [...currSetOfFiles];

      // Navigate through the folder structure, creating folders as needed
      let currentLevel = updatedFiles;
      let currentFolderPath = "";

      for (const folder of pathParts) {
        currentFolderPath = currentFolderPath ? `${currentFolderPath}/${folder}` : folder;

        // Find existing folder or create new one
        let folderNode = currentLevel.find(
          (node) => node.name === folder && node.type === "folder"
        );

        if (!folderNode) {
          folderNode = {
            name: folder,
            type: "folder",
            path: currentFolderPath,
            children: [],
            isOpen: true,
          };
          currentLevel.push(folderNode);
        }

        if (!folderNode.children) {
          folderNode.children = [];
        }

        currentLevel = folderNode.children;
      }

      // Find existing file or create new one
      let file = currentLevel.find(
        (currFile) => currFile.name === fileName && currFile.type === "file"
      );

      let isNewFile = false;

      if (!file) {
        file = {
          name: fileName,
          type: "file",
          path: pathParts.length > 0 ? `${currentFolderPath}/${fileName}` : fileName,
          content: isInitialFileCreation ? step.code || "" : "",
        };
        isNewFile = true;
        currentLevel.push(file);
      } else {
        file.content = isInitialFileCreation ? step.code || "" : "";
      }

      return { file, updatedFiles, isNewFile };
    },
    []
  );

  /**
   * Convert file tree structure to WebContainer's FileSystemTree format
   */
  const convertFilesToFileSystemTree = useCallback((files: FileItem[]): FileSystemTree => {
    const fileSystemTree: FileSystemTree = {};

    const processNodes = (nodes: FileItem[], parentTree: FileSystemTree = fileSystemTree) => {
      for (const node of nodes) {
        if (node.type === "file") {
          parentTree[node.name] = {
            file: {
              contents: node.content || "",
            },
          };
        } else if (node.type === "folder" && node.children) {
          const directoryNode: DirectoryNode = {
            directory: {},
          };

          parentTree[node.name] = directoryNode;
          processNodes(node.children, directoryNode.directory);
        }
      }
    };

    processNodes(files);
    return fileSystemTree;
  }, []);

  const findFileByPath = useCallback(
    (path: string): FileItem | null => {
      const pathParts = path.split("/").filter((part) => part.length > 0);

      const searchInLevel = (nodes: FileItem[], depth: number): FileItem | null => {
        for (const node of nodes) {
          if (
            depth === pathParts.length - 1 &&
            node.name === pathParts[depth] &&
            node.type === "file"
          ) {
            return node;
          }

          if (node.type === "folder" && node.name === pathParts[depth] && node.children) {
            const found = searchInLevel(node.children, depth + 1);
            if (found) return found;
          }
        }

        return null;
      };

      return pathParts.length > 0 ? searchInLevel(files, 0) : null;
    },
    [files]
  );

  const resetFiles = useCallback(() => {
    setFiles([]);
    filesRef.current = [];
    filesChangedRef.current = false;
  }, []);

  return {
    files,
    setFiles,
    handleCreateFileStep,
    filesChangedRef,
    filesRef,
    convertFilesToFileSystemTree,
    findFileByPath,
    resetFiles,
  };
};
