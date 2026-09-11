# Mine Build Defeat

A Minecraft-inspired survival and building game built with **Three.js**.

## Features
- **Mining & Building**: Voxel-based world interaction.
- **Boss Fight**: Encounter the deadly **ios-2** robot.
- **AI Helper**: A robotic companion to guide you.
- **Crafting System**: Gather resources to build structures.

## How to Play
- **ARROW KEYS**: Move
- **SPACE**: Jump
- **LEFT CLICK**: Mine blocks
- **RIGHT CLICK**: Place blocks
- **Q**: Drop the selected item; matching nearby drops merge into a stack
- **W**: Open the items menu
- **T**: Open the Agent console
- **1-5**: Switch inventory slots
- **ESC**: Unlock cursor

## Setup & Installation

This project uses **Vite** for local development and to securely manage environment variables.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables (optional for default ChatGPT integration):
   - Copy `.env.example` to `.env`.
   - Add your OpenAI API Key: `VITE_OPENAI_API_KEY=sk-yourkey`
3. Run the development server:
   ```bash
   npm run dev
   ```

## ChatGPT Agent Integration
The in-game floating robot companion is powered by ChatGPT.
- Open the Agent Console by pressing `/` or `T`.
- Click the **⚙️ Settings** icon to enter your OpenAI API key and choose your preferred model (e.g., `gpt-4o`).
- You can now talk naturally with the AI while continuing to use built-in commands like `give Diamond 10`.

## Deployment
For production deployment, build the project with:
```bash
npm run build
```
Then serve the `dist/` directory. **Note**: If you want the ChatGPT integration to work for public users without them entering their own API keys, you will need to proxy the API requests through a secure backend so your `.env` key is not exposed to the client browser.

### Guest TV with in-game YouTube

Press **T** and enter `build tv` to place a TV on nearby ground, facing you.

- `tv youtube <video URL or ID>` opens the embedded YouTube player inside the game.
- `tv youtube` opens the player with a video input and remembers the last video.
- `tv on`, `tv off`, `tv home`, `tv status`, and `tv stop` control the nearest TV within eight blocks.
- Use the embedded YouTube controls to play, pause, change volume, or enter fullscreen. **Stop & back to game** removes the player and stops its audio.

Guest playback needs no API key or game sign-in. Paste a video link or ID; full YouTube search is not included. YouTube videos must allow embedding. Playback stays in the game tab; no service shortcuts are used. The 3D TV opens a large in-game viewing panel when used.

TV is in the Blocks & Furniture catalog; `give tv 1` adds one to inventory. Right-click a placed TV to watch; left-click to collect it. Local world saves include placed TVs, power, and the last video ID.
