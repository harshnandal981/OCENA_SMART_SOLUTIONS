Set-Location (Join-Path $PSScriptRoot "..")
python -m uvicorn app.main:app `
  --app-dir backend `
  --host 127.0.0.1 `
  --port 8000 `
  --reload `
  --log-level debug
