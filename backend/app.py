from __future__ import annotations

import asyncio
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.face.face_verifier import FaceVerifier
from backend.ocr.ocr_engine import OCREngine
from backend.tampering.tamper_detector import TamperDetector
from backend.validation.validator import DocumentValidator


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="AI Border Document Screening System",
    version="1.0.0",
    description="AI-assisted border document screening system.",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# MODULES
# =========================================================

ocr_engine = OCREngine()
validator = DocumentValidator()
tamper_detector = TamperDetector()
face_verifier = FaceVerifier()


# =========================================================
# HEALTH
# =========================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "AI Border Document Screening System",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "modules": {
            "ocr": True,
            "validation": True,
            "tampering": True,
            "face": True,
        },
    }


# =========================================================
# SCREENING
# =========================================================

@app.post("/api/screening/analyze")
async def analyze_document(
    document: UploadFile = File(...),
    document_type: str = Form(...),
    reference_image: UploadFile | None = File(None),
    back_document: UploadFile | None = File(None),
):
    allowed_types = {
        "Aadhar Card",
        "Passport",
    }

    if document_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported document type. "
                "Use Aadhar Card or Passport."
            ),
        )

    if not document.filename:
        raise HTTPException(
            status_code=400,
            detail="Document filename is missing.",
        )

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="border_screening_"
        )
    )

    document_path = (
        temp_dir / document.filename
    )

    reference_path: Path | None = None
    back_document_path: Path | None = None

    try:

        # -----------------------------------------------------
        # Save document
        # -----------------------------------------------------

        with document_path.open(
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                document.file,
                buffer,
            )

        # -----------------------------------------------------
        # Save optional reference image
        # -----------------------------------------------------

        if reference_image is not None:

            if not reference_image.filename:
                raise HTTPException(
                    status_code=400,
                    detail="Reference image filename is missing.",
                )

            reference_path = (
                temp_dir
                / f"reference_{reference_image.filename}"
            )

            with reference_path.open(
                "wb"
            ) as buffer:

                shutil.copyfileobj(
                    reference_image.file,
                    buffer,
                )

        if back_document is not None and document_type == "Aadhar Card":
            if not back_document.filename:
                raise HTTPException(
                    status_code=400,
                    detail="Back document filename is missing.",
                )

            back_document_path = (
                temp_dir
                / f"back_{back_document.filename}"
            )

            with back_document_path.open(
                "wb"
            ) as buffer:

                shutil.copyfileobj(
                    back_document.file,
                    buffer,
                )

        async def _with_timeout(
            operation,
            *args,
            timeout: float = 20.0,
            **kwargs,
        ):
            return await asyncio.wait_for(
                asyncio.to_thread(operation, *args, **kwargs),
                timeout=timeout,
            )

        # -----------------------------------------------------
        # 1. OCR
        # -----------------------------------------------------

        try:
            ocr_result = await _with_timeout(
                ocr_engine.extract,
                str(document_path),
                document_type,
                timeout=20.0,
            )
        except asyncio.TimeoutError:
            ocr_result = ocr_engine._empty_result(
                document_type,
                "OCR processing timed out while initializing the recognition model.",
            )

        if document_type == "Aadhar Card" and back_document_path is not None:
            try:
                back_ocr = await _with_timeout(
                    ocr_engine.extract,
                    str(back_document_path),
                    document_type,
                    timeout=20.0,
                )
                ocr_result = _merge_ocr_outputs(ocr_result, back_ocr)
            except asyncio.TimeoutError:
                pass

        # -----------------------------------------------------
        # 2. Validation
        # -----------------------------------------------------

        try:
            validation_result = await _with_timeout(
                validator.validate,
                timeout=10.0,
                fields=ocr_result,
                document_type=document_type,
                raw_text=ocr_result.get(
                    "rawText",
                    "",
                ),
            )
        except asyncio.TimeoutError:
            validation_result = {
                "riskScore": 100.0,
                "status": "Unable to validate document",
                "issues": ["Validation timed out."],
            }

        # -----------------------------------------------------
        # 3. Tampering
        # -----------------------------------------------------

        try:
            tampering_result = await _with_timeout(
                tamper_detector.analyze,
                str(document_path),
                timeout=15.0,
            )
        except asyncio.TimeoutError:
            tampering_result = {
                "score": 100.0,
                "status": "TAMPER_CHECK_TIMEOUT",
                "message": "Tampering analysis timed out.",
            }

        # -----------------------------------------------------
        # 4. Face
        # -----------------------------------------------------

        try:
            face_result = await _with_timeout(
                face_verifier.verify,
                timeout=15.0,
                document_image_path=str(
                    document_path
                ),
                reference_image_path=(
                    str(reference_path)
                    if reference_path
                    else None
                ),
            )
        except asyncio.TimeoutError:
            face_result = {
                "matchScore": 0.0,
                "livenessAvailable": False,
                "status": "Face verification timed out",
                "model_available": False,
            }

        # -----------------------------------------------------
        # DOCUMENT RISK
        # -----------------------------------------------------
        #
        # IMPORTANT:
        #
        # Face is intentionally NOT included here.
        #
        # D = 0.20O + 0.25V + 0.55T
        #
        # This is the document-integrity risk.
        # Tampering is weighted more strongly to counter AI-generated
        # or synthetic passport forgeries, which often look visually
        # coherent while still exhibiting template-style artifacts.
        # -----------------------------------------------------

        tampering_score = float(
            tampering_result.get("score", 0.0)
        )

        if (
            tampering_result.get("status") == "High indication"
            or (tampering_result.get("components", {}).get("syntheticDocumentPattern", 0.0) >= 0.50)
        ):
            tampering_score = max(
                tampering_score,
                80.0,
            )

        document_risk = (
            0.20 * float(
                ocr_result["riskScore"]
            )
            + 0.25 * float(
                validation_result["riskScore"]
            )
            + 0.55 * float(
                tampering_score
            )
        )

        document_risk = round(
            min(
                100.0,
                max(
                    0.0,
                    document_risk,
                ),
            ),
            2,
        )

        # -----------------------------------------------------
        # FACE / IDENTITY DECISION
        # -----------------------------------------------------

        identity_status = _identity_decision(
            face_result
        )

        # -----------------------------------------------------
        # FINAL SCREENING DECISION
        # -----------------------------------------------------

        screening_outcome = _screening_decision(
            document_risk=document_risk,
            identity_status=identity_status,
            face_result=face_result,
        )

        screening_status = (
            screening_outcome.get("status")
            if isinstance(screening_outcome, dict)
            else str(screening_outcome)
        )

        # -----------------------------------------------------
        # Risk level
        # -----------------------------------------------------

        risk_level = _risk_level(
            document_risk
        )

        # -----------------------------------------------------
        # RESPONSE
        # -----------------------------------------------------

        return {
            "documentType": document_type,
            "fileName": document.filename,

            "ocr": ocr_result,

            "validation": validation_result,

            "tampering": tampering_result,

            "face": {
                **face_result,
                "identityStatus": identity_status,
            },

            "documentRiskScore": document_risk,
            "riskScore": document_risk,
            "riskLevel": risk_level,

            "screeningOutcome": screening_status,

            "decisionBasis": {
                "documentRiskFormula": (
                    "D = 0.20O + 0.25V + 0.55T"
                ),
                "faceExcludedFromDocumentRisk": True,
                "faceActsAsIndependentIdentityCheck": True,
                "screeningDecision": screening_outcome,
            },
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Document screening failed: "
                f"{str(exc)}"
            ),
        ) from exc

    finally:

        # Temporary files are removed after processing.
        shutil.rmtree(
            temp_dir,
            ignore_errors=True,
        )


# =========================================================
# DECISION FUNCTIONS
# =========================================================

def _risk_level(
    risk_score: float,
) -> str:

    if risk_score < 40:
        return "Low Risk"

    if risk_score <= 70:
        return "Medium Risk"

    return "High Risk"


def _identity_decision(
    face_result: dict,
) -> str:

    match_score = float(
        face_result.get(
            "matchScore",
            0,
        )
    )

    if not face_result.get(
        "livenessAvailable",
        False,
    ):
        # Static uploaded reference image.
        # Therefore this is identity consistency,
        # not live-person authentication.
        pass

    if match_score >= 85:
        return "Identity Consistent"

    if match_score >= 70:
        return "Identity Review Required"

    return "Identity Mismatch"


def _merge_ocr_outputs(primary: dict, secondary: dict) -> dict:
    merged = dict(primary)
    merged["rawText"] = "\n".join(
        part for part in [primary.get("rawText", ""), secondary.get("rawText", "")] if part
    )

    merged["lines"] = list(primary.get("lines", [])) + list(secondary.get("lines", []))
    merged["confidence"] = max(float(primary.get("confidence", 0.0) or 0.0), float(secondary.get("confidence", 0.0) or 0.0))

    for key in [
        "name",
        "documentNumber",
        "nationality",
        "dateOfBirth",
        "expiryDate",
        "gender",
        "visaNumber",
        "visaType",
        "passportNumber",
    ]:
        if not merged.get(key) and secondary.get(key):
            merged[key] = secondary[key]

    for key in [
        "missingFieldRatio",
        "confidenceAnomaly",
        "internalInconsistency",
        "layoutAnomaly",
    ]:
        if key in primary.get("components", {}) or key in secondary.get("components", {}):
            merged.setdefault("components", {})
            merged["components"][key] = max(
                float(primary.get("components", {}).get(key, 0.0) or 0.0),
                float(secondary.get("components", {}).get(key, 0.0) or 0.0),
            )

    merged["riskScore"] = max(float(primary.get("riskScore", 0.0) or 0.0), float(secondary.get("riskScore", 0.0) or 0.0))
    return merged


def _screening_decision(
    document_risk: float,
    identity_status: str,
    face_result: dict,
) -> dict:

    # ---------------------------------------------------------
    # HIGHEST PRIORITY:
    # identity mismatch
    # ---------------------------------------------------------

    if identity_status == "Identity Mismatch":

        return {
            "status": "OFFICER REVIEW REQUIRED",
            "severity": "critical",
            "reason": (
                "Reference face does not sufficiently "
                "match the face detected on the document."
            ),
            "documentRisk": document_risk,
            "identityRisk": "Mismatch",
        }

    # ---------------------------------------------------------
    # FACE UNCERTAIN
    # ---------------------------------------------------------

    if identity_status == "Identity Review Required":

        return {
            "status": "OFFICER REVIEW REQUIRED",
            "severity": "warning",
            "reason": (
                "Face similarity is inconclusive. "
                "Officer verification is required."
            ),
            "documentRisk": document_risk,
            "identityRisk": "Review",
        }

    # ---------------------------------------------------------
    # DOCUMENT RISK
    # ---------------------------------------------------------

    if document_risk > 70:

        return {
            "status": "OFFICER REVIEW REQUIRED",
            "severity": "high",
            "reason": (
                "Document integrity risk exceeds "
                "the high-risk threshold."
            ),
            "documentRisk": document_risk,
            "identityRisk": "Consistent",
        }

    if document_risk >= 40:

        return {
            "status": "OFFICER REVIEW REQUIRED",
            "severity": "warning",
            "reason": (
                "Document contains moderate risk "
                "indicators requiring officer assessment."
            ),
            "documentRisk": document_risk,
            "identityRisk": "Consistent",
        }

    # ---------------------------------------------------------
    # ALL CLEAR
    # ---------------------------------------------------------

    return {
        "status": "LOW RISK / IDENTITY CONSISTENT",
        "severity": "low",
        "reason": (
            "Document risk is low and the reference "
            "face is sufficiently consistent."
        ),
        "documentRisk": document_risk,
        "identityRisk": "Consistent",
    }