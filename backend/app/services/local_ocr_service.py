"""本地 OCR：RapidOCR 主路径 + EasyOCR 子进程兜底（源自 guanggao 项目）。"""

from __future__ import annotations

import asyncio
import io
import logging
import multiprocessing as mp
from typing import Any

logger = logging.getLogger(__name__)

_rapid_ocr: Any = None
_easyocr_reader: Any = None

OCR_TIMEOUT_SEC = 30.0


def _get_rapid_ocr():
    global _rapid_ocr
    if _rapid_ocr is None:
        from rapidocr_onnxruntime import RapidOCR

        _rapid_ocr = RapidOCR()
    return _rapid_ocr


def preprocess_image(image_bytes: bytes) -> bytes:
    from PIL import Image, ImageEnhance

    im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = im.size
    max_side = 1600
    longest = max(w, h)
    if longest > max_side:
        scale = max_side / longest
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(1.2)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def ocr_image_bytes_rapid(image_bytes: bytes) -> str:
    import numpy as np
    from PIL import Image

    im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(im)
    result, _ = _get_rapid_ocr()(arr)
    if not result:
        raise ValueError("图片中未识别到文字")
    lines = [str(row[1]).strip() for row in result if len(row) > 1 and str(row[1]).strip()]
    text = "\n".join(lines).strip()
    if not text:
        raise ValueError("图片中未识别到文字")
    return text


def _get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        import easyocr

        _easyocr_reader = easyocr.Reader(["ch_sim", "en"], gpu=False, verbose=False)
    return _easyocr_reader


def ocr_image_bytes_easyocr(image_bytes: bytes) -> str:
    import numpy as np
    from PIL import Image

    im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(im)
    hits = _get_easyocr_reader().readtext(arr, paragraph=False)
    lines = [str(h[1]).strip() for h in hits if len(h) > 1 and str(h[1]).strip()]
    text = "\n".join(lines).strip()
    if not text:
        raise ValueError("图片中未识别到文字")
    return text


def _easyocr_worker(image_bytes: bytes, queue: Any) -> None:
    try:
        text = ocr_image_bytes_easyocr(image_bytes)
        queue.put(("ok", text))
    except Exception as exc:
        queue.put(("err", str(exc)))


def run_easyocr_isolated(image_bytes: bytes, timeout_sec: float = OCR_TIMEOUT_SEC) -> tuple[str, dict[str, Any]]:
    ctx = mp.get_context("spawn")
    queue: mp.Queue = ctx.Queue()
    proc = ctx.Process(target=_easyocr_worker, args=(image_bytes, queue), daemon=True)
    proc.start()
    proc.join(timeout=timeout_sec)
    meta: dict[str, Any] = {}

    if proc.is_alive():
        proc.terminate()
        proc.join(3)
        if proc.is_alive():
            proc.kill()
            proc.join(2)
        meta["easyocr_error"] = "timeout"
        return "", meta

    if proc.exitcode not in (0, None):
        meta["easyocr_error"] = f"crashed:{proc.exitcode}"
        return "", meta

    try:
        status, payload = queue.get_nowait()
    except Exception:
        meta["easyocr_error"] = "no_result"
        return "", meta

    if status == "ok" and isinstance(payload, str) and len(payload) >= 2:
        meta["ocr_engine"] = "easyocr"
        return payload, meta
    meta["easyocr_error"] = str(payload)
    return "", meta


def ocr_image_bytes(image_bytes: bytes) -> tuple[str, str]:
    """同步 OCR：RapidOCR → EasyOCR 子进程。"""
    processed = preprocess_image(image_bytes)
    try:
        text = ocr_image_bytes_rapid(processed)
        if len(text) >= 2:
            return text, "rapidocr"
    except Exception as exc:
        logger.warning("RapidOCR failed: %s", exc)

    text, meta = run_easyocr_isolated(processed)
    if text:
        return text, meta.get("ocr_engine", "easyocr")
    raise ValueError(meta.get("easyocr_error") or "图片识别失败")


async def ocr_image_bytes_async(image_bytes: bytes) -> tuple[str, str]:
    return await asyncio.to_thread(ocr_image_bytes, image_bytes)


def extract_pdf_text(file_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    parts = [(page.extract_text() or "").strip() for page in reader.pages]
    return "\n".join(p for p in parts if p).strip()


def ocr_pdf_scanned(file_bytes: bytes, max_pages: int = 5) -> tuple[str, str]:
    """扫描件 PDF：逐页渲染为图片后 OCR。"""
    import fitz

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    texts: list[str] = []
    engine = "rapidocr"
    try:
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("png")
            page_text, page_engine = ocr_image_bytes(img_bytes)
            if page_text:
                texts.append(page_text)
                engine = page_engine
    finally:
        doc.close()

    combined = "\n\n".join(texts).strip()
    if not combined:
        raise ValueError("扫描 PDF 未识别到文字")
    return combined, engine


def is_ocr_available() -> bool:
    try:
        import rapidocr_onnxruntime  # noqa: F401

        return True
    except ImportError:
        return False
