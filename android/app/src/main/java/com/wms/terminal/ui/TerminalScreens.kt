package com.wms.terminal.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.wms.terminal.scanner.ZebraScannerManager

@Composable
fun TerminalApp(viewModel: TerminalViewModel) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    DisposableEffect(Unit) {
        val scanner = ZebraScannerManager(context) { barcode ->
            viewModel.onScan(barcode)
        }
        scanner.register()
        onDispose { scanner.unregister() }
    }

    if (state.showExitConfirm) {
        AlertDialog(
            onDismissRequest = viewModel::dismissExitConfirm,
            title = { Text("Leave picking?") },
            text = { Text("Your session will stay active. You can return later.") },
            confirmButton = {
                TextButton(onClick = viewModel::backToHome) { Text("Leave") }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissExitConfirm) { Text("Cancel") }
            },
        )
    }

    if (state.showEndShiftConfirm) {
        AlertDialog(
            onDismissRequest = viewModel::dismissEndShiftConfirm,
            title = { Text("End shift?") },
            text = { Text("Are you sure you want to end your shift?") },
            confirmButton = {
                TextButton(onClick = viewModel::clockOut) { Text("End shift") }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissEndShiftConfirm) { Text("Cancel") }
            },
        )
    }

    if (state.showShiftDialog && !state.showEndShiftConfirm) {
        AlertDialog(
            onDismissRequest = viewModel::dismissShiftDialog,
            title = { Text("Shift") },
            text = {
                Text(
                    if (state.clockedIn) "You are clocked in."
                    else "You are not clocked in.",
                )
            },
            confirmButton = {
                if (state.clockedIn) {
                    TextButton(onClick = viewModel::requestEndShift) { Text("End shift") }
                } else {
                    TextButton(onClick = viewModel::clockIn) { Text("Start shift") }
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissShiftDialog) { Text("Close") }
            },
        )
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (state.screen != AppScreen.Picking) {
                Text(
                    "WMS Terminal",
                    style = MaterialTheme.typography.headlineLarge,
                )
            }

            state.error?.let { StatusBanner(message = it, isError = true) }
            state.statusMessage?.let { StatusBanner(message = it, isError = false) }

            if (state.loading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            }

            when (state.screen) {
                AppScreen.Login -> LoginScreen(onLogin = viewModel::login)
                AppScreen.Home -> HomeScreen(
                    clockedIn = state.clockedIn,
                    hasActiveSession = state.hasActiveSession,
                    onOpenShift = viewModel::openShiftDialog,
                    onPicking = viewModel::openPicking,
                    onLogout = viewModel::logout,
                )
                AppScreen.TaskList -> TaskListScreen(
                    tasks = state.tasks,
                    onClaim = viewModel::claimTask,
                    onRefresh = viewModel::refreshTasks,
                    onBack = viewModel::requestBackToHome,
                )
                AppScreen.Picking -> PickingScreen(
                    session = state.session,
                    willPick = state.willPickQuantity,
                    onWillPickChange = viewModel::updateWillPick,
                    onScan = viewModel::submitScan,
                    onConfirmQty = viewModel::confirmQuantity,
                    onBack = viewModel::requestBackToHome,
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "Sign in to continue",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = TerminalCorner,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        )
        OutlinedTextField(
            value = pin,
            onValueChange = { pin = it },
            label = { Text("PIN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = TerminalCorner,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onLogin(email, pin) }),
        )
        Spacer(Modifier.height(4.dp))
        TerminalPrimaryButton(text = "Login", onClick = { onLogin(email, pin) })
    }
}

@Composable
private fun HomeScreen(
    clockedIn: Boolean,
    hasActiveSession: Boolean,
    onOpenShift: () -> Unit,
    onPicking: () -> Unit,
    onLogout: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = TerminalCorner,
            colors = CardDefaults.cardColors(
                containerColor = if (clockedIn) {
                    MaterialTheme.colorScheme.primaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceVariant
                },
            ),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    if (clockedIn) "Shift: clocked in" else "Shift: not clocked in",
                    style = MaterialTheme.typography.titleLarge,
                    color = if (clockedIn) {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Text(
                    "Tap Shift to start or end your shift.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        TerminalSecondaryButton(text = "Shift…", onClick = onOpenShift)

        Spacer(Modifier.height(4.dp))
        Text("Sphere", style = MaterialTheme.typography.headlineMedium)

        if (hasActiveSession) {
            TerminalPrimaryButton(text = "Continue picking", onClick = onPicking)
            Text(
                "You have an unfinished pick session.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            TerminalPrimaryButton(text = "Picking", onClick = onPicking)
        }

        Spacer(Modifier.weight(1f))
        TerminalDangerButton(text = "Logout", onClick = onLogout)
    }
}

@Composable
private fun TaskListScreen(
    tasks: List<com.wms.terminal.data.AvailableTaskDto>,
    onClaim: (String) -> Unit,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ScreenHeader(title = "Micro-tasks", onBack = onBack)
        TerminalSecondaryButton(text = "Refresh", onClick = onRefresh)

        if (tasks.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = TerminalCorner,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Text(
                    "No available tasks.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(20.dp),
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(tasks) { task ->
                    TaskCard(
                        title = task.taskNumber,
                        subtitle = "${task.itemCount} lines · qty ${task.totalQuantity}",
                        onClick = { onClaim(task.taskId) },
                    )
                }
            }
        }
    }
}

@Composable
private fun PickingScreen(
    session: com.wms.terminal.data.SessionDto?,
    willPick: String,
    onWillPickChange: (String) -> Unit,
    onScan: (String) -> Unit,
    onConfirmQty: () -> Unit,
    onBack: () -> Unit,
) {
    if (session == null) {
        Text("No active session", style = MaterialTheme.typography.bodyLarge)
        return
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ScreenHeader(title = "Picking", onBack = onBack)
        PickingMeta(session)

        val scanKey = "${session.step}:${session.locationCode}:${session.productSku}"
        key(scanKey) {
            when (session.step) {
                "CONTAINER_SCAN" -> ContainerStep(scanKey, onScan)
                "GO_TO_LOCATION", "LOCATION_VERIFY" -> LocationStep(session.locationCode, scanKey, onScan)
                "SKU_SCAN" -> SkuStep(session, scanKey, onScan)
                "QUANTITY_CONFIRM" -> QuantityStep(session, willPick, onWillPickChange, onConfirmQty)
                "BUFFER_SCAN" -> BufferStep(scanKey, onScan)
                "COMPLETED" -> CompletedStep()
            }
        }
    }
}

@Composable
private fun PickingMeta(session: com.wms.terminal.data.SessionDto) {
    val parts = buildList {
        session.taskNumber?.let { add("Task $it") }
        session.containerBarcode?.let { add("Container $it") }
    }
    if (parts.isNotEmpty()) {
        Text(
            parts.joinToString(" · "),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ScanInput(
    scanKey: String,
    label: String,
    onSubmit: (String) -> Unit,
) {
    key(scanKey) {
        var value by remember { mutableStateOf("") }
        OutlinedTextField(
            value = value,
            onValueChange = { value = it },
            label = { Text(label) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = TerminalCorner,
            textStyle = MaterialTheme.typography.bodyLarge,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                if (value.isNotBlank()) {
                    onSubmit(value.trim())
                    value = ""
                }
            }),
        )
    }
}

@Composable
private fun StepCard(content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = TerminalCorner,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = { content() },
        )
    }
}

@Composable
private fun ContainerStep(scanKey: String, onScan: (String) -> Unit) {
    StepCard {
        StepLabel("Container")
        MainValue("Scan sticker")
        ScanInput(scanKey = scanKey, label = "Container barcode", onSubmit = onScan)
    }
}

@Composable
private fun LocationStep(locationCode: String?, scanKey: String, onScan: (String) -> Unit) {
    StepCard {
        StepLabel("Location")
        MainValue(locationCode?.ifBlank { "—" } ?: "—")
        ScanInput(scanKey = scanKey, label = "Scan location barcode", onSubmit = onScan)
    }
}

@Composable
private fun SkuStep(
    session: com.wms.terminal.data.SessionDto,
    scanKey: String,
    onScan: (String) -> Unit,
) {
    StepCard {
        ContextLine("Location", session.locationCode?.ifBlank { "—" } ?: "—")
        StepLabel("Product")
        MainValue(session.productSku?.ifBlank { "—" } ?: "—")
        ScanInput(scanKey = scanKey, label = "Scan product barcode", onSubmit = onScan)
    }
}

@Composable
private fun QuantityStep(
    session: com.wms.terminal.data.SessionDto,
    willPick: String,
    onWillPickChange: (String) -> Unit,
    onConfirmQty: () -> Unit,
) {
    StepCard {
        ContextLine("Location", session.locationCode?.ifBlank { "—" } ?: "—")
        ContextLine("SKU", session.productSku?.ifBlank { "—" } ?: "—")
        StepLabel("Quantity")

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "To pick",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    formatQtyDisplay(session.quantityRemaining),
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Picking",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.End,
                )
                OutlinedTextField(
                    value = willPick,
                    onValueChange = onWillPickChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = TerminalCorner,
                    textStyle = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.End,
                    ),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { onConfirmQty() }),
                )
            }
        }

        Text(
            "Change only if picking less than required.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        TerminalPrimaryButton(text = "Confirm pick", onClick = onConfirmQty)
    }
}

@Composable
private fun BufferStep(scanKey: String, onScan: (String) -> Unit) {
    StepCard {
        StepLabel("Buffer")
        MainValue("Scan buffer")
        ScanInput(scanKey = scanKey, label = "Scan buffer barcode", onSubmit = onScan)
    }
}

@Composable
private fun CompletedStep() {
    StepCard {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("Done", style = MaterialTheme.typography.displayLarge)
            Text(
                "Returning to task list…",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun formatQtyDisplay(value: Double?): String {
    if (value == null) return "0"
    return if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
}
