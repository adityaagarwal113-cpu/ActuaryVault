import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Shared Gemini Client following guidelines (User-Agent telemetry + process.env)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve uploads folder statically in both development and production
  const uploadsPath = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  // Body parser with 50mb limit to handle high-res image and PDF uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Handle saving of uploaded past paper PDFs directly to the server files
  app.post("/api/upload-pdf", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData) {
        res.status(400).json({ error: "No file data provided." });
        return;
      }

      const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      
      // Sanitise filename to prevent path traversal
      const safeName = (fileName || `upload_${Date.now()}.pdf`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const filePath = path.join(uploadsPath, safeName);
      
      fs.writeFileSync(filePath, buffer);
      
      // Return relative path from server root
      res.json({ pdfUrl: `/uploads/${safeName}` });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ error: error.message || "An error occurred during file saving." });
    }
  });

  // Process uploaded documents/images and extract structured actuarial questions
  app.post("/api/process-upload", async (req, res) => {
    try {
      const { fileData, fileName, mimeType, examBody, subject, rephraseMode } = req.body;

      if (!fileData) {
        res.status(400).json({ error: "No file data provided." });
        return;
      }

      // Check if API key is present
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
        return;
      }

      const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");

      // Safe rephrase instructions
      const rephraseInstructions = rephraseMode === "Original Only" 
        ? "Do not perform rephrasing. Leave the rephrasedQuestion field blank."
        : `Generate a 'rephrasedQuestion' field. You must strictly follow these Safe Rephrase rules:
           1. NEVER MODIFY these command verbs/actions: Describe, Explain, Discuss, List, State, Recommend, Compare, Justify, Calculate, Derive, Show. They must remain exactly as originally written.
           2. NEVER MODIFY any actuarial or financial terminology, mathematical formulae, or technical keywords (such as ALM, Solvency II, mortality, longevity, annuity, reserves, credibility, premium, standard deviations, stochastic, Markov chains, etc.).
           3. Only rewrite surrounding context, scenario fluff, or filler phrases to make it feel fresh while preserving 100% of the mathematical, technical, and cognitive style of the original question.`;

      const promptText = `You are a professional actuarial examiner and expert actuarial questions parser.
We are extracting questions for Exam Body: ${examBody} and Subject: ${subject}.

Extract ALL distinct questions from the uploaded material. If the material consists of a single question, parse it fully. If it has multiple, parse each one.
For each question, ensure you preserve any numbered sub-sections (e.g., i, ii, iii, iv) perfectly in the text.

You MUST respond with a single valid JSON object containing an array of extracted questions under the "questions" key.
No markdown block wrappers around the JSON, just the raw JSON text.

JSON Schema structure:
{
  "questions": [
    {
      "question": "The original complete question text, retaining all sub-questions (e.g. i, ii, iii, iv) and mark allocations.",
      "rephrasedQuestion": "Rephrased question if requested, or empty otherwise",
      "marks": 10,  // Integer absolute mark value total for the question
      "chapter": "Suggested Syllabus Chapter Name",
      "topic": "Suggested Syllabus Specific Topic Name",
      "difficulty": "Easy" | "Medium" | "Hard", // Single value based on style
      "commandWord": "Identify the primary command word used, e.g. Discuss, Calculate, Explain",
      "aiSolution": "A detailed step-by-step explanatory actuarial solution or guide explaining how to solve this question, expanding on relevant actuarial principles.",
      "keyPoints": "Key points students must remember, separated by newlines.",
      "commonMistakes": "Common mistakes and student errors for this type of question, separated by newlines.",
      "officialAnswer": "If there is an official answer/solution in the text, extract it exactly. Else, leave empty or create a brief draft.",
      "markScheme": "Expected marks allocation details if found in text, else empty.",
      "examinerReport": "Examiner's observations or report commentary if found, else empty.",
      "confidenceScore": 95 // Integer confidence rating between 1 and 100 on how accurately you parsed this question. High confidence (>90) for structured papers, Lower (<90) for fuzzy, scrambled text or images.
    }
  ]
}

REPHRASE RULES:
${rephraseInstructions}

Double check that the response is parseable by JSON.parse. Avoid trailing commas or comments. Start the response with { and end with }.`;

      // Structure Gemini contents parameter
      const contentsPayload = [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "application/pdf"
          }
        },
        promptText
      ];

      // Call the model using the recommended gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini API.");
      }

      // Try to parse JSON to make sure it's valid
      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (e) {
        // Fallback: strip potential markdown wrapper if Gemini added them despite prompt
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleaned);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("AI processing error:", error);
      res.status(500).json({ error: error.message || "An error occurred during AI processing." });
    }
  });

  // Evaluate student answer sheet/file against questions and marking rubrics
  app.post("/api/evaluate-answers", async (req, res) => {
    try {
      const { questions, studentAnswersText, fileData, fileName, mimeType } = req.body;

      if (!questions || !Array.isArray(questions)) {
        res.status(400).json({ error: "Questions list is required." });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
        return;
      }

      let contentsPayload: any[] = [];
      let systemPrompt = `You are an expert actuarial examiner. Your task is to evaluate and grade a student's answer sheet against a set of questions, their official model answers, and their marking schemes.

Questions with official solutions and rubrics to grade:
${JSON.stringify(questions, null, 2)}

Please evaluate the student's work. Be precise, fair, and professional.
Evaluate their mathematical logic, formulae derivation, and qualitative justifications.
For each question, allocate marks (up to the maximum marks specified for that question) according to the marking scheme. Highlight what key concepts were missed, what common mistakes they fell into, and provide clear remedial advice.

Provide an overall score (sum of marks awarded) and general constructive comments.

You MUST respond with a single valid JSON object matching the JSON schema below. No markdown block wrappers around the JSON, just the raw JSON text.

JSON Schema:
{
  "overallScore": 34, // Sum of all marks awarded (must be an integer)
  "maxMarks": 100, // Sum of max marks of all questions (must be an integer)
  "feedback": [
    {
      "questionId": "string id of the question",
      "marksAwarded": 8, // Integer marks awarded
      "maxMarks": 10, // Integer max marks of this question
      "comments": "Detailed explanation of why marks were awarded or deducted",
      "keyMissedConcepts": "Concepts or steps they missed",
      "remedialAdvice": "How they can improve or what to study"
    }
  ],
  "generalComments": "General summary feedback for the candidate's paper"
}
`;

      if (studentAnswersText) {
        systemPrompt += `\n\nStudent's typed answers:\n${studentAnswersText}`;
      }

      if (fileData) {
        const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");
        contentsPayload.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "application/pdf"
          }
        });
        systemPrompt += `\n\nAdditionally, the student has uploaded an answer file (${fileName || "submission"}) which contains their written/calculation work. Please read this file to grade their answers.`;
      }

      contentsPayload.push(systemPrompt);

      // Call the model using the recommended gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini API.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (e) {
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleaned);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("AI evaluation error:", error);
      res.status(500).json({ error: error.message || "An error occurred during AI evaluation." });
    }
  });

  // Process student revision notes to create custom summaries, formula sheets, and flashcards
  app.post("/api/process-notes", async (req, res) => {
    try {
      const { fileData, fileName, mimeType, subject } = req.body;

      if (!fileData) {
        res.status(400).json({ error: "No file data provided." });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
        return;
      }

      const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");

      const promptText = `You are an expert actuarial study coach and mentor.
A student has uploaded their personal revision notes, lecture slides, or study summaries for Subject: ${subject || "Core Actuarial Studies"}.

Your task is to analyze these notes and synthesize them into highly structured, student-friendly interactive study assets.
Extract:
1. A concise, easy-to-read "summary" of the main topics covered.
2. An array of "formulas": core mathematical/actuarial formulas, nicely formatted with standard LaTeX or clear math notations.
3. An array of "definitions": key concepts, acronyms, or theories with clean student-friendly explanations.
4. An array of "mockQuestions": 3-4 custom practice questions generated directly from these notes to test their understanding, including a detailed "solution" for each.

You MUST respond with a single valid JSON object matching the schema below. No markdown block wrappers around the JSON, just the raw JSON text.

JSON Schema:
{
  "summary": "Brief student-friendly summary of the note contents...",
  "formulas": [
    {
      "name": "Name of formula",
      "formula": "LaTeX formula expression, e.g. \\\\ddot{a}_x = \\\\sum_{t=0}^{\\\\infty} v^t \\\\,_tp_x",
      "context": "Brief context or variables definition"
    }
  ],
  "definitions": [
    {
      "concept": "Concept Name",
      "explanation": "Clear, intuitive explanation of this concept"
    }
  ],
  "mockQuestions": [
    {
      "question": "Custom test question based on their notes...",
      "marks": 5, // reasonable marks
      "solution": "Step-by-step mathematical or qualitative derivation solution"
    }
  ]
}

Double check that the response is parseable by JSON.parse. Avoid trailing commas or comments. Start the response with { and end with }.`;

      const contentsPayload = [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "application/pdf"
          }
        },
        promptText
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsPayload,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response returned from Gemini API.");
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText.trim());
      } catch (e) {
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleaned);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Notes processing error:", error);
      res.status(500).json({ error: error.message || "An error occurred during notes processing." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
