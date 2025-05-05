import { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { NextFunction, Request, Response, Router } from "express";
import anthropic from "../config/anthropic";
import { config } from "../config/environment";
import { basePrompt as nodeBasePrompt } from "../defaults/node";
import { basePrompt as reactBasePrompt } from "../defaults/react";
import { ApiError } from "../middleware/error.middleware";
import { BASE_PROMPT, getArtifactPrompt, getSystemPrompt, templateSystemPrompt } from "../prompts/system";
import { chunks } from "../utils/chunks";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TemplateRequest extends Request {
  body: {
    prompt: string;
  };
}

interface ChatRequest extends Request {
  body: {
    messages: Message[];
  };
}

const router = Router();

/**
 * @route GET /api
 * @desc API root
 * @access Public
 */
router.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API is running",
    endpoints: {
      health: "/api/health",
      template: "/api/template",
      chat: "/api/chat",
    },
  });
});

/**
 * @route GET /api/health
 * @desc Health check
 * @access Public
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API is running",
  });
});

/**
 * @route POST /api/template
 * @desc Generate template
 * @access Public
 */
router.post("/template", async (req: TemplateRequest, res: Response, next: NextFunction) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) {
      throw new ApiError(400, "Prompt is required");
    }

    const response = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: config.claudeModel,
      max_tokens: 8,
      system: templateSystemPrompt,
    });

    const answer = (response.content[0] as TextBlock).text;

    if (answer == "node") {
      res.json({
        prompts: [BASE_PROMPT, getArtifactPrompt(nodeBasePrompt)],
        uiPrompts: [nodeBasePrompt],
      });
    } else if (answer == "react") {
      res.json({
        prompts: [BASE_PROMPT, getArtifactPrompt(reactBasePrompt)],
        uiPrompts: [reactBasePrompt],
      });
    } else {
      console.log("Unexpected response from Claude:", answer);
      throw new ApiError(400, `Invalid response from AI: ${answer}`);
    }
  } catch (error) {
    console.error("Error in template route:", error);
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(500, "Failed to process template request"));
    }
  }
});

/**
 * @route POST /api/chat
 * @desc Chat with Claude
 * @access Public
 */
router.post("/chat", async (req: ChatRequest, res: Response, next: NextFunction) => {
  const messages = req.body.messages;
  if (!messages) {
    throw new ApiError(400, "Messages are required");
  }

  try {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    });

    const stream = await anthropic.messages.create({
      messages: messages,
      model: config.claudeModel,
      max_tokens: 8000,
      system: getSystemPrompt(),
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        res.write(chunk.delta.text);
      }

      if (res.flushHeaders) {
        res.flushHeaders();
      }
    }

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        const apiError = new ApiError(500, "Failed to process chat request");
        next(apiError);
      }
    } else {
      res.write("\n\nError: Streaming interrupted. Please try again.");
      res.end();
      console.error("Streaming error:", error);
    }
  }
});

router.post("/chat-test", async (req: ChatRequest, res: Response, next: NextFunction) => {
  // const messages = req.body.messages;
  // if (!messages) {
  //   throw new ApiError(400, "Messages are required");
  // }

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
    "Cache-Control": "no-cache",
  });

  for (const chunk of chunks) {
    res.write(chunk);
    await new Promise((resolve) => setTimeout(resolve, 300)); // simulate delay
  }

  res.end();
});

export default router;
