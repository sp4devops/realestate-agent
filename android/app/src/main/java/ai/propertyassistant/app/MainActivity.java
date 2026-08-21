package ai.propertyassistant.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
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
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;

public final class MainActivity extends Activity {
  private static final int AUDIO_PERMISSION_REQUEST = 42;
  private static final int LOCATION_PERMISSION_REQUEST = 43;
  private static final int FILE_CHOOSER_REQUEST = 44;
  private static final String APP_URL = "https://appassets.androidplatform.net/assets/index.html#/splash";

  private PermissionRequest pendingPermissionRequest;
  private String pendingSpeechLanguage;
  private GeolocationPermissions.Callback pendingGeolocationCallback;
  private String pendingGeolocationOrigin;
  private ValueCallback<Uri[]> pendingFileChooser;
  private Uri pendingCameraImageUri;
  private WebView web;
  private SpeechRecognizer speechRecognizer;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

    web = new WebView(this);
    ViewCompat.setOnApplyWindowInsetsListener(web, (view, windowInsets) -> {
      android.graphics.Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars()).toPlatformInsets();
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
      return windowInsets;
    });

    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(true);
    settings.setGeolocationEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(true);

    WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    web.addJavascriptInterface(new PropertyAssistantHost(), "PropertyAssistantHost");
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assetLoader.shouldInterceptRequest(request.getUrl());
      }

      @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        return assetLoader.shouldInterceptRequest(Uri.parse(url));
      }
    });
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

    @JavascriptInterface public boolean hasOnDeviceSpeech() {
      return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(MainActivity.this);
    }

    @JavascriptInterface public void startOnDeviceSpeech(String languageTag) {
      runOnUiThread(() -> requestNativeSpeech(languageTag));
    }

    @JavascriptInterface public void stopOnDeviceSpeech() {
      runOnUiThread(() -> {
        if (speechRecognizer != null) speechRecognizer.stopListening();
      });
    }
  }

  private void requestNativeSpeech(String languageTag) {
    if (!isOnDeviceSpeechAvailable()) {
      sendSpeechResult(false, null, "On-device speech recognition is unavailable on this phone.");
      return;
    }
    pendingSpeechLanguage = normalizeLanguageTag(languageTag);
    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
      startOnDeviceSpeech(pendingSpeechLanguage);
      return;
    }
    requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, AUDIO_PERMISSION_REQUEST);
  }

  private boolean isOnDeviceSpeechAvailable() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(this);
  }

  private String normalizeLanguageTag(String languageTag) {
    if (languageTag == null || languageTag.isBlank() || "auto".equalsIgnoreCase(languageTag)) return "en-IN";
    return languageTag;
  }

  private void startOnDeviceSpeech(String languageTag) {
    if (!isOnDeviceSpeechAvailable()) {
      sendSpeechResult(false, null, "On-device speech recognition is unavailable on this phone.");
      return;
    }
    if (speechRecognizer != null) speechRecognizer.destroy();
    speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
    speechRecognizer.setRecognitionListener(new RecognitionListener() {
      @Override public void onReadyForSpeech(Bundle params) { sendSpeechStatus("Listening…"); }
      @Override public void onBeginningOfSpeech() { }
      @Override public void onRmsChanged(float rmsdB) { }
      @Override public void onBufferReceived(byte[] buffer) { }
      @Override public void onEndOfSpeech() { sendSpeechStatus("Processing locally…"); }
      @Override public void onError(int error) {
        sendSpeechResult(false, null, speechErrorMessage(error));
      }
      @Override public void onResults(Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty() || matches.get(0).trim().isEmpty()) {
          sendSpeechResult(false, null, "I could not hear enough speech. Try again.");
          return;
        }
        sendSpeechResult(true, matches.get(0).trim(), null);
      }
      @Override public void onPartialResults(Bundle partialResults) { }
      @Override public void onEvent(int eventType, Bundle params) { }
    });

    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, languageTag);
    intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
    intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
    speechRecognizer.startListening(intent);
  }

  private String speechErrorMessage(int error) {
    if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) return "Microphone permission is required for Speak & Save.";
    if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) return "I could not hear enough speech. Try again.";
    if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) return "Speech recognition is busy. Please try again.";
    return "On-device speech recognition could not complete. Try again or use Type & Save.";
  }

  private void sendSpeechStatus(String message) {
    if (web == null) return;
    String js = "window.__PA_ON_DEVICE_STT_STATUS__ && window.__PA_ON_DEVICE_STT_STATUS__(" + JSONObject.quote(message) + ")";
    web.evaluateJavascript(js, null);
  }

  private void sendSpeechResult(boolean ok, String transcript, String error) {
    pendingSpeechLanguage = null;
    if (web == null) return;
    String payload = "{ok:" + ok + ",transcript:" + (transcript == null ? "null" : JSONObject.quote(transcript)) + ",error:" + (error == null ? "null" : JSONObject.quote(error)) + "}";
    web.evaluateJavascript("window.__PA_ON_DEVICE_STT_RESULT__ && window.__PA_ON_DEVICE_STT_RESULT__(" + payload + ")", null);
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
    if (requestCode == AUDIO_PERMISSION_REQUEST) {
      boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
      if (pendingPermissionRequest != null) {
        if (granted) pendingPermissionRequest.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
        else pendingPermissionRequest.deny();
        pendingPermissionRequest = null;
      }
      if (pendingSpeechLanguage != null) {
        String language = pendingSpeechLanguage;
        if (granted) startOnDeviceSpeech(language);
        else sendSpeechResult(false, null, "Microphone permission is required for Speak & Save.");
      }
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
    if (speechRecognizer != null) speechRecognizer.destroy();
    speechRecognizer = null;
    pendingSpeechLanguage = null;
    pendingFileChooser = null;
    pendingGeolocationCallback = null;
    pendingGeolocationOrigin = null;
    if (web != null) {
      web.removeJavascriptInterface("PropertyAssistantHost");
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
