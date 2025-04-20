import { WebContainer } from "@webcontainer/api";
import { useEffect, useState } from "react";

export function PreviewTab({ webContainer }: { webContainer: WebContainer | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const startPreview = async () => {
      if (webContainer) {
        const installProcess = await webContainer.spawn("npm", ["install"]);

        installProcess.output.pipeTo(
          new WritableStream({
            write: (chunk) => {
              console.log(chunk);
            },
          })
        );

        await webContainer.spawn("npm", ["run", "dev"]);
        webContainer.on("server-ready", (_, url) => {
          setPreviewUrl(url);
        });
      }
    };

    startPreview();
  }, [webContainer]);

  return (
    <div className="h-full w-full">
      {previewUrl ? <iframe src={previewUrl} width="100%" height="100%" /> : <p>Loading preview...</p>}
    </div>
  );
}
