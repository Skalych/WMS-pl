# WMS Android Picking Terminal

Kotlin + Jetpack Compose app for Zebra warehouse terminals.

## Setup

1. Open `android/` in Android Studio.
2. Set API URL in `app/build.gradle.kts` product flavor (`dev` uses emulator localhost `10.0.2.2:8000`).
3. Build & install on Zebra device.

## Flow

Login → Shift clock → Picking → Task list → Container scan → Location → SKU → Quantity → Buffer.

## Scanner

Uses Zebra **DataWedge** broadcast (`com.wms.terminal.SCAN`). Manual barcode field available for testing on emulator.
