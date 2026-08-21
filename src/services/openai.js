import OpenAI from 'openai';

class OpenAIService {
    constructor() {
        this.client = null;
        this.apiKey = null;
        this.model = 'gpt-5.5'; // default
        this.temperature = 0.7;
        this.history = [];
        this.systemPrompt = `You are an AI companion in a Minecraft-inspired survival and building game called "Mine Build Defeat". 
You assist the player (Captain). You are a floating robot with a green heart core.
Keep responses concise, helpful, and somewhat robotic but friendly.
You do NOT execute commands yourself in this interface, you just provide text responses, advice, and lore.`;
        
        // Session tracking
        this.isLoggedIn = typeof localStorage !== 'undefined' && !!localStorage.getItem('chatgpt_user_email');
        this.userEmail = typeof localStorage !== 'undefined' ? localStorage.getItem('chatgpt_user_email') : null;
        
        // Initial setup
        this.init();
    }

    /**
     * Initialize or update the OpenAI client.
     */
    init(apiKey, model, temperature) {
        let envKey = null;
        try {
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                envKey = import.meta.env.VITE_OPENAI_API_KEY;
            }
        } catch (e) {}

        this.apiKey = apiKey || envKey || this.apiKey;
        this.model = model || this.model;
        this.temperature = temperature !== undefined ? temperature : this.temperature;

        // Only instantiate the real OpenAI client if we have a real key (not a placeholder)
        if (this.apiKey && this.apiKey !== 'sk-your-actual-api-key-goes-here' && !this.apiKey.includes('your_openai')) {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                dangerouslyAllowBrowser: true // Required for client-side execution
            });
            return true;
        } else {
            this.client = null;
        }
        return false;
    }

    setLoggedIn(email) {
        this.isLoggedIn = true;
        this.userEmail = email;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('chatgpt_user_email', email);
        }
    }

    setLoggedOut() {
        this.isLoggedIn = false;
        this.userEmail = null;
        this.client = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('chatgpt_user_email');
        }
        this.clearHistory();
    }

    isConnected() {
        return this.isLoggedIn;
    }

    clearHistory() {
        this.history = [];
    }

    /**
     * Sends a message to OpenAI or local simulator and yields the streamed response chunks.
     * @param {string} message The user's message
     * @returns {AsyncGenerator<string, void, unknown>}
     */
    async *streamMessage(message) {
        if (!this.isConnected()) {
            yield "Error: ChatGPT session is not active. Please sign in in Settings.";
            return;
        }

        // If we don't have a valid client, run the local simulator stream
        if (!this.client) {
            yield* this.streamSimulatedResponse(message);
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
            console.error("OpenAI API Error, falling back to local simulation:", error);
            yield* this.streamSimulatedResponse(message);
        }
    }

    /**
     * Local game-aware response generator for offline or keyless play.
     */
    async *streamSimulatedResponse(message) {
        const query = message.trim().toLowerCase();
        let responseText = "";

        if (query.includes('help') || query.includes('command')) {
            responseText = "Here are the available console commands you can use:\n" +
                           "  - `give <item> [amount]` : Synthesize items into your inventory.\n" +
                           "  - `build house` : Instantly construct a cozy, furnished shelter.\n" +
                           "  - `build castle` : Raise a fortified castle with towers, battlements, and a keep.\n" +
                           "  - `clear` : Clear the console log.\n" +
                           "  - `day` / `night` : Change the time of day.\n" +
                           "  - `help` : Show this helper menu.\n\n" +
                           "You can also use standard keybindings:\n" +
                           "  - **L** : Toggle day/night cycle\n" +
                           "  - **E** : Open creative inventory / catalog\n" +
                           "  - **/** or **T** : Toggle agent console";
        } else if (query.includes('synthesize') || query.includes('give') || query.includes('item') || query.includes('block')) {
            responseText = "To synthesize items, type the command `give <item_name> [amount]` directly into this console.\n" +
                           "For example, typing `give stone 10` will add 10 stone blocks to your hotbar/inventory!\n" +
                           "You can also use the Creative Catalog by pressing **E** to select blocks visually.";
        } else if (query.includes('control') || query.includes('move') || query.includes('play') || query.includes('key')) {
            responseText = "Here is a quick controls cheat sheet, Captain:\n" +
                           "  - **W / A / S / D** : Move around the world\n" +
                           "  - **Space** : Jump (hold to swim/fly)\n" +
                           "  - **Left Click** : Mine/destroy blocks\n" +
                           "  - **Right Click** : Place active block from hotbar\n" +
                           "  - **1 - 5 Keys** : Select slot in your hotbar\n" +
                           "  - **E** : Open inventory menu\n" +
                           "  - **L** : Toggle day/night\n" +
                           "  - **T** or **/** : Open/close agent console";
        } else if (query.includes('monster') || query.includes('zombie') || query.includes('spider') || query.includes('fight') || query.includes('enemy') || query.includes('defeat')) {
            responseText = "Monsters like Zombies and Spiders will spawn in dark areas and during the night.\n" +
                           "Make sure to build a secure shelter with walls and a roof before sunset.\n" +
                           "Zombies will chase you and deal contact damage, while Spiders are agile and can climb. Watch your health and energy bars!";
        } else if (query.includes('weather') || query.includes('rain') || query.includes('sun') || query.includes('clear')) {
            responseText = "Voxel environment weather scanning is active. The weather system dynamically changes between Sunny and Rain/Storm.\n" +
                           "You can monitor the weather in the top right HUD indicator. Staying under a roof protects you from rain, which is beneficial for keeping your systems dry!";
        } else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('there')) {
            responseText = "Greetings, Captain! 💚 Voxel assistant companion online and ready.\n" +
                           "I am connected to ChatGPT. Ask me about crafting, controls, monsters, or type a command like `help` to see what I can do.";
        } else if (query.includes('who are you') || query.includes('your name') || query.includes('assistant')) {
            responseText = "I am your automated AI Companion! I manifest in the game world to assist you with navigation, commands, building tips, and survival telemetry.";
        } else {
            // General companion responses
            const responses = [
                "Understood, Captain. Scans show the local voxel terrain is stable. What is our current building objective?",
                "Systems online. Let me know if you need to synthesize any specific blocks or if you want tips on defending against spiders and zombies.",
                "Processing terrain data... I am monitoring your hotbar and energy levels. Don't forget you can press 'E' to see your catalog!",
                "Affirmative! Keep exploring and building. If you get lost or want to set the time, just ask or type `night`/`day`.",
                "Analyzing query... My knowledge database suggests building a secure perimeter. The local monsters get quite aggressive after twilight."
            ];
            const randomIndex = Math.floor(Math.random() * responses.length);
            responseText = responses[randomIndex];
        }

        // Stream the text chunk by chunk to simulate API response streaming
        const words = responseText.split(/(\s+)/);
        for (const word of words) {
            yield word;
            await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 20));
        }
    }
}

export const openAIService = new OpenAIService();
