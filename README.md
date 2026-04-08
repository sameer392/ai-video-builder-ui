# AI Marketing Media Generator (ComfyUI + React + Express)

Full-stack web app to generate AI marketing images/videos through the ComfyUI API.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Axios
- Backend: Node.js + Express + Axios

## Project Structure

```
.
├─ frontend/
│  ├─ src/
│  ├─ .env.example
│  └─ tailwind.config.js
└─ backend/
   ├─ src/
   │  ├─ config/
   │  ├─ middleware/
   │  ├─ routes/
   │  └─ services/
   ├─ workflow.json
   └─ .env.example
```

## Features

- Modern SaaS-style responsive dashboard
- Person selector with style/LoRA-based prompt injection
- Prompt textarea + Generate workflow
- Loading spinner + generated media preview
- Graceful error handling
- Generation history list
- Download output button
- API key middleware for backend routes

## Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```
PORT=4000
SERVER_COMFY_URL=https://YOUR_COMFY_DOMAIN
SERVER_API_KEY=replace-with-a-secure-api-key
```

`SERVER_COMFY_URL` is required and **must not be hardcoded**.

## Frontend Environment Variables

Create `frontend/.env` from `frontend/.env.example`:

```
VITE_API_URL=http://localhost:4000
VITE_API_KEY=replace-with-the-same-value-as-server-api-key
```

## Person Configuration

Defined in `backend/src/config/personConfig.js`:

```json
{
  "sameer": {
    "lora": "sameer.safetensors",
    "style": "confident CEO, professional, formal"
  },
  "vikas": {
    "lora": "vikas.safetensors",
    "style": "energetic marketing expert, friendly"
  }
}
```

You can add/remove people and styles as needed.

## Workflow Template

`backend/workflow.json` is used as a template and dynamically updated before calling ComfyUI:

- `workflow["lora_node"].inputs.lora_name`
- `workflow["prompt_node"].inputs.text`

### Example `workflow.json`

```json
{
  "lora_node": {
    "class_type": "LoraLoader",
    "inputs": {
      "lora_name": "sameer.safetensors",
      "strength_model": 1,
      "strength_clip": 1
    }
  },
  "prompt_node": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "Default prompt text"
    }
  },
  "sampler_node": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 123456,
      "steps": 20,
      "cfg": 8
    }
  }
}
```

## API Endpoints

- `POST /generate`
  - Body:
    ```json
    {
      "person": "sameer",
      "script": "Welcome to Cube Web Tech..."
    }
    ```
  - Behavior:
    - Loads `workflow.json`
    - Injects LoRA and full prompt (`script + style`)
    - Calls `POST ${SERVER_COMFY_URL}/prompt`
    - Polls ComfyUI history endpoint
    - Returns generated media URL

- `GET /persons`
- `GET /history`
- `GET /health`

## Run Locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open Vite URL (usually `http://localhost:5173`).

## Notes for Production

- Replace in-memory history with DB persistence.
- Add robust retry/backoff and job status tracking.
- Configure HTTPS + secure secret management.