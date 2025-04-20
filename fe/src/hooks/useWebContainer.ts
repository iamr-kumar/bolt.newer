import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

export const useWebContainer = () => {
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);

  const initWebContainer = async () => {
    try {
      const container = await WebContainer.boot();
      setWebContainer(container);
    } catch (error) {
      console.error("Failed to initialize WebContainer:", error);
    }
  };

  useEffect(() => {
    initWebContainer();
  }, []);

  return { webContainer };
};
