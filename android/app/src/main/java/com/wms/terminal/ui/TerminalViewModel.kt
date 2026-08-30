package com.wms.terminal.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.wms.terminal.data.ApiClient
import com.wms.terminal.data.AvailableTaskDto
import com.wms.terminal.data.ConfirmQuantityRequest
import com.wms.terminal.data.LoginRequest
import com.wms.terminal.data.ScanRequest
import com.wms.terminal.data.SessionDto
import com.wms.terminal.data.TokenStore
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

enum class AppScreen {
    Login, Home, TaskList, Picking,
}

data class TerminalUiState(
    val screen: AppScreen = AppScreen.Login,
    val loading: Boolean = false,
    val error: String? = null,
    val statusMessage: String? = null,
    val clockedIn: Boolean = false,
    val hasActiveSession: Boolean = false,
    val showShiftDialog: Boolean = false,
    val showEndShiftConfirm: Boolean = false,
    val tasks: List<AvailableTaskDto> = emptyList(),
    val session: SessionDto? = null,
    val willPickQuantity: String = "",
    val showExitConfirm: Boolean = false,
)

class TerminalViewModel(app: Application) : AndroidViewModel(app) {
    private val tokenStore = TokenStore(app)
    private var token: String? = tokenStore.getToken()
    private val api = ApiClient.create { token }

    private val _state = MutableStateFlow(
        TerminalUiState(
            screen = if (token != null) AppScreen.Home else AppScreen.Login,
        ),
    )
    val state: StateFlow<TerminalUiState> = _state.asStateFlow()

    init {
        if (token != null) {
            refreshHomeStatus()
        }
    }

    fun login(email: String, pin: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = api.login(LoginRequest(email.trim(), pin))
                token = response.accessToken
                tokenStore.saveToken(response.accessToken)
                _state.value = _state.value.copy(loading = false, screen = AppScreen.Home)
                refreshHomeStatus()
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = friendlyError(e, "Login failed"))
            }
        }
    }

    fun logout() {
        token = null
        tokenStore.clear()
        _state.value = TerminalUiState(screen = AppScreen.Login)
    }

    fun openShiftDialog() {
        _state.value = _state.value.copy(showShiftDialog = true, showEndShiftConfirm = false)
    }

    fun dismissShiftDialog() {
        _state.value = _state.value.copy(showShiftDialog = false, showEndShiftConfirm = false)
    }

    fun requestEndShift() {
        _state.value = _state.value.copy(showEndShiftConfirm = true)
    }

    fun dismissEndShiftConfirm() {
        _state.value = _state.value.copy(showEndShiftConfirm = false)
    }

    fun clockIn() = clock(shiftIn = true)

    fun clockOut() = clock(shiftIn = false)

    private fun clock(shiftIn: Boolean) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val result = if (shiftIn) api.clockIn() else api.clockOut()
                _state.value = _state.value.copy(
                    loading = false,
                    clockedIn = shiftIn,
                    statusMessage = if (shiftIn) "Shift started" else "Shift ended: ${result.event}",
                    showShiftDialog = false,
                    showEndShiftConfirm = false,
                )
                refreshShiftStatus()
            } catch (e: Exception) {
                if (handleAuthFailure(e)) return@launch
                _state.value = _state.value.copy(
                    loading = false,
                    error = friendlyError(e, "Clock action failed"),
                )
            }
        }
    }

    fun refreshHomeStatus() {
        viewModelScope.launch {
            refreshShiftStatus()
            refreshActiveSessionFlag()
        }
    }

    private suspend fun refreshShiftStatus() {
        try {
            val status = api.shiftStatus()
            _state.value = _state.value.copy(clockedIn = status.clockedIn)
        } catch (e: Exception) {
            if (handleAuthFailure(e)) return
            // Keep previous clockedIn; surface soft error only when on Home.
            if (_state.value.screen == AppScreen.Home) {
                _state.value = _state.value.copy(
                    error = friendlyError(e, "Could not load shift status"),
                )
            }
        }
    }

    private suspend fun refreshActiveSessionFlag() {
        try {
            val session = api.currentSession().body()
            val active = session != null && session.step != "COMPLETED"
            _state.value = _state.value.copy(hasActiveSession = active)
        } catch (e: Exception) {
            if (handleAuthFailure(e)) return
            _state.value = _state.value.copy(hasActiveSession = false)
        }
    }

    fun openPicking() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val session = api.currentSession().body()
                if (session != null && session.step != "COMPLETED") {
                    openSession(session)
                } else {
                    val tasks = api.availableTasks()
                    _state.value = _state.value.copy(
                        loading = false,
                        screen = AppScreen.TaskList,
                        tasks = tasks,
                        hasActiveSession = false,
                    )
                }
            } catch (e: Exception) {
                if (handleAuthFailure(e)) return@launch
                _state.value = _state.value.copy(
                    loading = false,
                    error = friendlyError(e, "Failed to load tasks"),
                )
            }
        }
    }

    fun claimTask(taskId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val session = api.claimTask(taskId)
                openSession(session)
            } catch (e: Exception) {
                if (handleAuthFailure(e)) return@launch
                _state.value = _state.value.copy(
                    loading = false,
                    error = friendlyError(e, "Could not claim task"),
                )
            }
        }
    }

    fun onScan(barcode: String) {
        val session = _state.value.session ?: return
        when (session.step) {
            "QUANTITY_CONFIRM", "COMPLETED" -> return
            else -> submitScan(barcode)
        }
    }

    fun submitScan(barcode: String) {
        val session = _state.value.session ?: return
        if (session.step == "QUANTITY_CONFIRM" || session.step == "COMPLETED") return

        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val updated = api.scan(ScanRequest(barcode))
                handleSessionAfterAction(updated)
            } catch (e: Exception) {
                if (handleAuthFailure(e)) return@launch
                _state.value = _state.value.copy(
                    loading = false,
                    error = friendlyError(e, "Scan rejected"),
                )
            }
        }
    }

    fun updateWillPick(value: String) {
        _state.value = _state.value.copy(willPickQuantity = value)
    }

    fun confirmQuantity() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            confirmQuantityInternal()
        }
    }

    private suspend fun confirmQuantityInternal() {
        val qtyText = _state.value.willPickQuantity.ifBlank {
            _state.value.session?.quantityDefault?.toString() ?: "0"
        }
        val qty = qtyText.toDoubleOrNull() ?: run {
            _state.value = _state.value.copy(loading = false, error = "Invalid quantity")
            return
        }
        try {
            val session = api.confirmQuantity(ConfirmQuantityRequest(qty))
            handleSessionAfterAction(session)
        } catch (e: Exception) {
            if (handleAuthFailure(e)) return
            _state.value = _state.value.copy(
                loading = false,
                error = friendlyError(e, "Quantity confirm failed"),
            )
        }
    }

    fun requestBackToHome() {
        _state.value = _state.value.copy(showExitConfirm = true)
    }

    fun dismissExitConfirm() {
        _state.value = _state.value.copy(showExitConfirm = false)
    }

    fun backToHome() {
        _state.value = _state.value.copy(
            screen = AppScreen.Home,
            session = null,
            error = null,
            showExitConfirm = false,
        )
        refreshHomeStatus()
    }

    private fun openSession(session: SessionDto) {
        _state.value = _state.value.copy(
            loading = false,
            screen = AppScreen.Picking,
            session = session,
            willPickQuantity = session.quantityDefault?.let { formatQty(it) } ?: "",
            error = null,
            hasActiveSession = session.step != "COMPLETED",
        )
    }

    private fun handleSessionAfterAction(session: SessionDto) {
        if (session.step == "COMPLETED") {
            _state.value = _state.value.copy(
                loading = false,
                screen = AppScreen.TaskList,
                session = null,
                statusMessage = "Task completed — scan next task",
                tasks = emptyList(),
                hasActiveSession = false,
            )
            openPicking()
            return
        }
        openSession(session)
    }

    private fun handleAuthFailure(e: Exception): Boolean {
        if (e !is HttpException || e.code() != 401) return false
        token = null
        tokenStore.clear()
        _state.value = TerminalUiState(
            screen = AppScreen.Login,
            error = "Session expired — please log in again",
        )
        return true
    }

    private fun friendlyError(e: Exception, fallback: String): String {
        when (e) {
            is HttpException -> {
                val detail = e.response()?.errorBody()?.string()?.takeIf { it.isNotBlank() }
                val code = e.code()
                return when {
                    !detail.isNullOrBlank() && detail.length < 200 -> "$fallback ($code): $detail"
                    else -> "$fallback (HTTP $code)"
                }
            }
            is ConnectException, is UnknownHostException ->
                return "Cannot reach server — is the backend running?"
            is SocketTimeoutException ->
                return "Server timed out — try again"
            is IOException ->
                return "Network error — check connection"
            else -> return fallback
        }
    }

    private fun formatQty(value: Double): String {
        return if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
    }
}
