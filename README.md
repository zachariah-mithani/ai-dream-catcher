AI Dream Catcher

Cross-platform dream journaling app (iOS/Android) with AI analysis and chat.

Backend setup
- cd backend
- Create .env:
  - PORT=4000
  - APP_ORIGIN=http://localhost:8081,http://localhost:19006
  - APP_PUBLIC_URL=http://localhost:4000
  - JWT_SECRET=please-change-me
  - DATA_DIR=./data
  - OPENROUTER_API_KEY=your_key
  - OPENROUTER_MODEL=deepseek/deepseek-chat-v3:free
- Use Node 20
- npm install
- npm run init:db
- npm run start

Frontend setup (Expo)
- cd frontend
- npm install
- Ensure app.json extra.API_URL points to backend (use LAN IP for devices)
- npm start
- npm run ios or npm run android

Endpoints
- POST /auth/register { email, password }
- POST /auth/login { email, password }
- GET /dreams
- POST /dreams { title?, content, voice_uri? }
- PUT /dreams/:id
- DELETE /dreams/:id
- POST /analysis { dreamId?, content }
- GET /analysis/patterns
- POST /chat { history?, message }

Notes
- OpenRouter free models may rate-limit; retry later.
- Change JWT_SECRET for production.

