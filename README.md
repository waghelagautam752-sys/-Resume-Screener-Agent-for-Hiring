# 🏆 TalentRank: Enterprise Batch Resume Screening Platform

An intelligent, high-performance, multi-agent AI resume screening and batch ranking platform. TalentRank orchestrates collaborative AI agents using a concurrent FastAPI backend and a premium, slate-themed recruiter dashboard.

---

## 🎯 Overview

TalentRank elevates automated resume assessment beyond simple keyword matching or single-prompt models. Utilizing **LangGraph-orchestrated collaborative agents**, the platform parses, extracts, matches, and evaluates resumes (PDF, DOCX, or TXT) against job descriptions. It then visualizes candidate alignment in real-time, complete with detailed career timeline visualizers, skill matrices, and custom-made interview question guides.

### 🌟 Key Implemented Features

* **⚡ Enterprise Batch Ingestion**: Screen 500+ resumes in parallel with client-side batch management.
* **🛡️ Zero-Failure Hybrid Engine**: A high-fidelity local semantic matching fallback guarantees the demo never crashes or gets rate-limited (429) during presentations.
* **📊 Premium Recruiters Dashboard**: Designed with a minimal, slate-themed visual language (Vercel/Linear style) optimized for fast decision-making.
* **🔍 Slide-Out Details Drawer**: Allows recruiters to perform Candidate Deep Dives including:
  * **Skills Alignment Checklist** (Required vs Preferred)
  * **Estimated Work Experience Timeline**
  * **Adaptive Interview Guide** generated dynamically based on resume gaps
* **📥 Instant Spreadsheet Export**: Finalized shortlist rankings can be instantly exported to standard CSV spreadsheets.

---

## 🏗️ Multi-Agent Architecture

```
                    ┌─────────────────┐
                    │  Resume (PDF/   │
                    │  DOCX/TXT)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Document Parser │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐     │     ┌────────▼────────┐
     │  Resume Parser  │     │     │  Job Analyzer   │
     │     Agent       │     │     │     Agent       │
     └────────┬────────┘     │     └────────┬────────┘
              │              │              │
     ┌────────▼────────┐     │              │
     │ Skill Extractor │     │              │
     │     Agent       │     │              │
     └────────┬────────┘     │              │
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐           ┌────────▼────────┐
     │ Skills Matcher  │           │   Experience    │
     │     Agent       │           │   Evaluator     │
     └────────┬────────┘           └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │    Decision     │
                    │   Synthesizer   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Ranked Canvas  │
                    │   & Dashboard   │
                    └─────────────────┘
```

### Agents and Their Responsibilities

| Agent | Responsibility |
| :--- | :--- |
| **Document Parser** | Multi-format engine extracting text from PDF/DOCX/TXT files. |
| **Resume Parser Agent** | Structures unstructured resume text into education, work experience, and personal details. |
| **Skill Extractor Agent** | Identifies and categorizes technical competencies and framework methodologies. |
| **Job Analyzer Agent** | Dissects job requirements, splitting criteria into mandatory vs. preferred elements. |
| **Skills Matcher Agent** | Performs semantic mapping between extracted resume skills and target requirements. |
| **Experience Evaluator Agent** | Assesses career timeline, role relevance, and identifies professional gaps. |
| **Decision Synthesizer Agent** | Combines multi-agent findings into a final match score and structured recommendation. |

---

## 📋 Prerequisites

* **Python 3.10+**
* An LLM API key (choose one or configure both):
  * **Gemini** (free): [Google AI Studio](https://makersuite.google.com/app/apikey)
  * **Groq** (free): [console.groq.com](https://console.groq.com)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# API Keys Configuration
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here

# Provider Configuration ("gemini" or "groq")
LLM_PROVIDER=groq
GEMINI_MODEL=gemini-2.0-flash
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Launch the Server
```bash
python3 -m uvicorn app:app --port 8000 --host 127.0.0.1
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser to access the recruiters dashboard.

---

## 🔒 Human-in-the-Loop Safeguards
TalentRank automatically flags candidate reviews for manual assessment when:
* **Ambiguity Range**: Final score lands in the ambiguous range (40% - 69%).
* **Low Confidence**: Low confidence flags are triggered by agents.
* **Experience Gaps**: Significant experience discrepancies compared to job requirements.
* **Parsing Warnings**: Notable missing sections in the input files.

---

## 📁 Repository Structure
```
AI-Resume-Screening/
├── app.py                      # FastAPI Backend Server (Concurrency & Local Fallbacks)
├── run.py                      # Command Line Interface (CLI Mode)
├── requirements.txt            # Python Dependencies
├── .env                        # Local Environment Config (API keys)
├── src/
│   ├── config.py              # Configuration manager
│   ├── document_parser.py     # PDF/DOCX multi-format extractor
│   ├── models.py              # Pydantic data schemas
│   ├── workflow.py            # LangGraph pipeline graph orchestrator
│   └── agents/
│       ├── base.py            # Base agent abstract class
│       ├── resume_parser.py   # Resume structuring
│       ├── skill_extractor.py # Skills extractor
│       ├── job_analyzer.py    # JD requirements parser
│       ├── skills_matcher.py  # Core semantic skills match
│       ├── experience_eval.py # Professional timeline evaluator
│       └── decision_synth.py  # Decisions synthesizer
├── static/                     # Premium Slate Recruiter Dashboard
│   ├── index.html             # Structure layout
│   ├── style.css              # Custom flat aesthetic tokens
│   └── app.js                 # Frontend MVC controller
├── sample_data/
│   ├── resumes/               # Preloaded hackathon resume cohort (.pdf, .txt)
│   └── job_descriptions/      # Real-world target job requirements
└── sample_outputs/            # Expected output structures
```

---

## 🛡️ Zero-Failure Design (Hackathon Ready)
During a live hackathon demonstration, standard LLM API endpoints are prone to connection blocks or strict token rate-limits (HTTP 429). 
TalentRank employs a **hybrid architecture** that monitors LLM responses. If an API key is rate-limited or fails:
1. The backend automatically redirects processing to the local semantic engine.
2. The UI continues to process candidate batches in milliseconds.
3. Candidate cards display exact parsed metrics, checklists, and timelines with 100% precision.

---

## 📄 License
MIT License - feel free to build upon and present this project!
# -Resume-Screener-Agent-for-Hiring
