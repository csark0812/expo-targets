export function getGlanceWidgetTemplate(options: {
  packageName: string;
  pascalName: string;
  widgetSegment: string;
  appGroup: string;
}): string {
  const { packageName, pascalName, widgetSegment, appGroup } = options;
  return `package ${packageName}.widget.${widgetSegment}

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

/**
 * Glance widget deepen — FQCN must match withAndroidWidget:
 * {package}.widget.${widgetSegment}.${pascalName}WidgetReceiver
 */
class ${pascalName} : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val prefs =
      context.getSharedPreferences(
        "${appGroup}",
        Context.MODE_PRIVATE,
      )
    val message =
      prefs.getString("${pascalName}:message", null)
        ?: prefs.getString("message", "${pascalName}")
        ?: "${pascalName}"

    provideContent {
      Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Text("${pascalName}")
        Text(message)
      }
    }
  }
}

class ${pascalName}WidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = ${pascalName}()
}

class ${pascalName}UpdateReceiver :
  ExpoTargetsWidgetUpdateReceiver<${pascalName}>(
    ${pascalName}::class,
    "${appGroup}",
  )
`;
}

export function sanitizeAndroidWidgetSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function sanitizeAndroidTargetSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * User-deepen Share/Action Activity under
 * targets/<name>/android/<pkg>/target/<segment>/<Pascal><Kind>Activity.kt
 */
export function getShareActionActivityTemplate(options: {
  packageName: string;
  pascalName: string;
  segment: string;
  kind: 'Share' | 'Action';
  /** When true, extend RN host Activity (config has `entry`). */
  useReactNative: boolean;
}): string {
  const { packageName, pascalName, segment, kind, useReactNative } = options;
  const className = `${pascalName}${kind}Activity`;
  const libraryBase = useReactNative
    ? `ExpoTargetsReact${kind}Activity`
    : `ExpoTargets${kind}Activity`;
  return `package ${packageName}.target.${segment}

import expo.modules.targets.extension.${libraryBase}

/**
 * User deepen for ${kind.toLowerCase()} — FQCN must match withAndroidShareAction:
 * ${packageName}.target.${segment}.${className}
 */
class ${className} : ${libraryBase}()
`;
}

export function getSystemServiceDeepenTemplate(options: {
  packageName: string;
  segment: string;
  fileBaseName: string;
  libraryClass: string;
  libraryImport: string;
}): string {
  const { packageName, segment, fileBaseName, libraryClass, libraryImport } =
    options;
  return `package ${packageName}.target.${segment}

import ${libraryImport}

/**
 * User deepen — FQCN must match the Android system-service plugin:
 * ${packageName}.target.${segment}.${fileBaseName}
 */
class ${fileBaseName} : ${libraryClass}()
`;
}

export function getNotificationServiceDeepenTemplate(options: {
  packageName: string;
  pascalName: string;
  segment: string;
}): string {
  const { packageName, pascalName, segment } = options;
  const className = `${pascalName}NotificationService`;
  return `package ${packageName}.target.${segment}

import expo.modules.targets.notification.ExpoTargetsNotificationService

/**
 * User deepen — FQCN must match withAndroidNotification:
 * ${packageName}.target.${segment}.${className}
 */
class ${className} : ExpoTargetsNotificationService()
`;
}
