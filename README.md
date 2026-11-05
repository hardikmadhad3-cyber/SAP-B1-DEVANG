# SAP-B1-DEVANG

SAP Business One web client development source, prepared from the current deployment.

## Requirements and setup

Use Node.js 24 and npm. Install dependencies from the repository root:

```powershell
npm ci --prefix backend
npm ci --prefix frontend
Copy-Item backend/.env.example backend/.env
```

Configure backend/.env with your own strong JWT secret, initial administrator password, SAP Service Layer connection and company database credentials. Set PORT=5002 if required. Configure companies and user permissions through the administration panel. Never commit local credentials or runtime databases.

The frontend uses /api by default. frontend/.env.example documents optional frontend settings. Build and start:

```powershell
npm run build --prefix frontend
npm start --prefix backend
```

The backend serves frontend/build. Runtime authentication data is stored locally; configure AUTH_SQLITE_PATH as needed. SAP access and reporting require locally configured company connections and permissions.

## Repository contents

This repository contains application source and dependency lockfiles. Environment files (apart from placeholder examples), authentication databases, uploads, company report templates and overrides, exported reports, diagnostic files, backups, logs, installed dependencies and compiled builds are excluded. Provision any required company-specific report resources privately in your deployment.

Do not add confidential SAP business data, passwords, tokens or private report resources to this public repository.
