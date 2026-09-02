from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

# PaddleOCR 3.x may route CPU inference through oneDNN. Disable it before
# importing PaddleOCR to avoid the Windows/PIR oneDNN runtime failure.
os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")

import cv2
import numpy as np

try:
    from paddleocr import PaddleOCR
except Exception:  # pragma: no cover - dependency may be unavailable at import time
    PaddleOCR = None


class OCREngine:
    """
    OCR + document-specific field extraction for:
      - Aadhaar Card
      - Passport
      - Visa

    The OCR score is:
        O = 100 * (0.35M + 0.25C + 0.20I + 0.20L)

    M = missing-field ratio
    C = OCR-confidence anomaly
    I = internal field inconsistency
    L = layout/expected-field anomaly
    """

    SUPPORTED_TYPES = {"aadhar card", "aadhaar card", "passport", "visa"}

    def __init__(self) -> None:
        self.ocr = None

    def _ensure_ocr(self):
        if self.ocr is not None:
            return self.ocr

        if PaddleOCR is None:
            raise RuntimeError(
                "PaddleOCR is unavailable in the current environment."
            )

        self.ocr = PaddleOCR(
            lang="en",
            device="cpu",
            enable_mkldnn=False,
        )
        return self.ocr

    def _empty_result(self, doc_type: str, message: str = "") -> dict[str, Any]:
        return {
            "name": "",
            "documentNumber": "",
            "nationality": "",
            "dateOfBirth": "",
            "expiryDate": "",
            "gender": "",
            "visaNumber": "",
            "visaType": "",
            "passportNumber": "",
            "rawText": "",
            "lines": [],
            "riskScore": 100.0,
            "confidence": 0.0,
            "components": {
                "missingFieldRatio": 1.0,
                "confidenceAnomaly": 1.0,
                "internalInconsistency": 0.0,
                "layoutAnomaly": 0.0,
            },
            "ocr_error": message,
            "documentType": doc_type,
        }

    def extract(self, image_path: str, document_type: str) -> dict[str, Any]:
        doc_type = self._normalize_document_type(document_type)

        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Unable to read image: {image_path}")

        try:
            self._ensure_ocr()
        except Exception as exc:
            return self._empty_result(doc_type, str(exc))

        prepared = self._prepare_image(image)
        raw_items = self._run_ocr(prepared)
        lines = self._normalise_ocr_items(raw_items)

        # Retry with grayscale/upscaled image if the first pass is sparse.
        if len(lines) < 3:
            enhanced = self._enhance_for_ocr(image)
            retry_items = self._run_ocr(enhanced)
            retry_lines = self._normalise_ocr_items(retry_items)
            if len(retry_lines) > len(lines):
                lines = retry_lines

        raw_text = "\n".join(item["text"] for item in lines)

        if doc_type == "Aadhar Card":
            fields, expected, layout_anomaly = self._extract_aadhaar(lines, raw_text)
        elif doc_type == "Passport":
            fields, expected, layout_anomaly = self._extract_passport(lines, raw_text)
        else:
            fields, expected, layout_anomaly = self._extract_visa(lines, raw_text)

        confidence = self._overall_confidence(lines)
        missing_ratio = self._missing_ratio(fields, expected)
        confidence_anomaly = max(0.0, min(1.0, 1.0 - confidence))
        internal_inconsistency = self._internal_inconsistency(
            fields, doc_type, raw_text
        )

        ocr_risk = 100.0 * (
            0.35 * missing_ratio
            + 0.25 * confidence_anomaly
            + 0.20 * internal_inconsistency
            + 0.20 * layout_anomaly
        )

        return {
            "name": fields.get("name", ""),
            "documentNumber": fields.get("documentNumber", ""),
            "nationality": fields.get("nationality", ""),
            "dateOfBirth": fields.get("dateOfBirth", ""),
            "expiryDate": fields.get("expiryDate", ""),
            "gender": fields.get("gender", ""),
            "visaNumber": fields.get("visaNumber", ""),
            "visaType": fields.get("visaType", ""),
            "passportNumber": fields.get("passportNumber", ""),
            "rawText": raw_text,
            "lines": lines,
            "riskScore": round(ocr_risk, 2),
            "confidence": round(confidence, 4),
            "components": {
                "missingFieldRatio": round(missing_ratio, 4),
                "confidenceAnomaly": round(confidence_anomaly, 4),
                "internalInconsistency": round(internal_inconsistency, 4),
                "layoutAnomaly": round(layout_anomaly, 4),
            },
        }

    # ------------------------------------------------------------------
    # OCR execution
    # ------------------------------------------------------------------

    def _run_ocr(self, image: np.ndarray) -> list[Any]:
        # PaddleOCR version compatibility:
        # - newer releases expose predict(...)
        # - v2.x installs commonly expose ocr(...)
        for method_name in ("predict", "ocr"):
            method = getattr(self.ocr, method_name, None)
            if method is None:
                continue

            try:
                result = method(image, cls=True) if method_name == "ocr" else method(image)
            except TypeError:
                # Some PaddleOCR builds allow ocr(image) without cls argument.
                try:
                    result = method(image)
                except Exception:
                    continue

            if result is None:
                continue

            if isinstance(result, list):
                return result
            return [result]

        raise RuntimeError(
            "PaddleOCR did not expose a usable recognition method on this installation."
        )

    def _normalise_ocr_items(self, result: list[Any]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []

        def add(text: Any, score: Any = 0.0, box: Any = None) -> None:
            if text is None:
                return
            text = str(text).strip()
            if not text:
                return
            try:
                conf = float(score)
            except (TypeError, ValueError):
                conf = 0.0
            items.append(
                {
                    "text": text,
                    "confidence": max(0.0, min(1.0, conf)),
                    "box": box,
                }
            )

        for res in result:
            data = None

            # PaddleOCR 3.x Result exposes a JSON representation.
            try:
                candidate = getattr(res, "json", None)
                if callable(candidate):
                    candidate = candidate()
                if isinstance(candidate, str):
                    data = json.loads(candidate)
                elif isinstance(candidate, dict):
                    data = candidate
            except Exception:
                data = None

            if data is None and isinstance(res, dict):
                data = res

            if data is not None:
                if isinstance(data, dict) and "res" in data and isinstance(data["res"], dict):
                    data = data["res"]

                if isinstance(data, dict):
                    texts = (
                        data.get("rec_texts")
                        or data.get("texts")
                        or data.get("rec_text")
                        or []
                    )
                    scores = (
                        data.get("rec_scores")
                        or data.get("scores")
                        or []
                    )
                    boxes = (
                        data.get("rec_polys")
                        or data.get("rec_boxes")
                        or data.get("boxes")
                        or []
                    )

                    if isinstance(texts, str):
                        texts = [texts]

                    for i, text in enumerate(texts):
                        score = scores[i] if i < len(scores) else 0.0
                        box = boxes[i] if i < len(boxes) else None
                        add(text, score, box)

                    if items:
                        continue

            # Older PaddleOCR result shape:
            # [[box, (text, confidence)], ...]
            self._parse_legacy_result(res, add)

        # Remove exact duplicates while preserving order.
        seen = set()
        unique = []
        for item in items:
            key = item["text"].strip().upper()
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)

        return unique

    def _parse_legacy_result(self, result: Any, add) -> None:
        if not isinstance(result, (list, tuple)):
            return

        for entry in result:
            if not isinstance(entry, (list, tuple)) or len(entry) < 2:
                continue

            box = entry[0]
            payload = entry[1]

            if isinstance(payload, (list, tuple)) and len(payload) >= 2:
                add(payload[0], payload[1], box)
            elif isinstance(payload, str):
                add(payload, 0.0, box)

    # ------------------------------------------------------------------
    # Image preparation
    # ------------------------------------------------------------------

    def _prepare_image(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        if max(h, w) < 1600:
            scale = 1600 / max(h, w)
            image = cv2.resize(
                image,
                None,
                fx=scale,
                fy=scale,
                interpolation=cv2.INTER_CUBIC,
            )
        return image

    def _enhance_for_ocr(self, image: np.ndarray) -> np.ndarray:
        image = self._prepare_image(image)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.fastNlMeansDenoising(gray, None, 5, 7, 21)
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    # ------------------------------------------------------------------
    # Aadhaar extraction
    # ------------------------------------------------------------------

    def _extract_aadhaar(
        self, lines: list[dict], raw_text: str
    ) -> tuple[dict, list[str], float]:
        texts = [x["text"] for x in lines]
        upper = [self._clean_text(x) for x in texts]

        fields: dict[str, str] = {}
        expected = ["name", "documentNumber"]
        optional = ["dateOfBirth", "gender"]

        aadhaar = self._find_aadhaar_number(raw_text)
        if aadhaar:
            fields["documentNumber"] = aadhaar

        # Date of birth / year of birth.
        dob = self._find_date_near_labels(
            texts,
            [r"date\s*of\s*birth", r"\bdob\b", r"year\s*of\s*birth", r"\byob\b"],
        )
        if dob:
            fields["dateOfBirth"] = dob

        gender = self._find_gender(texts)
        if gender:
            fields["gender"] = gender

        # Label-aware name extraction.
        name = self._find_name_near_labels(
            texts,
            [r"\bname\b", r"नाम"],
            excluded_patterns=[
                r"government", r"india", r"aadhaar", r"unique", r"authority"
            ],
        )
        if name:
            fields["name"] = name

        # If no label-aware name was found, use a conservative candidate
        # from nearby person-name-looking lines.
        if not fields.get("name"):
            candidate = self._best_name_candidate(texts)
            if candidate:
                fields["name"] = candidate

        # Aadhaar normally has no expiry date.
        fields["expiryDate"] = ""
        fields["nationality"] = "INDIAN" if self._contains_india_signal(raw_text) else ""

        # For Aadhaar, optional DOB/gender do not become hard missing fields.
        expected_for_risk = expected.copy()
        optional_present = sum(bool(fields.get(k)) for k in optional)
        layout_anomaly = 0.0

        # A very sparse OCR result is a layout/quality warning.
        if len(texts) < 4:
            layout_anomaly = 0.5
        elif len(texts) < 7:
            layout_anomaly = 0.2

        # If the Aadhaar number exists, this is strong structural evidence.
        if fields.get("documentNumber"):
            layout_anomaly *= 0.5

        return fields, expected_for_risk, layout_anomaly

    def _find_aadhaar_number(self, text: str) -> str:
        # Handles:
        # 1234 5678 9012
        # 123456789012
        # XXXX XXXX 9012
        masked = re.search(
            r"(?:\d{4}\s*){2}\d{4}",
            text,
            flags=re.IGNORECASE,
        )
        if masked:
            value = re.sub(r"\D", "", masked.group(0))
            if len(value) == 12:
                return value

        compact = re.findall(r"(?<!\d)\d{12}(?!\d)", text)
        for value in compact:
            if self._looks_like_aadhaar(value):
                return value

        # Common OCR segmentation: three numeric groups.
        groups = re.findall(r"\b\d{4}\b", text)
        for i in range(len(groups) - 2):
            candidate = "".join(groups[i : i + 3])
            if len(candidate) == 12:
                return candidate

        return ""

    def _looks_like_aadhaar(self, value: str) -> bool:
        return len(value) == 12 and value[0] not in {"0", "1"}

    # ------------------------------------------------------------------
    # Passport extraction
    # ------------------------------------------------------------------

    def _extract_passport(
        self, lines: list[dict], raw_text: str
    ) -> tuple[dict, list[str], float]:
        texts = [x["text"] for x in lines]
        fields: dict[str, str] = {}

        mrz = self._find_mrz_lines(texts)

        if mrz:
            parsed = self._parse_td3_mrz(mrz)
            fields.update(parsed)

        if not fields.get("name"):
            fields["name"] = self._find_name_near_labels(
                texts, [r"\bsurname\b", r"\bgiven\s*names?\b", r"\bname\b"]
            )

        if not fields.get("documentNumber"):
            fields["documentNumber"] = self._find_labeled_value(
                texts,
                [r"passport\s*(?:no|number)", r"document\s*(?:no|number)"],
                r"[A-Z0-9]{6,12}",
            )

        if not fields.get("nationality"):
            fields["nationality"] = self._find_labeled_value(
                texts,
                [r"nationality"],
                r"[A-Z]{3}",
            )

        if not fields.get("dateOfBirth"):
            fields["dateOfBirth"] = self._find_date_near_labels(
                texts, [r"date\s*of\s*birth", r"\bdob\b"]
            )

        if not fields.get("expiryDate"):
            fields["expiryDate"] = self._find_date_near_labels(
                texts, [r"date\s*of\s*expiry", r"expiry", r"expiration"]
            )

        if not fields.get("gender"):
            fields["gender"] = self._find_gender(texts)

        expected = [
            "name",
            "documentNumber",
            "nationality",
            "dateOfBirth",
            "expiryDate",
            "gender",
        ]

        layout_anomaly = 0.0 if mrz else 0.35
        return fields, expected, layout_anomaly

    def _find_mrz_lines(self, texts: list[str]) -> list[str]:
        candidates = []
        for text in texts:
            cleaned = re.sub(r"\s+", "", text.upper())
            if len(cleaned) >= 35 and "<" in cleaned:
                candidates.append(cleaned)

        # TD3 passports normally have two 44-character lines.
        if len(candidates) >= 2:
            return candidates[-2:]
        return candidates

    def _parse_td3_mrz(self, lines: list[str]) -> dict[str, str]:
        if len(lines) < 2:
            return {}

        l1 = lines[-2].ljust(44, "<")[:44]
        l2 = lines[-1].ljust(44, "<")[:44]

        result: dict[str, str] = {}

        if l1.startswith("P<"):
            issuing = l1[2:5].replace("<", "")
            if issuing:
                result["issuingCountry"] = issuing

            names = l1[5:].split("<<", 1)
            surname = names[0].replace("<", " ").strip()
            given = names[1].replace("<", " ").strip() if len(names) > 1 else ""
            full_name = " ".join(x for x in [surname, given] if x).strip()
            if full_name:
                result["name"] = full_name

        doc_no = l2[0:9].replace("<", "")
        nationality = l2[10:13].replace("<", "")
        dob = l2[13:19]
        gender = l2[20].replace("<", "")
        expiry = l2[21:27]

        if doc_no:
            result["documentNumber"] = doc_no
        if nationality:
            result["nationality"] = nationality
        if re.fullmatch(r"\d{6}", dob):
            result["dateOfBirth"] = self._mrz_date(dob)
        if gender in {"M", "F", "X"}:
            result["gender"] = gender
        if re.fullmatch(r"\d{6}", expiry):
            result["expiryDate"] = self._mrz_date(expiry)

        return result

    def _mrz_date(self, value: str) -> str:
        yy = int(value[:2])
        mm = int(value[2:4])
        dd = int(value[4:6])
        # For DOB, 00-49 -> 2000-2049 and 50-99 -> 1950-1999.
        # This is a display conversion only; validator performs date checks.
        year = 2000 + yy if yy <= 49 else 1900 + yy
        return f"{dd:02d}-{mm:02d}-{year:04d}"

    # ------------------------------------------------------------------
    # Visa extraction
    # ------------------------------------------------------------------

    def _extract_visa(
        self, lines: list[dict], raw_text: str
    ) -> tuple[dict, list[str], float]:
        texts = [x["text"] for x in lines]
        fields: dict[str, str] = {}

        fields["visaNumber"] = self._find_labeled_value(
            texts,
            [r"visa\s*(?:no|number)", r"visa\s*number"],
            r"[A-Z0-9]{5,20}",
        )

        fields["name"] = self._find_name_near_labels(
            texts, [r"\bname\b", r"\bsurname\b", r"\bgiven\s*name"]
        )

        fields["nationality"] = self._find_labeled_value(
            texts,
            [r"nationality", r"citizenship"],
            r"[A-Z]{2,20}",
        )

        fields["passportNumber"] = self._find_labeled_value(
            texts,
            [r"passport\s*(?:no|number)"],
            r"[A-Z0-9]{6,12}",
        )

        fields["dateOfBirth"] = self._find_date_near_labels(
            texts, [r"date\s*of\s*birth", r"\bdob\b"]
        )

        fields["expiryDate"] = self._find_date_near_labels(
            texts, [r"expiry", r"expiration", r"valid\s*(?:until|to)"]
        )

        fields["visaType"] = self._find_labeled_value(
            texts,
            [r"visa\s*type", r"type\s*of\s*visa"],
            r"[A-Za-z0-9 /-]{3,30}",
        )

        expected = [
            "name",
            "visaNumber",
            "passportNumber",
            "nationality",
            "dateOfBirth",
            "expiryDate",
        ]

        layout_anomaly = 0.15 if len(texts) >= 5 else 0.4
        return fields, expected, layout_anomaly

    # ------------------------------------------------------------------
    # Generic extraction helpers
    # ------------------------------------------------------------------

    def _find_labeled_value(
        self, texts: list[str], labels: list[str], value_pattern: str
    ) -> str:
        for i, text in enumerate(texts):
            for label in labels:
                m = re.search(label + r"\s*[:\-]?\s*(.+)$", text, re.I)
                if m:
                    candidate = m.group(1).strip()
                    v = re.search(value_pattern, candidate, re.I)
                    if v:
                        return v.group(0).strip()

                if re.search(label, text, re.I) and i + 1 < len(texts):
                    candidate = texts[i + 1].strip()
                    v = re.search(value_pattern, candidate, re.I)
                    if v:
                        return v.group(0).strip()
        return ""

    def _find_date_near_labels(self, texts: list[str], labels: list[str]) -> str:
        date_pattern = r"\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b"
        for i, text in enumerate(texts):
            if any(re.search(label, text, re.I) for label in labels):
                m = re.search(date_pattern, text)
                if m:
                    return self._normalise_date(m.group(0))
                if i + 1 < len(texts):
                    m = re.search(date_pattern, texts[i + 1])
                    if m:
                        return self._normalise_date(m.group(0))
        return ""

    def _normalise_date(self, value: str) -> str:
        value = value.replace("/", "-")
        parts = value.split("-")
        if len(parts) != 3:
            return value
        if len(parts[0]) == 4:
            return f"{parts[2].zfill(2)}-{parts[1].zfill(2)}-{parts[0]}"
        return f"{parts[0].zfill(2)}-{parts[1].zfill(2)}-{parts[2]}"

    def _find_gender(self, texts: list[str]) -> str:
        for text in texts:
            if re.search(r"\b(?:gender|sex)\b", text, re.I):
                m = re.search(r"\b(MALE|FEMALE|M|F|X)\b", text, re.I)
                if m:
                    value = m.group(1).upper()
                    return {"MALE": "M", "FEMALE": "F"}.get(value, value)

        # Passport MRZ often contains a standalone M/F.
        for text in texts:
            if re.fullmatch(r"\s*[MFX]\s*", text, re.I):
                return text.strip().upper()

        return ""

    def _find_name_near_labels(
        self,
        texts: list[str],
        labels: list[str],
        excluded_patterns: list[str] | None = None,
    ) -> str:
        excluded_patterns = excluded_patterns or []

        for i, text in enumerate(texts):
            if not any(re.search(label, text, re.I) for label in labels):
                continue

            candidate = ""
            for source in [text, texts[i + 1] if i + 1 < len(texts) else ""]:
                m = re.search(
                    r"(?:name|surname|given\s*names?|नाम)\s*[:\-]?\s*(.+)$",
                    source,
                    re.I,
                )
                if m:
                    candidate = m.group(1).strip()
                    break

                if source == texts[i + 1] if i + 1 < len(texts) else False:
                    candidate = source.strip()

            candidate = self._clean_name(candidate)
            if self._valid_name_candidate(candidate, excluded_patterns):
                return candidate

        return ""

    def _best_name_candidate(self, texts: list[str]) -> str:
        candidates = []
        for text in texts:
            candidate = self._clean_name(text)
            if not self._valid_name_candidate(candidate, []):
                continue
            if re.search(r"\d", candidate):
                continue
            if len(candidate.split()) > 5:
                continue
            candidates.append(candidate)

        # Prefer a 2-4 token alphabetic name over generic headings.
        candidates.sort(
            key=lambda x: (
                0 if 2 <= len(x.split()) <= 4 else 1,
                abs(len(x) - 20),
            )
        )
        return candidates[0] if candidates else ""

    def _clean_name(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value).strip(" :-")
        return value

    def _valid_name_candidate(
        self, value: str, excluded_patterns: list[str]
    ) -> bool:
        if not (3 <= len(value) <= 80):
            return False
        if not re.fullmatch(r"[A-Za-z][A-Za-z .'-]*", value):
            return False
        for pattern in excluded_patterns:
            if re.search(pattern, value, re.I):
                return False
        return True

    def _contains_india_signal(self, text: str) -> bool:
        return bool(re.search(r"\b(?:INDIA|INDIAN)\b|भारत", text, re.I))

    def _clean_text(self, text: str) -> str:
        return re.sub(r"[^A-Z0-9<> ]", "", text.upper())

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def _overall_confidence(self, lines: list[dict]) -> float:
        if not lines:
            return 0.0
        values = [float(x.get("confidence", 0.0)) for x in lines]
        return sum(values) / len(values)

    def _missing_ratio(self, fields: dict, expected: list[str]) -> float:
        if not expected:
            return 0.0
        return sum(not bool(fields.get(k)) for k in expected) / len(expected)

    def _internal_inconsistency(
        self, fields: dict, doc_type: str, raw_text: str
    ) -> float:
        checks = []
        if fields.get("documentNumber"):
            checks.append(
                bool(
                    re.search(
                        re.escape(fields["documentNumber"][:4]),
                        raw_text,
                        re.I,
                    )
                )
            )

        if fields.get("dateOfBirth"):
            checks.append(True)

        if doc_type == "Passport":
            if fields.get("documentNumber") and len(fields["documentNumber"]) > 12:
                checks.append(False)

        if not checks:
            return 0.0
        return 1.0 - (sum(checks) / len(checks))

    def _normalize_document_type(self, value: str) -> str:
        normalized = re.sub(r"\s+", " ", (value or "").strip().lower())
        if normalized in {"aadhar", "aadhaar", "aadhar card", "aadhaar card"}:
            return "Aadhar Card"
        if normalized == "passport":
            return "Passport"
        if normalized == "visa":
            return "Visa"
        raise ValueError(
            "Unsupported document type. Allowed values: Aadhar Card, Passport, Visa."
        )
