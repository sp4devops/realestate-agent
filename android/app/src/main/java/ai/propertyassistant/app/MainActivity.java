package ai.propertyassistant.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

public final class MainActivity extends Activity {
  private static final int AUDIO_PERMISSION_REQUEST = 42;
  private static final int LOCATION_PERMISSION_REQUEST = 43;
  private static final int FILE_CHOOSER_REQUEST = 44;

  private PermissionRequest pendingPermissionRequest;
  private GeolocationPermissions.Callback pendingGeolocationCallback;
  private String pendingGeolocationOrigin;
  private ValueCallback<Uri[]> pendingFileChooser;
  private Uri pendingCameraImageUri;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WebView web = new WebView(this);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(true);
    settings.setGeolocationEnabled(true);
    web.addJavascriptInterface(new PropertyAssistantHost(), "PropertyAssistantHost");
    web.setWebViewClient(new WebViewClient());
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest request) {
        runOnUiThread(() -> handleWebPermissionRequest(request));
      }

      @Override public boolean onShowFileChooser(
          WebView webView,
          ValueCallback<Uri[]> filePathCallback,
          FileChooserParams fileChooserParams) {
        return launchFileChooser(filePathCallback, fileChooserParams);
      }

      @Override public void onGeolocationPermissionsShowPrompt(
          String origin,
          GeolocationPermissions.Callback callback) {
        runOnUiThread(() -> handleGeolocationPermission(origin, callback));
      }
    });
    web.loadUrl("file:///android_asset/index.html#/splash");
    setContentView(web);
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
          // The web UI reports availability where possible; no broad permission is requested.
        }
      });
    }
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

  private void handleWebPermissionRequest(PermissionRequest request) {
    boolean wantsAudio = false;
    for (String resource : request.getResources()) {
      if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
        wantsAudio = true;
        break;
      }
    }
    if (!wantsAudio) {
      request.deny();
      return;
    }
    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
      request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
      return;
    }
    pendingPermissionRequest = request;
    requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, AUDIO_PERMISSION_REQUEST);
  }

  private void handleGeolocationPermission(String origin, GeolocationPermissions.Callback callback) {
    if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
      callback.invoke(origin, true, false);
      return;
    }
    if (pendingGeolocationCallback != null) {
      pendingGeolocationCallback.invoke(pendingGeolocationOrigin, false, false);
    }
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
      pendingCameraImageUri = FileProvider.getUriForFile(
          this,
          getPackageName() + ".fileprovider",
          image);
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
    if (requestCode != FILE_CHOOSER_REQUEST || pendingFileChooser == null) return;
    Uri[] results = null;
    if (resultCode == RESULT_OK) {
      if ((data == null || data.getData() == null) && pendingCameraImageUri != null) {
        results = new Uri[] { pendingCameraImageUri };
      } else {
        results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
      }
    }
    pendingFileChooser.onReceiveValue(results);
    pendingFileChooser = null;
    pendingCameraImageUri = null;
  }

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == AUDIO_PERMISSION_REQUEST && pendingPermissionRequest != null) {
      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        pendingPermissionRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
      } else {
        pendingPermissionRequest.deny();
      }
      pendingPermissionRequest = null;
      return;
    }
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
    super.onDestroy();
  }
}
