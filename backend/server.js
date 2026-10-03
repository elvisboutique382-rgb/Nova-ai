import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// API CLIENTS
// ============================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ============================================================
// NOVA AI SYSTEM INSTRUCTIONS
// ============================================================

const NOVA_INSTRUCTIONS = `
You are Nova AI, a helpful, friendly and intelligent AI assistant.

You can help with:
- School subjects
- Mathematics
- Science
- Coding
- Writing
- Research
- Explanations
- Creative ideas
- General questions

For students, explain difficult topics clearly and step-by-step.
Do not pretend to know something when you are uncertain.
Be accurate, helpful and easy to understand.
`;

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "Nova AI",
    providers: ["OpenAI", "Gemini", "Claude"],
  });
});

// ============================================================
// OPENAI
// ============================================================

async function askOpenAI(message, previousResponseId) {
  const request = {
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: NOVA_INSTRUCTIONS,
    input: message,
  };

  if (previousResponseId) {
    request.previous_response_id = previousResponseId;
  }

  const response = await openai.responses.create(request);

  return {
    text: response.output_text,
    responseId: response.id,
  };
}

// ============================================================
// GEMINI
// ============================================================

async function askGemini(message) {
  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: `${NOVA_INSTRUCTIONS}

User:
${message}`,
  });

  return {
    text: response.text || "Gemini did not return a response.",
    responseId: null,
  };
}

// ============================================================
// CLAUDE
// ============================================================

async function askClaude(message) {
  const response = await fetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:
          process.env.CLAUDE_MODEL ||
          "claude-sonnet-4-5",
        max_tokens: 4096,
        system: NOVA_INSTRUCTIONS,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${errorText}`);
  }

  const data = await response.json();

  const text = (data.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");

  return {
    text: text || "Claude did not return a response.",
    responseId: data.id || null,
  };
}

// ============================================================
// CHAT ENDPOINT
// ============================================================

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      provider = "openai",
      previousResponseId,
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "A message is required.",
      });
    }

    let result;

    // --------------------------------------------------------
    // SELECT AI PROVIDER
    // --------------------------------------------------------

    switch (provider.toLowerCase()) {
      case "openai":
      case "gpt":
        result = await askOpenAI(
          message,
          previousResponseId
        );
        break;

      case "gemini":
      case "google":
        result = await askGemini(message);
        break;

      case "claude":
      case "anthropic":
        result = await askClaude(message);
        break;

      default:
        return res.status(400).json({
          success: false,
          error:
            "Invalid provider. Choose openai, gemini, or claude.",
        });
    }

    // --------------------------------------------------------
    // SEND RESPONSE TO FLUTTER APP
    // --------------------------------------------------------

    res.json({
      success: true,
      provider: provider,
      response: result.text,
      responseId: result.responseId,
    });

  } catch (error) {
    console.error("Nova AI error:", error);

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Nova AI could not process your request.",
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(
    `Nova AI backend running on port ${PORT}`
  );
});
