from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np


class TamperDetector:
    """
    Baseline document-forensics detector.

    T = 100 * (
        0.40S +
        0.25P +
        0.20N +
        0.15M
    )

    S = suspicious/spliced region
    P = photo/text manipulation
    N = noise/compression inconsistency
    M = metadata anomaly

    This is a forensic screening signal, NOT a definitive
    determination of document forgery.
    """

    def analyze(
        self,
        image_path: str,
    ) -> dict[str, Any]:

        image = cv2.imread(
            image_path
        )

        if image is None:
            return {
                "score": 100.0,
                "status": "Unable to analyze",
                "findings": [
                    "Document image could not be processed."
                ],
                "components": {
                    "suspiciousRegion": 1.0,
                    "photoTextManipulation": 1.0,
                    "noiseCompression": 1.0,
                    "metadataAnomaly": 1.0,
                },
                "modelAvailable": False,
                "method": "forensic-baseline",
            }

        suspicious_region = self._edge_anomaly(
            image
        )

        noise_compression = self._noise_anomaly(
            image
        )

        photo_text = self._photo_text_anomaly(
            image
        )

        metadata = self._metadata_anomaly(
            image_path
        )

        synthetic_pattern = self._synthetic_document_anomaly(
            image
        )

        # Conservative cap for heuristic components.
        suspicious_region = min(
            suspicious_region,
            0.65,
        )

        noise_compression = min(
            noise_compression,
            0.60,
        )

        photo_text = min(
            photo_text,
            0.60,
        )

        synthetic_pattern = min(
            synthetic_pattern,
            1.0,
        )

        score = 100.0 * (
            0.30 * suspicious_region
            + 0.20 * photo_text
            + 0.15 * noise_compression
            + 0.10 * metadata
            + 0.25 * synthetic_pattern
        )

        findings: list[str] = []

        if suspicious_region > 0.45:
            findings.append(
                "Localized edge/texture discontinuity detected."
            )

        if photo_text > 0.40:
            findings.append(
                "Photo/text region shows inconsistent visual characteristics."
            )

        if noise_compression > 0.45:
            findings.append(
                "Image contains inconsistent noise or compression characteristics."
            )

        if synthetic_pattern > 0.50:
            findings.append(
                "Synthetic document pattern detected: unusually uniform or template-like rendering."
            )

        if metadata > 0:
            findings.append(
                "Image metadata contains an anomaly requiring review."
            )

        if not findings:
            findings.append(
                "No strong forensic anomaly detected by the baseline checks."
            )

        synthetic_signal = synthetic_pattern >= 0.50

        if synthetic_signal:
            score = max(score, 80.0)
            status = "High indication"
        elif score < 30:
            status = "Low indication"
        elif score < 60:
            status = "Moderate indication"
        else:
            status = "High indication"

        return {
            "score": round(score, 2),
            "status": status,
            "findings": findings,
            "components": {
                "suspiciousRegion": round(
                    suspicious_region,
                    4,
                ),
                "photoTextManipulation": round(
                    photo_text,
                    4,
                ),
                "noiseCompression": round(
                    noise_compression,
                    4,
                ),
                "metadataAnomaly": round(
                    metadata,
                    4,
                ),
                "syntheticDocumentPattern": round(
                    synthetic_pattern,
                    4,
                ),
            },
            "modelAvailable": False,
            "method": "forensic-baseline",
        }

    # ---------------------------------------------------------
    # Edge anomaly
    # ---------------------------------------------------------

    def _edge_anomaly(
        self,
        image: np.ndarray,
    ) -> float:

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        edges = cv2.Canny(
            gray,
            80,
            180,
        )

        h, w = gray.shape

        if h < 20 or w < 20:
            return 0.0

        # Ignore outer document boundary where
        # natural edges are expected.
        margin_y = max(
            5,
            int(h * 0.05),
        )

        margin_x = max(
            5,
            int(w * 0.05),
        )

        inner = edges[
            margin_y:h - margin_y,
            margin_x:w - margin_x,
        ]

        if inner.size == 0:
            return 0.0

        density = float(
            np.mean(inner > 0)
        )

        # Excessive edge density can indicate text/splicing,
        # but ordinary documents also contain significant edges.
        anomaly = max(
            0.0,
            min(
                1.0,
                (density - 0.10) / 0.25,
            ),
        )

        return anomaly

    # ---------------------------------------------------------
    # Noise/compression
    # ---------------------------------------------------------

    def _noise_anomaly(
        self,
        image: np.ndarray,
    ) -> float:

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        blur = cv2.GaussianBlur(
            gray,
            (3, 3),
            0,
        )

        residual = (
            gray.astype(np.float32)
            - blur.astype(np.float32)
        )

        noise_std = float(
            np.std(residual)
        )

        anomaly = max(
            0.0,
            min(
                1.0,
                abs(noise_std - 8.0) / 20.0,
            ),
        )

        return anomaly

    # ---------------------------------------------------------
    # Photo/text region
    # ---------------------------------------------------------

    def _photo_text_anomaly(
        self,
        image: np.ndarray,
    ) -> float:

        h, w = image.shape[:2]

        if h < 200 or w < 200:
            return 0.0

        # Generic document-photo estimate.
        # This deliberately stays weak until a trained
        # document-specific model is introduced.
        region = image[
            int(h * 0.15):int(h * 0.65),
            int(w * 0.55):int(w * 0.95),
        ]

        if region.size == 0:
            return 0.0

        gray = cv2.cvtColor(
            region,
            cv2.COLOR_BGR2GRAY,
        )

        variance = float(
            np.var(gray)
        )

        return max(
            0.0,
            min(
                1.0,
                abs(variance - 1800.0) / 5000.0,
            ),
        )

    # ---------------------------------------------------------
    # Metadata
    # ---------------------------------------------------------

    def _metadata_anomaly(
        self,
        image_path: str,
    ) -> float:

        path = Path(
            image_path
        )

        try:
            size = path.stat().st_size
        except OSError:
            return 0.0

        # Extremely tiny files are suspicious,
        # but this is intentionally weak.
        if size < 10_000:
            return 0.25

        return 0.0

    def _synthetic_document_anomaly(
        self,
        image: np.ndarray,
    ) -> float:

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        h, w = gray.shape
        if h < 100 or w < 100:
            return 0.0

        blur = cv2.GaussianBlur(
            gray,
            (31, 31),
            0,
        )

        smoothing_delta = np.mean(
            np.abs(
                gray.astype(np.float32)
                - blur.astype(np.float32)
            )
        )

        uniform_ratio = float(
            np.mean(
                np.abs(gray.astype(np.float32) - np.median(gray)) < 8.0
            )
        )

        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.mean(edges > 0))

        # Synthetic or AI-generated identity docs often have over-smoothed areas,
        # unusually uniform background blocks, and weak edge variation across rows.
        anomaly = (
            0.40 * max(0.0, min(1.0, (0.75 - smoothing_delta / 25.0)))
            + 0.35 * max(0.0, min(1.0, (uniform_ratio - 0.50) / 0.35))
            + 0.25 * max(0.0, min(1.0, (0.15 - edge_density) / 0.10))
        )

        return max(0.0, min(1.0, anomaly))