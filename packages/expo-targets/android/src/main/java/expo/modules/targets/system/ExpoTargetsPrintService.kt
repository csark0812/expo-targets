package expo.modules.targets.system

import android.printservice.PrintJob
import android.printservice.PrintService
import android.printservice.PrinterDiscoverySession

/**
 * Minimal PrintService (Wave 3c). Settings enablement may be leftover.
 */
open class ExpoTargetsPrintService : PrintService() {
  override fun onCreatePrinterDiscoverySession(): PrinterDiscoverySession {
    return object : PrinterDiscoverySession() {
      override fun onStartPrinterDiscovery(priorityList: MutableList<android.print.PrinterId>) {}

      override fun onStopPrinterDiscovery() {}

      override fun onValidatePrinters(printerIds: MutableList<android.print.PrinterId>) {}

      override fun onStartPrinterStateTracking(printerId: android.print.PrinterId) {}

      override fun onStopPrinterStateTracking(printerId: android.print.PrinterId) {}

      override fun onDestroy() {}
    }
  }

  override fun onRequestCancelPrintJob(printJob: PrintJob) {
    printJob.cancel()
  }

  override fun onPrintJobQueued(printJob: PrintJob) {
    printJob.complete()
  }
}
