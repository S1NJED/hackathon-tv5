# MovieGenius — Next.js + FastAPI - Hackathon agentics.org

You can test it at https://sinjed.net

A small project: a Next.js frontend (MovieGenius) that queries a local FastAPI agent.

Features:

- Ask anything to get get a movie
- A `Wheel mode` to select a movie based on a selection of movies

- Frontend (Next.js): `./apps/movie-genius`
- Backend (FastAPI agent): `./src/agents/agent.py`

How to Use it:

- Ask anything to find a movie (A good movie with Marlon Brando)
- In `Wheel Mode` you can add movies to the wheel by clicking "Add to wheel" then you can spin the wheel 

What I did
- Implemented the MovieGenius website in `./apps/movie-genius`.
- Implemented the agent backend in `./src/agents/agent.py`.
- The frontend queries the FastAPI server on `localhost` and the site is served at `sinjed.net`.

Minimal workflow
1. Start the FastAPI backend (e.g., `uvicorn src.agents.agent:app --reload --port 8000`).
2. Start the Next.js frontend (`cd apps/movie-genius && npm run dev`).


Notes
- Keep API keys and secrets out of the repository.
- The frontend makes requests to the backend on localhost during development.

That's all — simple local setup and a FastAPI-backed Next.js site.
