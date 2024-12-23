import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
// import { ChatOllama } from "langchain/llms/openai";
// import { JsonOutputParser } from "langchain/output_parsers";
// import { ChatPromptTemplate } from "langchain/prompts";
import fs from 'fs/promises';
import { ChatOpenAI } from "@langchain/openai";

import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { ChatOllama } from "@langchain/ollama";

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route to handle MCQ input
app.post('/mcq', async (req: Request, res: Response): Promise<void> => {
    const { mcqs, tag, technology, mcqPrompt, level } = req.body;

    // Validate input
    if (typeof mcqs !== 'number' || typeof tag !== 'string' || typeof technology !== 'string' || typeof mcqPrompt !== 'string' || !['easy', 'medium', 'hard'].includes(level)) {
        res.status(400).json({
            error: 'Invalid input. Ensure mcqs is a number, tag, technology, and mcqPrompt are strings, and level is one of "easy", "medium", or "hard".'
        });
        return;
    }

    // Set up the AI model
    const ollamaLlm = new ChatOllama({
        baseUrl: "http://69.57.160.76:11434",
        model: "llama2"
    });

    // Define the parser for the output
    const parser = new JsonOutputParser<{ mcqs: Array<{ question: string; options: Array<{ text: string; correct: boolean }> }> }>();

    // Create the prompt
    const formatInstructions = `
        Respond with a valid JSON object containing the following fields:
        - mcqs: an array of ${mcqs} objects where each object contains:
          - question: a string representing the MCQ prompt.
          - options: an array of objects where each object contains:
            - text: a string representing the option text.
            - correct: a boolean indicating whether the option is correct.
    `;

    // "Generate {mcqs} multiple-choice questions (MCQs) related to the following details.\n" +
    // "Tag: {tag}\nTechnology: {technology}\nPrompt: {mcqPrompt}\nDifficulty Level: {level}\n{format_instructions}\n"
    const prompt = ChatPromptTemplate.fromTemplate(
            "Generate exactly {mcqs} multiple-choice questions (MCQs) based on the following details. Each question must have 4 options, with exactly one marked as correct. Tag: {tag} Technology: {technology} Prompt: {mcqPrompt} Difficulty Level: {level} {format_instructions}"
    );

    const partialedPrompt = await prompt.partial({
        format_instructions: formatInstructions
    });

    const chain = partialedPrompt.pipe(ollamaLlm).pipe(parser);

    try {
        // Invoke the chain
        const response = await chain.invoke({ mcqs, tag, technology, mcqPrompt, level });

        // Save response to a file
        const filePath = './mcqs.json';
        await fs.writeFile(filePath, JSON.stringify({
            mcqs: response.mcqs,
            tag,
            technology,
            mcqPrompt,
            level
        }, null, 2), 'utf-8');

        console.log(`JSON saved to ${filePath}`);

        // Send response
        res.json({
            mcqs: response.mcqs,
            tag,
            technology,
            mcqPrompt,
            level
        });
    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: 'Failed to generate MCQs. Please try again later.' });
    }
});

// app.post('/mcq', async (req: Request, res: Response): Promise<void> => {
//     const { mcqs, tag, technology, mcqPrompt, level } = req.body;

//     // Validate input
//     if (typeof mcqs !== 'number' || mcqs <= 0 || typeof tag !== 'string' || typeof technology !== 'string' || typeof mcqPrompt !== 'string' || !['easy', 'medium', 'hard'].includes(level)) {
//         res.status(400).json({
//             error: 'Invalid input. Ensure mcqs is a positive number, tag, technology, and mcqPrompt are strings, and level is one of "easy", "medium", or "hard".'
//         });
//         return;
//     }


// const ollamaLlm = new ChatOpenAI({
//     apiKey: "ksdkls",
//   model: "gpt-4o-mini",
// });



//     // Set up the AI model
//     // const ollamaLlm = new ChatOllama({
//     //     baseUrl: "http://69.57.160.76:11434",
//     //     model: "llama2"
//     // });

//     // Define the parser for the output
//     const parser = new JsonOutputParser<{ mcqs: Array<{ question: string; options: Array<{ text: string; correct: boolean }> }> }>();

//     // Create the prompt
//     const formatInstructions = `
//         Respond with a valid JSON object containing the following fields:
//         - mcqs: an array of ${mcqs} objects where each object contains:
//           - question: a string representing the MCQ prompt.
//           - options: an array of objects where each object contains:
//             - text: a string representing the option text.
//             - correct: a boolean indicating whether the option is correct.
//     `;

//     const prompt = ChatPromptTemplate.fromTemplate(
//         `Generate exactly {mcqs} multiple-choice questions (MCQs) based on the following details. Each question must have 4 options, with exactly one marked as correct.
//         Tag: {tag}
//         Technology: {technology}
//         Prompt: {mcqPrompt}
//         Difficulty Level: {level}
//         {format_instructions}`
//     );

//     const partialedPrompt = await prompt.partial({
//         format_instructions: formatInstructions
//     });

//     const chain = partialedPrompt.pipe(ollamaLlm).pipe(parser);

//     try {
//         // Invoke the chain
//         const response = await chain.invoke({ mcqs, tag, technology, mcqPrompt, level });

//         // Check and adjust the number of questions if necessary
//         let generatedMcqs = response.mcqs;
//         if (generatedMcqs.length > mcqs) {
//             generatedMcqs = generatedMcqs.slice(0, mcqs); // Trim extra questions
//         }

//         if (generatedMcqs.length < mcqs) {
//             res.status(500).json({
//                 error: `Only ${generatedMcqs.length} questions were generated instead of ${mcqs}. Try refining your input or increasing the MCQs value.`
//             });
//             return;
//         }

//         // Save response to a file
//         const filePath = './mcqs.json';
//         await fs.writeFile(filePath, JSON.stringify({
//             mcqs: generatedMcqs,
//             tag,
//             technology,
//             mcqPrompt,
//             level
//         }, null, 2), 'utf-8');

//         console.log(`JSON saved to ${filePath}`);

//         // Send response
//         res.json({
//             mcqs: generatedMcqs,
//             tag,
//             technology,
//             mcqPrompt,
//             level
//         });
//     } catch (error) {
//         console.error("Error occurred:", error);
//         res.status(500).json({ error: 'Failed to generate MCQs. Please try again later.' });
//     }
// });


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
