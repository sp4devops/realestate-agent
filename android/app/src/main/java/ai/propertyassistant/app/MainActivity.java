package ai.propertyassistant.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
  private static final int AUDIO_PERMISSION_REQUEST = 42;
  private PermissionRequest pendingPermissionRequest;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WebView web = new WebView(this);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(true);
    web.setWebViewClient(new WebViewClient());
    web.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(PermissionRequest request) {
        runOnUiThread(() -> handleWebPermissionRequest(request));
      }
    });
    web.loadUrl("file:///android_asset/index.html#/splash");
    setContentView(web);
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

  @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode != AUDIO_PERMISSION_REQUEST || pendingPermissionRequest == null) return;
    if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
      pendingPermissionRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
    } else {
      pendingPermissionRequest.deny();
    }
    pendingPermissionRequest = null;
  }
}
