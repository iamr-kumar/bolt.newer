import { Router, Request, Response, NextFunction } from "express";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import anthropic from "@/config/anthropic";
import { config } from "@/config/environment";
import {
  BASE_PROMPT,
  getArtifactPrompt,
  getSystemPrompt,
  templateSystemPrompt,
} from "@/prompts/system";
import { basePrompt as reactBasePrompt } from "@/defaults/react";
import { basePrompt as nodeBasePrompt } from "@/defaults/node";
import { ApiError } from "@/middleware/error.middleware";

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

router.post(
  "/template",
  async (req: TemplateRequest, res: Response, next: NextFunction) => {
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
        max_tokens: 100,
        system: templateSystemPrompt,
      });

      const answer = (response.content[0] as TextBlock).text;
      if (answer === "node") {
        res.json({
          prompts: [BASE_PROMPT, getArtifactPrompt(nodeBasePrompt)],
          uiPrompts: [nodeBasePrompt],
        });
      } else if (answer === "react") {
        res.json({
          prompts: [BASE_PROMPT, getArtifactPrompt(reactBasePrompt)],
          uiPrompts: [reactBasePrompt],
        });
      } else {
        throw new ApiError(403, "You cannot access this resource");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, "Failed to process template request"));
      }
    }
  }
);

router.post(
  "/chat",
  async (req: ChatRequest, res: Response, next: NextFunction) => {
    const messages = req.body.messages;
    if (!messages) {
      throw new ApiError(400, "Messages are required");
    }

    try {
      const response = await anthropic.messages.create({
        messages: messages,
        model: config.claudeModel,
        max_tokens: 100,
        system: getSystemPrompt(),
      });

      res.json({
        content: (response.content[0] as TextBlock).text,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, "Failed to process chat request"));
      }
    }
  }
);

export default router;
