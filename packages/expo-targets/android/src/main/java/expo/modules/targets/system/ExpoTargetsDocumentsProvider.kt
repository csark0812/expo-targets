package expo.modules.targets.system

import android.database.Cursor
import android.database.MatrixCursor
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.DocumentsProvider
import java.io.File
import java.io.FileNotFoundException

/**
 * Minimal DocumentsProvider (Wave 3a). Enumerates a single root backed by
 * app filesDir/expo_targets_docs. Deepen under targets/<name>/android for real sync.
 */
open class ExpoTargetsDocumentsProvider : DocumentsProvider() {
  private val rootId = "expo_targets_root"
  private val docRoot = "root"

  override fun onCreate(): Boolean {
    ensureSeedFile()
    return true
  }

  private fun docsDir(): File {
    val dir = File(context!!.filesDir, "expo_targets_docs")
    if (!dir.exists()) dir.mkdirs()
    return dir
  }

  /** Seed a visible file so DocumentsUI / Files can prove the root is live. */
  private fun ensureSeedFile() {
    val seed = File(docsDir(), "et-fp-seed.txt")
    if (!seed.exists()) {
      seed.writeText("expo-targets file-provider seed\n")
    }
  }

  override fun queryRoots(projection: Array<out String>?): Cursor {
    val cols =
      projection
        ?: arrayOf(
          DocumentsContract.Root.COLUMN_ROOT_ID,
          DocumentsContract.Root.COLUMN_DOCUMENT_ID,
          DocumentsContract.Root.COLUMN_TITLE,
          DocumentsContract.Root.COLUMN_FLAGS,
          DocumentsContract.Root.COLUMN_MIME_TYPES,
        )
    val cursor = MatrixCursor(cols)
    val row = mutableListOf<Any?>()
    for (col in cols) {
      row.add(
        when (col) {
          DocumentsContract.Root.COLUMN_ROOT_ID -> rootId
          DocumentsContract.Root.COLUMN_DOCUMENT_ID -> docRoot
          DocumentsContract.Root.COLUMN_TITLE -> "Expo Targets"
          DocumentsContract.Root.COLUMN_FLAGS ->
            (DocumentsContract.Root.FLAG_SUPPORTS_CREATE or
              DocumentsContract.Root.FLAG_LOCAL_ONLY)
          DocumentsContract.Root.COLUMN_MIME_TYPES -> "*${'/'}*"
          else -> null
        },
      )
    }
    cursor.addRow(row)
    return cursor
  }

  override fun queryDocument(documentId: String, projection: Array<out String>?): Cursor {
    return includeFile(projection, documentId, if (documentId == docRoot) docsDir() else File(docsDir(), documentId))
  }

  override fun queryChildDocuments(
    parentDocumentId: String,
    projection: Array<out String>?,
    sortOrder: String?,
  ): Cursor {
    val cols = projection ?: DEFAULT_DOCUMENT_PROJECTION
    val cursor = MatrixCursor(cols)
    if (parentDocumentId != docRoot) return cursor
    docsDir().listFiles()?.forEach { file ->
      includeFileInto(cursor, cols, file.name, file)
    }
    return cursor
  }

  override fun openDocument(
    documentId: String,
    mode: String,
    signal: CancellationSignal?,
  ): ParcelFileDescriptor {
    val file = if (documentId == docRoot) docsDir() else File(docsDir(), documentId)
    if (!file.exists() || file.isDirectory) {
      throw FileNotFoundException(documentId)
    }
    val access =
      if (mode.contains("w")) ParcelFileDescriptor.MODE_READ_WRITE
      else ParcelFileDescriptor.MODE_READ_ONLY
    return ParcelFileDescriptor.open(file, access)
  }

  private fun includeFile(
    projection: Array<out String>?,
    docId: String,
    file: File,
  ): Cursor {
    val cols = projection ?: DEFAULT_DOCUMENT_PROJECTION
    val cursor = MatrixCursor(cols)
    includeFileInto(cursor, cols, docId, file)
    return cursor
  }

  private fun includeFileInto(
    cursor: MatrixCursor,
    cols: Array<out String>,
    docId: String,
    file: File,
  ) {
    val row = mutableListOf<Any?>()
    for (col in cols) {
      row.add(
        when (col) {
          DocumentsContract.Document.COLUMN_DOCUMENT_ID -> docId
          DocumentsContract.Document.COLUMN_DISPLAY_NAME ->
            if (docId == docRoot) "Expo Targets" else file.name
          DocumentsContract.Document.COLUMN_SIZE -> if (file.isFile) file.length() else null
          DocumentsContract.Document.COLUMN_MIME_TYPE ->
            if (file.isDirectory || docId == docRoot) {
              DocumentsContract.Document.MIME_TYPE_DIR
            } else {
              "application/octet-stream"
            }
          DocumentsContract.Document.COLUMN_LAST_MODIFIED -> file.lastModified()
          DocumentsContract.Document.COLUMN_FLAGS ->
            if (file.isDirectory || docId == docRoot) {
              DocumentsContract.Document.FLAG_DIR_SUPPORTS_CREATE
            } else {
              (DocumentsContract.Document.FLAG_SUPPORTS_DELETE or
                DocumentsContract.Document.FLAG_SUPPORTS_WRITE)
            }
          else -> null
        },
      )
    }
    cursor.addRow(row)
  }

  companion object {
    private val DEFAULT_DOCUMENT_PROJECTION =
      arrayOf(
        DocumentsContract.Document.COLUMN_DOCUMENT_ID,
        DocumentsContract.Document.COLUMN_DISPLAY_NAME,
        DocumentsContract.Document.COLUMN_MIME_TYPE,
        DocumentsContract.Document.COLUMN_SIZE,
        DocumentsContract.Document.COLUMN_FLAGS,
        DocumentsContract.Document.COLUMN_LAST_MODIFIED,
      )
  }
}
