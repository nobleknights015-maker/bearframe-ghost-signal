package labs.bearframe.ghostsignal.expanded;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Insets;
import android.view.DisplayCutout;
import android.view.WindowInsets;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Production-path host for the original Ghost Signal game, not an Aeon/engine test bay.
 * All gameplay assets and runtime scripts are copied into the APK from frontend/public.
 * Standalone package ID prevents overwriting a previously installed engine/game build.
 */
public final class MainActivity extends Activity {
  private static final String START = "https://appassets.androidplatform.net/index.html";
  private WebView webView;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
    hideBars();
    FrameLayout frame = new FrameLayout(this);
    frame.setBackgroundColor(0xff050607);
    webView = new WebView(this);
    webView.setBackgroundColor(0xff050607);
    frame.addView(webView, new FrameLayout.LayoutParams(-1,-1));
    frame.setOnApplyWindowInsetsListener((view, insets) -> {
      int left=0, top=0, right=0, bottom=0;
      if (Build.VERSION.SDK_INT >= 30) {
        Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
        left=safe.left; top=safe.top; right=safe.right; bottom=safe.bottom;
      } else {
        left=insets.getSystemWindowInsetLeft();
        top=insets.getSystemWindowInsetTop();
        right=insets.getSystemWindowInsetRight();
        bottom=insets.getSystemWindowInsetBottom();
        if (Build.VERSION.SDK_INT >= 28) {
          DisplayCutout cutout=insets.getDisplayCutout();
          if(cutout!=null) {
            left=Math.max(left,cutout.getSafeInsetLeft());
            top=Math.max(top,cutout.getSafeInsetTop());
            right=Math.max(right,cutout.getSafeInsetRight());
            bottom=Math.max(bottom,cutout.getSafeInsetBottom());
          }
        }
      }
      view.setPadding(left,top,right,bottom);
      return insets;
    });
    setContentView(frame);
    WebSettings settings=webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setAllowFileAccessFromFileURLs(false);
    settings.setAllowUniversalAccessFromFileURLs(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setJavaScriptCanOpenWindowsAutomatically(false);
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    final WebViewAssetLoader assets=new WebViewAssetLoader.Builder()
        .setDomain("appassets.androidplatform.net")
        .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();
    webView.setWebViewClient(new WebViewClientCompat() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assets.shouldInterceptRequest(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !START.startsWith(request.getUrl().getScheme()+"://"+request.getUrl().getHost()+"/");
      }
    });
    webView.loadUrl(START);
  }
  private void hideBars() {
    getWindow().getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    );
  }
  @Override public void onWindowFocusChanged(boolean focused) {
    super.onWindowFocusChanged(focused);
    if (focused) hideBars();
    else if(webView!=null) webView.evaluateJavascript("window.dispatchEvent(new Event('blur'))",null);
  }
  @Override public void onBackPressed() {
    if(webView!=null) webView.evaluateJavascript(
      "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',key:'Escape',bubbles:true}));",null
    );
    else super.onBackPressed();
  }
  @Override protected void onPause() {
    if(webView!=null) {
      webView.evaluateJavascript("window.dispatchEvent(new Event('ghost-signal-host-pause'));window.dispatchEvent(new Event('blur'));",null);
      webView.onPause();
    }
    super.onPause();
  }
  @Override protected void onResume() {
    super.onResume();
    if(webView!=null) { webView.onResume(); webView.requestApplyInsets(); hideBars(); }
  }
  @Override protected void onDestroy() {
    if(webView!=null) { webView.destroy(); webView=null; }
    super.onDestroy();
  }
}
