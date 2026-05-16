import OpenAI from 'openai';

class OpenAIService {
    constructor() {
        this.client = null;
        this.apiKey = null;
        this.model = 'gpt-4o'; // default
        this.temperature = 0.7;
        this.history = [];
        this.systemPrompt = `You are an AI companion in a Minecraft-inspired survival and building game called "Mine Build Defeat". 
You assist the player (Captain). You are a floating robot with a blue eye.
Keep responses concise, helpful, and somewhat robotic but friendly.
You do NOT execute commands yourself in this interface, you just provide text responses, advice, and lore.`;
    }

    /**
     * Initialize or update the OpenAI client.
     */
    init(apiKey, model, temperature) {
        this.apiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
        this.model = model || this.model;
        this.temperature = temperature !== undefined ? temperature : this.temperature;

        if (this.apiKey) {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                dangerouslyAllowBrowser: true // Required for client-side execution
            });
            return true;
        }
        return false;
    }

    isConnected() {
        return this.client !== null;
    }

    clearHistory() {
        this.history = [];
    }

    /**
     * Sends a message to OpenAI and yields the streamed response chunks.
     * @param {string} message The user's message
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    async *streamMessage(message) {
        if (!this.isConnected()) {
            yield "Error: OpenAI client is not connected. Please configure your API key in Settings.";
            return;
        }

        // Prepare messages array
        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.history,
            { role: 'user', content: message }
        ];

        try {
            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: this.temperature,
                stream: true,
            });

            let fullResponse = "";
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                fullResponse += content;
                yield content;
            }

            // Save to history after successful stream
            this.history.push({ role: 'user', content: message });
            this.history.push({ role: 'assistant', content: fullResponse });

            // Keep history manageable (e.g., last 20 messages = 10 turns)
            if (this.history.length > 20) {
                this.history = this.history.slice(this.history.length - 20);
            }

        } catch (error) {
            console.error("OpenAI API Error:", error);
            if (error.status === 401) {
                yield "\n[Error: Invalid API Key. Please check your Settings.]";
            } else if (error.status === 429) {
                yield "\n[Error: Rate limit exceeded or quota exhausted.]";
            } else {
                yield `\n[Error: ${error.message}]`;
            }
        }
    }
}

export const openAIService = new OpenAIService();
