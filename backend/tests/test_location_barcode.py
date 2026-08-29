"""Tests for location barcode encoding."""
from app.utils.location_barcode import (
    encode_location_barcode,
    encode_location_barcode_from_code,
    location_barcode_matches,
)


def test_encode_37_30_3():
    assert encode_location_barcode(37, 30, 3) == "90373003"
    assert encode_location_barcode_from_code("37-30-3") == "90373003"


def test_encode_10_10_25():
    assert encode_location_barcode(10, 10, 25) == "90101025"
    assert encode_location_barcode_from_code("10-10-25") == "90101025"


def test_encode_01_10_1():
    assert encode_location_barcode(1, 10, 1) == "90011001"
    assert encode_location_barcode_from_code("01-10-1") == "90011001"


def test_location_barcode_matches():
    assert location_barcode_matches("10-10-25", "90101025")
    assert not location_barcode_matches("10-10-25", "90101026")
