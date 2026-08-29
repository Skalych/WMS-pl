package com.wms.terminal.scanner

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log

/**
 * Zebra DataWedge scanner integration via broadcast intents.
 */
class ZebraScannerManager(
    private val context: Context,
    private val onScan: (String) -> Unit,
) {
    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            val data = intent?.getStringExtra(EXTRA_DATA) ?: return
            if (data.isNotBlank()) onScan(data.trim())
        }
    }

    fun register() {
        val filter = IntentFilter(SCAN_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, filter)
        }
        configureDataWedge()
    }

    fun unregister() {
        try {
            context.unregisterReceiver(receiver)
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "Receiver already unregistered", e)
        }
    }

    private fun configureDataWedge() {
        val profileConfig = Intent().apply {
            action = ACTION_DATAWEDGE
            putExtra("com.symbol.datawedge.api.CREATE_PROFILE", PROFILE_NAME)
        }
        context.sendBroadcast(profileConfig)

        val intentConfig = arrayOf(
            mapOf("PLUGIN_NAME" to "INTENT", "RESET_CONFIG" to "true"),
            mapOf(
                "PLUGIN_NAME" to "INTENT",
                "PARAM_LIST" to mapOf(
                    "intent_output_enabled" to "true",
                    "intent_action" to SCAN_ACTION,
                    "intent_delivery" to "2",
                ),
            ),
        )

        val setConfig = Intent().apply {
            action = ACTION_DATAWEDGE
            putExtra("com.symbol.datawedge.api.SET_CONFIG", intentConfig)
            putExtra("SEND_RESULT", "LAST_RESULT")
            putExtra("COMMAND_IDENTIFIER", "WMS_INTENT_CONFIG")
        }
        context.sendBroadcast(setConfig)
    }

    companion object {
        private const val TAG = "ZebraScanner"
        const val SCAN_ACTION = "com.wms.terminal.SCAN"
        private const val ACTION_DATAWEDGE = "com.symbol.datawedge.api.ACTION"
        private const val EXTRA_DATA = "com.symbol.datawedge.data_string"
        private const val PROFILE_NAME = "WmsTerminal"
    }
}
