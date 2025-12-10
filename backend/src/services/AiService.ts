import { GoogleGenerativeAI } from '@google/generative-ai';
import Project from '../models/Project';
import Customer from '../models/Customer';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY is missing in .env');
        }
        this.genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
        // Using a fast and capable model
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    }

    private async getSystemPrompt(): Promise<string> {
        let context = '';

        try {
            // RAG: Fetch basic context from DB to inject into the system prompt
            const recentProjects = await Project.find({ status: 'active' }).limit(10).select('projectCode projectName customer');
            const customers = await Customer.find({ isActive: true }).select('name code');

            context = `
            Current Active Projects: ${JSON.stringify(recentProjects)}
            Customers: ${JSON.stringify(customers)}
            `;
        } catch (dbError) {
            console.error('AI Context Fetch Error (DB likely down):', dbError);
            context = 'Database content unavailable (Connection Error).';
        }

        return `
    You are an intelligent ERP Assistant for a manufacturing company.
    Your goal is to help users find information in the database and navigate the application.
    
    Current Database Context:
    ${context}

    Available Navigation Paths (URLs):
    - /sales/projects (Project Management)
    - /sales/invoices (Invoices)
    - /sales/ar (Accounts Receivable)
    - /purchase/purchase-requests (Purchase Requests)
    - /purchase/purchase-orders (Purchase Orders)
    - /inventory/products (Inventory)
    - /master-data/sales/customers (Customers)
    - /hr/employees (Employees)
    
    Response Format:
    You must ALWAYS return a JSON object. Do not return plain text or markdown blocks (like \`\`\`json).
    
    Structure:
    {
      "message": "The text response to show the user",
      "action": "navigate" | "none", 
      "path": "/path/to/navigate" (only if action is navigate)
    }
    
    Examples:
    User: "Go to the invoice page"
    Response: { "message": "Navigating to Invoices...", "action": "navigate", "path": "/sales/invoices" }
    
    User: "Who is the customer for project VW-001?"
    Response: { "message": "The customer for project VW-001 is [Customer Name].", "action": "none" }
    `;
    }

    public async chat(messages: ChatMessage[]): Promise<any> {
        if (!process.env.GEMINI_API_KEY) {
            return {
                message: "Gemini API Key is missing in .env. Please configure GEMINI_API_KEY.",
                action: "none"
            };
        }

        try {
            const systemPrompt = await this.getSystemPrompt();

            // Prepare history for Gemini
            // Gemini roles: 'user' or 'model'. System prompt is usually passed effectively as the first user message or via system instructions in newer API versions.
            // Here we'll prepend the system prompt to the first message for simplicity and compatibility.

            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })).filter(m => m.role !== 'user' || m.parts[0].text !== undefined); // Simple filter

            // Initialize chat with history (excluding the very last message which is the new input)
            // But strict conversion: OpenAI messages include the latest one.
            // We need to separate history vs current prompt for `startChat` + `sendMessage`, OR use `generateContent` with all messages.
            // `startChat` is better for multi-turn.

            const chatObj = this.model.startChat({
                history: [
                    {
                        role: 'user',
                        parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}` }]
                    },
                    ...history.slice(0, -1) // All previous messages
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const lastMessage = history[history.length - 1];
            const result = await chatObj.sendMessage(lastMessage.parts[0].text);
            const responseText = result.response.text();

            if (!responseText) {
                throw new Error("No content in Gemini response");
            }

            return JSON.parse(responseText);

        } catch (error: any) {
            console.error('Gemini Service Error:', error);
            return {
                message: "오류가 발생했습니다: " + error.message,
                action: "none"
            };
        }
    }
}

export const aiService = new AiService();
