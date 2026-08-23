package ai.propertyassistant.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
  private static final int LOCATION_PERMISSION_REQUEST = 43;
  private static final int FILE_CHOOSER_REQUEST = 44;
  private static final int BACKUP_EXPORT_REQUEST = 45;
  private static final String APP_HOST = "appassets.androidplatform.net";
  private static final String APP_ORIGIN = "https://" + APP_HOST;
  private static final String APP_PATH_PREFIX = "/assets/";
  private static final String APP_URL = APP_ORIGIN + APP_PATH_PREFIX + "index.html#/splash";

  private GeolocationPermissions.Callback pendingGeolocationCallback;
  private String pendingGeolocationOrigin;
  private ValueCallback<Uri[]> pendingFileChooser;
  private Uri pendingCameraImageUri;
  private String pendingBackupText;
  private WebView web;
  private TextRecognizer posterTextRecognizer;
  private int safeInsetTop;
  private int safeInsetRight;
  private int safeInsetBottom;
  private int safeInsetLeft;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

    web = new WebView(this);
    ViewCompat.setOnApplyWindowInsetsListener(web, (view, windowInsets) -> {
      Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
      safeInsetTop = bars.top;
      safeInsetRight = bars.right;
      safeInsetBottom = bars.bottom;
      safeInsetLeft = bars.left;
      applySystemInsetsToWeb();
      return windowInsets;
    });

    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(true);
    settings.setGeolocationEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

    WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
        .addPathHandler(APP_PATH_PREFIX, new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    web.addJavascriptInterface(new PropertyAssistantHost(), "PropertyAssistantHost");
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assetLoader.shouldInterceptRequest(request.getUrl());
      }

      @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        return assetLoader.shouldInterceptRequest(Uri.parse(url));
      }

      @Override public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        applySystemInsetsToWeb();
      }

      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (!request.isForMainFrame()) return false;
        return handleNavigation(request.getUrl());
      }

      @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return handleNavigation(Uri.parse(url));
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest request) {
        runOnUiThread(request::deny);
      }

      @Override public boolean onShowFileChooser(
          WebView webView,
          ValueCallback<Uri[]> filePathCallback,
          FileChooserParams fileChooserParams) {
        if (!isTrustedAppUrl(webView.getUrl())) {
          filePathCallback.onReceiveValue(null);
          return false;
        }
        return launchFileChooser(filePathCallback, fileChooserParams);
      }

      @Override public void onGeolocationPermissionsShowPrompt(
          String origin,
          GeolocationPermissions.Callback callback) {
        runOnUiThread(() -> handleGeolocationPermission(origin, callback));
      }
    });
    web.loadUrl(APP_URL);
    setContentView(web);
    ViewCompat.requestApplyInsets(web);
  }

  public final class PropertyAssistantHost {
    @JavascriptInterface public void dial(String phone) {
      runOnUiThread(() -> launchExternal(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + digitsOnly(phone)))));
    }

    @JavascriptInterface public void whatsapp(String phone, String text) {
      runOnUiThread(() -> {
        String number = digitsOnly(phone);
        Uri appUri = Uri.parse("whatsapp://send?phone=" + number + "&text=" + Uri.encode(text == null ? "" : text));
        Intent appIntent = new Intent(Intent.ACTION_VIEW, appUri);
        if (!launchExternal(appIntent)) {
          launchExternal(new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/" + number + "?text=" + Uri.encode(text == null ? "" : text))));
        }
      });
    }

    @JavascriptInterface public void shareText(String text) {
      runOnUiThread(() -> {
        Intent share = new Intent(Intent.ACTION_SEND);
        share.setType("text/plain");
        share.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
        try {
          startActivity(Intent.createChooser(share, "Share follow-up"));
        } catch (ActivityNotFoundException ignored) {
          // No broad permission is required for the Android share sheet.
        }
      });
    }

    @JavascriptInterface public void exportBackup(String fileName, String encryptedText) {
      runOnUiThread(() -> launchBackupExport(fileName, encryptedText));
    }

    @JavascriptInterface public void recognizePoster(String imageDataUrl, String requestId) {
      startPosterRecognition(imageDataUrl, requestId);
    }
  }

  private void applySystemInsetsToWeb() {
    if (web == null) return;
    String script = "(function(){var s=document.documentElement.style;"
        + "s.setProperty('--native-safe-top','" + safeInsetTop + "px');"
        + "s.setProperty('--native-safe-right','" + safeInsetRight + "px');"
        + "s.setProperty('--native-safe-bottom','" + safeInsetBottom + "px');"
        + "s.setProperty('--native-safe-left','" + safeInsetLeft + "px');})();";
    web.evaluateJavascript(script, null);
  }

  private synchronized TextRecognizer getPosterTextRecognizer() {
    if (posterTextRecognizer == null) {
      posterTextRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }
    return posterTextRecognizer;
  }

  private void startPosterRecognition(String imageDataUrl, String requestId) {
    if (requestId == null || requestId.isEmpty()) return;
    if (imageDataUrl == null || imageDataUrl.length() > 8_000_000) {
      sendPosterRecognitionResult(requestId, false, "", "Poster image is too large. Retake it closer to the poster.");
      return;
    }
    new Thread(() -> {
      Bitmap bitmap = null;
      try {
        int comma = imageDataUrl.indexOf(',');
        if (comma < 0 || !imageDataUrl.substring(0, comma).startsWith("data:image/")) {
          throw new IllegalArgumentException("Poster image format is invalid.");
        }
        byte[] bytes = Base64.decode(imageDataUrl.substring(comma + 1), Base64.DEFAULT);
        bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) throw new IllegalArgumentException("Poster image could not be opened.");
        final Bitmap recognizedBitmap = bitmap;
        InputImage image = InputImage.fromBitmap(recognizedBitmap, 0);
        getPosterTextRecognizer().process(image)
            .addOnSuccessListener(result -> {
              String text = result.getText() == null ? "" : result.getText().trim();
              if (text.isEmpty()) sendPosterRecognitionResult(requestId, false, "", "No readable text was found. Retake the poster in good light or type the text.");
              else sendPosterRecognitionResult(requestId, true, text, "");
            })
            .addOnFailureListener(error -> sendPosterRecognitionResult(requestId, false, "", "Poster reading failed locally. Retake it or type the text."))
            .addOnCompleteListener(task -> recognizedBitmap.recycle());
      } catch (Exception error) {
        if (bitmap != null) bitmap.recycle();
        sendPosterRecognitionResult(requestId, false, "", error.getMessage() == null ? "Poster image could not be read." : error.getMessage());
      }
    }, "property-assistant-ocr").start();
  }

  private void sendPosterRecognitionResult(String requestId, boolean ok, String text, String error) {
    runOnUiThread(() -> {
      if (web == null) return;
      String payload = "{ok:" + ok + ",text:" + JSONObject.quote(text) + ",error:" + JSONObject.quote(error) + "}";
      web.evaluateJavascript("window.__PA_POSTER_OCR_RESULT__ && window.__PA_POSTER_OCR_RESULT__(" + JSONObject.quote(requestId) + "," + payload + ")", null);
    });
  }

  private boolean handleNavigation(Uri uri) {
    if (isTrustedAppUri(uri)) return false;
    if (uri != null && ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
      launchExternal(new Intent(Intent.ACTION_VIEW, uri));
    }
    return true;
  }

  private boolean isTrustedAppUrl(String value) {
    return value != null && isTrustedAppUri(Uri.parse(value));
  }

  private boolean isTrustedAppUri(Uri uri) {
    return uri != null
        && "https".equalsIgnoreCase(uri.getScheme())
        && APP_HOST.equalsIgnoreCase(uri.getHost())
        && uri.getPath() != null
        && uri.getPath().startsWith(APP_PATH_PREFIX);
  }

  private boolean isTrustedOrigin(Uri origin) {
    return origin != null
        && "https".equalsIgnoreCase(origin.getScheme())
        && APP_HOST.equalsIgnoreCase(origin.getHost())
        && (origin.getPort() == -1 || origin.getPort() == 443);
  }

  private void launchBackupExport(String fileName, String encryptedText) {
    if (pendingBackupText != null) {
      sendBackupExportResult(false, "Another backup export is already open.");
      return;
    }
    if (encryptedText == null || encryptedText.isEmpty()) {
      sendBackupExportResult(false, "Backup content is empty.");
      return;
    }
    pendingBackupText = encryptedText;
    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("application/json");
    String safeName = fileName == null ? "property-assistant.pabackup" : fileName.replaceAll("[^A-Za-z0-9._-]", "-");
    if (!safeName.endsWith(".pabackup")) safeName += ".pabackup";
    intent.putExtra(Intent.EXTRA_TITLE, safeName);
    try {
      startActivityForResult(intent, BACKUP_EXPORT_REQUEST);
    } catch (ActivityNotFoundException error) {
      pendingBackupText = null;
      sendBackupExportResult(false, "No local file picker is available for backup export.");
    }
  }

  private void finishBackupExport(int resultCode, Intent data) {
    String text = pendingBackupText;
    pendingBackupText = null;
    if (resultCode != RESULT_OK || data == null || data.getData() == null) {
      sendBackupExportResult(false, "Backup export was cancelled.");
      return;
    }
    if (text == null) {
      sendBackupExportResult(false, "Backup export expired. Create the backup again.");
      return;
    }
    try (OutputStream output = getContentResolver().openOutputStream(data.getData(), "w")) {
      if (output == null) throw new IOException("Could not open the selected file");
      output.write(text.getBytes(StandardCharsets.UTF_8));
      output.flush();
      sendBackupExportResult(true, "Encrypted backup saved locally.");
    } catch (IOException error) {
      sendBackupExportResult(false, "Backup file could not be written.");
    }
  }

  private void sendBackupExportResult(boolean ok, String message) {
    if (web == null) return;
    String payload = "{ok:" + ok + ",message:" + JSONObject.quote(message) + "}";
    web.evaluateJavascript("window.__PA_BACKUP_EXPORT_RESULT__ && window.__PA_BACKUP_EXPORT_RESULT__(" + payload + ")", null);
  }

  private String digitsOnly(String value) {
    return value == null ? "" : value.replaceAll("[^0-9]", "");
  }

  private boolean launchExternal(Intent intent) {
    try {
      startActivity(intent);
      return true;
    } catch (ActivityNotFoundException error) {
      return false;
    }
  }

  private void handleGeolocationPermission(String origin, GeolocationPermissions.Callback callback) {
    Uri originUri = origin == null ? null : Uri.parse(origin);
    if (!isTrustedOrigin(originUri)) {
      callback.invoke(origin, false, false);
      return;
    }
    if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
      callback.invoke(origin, true, false);
      return;
    }
    if (pendingGeolocationCallback != null) pendingGeolocationCallback.invoke(pendingGeolocationOrigin, false, false);
    pendingGeolocationCallback = callback;
    pendingGeolocationOrigin = origin;
    requestPermissions(new String[] { Manifest.permission.ACCESS_COARSE_LOCATION }, LOCATION_PERMISSION_REQUEST);
  }

  private boolean launchFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
    if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
    pendingFileChooser = callback;
    pendingCameraImageUri = null;

    Intent contentIntent;
    try {
      contentIntent = params.createIntent();
    } catch (ActivityNotFoundException error) {
      pendingFileChooser = null;
      callback.onReceiveValue(null);
      return false;
    }

    Intent chooser = new Intent(Intent.ACTION_CHOOSER);
    chooser.putExtra(Intent.EXTRA_INTENT, contentIntent);
    chooser.putExtra(Intent.EXTRA_TITLE, "Choose poster image");
    if (acceptsImages(params)) {
      Intent cameraIntent = createCameraIntent();
      if (cameraIntent != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { cameraIntent });
    }
    try {
      startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
      return true;
    } catch (ActivityNotFoundException error) {
      pendingFileChooser = null;
      callback.onReceiveValue(null);
      return false;
    }
  }

  private boolean acceptsImages(WebChromeClient.FileChooserParams params) {
    String[] types = params.getAcceptTypes();
    if (types == null || types.length == 0) return true;
    for (String type : types) {
      if (type == null || type.isEmpty() || type.startsWith("image/") || "image/*".equals(type)) return true;
    }
    return false;
  }

  private Intent createCameraIntent() {
    Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
    if (cameraIntent.resolveActivity(getPackageManager()) == null) return null;
    try {
      File directory = new File(getCacheDir(), "poster-captures");
      if (!directory.exists() && !directory.mkdirs()) return null;
      File image = File.createTempFile("poster-", ".jpg", directory);
      pendingCameraImageUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", image);
      cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraImageUri);
      cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
      return cameraIntent;
    } catch (IOException error) {
      pendingCameraImageUri = null;
      return null;
    }
  }

  @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == BACKUP_EXPORT_REQUEST) {
      finishBackupExport(resultCode, data);
      return;
    }
    if (requestCode != FILE_CHOOSER_REQUEST || pendingFileChooser == null) return;
    Uri[] results = null;
    if (resultCode == RESULT_OK) {
      if ((data == null || data.getData() == null) && pendingCameraImageUri != null) results = new Uri[] { pendingCameraImageUri };
      else results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
    }
    pendingFileChooser.onReceiveValue(results);
    pendingFileChooser = null;
    pendingCameraImageUri = null;
  }

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == LOCATION_PERMISSION_REQUEST && pendingGeolocationCallback != null) {
      boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
      pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
      pendingGeolocationCallback = null;
      pendingGeolocationOrigin = null;
    }
  }

  @Override protected void onDestroy() {
    if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
    if (pendingGeolocationCallback != null) pendingGeolocationCallback.invoke(pendingGeolocationOrigin, false, false);
    pendingFileChooser = null;
    pendingGeolocationCallback = null;
    pendingGeolocationOrigin = null;
    pendingBackupText = null;
    if (posterTextRecognizer != null) {
      posterTextRecognizer.close();
      posterTextRecognizer = null;
    }
    if (web != null) {
      web.removeJavascriptInterface("PropertyAssistantHost");
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
