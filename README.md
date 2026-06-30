#  RepoScope

> **Understand a Repository Before You Contribute.**
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-green)

🌐 **Live Demo:** 

RepoScope is an AI-powered GitHub repository analysis platform that helps developers evaluate open-source projects before contributing. Instead of manually inspecting repositories across multiple GitHub pages, RepoScope combines repository health metrics, AI-generated insights, contribution difficulty estimation, commit analytics, language statistics, and community information into a single interactive dashboard.
---

##  Features

*  Explore trending and popular GitHub repositories
*  AI-generated repository summaries
*  Repository Health Score with detailed breakdown
*  Contribution Difficulty estimation
*  Commit Activity visualization
*  Language Distribution charts
*  Community & contributor insights
*  Bookmark repositories for later
*  GitHub OAuth authentication
*  Personalized developer profile and preferences
*  Modern responsive dark-themed interface

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* tRPC
* Recharts

### Backend

* Node.js
* Hono
* Drizzle ORM

### Database

* MySQL

### Authentication

* GitHub OAuth

### AI

* Repository Intelligence Engine
* GitHub API Analysis

### Development Tools

* Docker
* ESLint

---

## Architecture

```text
React + TypeScript
        │
     tRPC API
        │
     Node.js + Hono
        │
   GitHub REST API
        │
    Drizzle ORM
        │
      MySQL
```

##  Getting Started

### Clone

```bash
git clone https://github.com/YOUR_USERNAME/RepoScope.git
cd RepoScope
```

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=
DATABASE_URL=
```

### Run

```bash
npm run dev
```

---

## 📂 Project Structure

```text
src/
 ├── components/
 ├── hooks/
 ├── pages/
 ├── providers/
 ├── router/
 ├── styles/
 └── utils/
```

---

##  Motivation

Finding a good open-source project to contribute to can be overwhelming. Developers often spend time navigating GitHub repositories, commit histories, documentation, and contributor activity before understanding whether a repository matches their experience level.

RepoScope streamlines this process by presenting repository insights, AI-generated summaries, health metrics, and contribution indicators in one place, helping developers make faster, more informed decisions.

---

##  License

This project is licensed under the MIT License.

---

##  Author

**Sweeny Dsouza**

Built as a full-stack portfolio project to simplify open-source repository discovery and analysis through AI-powered insights.
