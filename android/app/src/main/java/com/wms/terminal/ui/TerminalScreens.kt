package com.wms.terminal.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
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

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Top,
        ) {
            Text("WMS Terminal", fontSize = 28.sp, modifier = Modifier.padding(bottom = 8.dp))
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
                    onBack = viewModel::backToHome,
                )
                AppScreen.Picking -> PickingScreen(
                    session = state.session,
                    willPick = state.willPickQuantity,
                    onWillPickChange = viewModel::updateWillPick,
                    onAdvance = viewModel::advanceLocation,
                    onConfirmQty = viewModel::confirmQuantity,
                    onManualScan = viewModel::submitScan,
                    onBack = viewModel::backToHome,
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
        Text("Micro-tasks", fontSize = 24.sp)
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
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
    }
}

@Composable
private fun PickingScreen(
    session: com.wms.terminal.data.SessionDto?,
    willPick: String,
    onWillPickChange: (String) -> Unit,
    onAdvance: () -> Unit,
    onConfirmQty: () -> Unit,
    onManualScan: (String) -> Unit,
    onBack: () -> Unit,
) {
    if (session == null) {
        Text("No active session")
        return
    }

    var manualBarcode by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Step: ${session.step}", fontSize = 20.sp)
        session.taskNumber?.let { Text("Task: $it", fontSize = 18.sp) }
        session.containerBarcode?.let { Text("Container: $it", fontSize = 18.sp) }

        when (session.step) {
            "CONTAINER_SCAN" -> Text("Scan container sticker", fontSize = 24.sp)
            "GO_TO_LOCATION" -> {
                Text("Go to:", fontSize = 20.sp)
                Text(session.locationCode ?: "", fontSize = 36.sp)
                Button(onClick = onAdvance, modifier = Modifier.fillMaxWidth()) {
                    Text("I'm here")
                }
            }
            "LOCATION_VERIFY" -> {
                Text("Scan location barcode", fontSize = 24.sp)
                Text(session.locationCode ?: "", fontSize = 28.sp)
            }
            "SKU_SCAN" -> {
                Text("Scan SKU", fontSize = 24.sp)
                Text(session.productSku ?: "", fontSize = 28.sp)
            }
            "QUANTITY_CONFIRM" -> {
                Text("To be picked: ${session.quantityRemaining ?: 0.0}", fontSize = 24.sp)
                OutlinedTextField(
                    value = willPick,
                    onValueChange = onWillPickChange,
                    label = { Text("Will be picked") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { onConfirmQty() }),
                    singleLine = true,
                )
                Button(onClick = onConfirmQty, modifier = Modifier.fillMaxWidth()) {
                    Text("Confirm")
                }
            }
            "BUFFER_SCAN" -> Text("Scan buffer (b-1-acc / b-2-acc / b-3-acc)", fontSize = 22.sp)
            "COMPLETED" -> Text("Done!", fontSize = 28.sp)
        }

        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = manualBarcode,
            onValueChange = { manualBarcode = it },
            label = { Text("Manual barcode") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = {
                if (manualBarcode.isNotBlank()) {
                    onManualScan(manualBarcode)
                    manualBarcode = ""
                }
            }),
        )
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back to home") }
    }
}
