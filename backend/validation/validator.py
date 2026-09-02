from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any


class DocumentValidator:
    """
    Document validation engine for:

        1. Aadhaar Card
        2. Passport
        3. Visa

    Validation risk:

        V = 100 * (
            0.30C +
            0.25E +
            0.20F +
            0.15M +
            0.10S
        )

    Where:

        C = checksum failure risk
        E = expiry / validity risk
        F = field-format violation risk
        M = missing required information risk
        S = structural/document-standard violation risk

    Important design principle:

        "Unable to verify" != "Failed"

    OCR can fail because of:
        - low image quality
        - blur
        - glare
        - skew
        - poor lighting
        - partial document
        - OCR character confusion

    Therefore, this validator avoids declaring a document fraudulent
    merely because a verification rule could not be applied.
    """

    # ------------------------------------------------------------------
    # Canonical document types
    # ------------------------------------------------------------------

    SUPPORTED_DOCUMENT_TYPES = {
        "aadhar": "Aadhar Card",
        "aadhaar": "Aadhar Card",
        "aadhar card": "Aadhar Card",
        "aadhaar card": "Aadhar Card",
        "passport": "Passport",
        "visa": "Visa",
    }

    # ------------------------------------------------------------------
    # Required fields
    # ------------------------------------------------------------------

    COMMON_FIELDS = [
        "name",
    ]

    AADHAAR_FIELDS = [
        "name",
        "documentNumber",
        "dateOfBirth",
        "gender",
    ]

    PASSPORT_FIELDS = [
        "name",
        "documentNumber",
        "nationality",
        "dateOfBirth",
        "expiryDate",
        "gender",
    ]

    VISA_FIELDS = [
        "name",
        "visaNumber",
        "visaType",
    ]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(
        self,
        fields: dict[str, Any],
        document_type: str,
        raw_text: str = "",
        ocr_confidence: float | None = None,
    ) -> dict:

        canonical_type = self._normalize_document_type(
            document_type
        )

        if canonical_type is None:
            canonical_type = str(
                document_type or "Unknown"
            ).strip()

        fields = self._clean_fields(fields)

        raw_text = raw_text or ""

        # --------------------------------------------------------------
        # Select document-specific required fields
        # --------------------------------------------------------------

        required_fields = self._required_fields(
            canonical_type
        )

        missing_fields = [
            field
            for field in required_fields
            if not self._has_value(fields.get(field))
        ]

        missing_ratio = (
            len(missing_fields) / len(required_fields)
            if required_fields
            else 0.0
        )

        # --------------------------------------------------------------
        # Format validation
        # --------------------------------------------------------------

        format_violations = self._format_violations(
            fields,
            canonical_type,
        )

        format_risk = min(
            1.0,
            len(format_violations) / max(
                1,
                len(required_fields),
            ),
        )

        # --------------------------------------------------------------
        # Expiry validation
        # --------------------------------------------------------------

        expiry_result = self._expiry_validation(
            fields,
            canonical_type,
        )

        expiry_risk = expiry_result["risk"]

        # --------------------------------------------------------------
        # Checksum validation
        # --------------------------------------------------------------

        checksum_result = self._checksum_validation(
            fields,
            raw_text,
            canonical_type,
        )

        checksum_risk = checksum_result["risk"]

        # --------------------------------------------------------------
        # Structural validation
        # --------------------------------------------------------------

        structural_result = self._structural_validation(
            fields,
            raw_text,
            canonical_type,
        )

        structural_risk = structural_result["risk"]

        # --------------------------------------------------------------
        # Internal consistency
        #
        # This is deliberately reported separately.
        # It should not blindly be treated as a checksum failure.
        # --------------------------------------------------------------

        consistency_result = self._internal_consistency(
            fields,
            raw_text,
            canonical_type,
        )

        consistency_risk = consistency_result["risk"]

        # --------------------------------------------------------------
        # Combined structural/field evidence
        #
        # Structural risk is allowed to incorporate strong internal
        # inconsistencies, but only partially.
        # --------------------------------------------------------------

        structural_risk = min(
            1.0,
            structural_risk
            + 0.50 * consistency_risk,
        )

        # --------------------------------------------------------------
        # Validation risk formula
        # --------------------------------------------------------------

        risk = 100.0 * (
            0.30 * checksum_risk
            + 0.25 * expiry_risk
            + 0.20 * format_risk
            + 0.15 * missing_ratio
            + 0.10 * structural_risk
        )

        risk = round(
            min(100.0, max(0.0, risk)),
            2,
        )

        # --------------------------------------------------------------
        # Frontend-compatible booleans
        #
        # These represent actual verification status, not merely
        # whether a rule was available.
        # --------------------------------------------------------------

        document_format_ok = not structural_result["failure"]

        checksum_ok = not checksum_result["failure"]

        expiry_ok = not expiry_result["failure"]

        field_consistency_ok = (
            not format_violations
            and not consistency_result["failure"]
        )

        return {
            "riskScore": risk,

            "documentFormat": document_format_ok,
            "checksum": checksum_ok,
            "expiry": expiry_ok,
            "fieldConsistency": field_consistency_ok,

            "documentType": canonical_type,

            "components": {
                "checksumFailure": round(
                    checksum_risk,
                    4,
                ),
                "expiryRisk": round(
                    expiry_risk,
                    4,
                ),
                "formatViolation": round(
                    format_risk,
                    4,
                ),
                "missingInformation": round(
                    missing_ratio,
                    4,
                ),
                "structuralViolation": round(
                    structural_risk,
                    4,
                ),
            },

            "missingFields": missing_fields,

            "formatViolations": format_violations,

            "expiryProblem": expiry_result["message"],

            "checksumDetails": checksum_result,

            "structuralDetails": structural_result,

            "consistencyDetails": consistency_result,

            "verificationSummary": self._verification_summary(
                checksum_result,
                expiry_result,
                structural_result,
                format_violations,
                missing_fields,
                consistency_result,
            ),
        }

    # ==================================================================
    # DOCUMENT TYPE
    # ==================================================================

    def _normalize_document_type(
        self,
        document_type: str,
    ) -> str | None:

        if not document_type:
            return None

        value = (
            str(document_type)
            .strip()
            .lower()
        )

        return self.SUPPORTED_DOCUMENT_TYPES.get(
            value
        )

    def _required_fields(
        self,
        document_type: str,
    ) -> list[str]:

        normalized = self._normalize_document_type(
            document_type
        )

        if normalized == "Aadhar Card":
            return self.AADHAAR_FIELDS.copy()

        if normalized == "Passport":
            return self.PASSPORT_FIELDS.copy()

        if normalized == "Visa":
            return self.VISA_FIELDS.copy()

        return self.COMMON_FIELDS.copy()

    # ==================================================================
    # FIELD CLEANING
    # ==================================================================

    def _clean_fields(
        self,
        fields: dict[str, Any],
    ) -> dict[str, Any]:

        cleaned = {}

        for key, value in fields.items():

            if value is None:
                cleaned[key] = ""
                continue

            if isinstance(value, str):
                value = re.sub(
                    r"\s+",
                    " ",
                    value,
                ).strip()

            cleaned[key] = value

        return cleaned

    def _has_value(
        self,
        value: Any,
    ) -> bool:

        if value is None:
            return False

        if isinstance(value, str):
            return bool(value.strip())

        return True

    # ==================================================================
    # FORMAT VALIDATION
    # ==================================================================

    def _format_violations(
        self,
        fields: dict[str, Any],
        document_type: str,
    ) -> list[str]:

        violations: list[str] = []

        # --------------------------------------------------------------
        # Name
        # --------------------------------------------------------------

        name = str(
            fields.get("name", "")
        ).strip()

        if name:

            # OCR can occasionally return labels instead of names.
            suspicious_names = {
                "government of india",
                "passport",
                "visa",
                "republic of india",
                "aadhaar",
                "aadhar",
            }

            if name.lower() in suspicious_names:
                violations.append(
                    "Extracted name appears to be a document label"
                )

            elif not re.fullmatch(
                r"[A-Za-z][A-Za-z .'\-]{1,99}",
                name,
            ):
                violations.append(
                    "Invalid name format"
                )

        # --------------------------------------------------------------
        # Aadhaar
        # --------------------------------------------------------------

        if document_type == "Aadhar Card":

            number = self._digits_only(
                fields.get(
                    "documentNumber",
                    "",
                )
            )

            if number:

                if len(number) != 12:
                    violations.append(
                        "Aadhaar number must contain 12 digits"
                    )

                if (
                    len(number) == 12
                    and number[0] == "0"
                ):
                    violations.append(
                        "Aadhaar number has invalid leading digit"
                    )

        # --------------------------------------------------------------
        # Passport
        # --------------------------------------------------------------

        elif document_type == "Passport":

            number = re.sub(
                r"[^A-Za-z0-9]",
                "",
                str(
                    fields.get(
                        "documentNumber",
                        "",
                    )
                ).upper(),
            )

            if number:

                if not re.fullmatch(
                    r"[A-Z0-9]{5,15}",
                    number,
                ):
                    violations.append(
                        "Invalid passport number format"
                    )

            nationality = str(
                fields.get(
                    "nationality",
                    "",
                )
            ).strip().upper()

            if nationality:

                if not re.fullmatch(
                    r"[A-Z]{3}",
                    nationality,
                ):
                    violations.append(
                        "Nationality should use a three-letter code"
                    )

            gender = str(
                fields.get(
                    "gender",
                    "",
                )
            ).strip().upper()

            if gender and gender not in {
                "M",
                "F",
                "X",
                "<",
            }:
                violations.append(
                    "Invalid passport gender code"
                )

        # --------------------------------------------------------------
        # Visa
        # --------------------------------------------------------------

        elif document_type == "Visa":

            visa_number = re.sub(
                r"[^A-Za-z0-9]",
                "",
                str(
                    fields.get(
                        "visaNumber",
                        "",
                    )
                ).upper(),
            )

            if visa_number:

                if not re.fullmatch(
                    r"[A-Z0-9]{5,30}",
                    visa_number,
                ):
                    violations.append(
                        "Invalid visa number format"
                    )

            visa_type = str(
                fields.get(
                    "visaType",
                    "",
                )
            ).strip()

            if visa_type:

                if len(visa_type) < 2:
                    violations.append(
                        "Invalid visa type"
                    )

        # --------------------------------------------------------------
        # Date validation
        # --------------------------------------------------------------

        for field_name in (
            "dateOfBirth",
            "expiryDate",
            "issueDate",
        ):

            value = fields.get(
                field_name,
                "",
            )

            if value:

                if self._parse_date(value) is None:

                    violations.append(
                        f"Invalid {field_name} date format"
                    )

        return violations

    # ==================================================================
    # EXPIRY / VALIDITY
    # ==================================================================

    def _expiry_validation(
        self,
        fields: dict[str, Any],
        document_type: str,
    ) -> dict:

        # Aadhaar does not normally have an expiry date.
        if document_type == "Aadhar Card":

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "message": "",
            }

        expiry = fields.get(
            "expiryDate",
            "",
        )

        if not expiry:

            # Missing expiry is handled through M,
            # not falsely treated as an expired document.
            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "message": "",
            }

        parsed = self._parse_date(expiry)

        if parsed is None:

            return {
                "failure": True,
                "verified": True,
                "risk": 1.0,
                "message": "Expiry date could not be parsed.",
            }

        today = date.today()

        if parsed < today:

            return {
                "failure": True,
                "verified": True,
                "risk": 1.0,
                "message": "Document is expired.",
            }

        return {
            "failure": False,
            "verified": True,
            "risk": 0.0,
            "message": "",
        }

    def _parse_date(
        self,
        value: Any,
    ) -> date | None:

        if not value:
            return None

        value = str(value).strip()

        formats = [
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%d.%m.%Y",
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%d-%m-%y",
            "%d/%m/%y",
            "%d %b %Y",
            "%d %B %Y",
            "%d %b %y",
            "%d %B %y",
        ]

        for fmt in formats:

            try:
                return datetime.strptime(
                    value,
                    fmt,
                ).date()

            except ValueError:
                continue

        # MRZ YYMMDD
        if re.fullmatch(
            r"\d{6}",
            value,
        ):

            yy = int(value[0:2])
            mm = int(value[2:4])
            dd = int(value[4:6])

            # MRZ date interpretation.
            current_year = date.today().year % 100

            if yy <= current_year:
                year = 2000 + yy
            else:
                year = 1900 + yy

            try:
                return date(
                    year,
                    mm,
                    dd,
                )
            except ValueError:
                return None

        return None

    # ==================================================================
    # CHECKSUM VALIDATION
    # ==================================================================

    def _checksum_validation(
        self,
        fields: dict[str, Any],
        raw_text: str,
        document_type: str,
    ) -> dict:

        # --------------------------------------------------------------
        # Aadhaar
        # --------------------------------------------------------------

        if document_type == "Aadhar Card":

            number = self._digits_only(
                fields.get(
                    "documentNumber",
                    "",
                )
            )

            if len(number) != 12:

                return {
                    "failure": False,
                    "verified": False,
                    "risk": 0.0,
                    "reason": (
                        "Aadhaar checksum could not be "
                        "verified because a valid 12-digit "
                        "Aadhaar number was not extracted."
                    ),
                }

            valid = self._verhoeff_validate(
                number
            )

            if valid:

                return {
                    "failure": False,
                    "verified": True,
                    "risk": 0.0,
                    "reason": (
                        "Aadhaar Verhoeff checksum verified."
                    ),
                }

            return {
                "failure": True,
                "verified": True,
                "risk": 1.0,
                "reason": (
                    "Aadhaar Verhoeff checksum failed."
                ),
            }

        # --------------------------------------------------------------
        # Passport
        # --------------------------------------------------------------

        if document_type == "Passport":

            mrz = self._extract_passport_mrz(
                raw_text
            )

            if len(mrz) < 2:

                return {
                    "failure": False,
                    "verified": False,
                    "risk": 0.0,
                    "reason": (
                        "Passport MRZ was not sufficiently "
                        "detected for checksum verification."
                    ),
                }

            line2 = mrz[-1]

            if len(line2) < 44:

                return {
                    "failure": True,
                    "verified": True,
                    "risk": 1.0,
                    "reason": (
                        "Passport MRZ is present but has "
                        "an invalid length."
                    ),
                }

            checks = []

            # Passport TD3:
            #
            # Document number: positions 0-8
            # Check digit:     position 9
            #
            # DOB:             positions 13-18
            # Check digit:     position 19
            #
            # Expiry:          positions 21-26
            # Check digit:     position 27

            checks.append(
                self._mrz_field_check(
                    line2[0:9],
                    line2[9],
                    "document number",
                )
            )

            checks.append(
                self._mrz_field_check(
                    line2[13:19],
                    line2[19],
                    "date of birth",
                )
            )

            checks.append(
                self._mrz_field_check(
                    line2[21:27],
                    line2[27],
                    "expiry date",
                )
            )

            valid_checks = [
                item
                for item in checks
                if item["verified"]
            ]

            failures = [
                item
                for item in valid_checks
                if item["failure"]
            ]

            if failures:

                return {
                    "failure": True,
                    "verified": True,
                    "risk": min(
                        1.0,
                        len(failures)
                        / max(1, len(valid_checks)),
                    ),
                    "reason": (
                        "One or more passport MRZ "
                        "checksums failed."
                    ),
                    "details": checks,
                }

            if valid_checks:

                return {
                    "failure": False,
                    "verified": True,
                    "risk": 0.0,
                    "reason": (
                        "Passport MRZ checksums verified."
                    ),
                    "details": checks,
                }

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "reason": (
                    "Passport MRZ was detected but "
                    "checksum verification was unavailable."
                ),
                "details": checks,
            }

        # --------------------------------------------------------------
        # Visa
        # --------------------------------------------------------------

        if document_type == "Visa":

            # Visa formats vary significantly by issuing country,
            # so no universal checksum is invented here.
            #
            # Structural and field checks are handled elsewhere.

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "reason": (
                    "No universal visa checksum rule was "
                    "applied. Structural and field validation "
                    "were used instead."
                ),
            }

        return {
            "failure": False,
            "verified": False,
            "risk": 0.0,
            "reason": "No checksum rule available.",
        }

    # ==================================================================
    # AADHAAR VERHOEFF
    # ==================================================================

    def _verhoeff_validate(
        self,
        number: str,
    ) -> bool:

        if not re.fullmatch(
            r"\d{12}",
            number,
        ):
            return False

        multiplication_table = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
            [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
            [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
            [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
            [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
            [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
            [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
            [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
            [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
        ]

        permutation_table = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            [0, 5, 7, 6, 2, 8, 3, 0, 9, 1],
            [0, 6, 3, 5, 1, 9, 2, 8, 0, 4],
            [0, 9, 8, 2, 7, 0, 1, 4, 3, 6],
            [0, 4, 1, 7, 6, 5, 9, 3, 8, 2],
            [0, 2, 9, 6, 3, 8, 0, 1, 4, 7],
            [0, 3, 0, 9, 5, 4, 8, 6, 1, 2],
            [0, 7, 4, 3, 1, 2, 6, 9, 5, 8],
        ]

        inverse_table = [
            0,
            4,
            3,
            2,
            1,
            5,
            6,
            7,
            8,
            9,
        ]

        check = 0

        reversed_digits = list(
            map(
                int,
                reversed(number),
            )
        )

        for position, digit in enumerate(
            reversed_digits
        ):

            permutation = (
                permutation_table[
                    position % 8
                ][digit]
            )

            check = multiplication_table[
                check
            ][permutation]

        return check == 0

    # ==================================================================
    # PASSPORT MRZ
    # ==================================================================

    def _extract_passport_mrz(
        self,
        raw_text: str,
    ) -> list[str]:

        candidates = []

        for raw_line in raw_text.splitlines():

            line = (
                raw_line
                .replace(" ", "")
                .strip()
                .upper()
            )

            if not line:
                continue

            # MRZ contains < filler characters and is generally
            # composed almost entirely of A-Z, 0-9 and <.
            if "<" in line:

                cleaned = re.sub(
                    r"[^A-Z0-9<]",
                    "",
                    line,
                )

                if len(cleaned) >= 30:

                    candidates.append(
                        cleaned
                    )

        return candidates

    def _mrz_field_check(
        self,
        value: str,
        check_digit: str,
        field_name: str,
    ) -> dict:

        if len(value) == 0:
            return {
                "field": field_name,
                "verified": False,
                "failure": False,
                "reason": "Field unavailable.",
            }

        if not check_digit.isdigit():
            return {
                "field": field_name,
                "verified": False,
                "failure": False,
                "reason": "Check digit unavailable.",
            }

        calculated = self._icao_checksum(
            value
        )

        actual = int(check_digit)

        return {
            "field": field_name,
            "verified": True,
            "failure": calculated != actual,
            "calculated": calculated,
            "actual": actual,
        }

    def _icao_checksum(
        self,
        value: str,
    ) -> int:

        weights = [7, 3, 1]

        total = 0

        for index, char in enumerate(
            value
        ):

            if char.isdigit():

                number = int(char)

            elif "A" <= char <= "Z":

                number = (
                    ord(char)
                    - ord("A")
                    + 10
                )

            elif char == "<":

                number = 0

            else:

                number = 0

            total += (
                number
                * weights[index % 3]
            )

        return total % 10

    # ==================================================================
    # STRUCTURAL VALIDATION
    # ==================================================================

    def _structural_validation(
        self,
        fields: dict[str, Any],
        raw_text: str,
        document_type: str,
    ) -> dict:

        raw_upper = raw_text.upper()

        if not raw_text.strip():

            return {
                "failure": True,
                "verified": False,
                "risk": 1.0,
                "reason": "No OCR text available.",
            }

        # --------------------------------------------------------------
        # Aadhaar
        # --------------------------------------------------------------

        if document_type == "Aadhar Card":

            number = self._digits_only(
                fields.get(
                    "documentNumber",
                    "",
                )
            )

            has_aadhaar_signal = bool(
                re.search(
                    r"\b(?:VID|DOB|AADHAAR|AADHAR)\b",
                    raw_upper,
                )
            )

            has_12_digit_number = bool(
                re.search(
                    r"\b\d{4}\s*\d{4}\s*\d{4}\b",
                    raw_text,
                )
            ) or len(number) == 12

            if (
                has_aadhaar_signal
                or has_12_digit_number
            ):

                return {
                    "failure": False,
                    "verified": True,
                    "risk": 0.0,
                    "reason": (
                        "Aadhaar structural indicators detected."
                    ),
                }

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "reason": (
                    "Aadhaar structure could not be "
                    "strongly verified from OCR."
                ),
            }

        # --------------------------------------------------------------
        # Passport
        # --------------------------------------------------------------

        if document_type == "Passport":

            mrz = self._extract_passport_mrz(
                raw_text
            )

            if len(mrz) >= 2:

                first = mrz[-2]
                second = mrz[-1]

                # TD3 passport MRZ normally contains two
                # 44-character lines.
                if (
                    len(first) == 44
                    and len(second) == 44
                ):

                    if first.startswith("P<"):

                        return {
                            "failure": False,
                            "verified": True,
                            "risk": 0.0,
                            "reason": (
                                "Valid-looking TD3 passport MRZ structure detected."
                            ),
                        }

                    return {
                        "failure": True,
                        "verified": True,
                        "risk": 0.8,
                        "reason": (
                            "MRZ detected but passport "
                            "document-code structure is invalid."
                        ),
                    }

                return {
                    "failure": False,
                    "verified": True,
                    "risk": 0.25,
                    "reason": (
                        "Passport MRZ detected but OCR "
                        "line structure is imperfect."
                    ),
                }

            # OCR may completely miss MRZ.
            # Do NOT call the passport invalid solely because of this.

            passport_signal = any(
                term in raw_upper
                for term in (
                    "PASSPORT",
                    "REPUBLIC",
                    "NATIONALITY",
                    "DATE OF BIRTH",
                )
            )

            if passport_signal:

                return {
                    "failure": False,
                    "verified": False,
                    "risk": 0.0,
                    "reason": (
                        "Passport indicators detected, "
                        "but MRZ was not sufficiently extracted."
                    ),
                }

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "reason": (
                    "Passport structure could not be "
                    "strongly verified from OCR."
                ),
            }

        # --------------------------------------------------------------
        # Visa
        # --------------------------------------------------------------

        if document_type == "Visa":

            visa_signal = any(
                term in raw_upper
                for term in (
                    "VISA",
                    "ENTRY",
                    "VALID UNTIL",
                    "VALID FROM",
                    "ISSUED",
                )
            )

            if visa_signal:

                return {
                    "failure": False,
                    "verified": True,
                    "risk": 0.0,
                    "reason": (
                        "Visa structural indicators detected."
                    ),
                }

            return {
                "failure": False,
                "verified": False,
                "risk": 0.0,
                "reason": (
                    "Visa structure could not be "
                    "strongly verified from OCR."
                ),
            }

        return {
            "failure": False,
            "verified": False,
            "risk": 0.0,
            "reason": "No document-specific structure available.",
        }

    # ==================================================================
    # INTERNAL CONSISTENCY
    # ==================================================================

    def _internal_consistency(
        self,
        fields: dict[str, Any],
        raw_text: str,
        document_type: str,
    ) -> dict:

        issues: list[str] = []

        # --------------------------------------------------------------
        # Date consistency
        # --------------------------------------------------------------

        dob = self._parse_date(
            fields.get(
                "dateOfBirth",
                "",
            )
        )

        expiry = self._parse_date(
            fields.get(
                "expiryDate",
                "",
            )
        )

        issue_date = self._parse_date(
            fields.get(
                "issueDate",
                "",
            )
        )

        today = date.today()

        if dob and dob >= today:

            issues.append(
                "Date of birth is in the future."
            )

        if issue_date and expiry:

            if expiry <= issue_date:

                issues.append(
                    "Expiry date is not after issue date."
                )

        # --------------------------------------------------------------
        # Name consistency with OCR text
        # --------------------------------------------------------------

        name = str(
            fields.get(
                "name",
                "",
            )
        ).strip()

        if name and raw_text:

            normalized_name = re.sub(
                r"[^A-Z]",
                "",
                name.upper(),
            )

            normalized_text = re.sub(
                r"[^A-Z]",
                "",
                raw_text.upper(),
            )

            # Only flag when enough characters exist.
            # Short OCR names are too unreliable.
            if (
                len(normalized_name) >= 5
                and normalized_name
                not in normalized_text
            ):

                # Don't immediately declare failure.
                # OCR can split/reorder words.
                issues.append(
                    "Extracted name was not found "
                    "verbatim in OCR text."
                )

        # --------------------------------------------------------------
        # Aadhaar number consistency
        # --------------------------------------------------------------

        if document_type == "Aadhar Card":

            number = self._digits_only(
                fields.get(
                    "documentNumber",
                    "",
                )
            )

            if number:

                compact_text = re.sub(
                    r"\D",
                    "",
                    raw_text,
                )

                if (
                    len(number) == 12
                    and number
                    not in compact_text
                ):

                    issues.append(
                        "Extracted Aadhaar number "
                        "was not found consistently in OCR text."
                    )

        # --------------------------------------------------------------
        # Passport consistency
        # --------------------------------------------------------------

        if document_type == "Passport":

            number = re.sub(
                r"[^A-Z0-9]",
                "",
                str(
                    fields.get(
                        "documentNumber",
                        "",
                    )
                ).upper(),
            )

            if number and raw_text:

                compact_text = re.sub(
                    r"[^A-Z0-9]",
                    "",
                    raw_text.upper(),
                )

                # OCR may use < instead of characters, therefore
                # this is only a weak consistency indicator.
                if (
                    len(number) >= 6
                    and number
                    not in compact_text
                ):

                    issues.append(
                        "Passport number was not "
                        "found consistently in OCR text."
                    )

        # --------------------------------------------------------------
        # Risk calculation
        # --------------------------------------------------------------

        if not issues:

            return {
                "failure": False,
                "risk": 0.0,
                "issues": [],
            }

        # Internal consistency issues are not all equally severe.
        # Two or more independent contradictions are stronger evidence.
        risk = min(
            1.0,
            0.35 * len(issues),
        )

        return {
            "failure": True,
            "risk": round(
                risk,
                4,
            ),
            "issues": issues,
        }

    # ==================================================================
    # VERIFICATION SUMMARY
    # ==================================================================

    def _verification_summary(
        self,
        checksum: dict,
        expiry: dict,
        structural: dict,
        format_violations: list[str],
        missing_fields: list[str],
        consistency: dict,
    ) -> dict:

        verified_checks = 0
        failed_checks = 0

        for result in (
            checksum,
            expiry,
            structural,
        ):

            if result.get(
                "verified",
                False,
            ):

                verified_checks += 1

                if result.get(
                    "failure",
                    False,
                ):

                    failed_checks += 1

        if format_violations:
            failed_checks += 1

        if consistency.get(
            "failure",
            False,
        ):
            failed_checks += 1

        if failed_checks:
            status = "Attention Required"

        elif missing_fields:
            status = "Incomplete Verification"

        elif verified_checks:
            status = "Verification Passed"

        else:
            status = "Limited Verification"

        return {
            "status": status,
            "verifiedChecks": verified_checks,
            "failedChecks": failed_checks,
            "missingFields": len(
                missing_fields
            ),
        }

    # ==================================================================
    # UTILITY FUNCTIONS
    # ==================================================================

    def _digits_only(
        self,
        value: Any,
    ) -> str:

        return re.sub(
            r"\D",
            "",
            str(value or ""),
        )