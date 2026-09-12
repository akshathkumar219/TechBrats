.PHONY: dev install test

install:
	python3 -m pip install -r requirements.txt
	cd web && npm install

dev:
	@echo "Starting SyndicateBrain (FastAPI on :8000, Vite on :5173)..."
	@trap 'kill 0' EXIT INT TERM; \
	python3 -m uvicorn brain.main:app --reload --host 127.0.0.1 --port 8000 & \
	(cd web && npm run dev -- --host 127.0.0.1 --port 5173) & \
	wait

test:
	python3 -m pytest tests/ -v
