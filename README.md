# AWS Lambda Project: PostgreSQL Integration with Secrets Manager

This project provides a modular serverless architecture using AWS Lambda functions, managed via Terraform and AWS CLI. It includes reusable Lambda layers for database and secrets management, and a collection of categorized Lambda functions.

---

## 📁 Project Structure

```
pgCategory/
├── pgListCategories/
│   ├── index.mjs              # Lambda handler
│   ├── package.json
│   ├── package-lock.json
│   └── update_function.ps1    # Script to update function

pg-secrets-lib/
├── updateLayer.ps1            # Automates layer compression & publishing
└── nodejs/
    ├── db.mjs                 # DB client helper
    ├── secret.mjs             # Secrets Manager logic
    ├── package.json
    └── node_modules/          # Shared dependencies
```

---

## 🔧 Setup Instructions

### 🧱 1. Install Dependencies
Each Lambda function (e.g., `pgListCategories`) contains its own `package.json`:

```bash
cd pgCategory/pgListCategories
npm install
```

For the shared layer:
```bash
cd pg-secrets-lib/nodejs
npm install
```

---

### 🚀 2. Publish Shared Layer
Run the provided PowerShell script to compress and publish the shared `pg-secrets-lib` layer:

```powershell
.\pg-secrets-lib\updateLayer.ps1
```

This:
- Zips the `nodejs/` directory
- Publishes a new Lambda layer version
- Updates all Lambda functions in `pgCategory/` with the new layer

---

### 🔄 3. Update Individual Lambda Functions
Each Lambda folder includes a script (e.g., `update_function.ps1`) to deploy or update that specific function.

---

## 📚 Notes

- Layer code is shared across functions to reduce duplication and improve maintainability.
- Secrets are managed either via runtime access to AWS Secrets Manager
- All code is written in **ES Modules (Node.js `.mjs`)** format.

---

## ✅ Future Enhancements

- Add GitHub Actions for automated CI/CD
- Extend `pgCategory/` with additional lambdas
