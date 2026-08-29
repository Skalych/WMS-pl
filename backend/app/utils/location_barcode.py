"""Encode/decode location verification barcodes (prefix 90)."""

from __future__ import annotations

import re


_LOCATION_CODE_RE = re.compile(r"^(\d+)-(\d+)-(\d+)$")


def parse_location_code(code: str) -> tuple[int, int, int]:
    """Parse X-Y-Z from location code like '37-10-1' (aisle-floor-shelf)."""
    match = _LOCATION_CODE_RE.match(code.strip())
    if not match:
        raise ValueError(f"Invalid location code format: {code}")
    aisle, floor_y, shelf = (int(match.group(i)) for i in range(1, 4))
    return aisle, floor_y, shelf


def encode_location_barcode(aisle: int, floor_y: int, shelf: int) -> str:
    """Build verification barcode: 90 + X(2) + Y(2) + Z(2), e.g. 37-30-3 → 90373003."""
    return f"90{aisle:02d}{floor_y:02d}{shelf:02d}"


def encode_location_barcode_from_code(location_code: str) -> str:
    aisle, floor_y, shelf = parse_location_code(location_code)
    return encode_location_barcode(aisle, floor_y, shelf)


def location_barcode_matches(location_code: str, scanned_barcode: str) -> bool:
    expected = encode_location_barcode_from_code(location_code)
    return scanned_barcode.strip() == expected
