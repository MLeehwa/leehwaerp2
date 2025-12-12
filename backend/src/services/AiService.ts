import OpenAI from 'openai';
import Project from '../models/Project';
import Customer from '../models/Customer';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class AiService {
    private openai: OpenAI;
    private model: string;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('❌ OPENAI_API_KEY is missing in .env');
        }
        this.openai = new OpenAI({
            apiKey: apiKey || 'dummy-key',
        });

        // Use GPT-4o-mini or GPT-4o as preferred fast/smart models
        this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
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
        if (!process.env.OPENAI_API_KEY) {
            return {
                message: "OpenAI API Key is missing in .env. Please configure OPENAI_API_KEY.",
                action: "none"
            };
        }

        try {
            const systemPrompt = await this.getSystemPrompt();

            // Prepare messages for OpenAI
            const openAiMessages: any[] = [
                { role: 'system', content: systemPrompt },
                ...messages
            ];

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: openAiMessages,
                response_format: { type: "json_object" }, // Enforce JSON response
            });

            const responseText = completion.choices[0].message.content;

            if (!responseText) {
                throw new Error("No content in OpenAI response");
            }

            return JSON.parse(responseText);

        } catch (error: any) {
            console.error('OpenAI Service Error:', error);

            // Fallback for JSON parse error or API error
            return {
                message: "오류가 발생했습니다: " + (error.message || "Unknown error"),
                action: "none"
            };
        }
    }
}

export const aiService = new AiService();

