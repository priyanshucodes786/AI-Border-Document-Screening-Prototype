from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


class FaceVerifier:
    """
    Face verification is intentionally NOT included in
    the document-risk weighted formula.

    Face risk:

        F = 100 * [
            0.75 * (1 - S_face)
            + 0.25 * (1 - L)
        ]

    S_face = similarity [0,1]
    L      = liveness [0,1]

    The resulting face assessment is used independently
    to determine identity consistency.
    """

    def __init__(self) -> None:

        cascade_path = (
            Path(
                cv2.data.haarcascades
            )
            / "haarcascade_frontalface_default.xml"
        )

        self.detector = cv2.CascadeClassifier(
            str(cascade_path)
        )

        self.sface = None

        # Optional OpenCV SFace model.
        # The baseline continues to work without it.
        model_path = Path(
            "models/face_model/face_recognition_sface_2021dec.onnx"
        )

        if model_path.exists():

            try:
                self.sface = cv2.FaceRecognizerSF.create(
                    str(model_path),
                    "",
                )
            except Exception:
                self.sface = None

    # ---------------------------------------------------------
    # Public API
    # ---------------------------------------------------------

    def verify(
        self,
        document_image_path: str,
        reference_image_path: str | None = None,
    ) -> dict:

        if not reference_image_path:

            return self._result(
                similarity=0.50,
                liveness=0.50,
                status="Reference image required",
                model_available=False,
            )

        document = cv2.imread(
            document_image_path
        )

        reference = cv2.imread(
            reference_image_path
        )

        if document is None:
            return self._failure(
                "Unable to process document face image."
            )

        if reference is None:
            return self._failure(
                "Unable to process reference face image."
            )

        document_face = self._extract_face(
            document
        )

        reference_face = self._extract_face(
            reference
        )

        if document_face is None:
            return self._failure(
                "No face detected in document."
            )

        if reference_face is None:
            return self._failure(
                "No face detected in reference image."
            )

        similarity = self._face_similarity(
            document_face,
            reference_face,
        )

        # A static uploaded reference image cannot establish
        # genuine liveness. Keep this explicitly unavailable.
        liveness = 0.50

        return self._result(
            similarity=similarity,
            liveness=liveness,
            status=self._identity_status(
                similarity
            ),
            model_available=self.sface is not None,
        )

    # ---------------------------------------------------------
    # Face extraction
    # ---------------------------------------------------------

    def _extract_face(
        self,
        image: np.ndarray,
    ) -> np.ndarray | None:

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        faces = self.detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )

        if len(faces) == 0:
            return None

        x, y, w, h = max(
            faces,
            key=lambda box: box[2] * box[3],
        )

        face = image[
            y:y + h,
            x:x + w,
        ]

        if face.size == 0:
            return None

        return cv2.resize(
            face,
            (224, 224),
            interpolation=cv2.INTER_AREA,
        )

    # ---------------------------------------------------------
    # Similarity
    # ---------------------------------------------------------

    def _face_similarity(
        self,
        face_a: np.ndarray,
        face_b: np.ndarray,
    ) -> float:

        if self.sface is not None:

            try:
                # SFace requires aligned face crops.
                # Baseline crops are already normalized.
                feature_a = self.sface.feature(
                    face_a
                )

                feature_b = self.sface.feature(
                    face_b
                )

                score = self.sface.match(
                    feature_a,
                    feature_b,
                    cv2.FaceRecognizerSF_FR_COSINE,
                )

                score = float(score)

                return max(
                    0.0,
                    min(
                        1.0,
                        score,
                    ),
                )

            except Exception:
                pass

        return self._visual_similarity(
            face_a,
            face_b,
        )

    def _visual_similarity(
        self,
        face_a: np.ndarray,
        face_b: np.ndarray,
    ) -> float:

        gray_a = cv2.cvtColor(
            face_a,
            cv2.COLOR_BGR2GRAY,
        )

        gray_b = cv2.cvtColor(
            face_b,
            cv2.COLOR_BGR2GRAY,
        )

        hist_a = cv2.calcHist(
            [gray_a],
            [0],
            None,
            [64],
            [0, 256],
        )

        hist_b = cv2.calcHist(
            [gray_b],
            [0],
            None,
            [64],
            [0, 256],
        )

        cv2.normalize(
            hist_a,
            hist_a,
        )

        cv2.normalize(
            hist_b,
            hist_b,
        )

        correlation = cv2.compareHist(
            hist_a,
            hist_b,
            cv2.HISTCMP_CORREL,
        )

        histogram_similarity = (
            correlation + 1.0
        ) / 2.0

        a = (
            gray_a.astype(
                np.float32
            )
            / 255.0
        )

        b = (
            gray_b.astype(
                np.float32
            )
            / 255.0
        )

        mse = float(
            np.mean(
                (a - b) ** 2
            )
        )

        pixel_similarity = max(
            0.0,
            1.0 - mse,
        )

        similarity = (
            0.60 * histogram_similarity
            + 0.40 * pixel_similarity
        )

        return max(
            0.0,
            min(
                1.0,
                similarity,
            ),
        )

    # ---------------------------------------------------------
    # Results
    # ---------------------------------------------------------

    def _identity_status(
        self,
        similarity: float,
    ) -> str:

        match_score = similarity * 100.0

        if match_score >= 85:
            return "Strong match"

        if match_score >= 70:
            return "Possible match"

        if match_score >= 50:
            return "Weak match"

        return "Identity mismatch"

    def _result(
        self,
        similarity: float,
        liveness: float,
        status: str,
        model_available: bool,
    ) -> dict:

        face_risk = 100.0 * (
            0.75 * (1.0 - similarity)
            + 0.25 * (1.0 - liveness)
        )

        return {
            "matchScore": round(
                similarity * 100.0,
                2,
            ),
            "status": status,
            "riskScore": round(
                face_risk,
                2,
            ),
            "similarity": round(
                similarity,
                4,
            ),
            "liveness": liveness,
            "livenessAvailable": False,
            "modelAvailable": model_available,
            "method": (
                "sface"
                if model_available
                else "visual-baseline"
            ),
        }

    def _failure(
        self,
        message: str,
    ) -> dict:

        return {
            "matchScore": 0,
            "status": message,
            "riskScore": 100,
            "similarity": 0.0,
            "liveness": None,
            "livenessAvailable": False,
            "modelAvailable": False,
            "method": "unavailable",
        }