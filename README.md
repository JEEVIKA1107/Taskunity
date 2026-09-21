# TASK UNITY — Cooperative-Owned Gig Services Platform

A production-ready, mobile-first cooperative platform connecting verified local skilled workers, customers, and cooperative administrators with institutional-grade protections, automated matching, and social security benefits.

---

## Single-Click Run (Windows)

Simply double-click on `run.bat`.

This automated script will:
1. Check that Node.js is installed.
2. Install any missing backend and frontend dependencies.
3. Build the client application if not already built.
4. Launch the server on `http://localhost:5000`.
5. Automatically open the platform in your default web browser.

---

## Manual Installation & Run

```bash
npm install
npm --prefix client install
npm --prefix client run build
npm run server
```
Visit **http://localhost:5000** in your browser.

---

## Demonstration Accounts

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| 🛡️ Cooperative Admin | admin@taskunity.org | AdminPass123! | Review worker applications, verify insurance, view ledger & audit logs |
| ⚡ Active Worker (Ramesh - Electrician) | ramesh.electrician@taskunity.org | WorkerPass123! | Fully verified worker, availability toggle, job tracking, earnings |
| 🔧 Onboarding Worker (Suresh - Plumber) | suresh.plumber@taskunity.org | WorkerPass123! | In-progress worker (demonstrates 10-step onboarding resume state) |
| 👤 Customer (Priya) | priya.customer@taskunity.org | CustomerPass123! | Service discovery, booking matching, live tracking, digital invoice |

---

## Automated Acceptance Tests

To verify all 22 acceptance criteria:
```bash
node tests/acceptance_suite.js
```

---

## Push to GitHub

```bash
git init
git add .
git commit -m "feat: Task Unity cooperative gig platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```