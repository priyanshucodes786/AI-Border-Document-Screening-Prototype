# AI Border Document Screening System

An AI-assisted document screening prototype designed to support officers in checking identity documents at land-border checkpoints. It combines OCR, rule-based validation, tampering indicators, and an independent face-verification module to support faster, evidence-based screening.

## Key Features

- **OCR Extraction:** Extracts text and identity fields from Indian passports, Aadhaar cards, and voter ID cards.
- **Document Validation:** Checks required fields, document formats, expiry dates, and available consistency rules.
- **Tampering Analysis:** Evaluates document images for potential manipulation indicators.
- **Face Verification:** Provides an independent identity-check result when a reference image is supplied.
- **Screening Decision:** Combines available evidence into an officer-facing outcome for further review.

## Workflow

1. **Upload:** The officer uploads a document image and, optionally, a reference image.
2. **OCR:** Text and relevant identity fields are extracted.
3. **Validation:** Extracted fields are checked against document-specific rules.
4. **Tampering Analysis:** The image is examined for suspicious manipulation indicators.
5. **Face Verification:** The document photo is compared with the reference image when provided.
6. **Decision:** The system presents the findings and a rule-based screening outcome for officer review.

## Backend Logic

The backend uses a modular pipeline:

- **OCR module:** Extracts fields using PaddleOCR.
- **Validation module:** Applies document-specific and consistency checks.
- **Tampering module:** Assesses potential image-manipulation indicators.
- **Face module:** Performs an independent identity check.
- **Decision logic:** Uses document evidence and screening rules to determine the outcome. Face verification remains separate from document-risk evaluation.

The backend exposes a FastAPI endpoint at `POST /api/screening/analyze` for document analysis.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI, Uvicorn |
| OCR | PaddleOCR, PaddlePaddle |
| Image Processing | OpenCV |
| Face Analysis | InsightFace / ONNX Runtime (where configured) |
| Deployment | Vercel (frontend): https://border-screening-seven.vercel.app/; backend deployment depends on available compute |

## Project Status

**Prototype / Proof of Concept.** The system is intended to demonstrate an AI-assisted screening workflow. Detection results are indicators for human review, not proof of fraud or identity. Accuracy, robustness, and operational suitability require further testing before real-world deployment.

## Setup and Installation

### 1. Clone the Repository

```bash
git clone https://github.com/priyanshucodes786/AI-Border-Document-Screening-Prototype.git
cd AI-Border-Document-Screening-Prototype
```

### 2. Create and Activate a Virtual Environment

```bash
python -m venv .venv
```

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
source .venv/bin/activate
```

### 3. Install Backend Dependencies

Navigate to the backend directory and install the packages listed in `requirements.txt`:

```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the Backend

From the `backend` directory:

```bash
python -m uvicorn app:app --reload
```

Open `http://127.0.0.1:8000/docs` to explore the FastAPI endpoints.

### 5. Run the Frontend

In a separate terminal, navigate to the frontend directory, install its dependencies, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

**Note:** Some AI dependencies require compatible Python versions and system resources. Check the project configuration before installation. Configure the frontend API URL to point to the running backend.

## Future Scope

- Expand support to Nepali and Bhutanese identity documents.
- Add additional visa and road-crossing document checks.
- Improve tampering detection using evaluated datasets.
- Benchmark accuracy, false positives, and processing time.

## License

Released under the MIT License. See [`LICENSE`](LICENSE) for details.
