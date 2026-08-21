package ai.propertyassistant.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WebView web = new WebView(this);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(true);
    web.setWebViewClient(new WebViewClient());
    web.loadUrl("file:///android_asset/index.html#/splash");
    setContentView(web);
  }
}
