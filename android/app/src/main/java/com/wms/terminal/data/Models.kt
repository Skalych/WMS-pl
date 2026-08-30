package com.wms.terminal.data

import com.google.gson.annotations.SerializedName

data class LoginRequest(val email: String, val pin: String)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
)

data class SphereDto(val id: String, val label: String)

data class AvailableTaskDto(
    @SerializedName("task_id") val taskId: String,
    @SerializedName("task_number") val taskNumber: String,
    @SerializedName("item_count") val itemCount: Int,
    @SerializedName("total_quantity") val totalQuantity: Double,
)

data class SessionDto(
    @SerializedName("session_id") val sessionId: String?,
    val step: String,
    @SerializedName("task_id") val taskId: String?,
    @SerializedName("task_number") val taskNumber: String?,
    @SerializedName("location_code") val locationCode: String?,
    @SerializedName("product_sku") val productSku: String?,
    @SerializedName("quantity_to_pick") val quantityToPick: Double?,
    @SerializedName("quantity_remaining") val quantityRemaining: Double?,
    @SerializedName("quantity_default") val quantityDefault: Double?,
    @SerializedName("container_barcode") val containerBarcode: String?,
    val message: String?,
)

data class ScanRequest(val barcode: String)

data class ConfirmQuantityRequest(val quantity: Double)

data class ShiftClockResponse(val status: String, val event: String)

data class ShiftStatusDto(
    @SerializedName("has_open_shift") val hasOpenShift: Boolean,
    @SerializedName("clocked_in") val clockedIn: Boolean,
    @SerializedName("shift_id") val shiftId: String?,
)
