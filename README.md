# Family Financial

A family finance tracker (Chinese UI) with multi-device sync: FastAPI + SQLite backend, plain HTML/CSS/JS frontend, one shared family password.

## Project layout

```
backend/    FastAPI app + SQLite database
frontend/   Static HTML/CSS/JS, served by the backend
```

## First-time setup

From the `backend/` directory:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
python -m app.scripts.hash_password   # follow the prompt, paste the printed hash into .env as FAMILY_PASSWORD_HASH
python -c "import secrets; print(secrets.token_hex(32))"   # paste the output into .env as SESSION_SECRET
```

## Run

From `backend/` (with the venv activated):

```bash
uvicorn app.main:app --reload --port 8765
```

Then open [http://localhost:8765](http://localhost:8765) and log in with the family password. Any device on the same network that can reach this address will see the same data.

## Data

All financial records live in `backend/data/family_finance.db` (SQLite). Back it up by copying that file.

## Notes

- The frontend and backend are served from the same process/port, so there's no separate frontend build step or CORS configuration to manage.
- For real multi-device use over the internet (not just your home LAN), put this behind a reverse proxy (e.g. Caddy or nginx) with HTTPS — the login password and session cookie should never travel over plain HTTP.
