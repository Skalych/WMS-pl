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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class AppScreen {
    Login, Home, TaskList, Picking,
}

data class TerminalUiState(
    val screen: AppScreen = AppScreen.Login,
    val loading: Boolean = false,
    val error: String? = null,
    val statusMessage: String? = null,
    val tasks: List<AvailableTaskDto> = emptyList(),
    val session: SessionDto? = null,
    val willPickQuantity: String = "",
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

    fun login(email: String, pin: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val response = api.login(LoginRequest(email.trim(), pin))
                token = response.accessToken
                tokenStore.saveToken(response.accessToken)
                _state.value = _state.value.copy(loading = false, screen = AppScreen.Home)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Login failed")
            }
        }
    }

    fun logout() {
        token = null
        tokenStore.clear()
        _state.value = TerminalUiState(screen = AppScreen.Login)
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
                    statusMessage = if (shiftIn) "Shift started" else "Shift ended: ${result.event}",
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Clock action failed")
            }
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
                    )
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Failed to load tasks")
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
                _state.value = _state.value.copy(loading = false, error = "Could not claim task")
            }
        }
    }

    fun advanceLocation() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                openSession(api.advanceLocation())
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Advance failed")
            }
        }
    }

    fun onScan(barcode: String) {
        val session = _state.value.session ?: return
        when (session.step) {
            "GO_TO_LOCATION" -> return
            "QUANTITY_CONFIRM" -> return
            "COMPLETED" -> return
            else -> submitScan(barcode)
        }
    }

    fun submitScan(barcode: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val session = api.scan(ScanRequest(barcode))
                handleSessionAfterAction(session)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Scan rejected")
            }
        }
    }

    fun updateWillPick(value: String) {
        _state.value = _state.value.copy(willPickQuantity = value)
    }

    fun confirmQuantity() {
        val qtyText = _state.value.willPickQuantity.ifBlank {
            _state.value.session?.quantityDefault?.toString() ?: "0"
        }
        val qty = qtyText.toDoubleOrNull() ?: run {
            _state.value = _state.value.copy(error = "Invalid quantity")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val session = api.confirmQuantity(ConfirmQuantityRequest(qty))
                handleSessionAfterAction(session)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = "Quantity confirm failed")
            }
        }
    }

    fun backToHome() {
        _state.value = _state.value.copy(screen = AppScreen.Home, session = null, error = null)
    }

    private fun openSession(session: SessionDto) {
        _state.value = _state.value.copy(
            loading = false,
            screen = AppScreen.Picking,
            session = session,
            willPickQuantity = session.quantityDefault?.let { formatQty(it) } ?: "",
            error = null,
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
            )
            openPicking()
            return
        }
        openSession(session)
    }

    private fun formatQty(value: Double): String {
        return if (value % 1.0 == 0.0) "${value.toInt()}.0" else value.toString()
    }
}
