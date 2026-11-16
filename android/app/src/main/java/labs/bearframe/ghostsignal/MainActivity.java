package labs.bearframe.ghostsignal;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Insets;
import android.view.WindowInsets;
import android.view.DisplayCutout;
import android.widget.FrameLayout;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Thin Android host. Ghost Signal remains the only gameplay and presentation engine.
 * Stable HTTPS-like asset origin preserves WebView's app-local DOM storage on updates.
 */
public final class MainActivity extends Activity {
    private WebView webView;
    private static final String APP_URL = "https://appassets.androidplatform.net/index.html";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        hideSystemBars();
        webView = new WebView(this);
        webView.setBackgroundColor(0xff050607);
        // Android 15 enforces edge-to-edge for target 35. Inset the host surface,
        // keeping the existing 480x270 viewport clear of camera cutouts/system bars.
        FrameLayout surface = new FrameLayout(this);
        surface.setBackgroundColor(0xff050607);
        surface.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        surface.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            int left, top, right, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = windowInsets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                left = safe.left; top = safe.top; right = safe.right; bottom = safe.bottom;
            } else {
                left = windowInsets.getSystemWindowInsetLeft(); top = windowInsets.getSystemWindowInsetTop();
                right = windowInsets.getSystemWindowInsetRight(); bottom = windowInsets.getSystemWindowInsetBottom();
                if (Build.VERSION.SDK_INT >= 28) {
                    DisplayCutout cutout = windowInsets.getDisplayCutout();
                    if (cutout != null) {
                        left = Math.max(left, cutout.getSafeInsetLeft()); top = Math.max(top, cutout.getSafeInsetTop());
                        right = Math.max(right, cutout.getSafeInsetRight()); bottom = Math.max(bottom, cutout.getSafeInsetBottom());
                    }
                }
            }
            view.setPadding(left, top, right, bottom);
            return windowInsets;
        });
        setContentView(surface);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        // Development APK offers both opt-in labs; production still launches untouched Ghost Signal.
        webView.loadUrl(BuildConfig.DEBUG ? "https://appassets.androidplatform.net/engine-lab.html" : APP_URL);
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
        else if (webView != null) webView.evaluateJavascript("window.dispatchEvent(new Event('blur'));", null);
    }

    @Override public void onBackPressed() {
        // Same ESC handling as desktop Ghost Signal; do not introduce a second menu design.
        if (webView != null) webView.evaluateJavascript(
            "document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code:'Escape',key:'Escape',bubbles:true}));", null);
        else super.onBackPressed();
    }

    @Override protected void onPause() {
        if (webView != null) {
            // WebView.onPause does not reliably deliver document visibilitychange.
            // Notify the game to release held inputs, pause and save its own journal.
            webView.evaluateJavascript("window.dispatchEvent(new Event('ghost-signal-host-pause'));window.dispatchEvent(new Event('blur'));", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            hideSystemBars();
            webView.requestApplyInsets();
        }
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
