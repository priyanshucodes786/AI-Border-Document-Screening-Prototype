from backend.ocr.ocr_engine import OCREngine


def test_ocr_engine_defers_model_load_until_extraction():
    engine = OCREngine()
    assert engine.ocr is None
