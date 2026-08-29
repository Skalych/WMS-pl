package com.wms.terminal

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import com.wms.terminal.ui.TerminalApp
import com.wms.terminal.ui.TerminalTheme
import com.wms.terminal.ui.TerminalViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: TerminalViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TerminalTheme {
                TerminalApp(viewModel = viewModel)
            }
        }
    }
}
