import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/config/environment";

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export default anthropic;
