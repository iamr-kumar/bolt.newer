import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

export function PreviewTab({
  webContainer,
}: {
  webContainer: WebContainer | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const startPreview = async () => {
      if (webContainer) {
        setIsStarting(true);
        try {
          await webContainer.spawn("npm", ["run", "dev"]);
          webContainer.on("server-ready", (_, url) => {
            setPreviewUrl(url);
            setIsStarting(false);
          });
        } catch (error) {
          console.error("Failed to start preview:", error);
          setIsStarting(false);
        }
      }
    };

    startPreview();
  }, [webContainer]);

  return (
    <div className="h-full w-full">
      {previewUrl ? (
        <iframe
          src={previewUrl}
          className="w-full h-full"
          style={{ height: "100%", width: "100%", border: "none" }}
        />
      ) : (
        <div className="flex items-center justify-center h-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-gray-500">
              {isStarting ? (
                <>
                  Starting development server
                  <LoadingDots />
                </>
              ) : (
                "Loading preview..."
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
