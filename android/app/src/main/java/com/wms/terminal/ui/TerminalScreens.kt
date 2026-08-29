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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.unit.sp
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

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Top,
        ) {
            if (state.screen != AppScreen.Picking) {
                Text("WMS Terminal", fontSize = 28.sp, modifier = Modifier.padding(bottom = 8.dp))
            }
            state.statusMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
            }
            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(bottom = 8.dp))
            }
            if (state.loading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            }

            when (state.screen) {
                AppScreen.Login -> LoginScreen(onLogin = viewModel::login)
                AppScreen.Home -> HomeScreen(
                    onClockIn = viewModel::clockIn,
                    onClockOut = viewModel::clockOut,
                    onPicking = viewModel::openPicking,
                    onLogout = viewModel::logout,
                )
                AppScreen.TaskList -> TaskListScreen(
                    tasks = state.tasks,
                    onClaim = viewModel::claimTask,
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
    Column {
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = pin,
            onValueChange = { pin = it },
            label = { Text("PIN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onLogin(email, pin) }),
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = { onLogin(email, pin) }, modifier = Modifier.fillMaxWidth()) {
            Text("Login", fontSize = 20.sp)
        }
    }
}

@Composable
private fun HomeScreen(
    onClockIn: () -> Unit,
    onClockOut: () -> Unit,
    onPicking: () -> Unit,
    onLogout: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Shift", fontSize = 22.sp)
        Button(onClick = onClockIn, modifier = Modifier.fillMaxWidth()) { Text("Start shift") }
        Button(onClick = onClockOut, modifier = Modifier.fillMaxWidth()) { Text("End shift") }
        Spacer(Modifier.height(8.dp))
        Text("Sphere", fontSize = 22.sp)
        Button(onClick = onPicking, modifier = Modifier.fillMaxWidth()) { Text("Picking") }
        Spacer(Modifier.height(16.dp))
        Button(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("Logout") }
    }
}

@Composable
private fun TaskListScreen(
    tasks: List<com.wms.terminal.data.AvailableTaskDto>,
    onClaim: (String) -> Unit,
    onBack: () -> Unit,
) {
    Column {
        ScreenHeader(title = "Micro-tasks", onBack = onBack)
        LazyColumn(modifier = Modifier.weight(1f, fill = false)) {
            items(tasks) { task ->
                Button(
                    onClick = { onClaim(task.taskId) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                ) {
                    Column {
                        Text(task.taskNumber, fontSize = 18.sp)
                        Text("${task.itemCount} lines · ${task.totalQuantity}", fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ScreenHeader(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
        Text(title, fontSize = 24.sp)
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
        Text("No active session")
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
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun StepTitle(text: String) {
    Text(
        text,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        letterSpacing = 0.5.sp,
    )
}

@Composable
private fun MainValue(text: String) {
    Text(
        text,
        fontSize = 40.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 44.sp,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun ContextInfo(label: String, value: String) {
    Text(
        "$label  $value",
        fontSize = 13.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
    )
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
private fun ContainerStep(scanKey: String, onScan: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        StepTitle("CONTAINER")
        MainValue("Scan sticker")
        ScanInput(scanKey = scanKey, label = "Container barcode", onSubmit = onScan)
    }
}

@Composable
private fun LocationStep(locationCode: String?, scanKey: String, onScan: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        StepTitle("LOCATION")
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
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ContextInfo("Location", session.locationCode?.ifBlank { "—" } ?: "—")
        Spacer(Modifier.height(4.dp))
        StepTitle("PRODUCT")
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
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ContextInfo("Location", session.locationCode?.ifBlank { "—" } ?: "—")
        ContextInfo("SKU", session.productSku?.ifBlank { "—" } ?: "—")

        Spacer(Modifier.height(8.dp))
        StepTitle("QUANTITY")

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "To pick",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    formatQtyDisplay(session.quantityRemaining),
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.End,
            ) {
                Text(
                    "Picking",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.End,
                )
                OutlinedTextField(
                    value = willPick,
                    onValueChange = onWillPickChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
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
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Button(
            onClick = onConfirmQty,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Confirm pick", fontSize = 18.sp)
        }
    }
}

@Composable
private fun BufferStep(scanKey: String, onScan: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        StepTitle("BUFFER")
        MainValue("b-1-acc")
        Text(
            "Also: b-2-acc · b-3-acc",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ScanInput(scanKey = scanKey, label = "Scan buffer barcode", onSubmit = onScan)
    }
}

@Composable
private fun CompletedStep() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Done", fontSize = 40.sp, fontWeight = FontWeight.Bold)
        Text(
            "Returning to task list…",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun formatQtyDisplay(value: Double?): String {
    if (value == null) return "0"
    return if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
}
