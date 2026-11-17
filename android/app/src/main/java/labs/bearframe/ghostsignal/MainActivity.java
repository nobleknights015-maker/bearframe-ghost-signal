package labs.bearframe.ghostsignal;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
import android.webkit.ValueCallback;
import java.io.File;
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
    private static final int IMPORT_PRIVATE_AEON = 8019;
    private ValueCallback<Uri[]> pendingPrivatePicker;
    private boolean privateImportBusy = false;
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
        // Only the trusted debug test bay can load user-installed PRIVATE
        // JSON/PNG art. Never add those files to the public APK or expose the
        // app's shared_prefs/databases. The original Ghost Signal resources
        // remain served from the signed APK, unchanged.
        File ownerContent = PrivateAeonAssets.activeDirectory(this);
        if (!ownerContent.exists() && !ownerContent.mkdirs())
            throw new IllegalStateException("Cannot prepare owner asset directory");
        final WebViewAssetLoader.PathHandler installedPrivate =
            new WebViewAssetLoader.InternalStoragePathHandler(this, ownerContent);
        final WebViewAssetLoader.PathHandler packagedPublic =
            new WebViewAssetLoader.AssetsPathHandler(this);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", path -> {
                if (BuildConfig.DEBUG && path.startsWith("assets/aeon/"))
                    return installedPrivate.handle(path.substring("assets/aeon/".length()));
                return packagedPublic.handle(path);
            })
            .build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView from,
                    ValueCallback<Uri[]> callback, FileChooserParams options) {
                // This is an owner action initiated by the debug-only local
                // test bay file input. Never pass arbitrary content:// URIs
                // into WebView's JS or allow a remote page to request files.
                if (!BuildConfig.DEBUG ||
                    !("https://appassets.androidplatform.net/engine-lab.html").equals(from.getUrl()) ||
                    options.getMode() != FileChooserParams.MODE_OPEN)
                    return false;
                if (privateImportBusy) { callback.onReceiveValue(null); return true; }
                if (pendingPrivatePicker != null) pendingPrivatePicker.onReceiveValue(null);
                pendingPrivatePicker = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*");
                picker.putExtra(Intent.EXTRA_MIME_TYPES,
                    new String[]{"application/zip","application/x-zip-compressed","application/octet-stream"});
                try {
                    startActivityForResult(picker, IMPORT_PRIVATE_AEON);
                } catch (ActivityNotFoundException noPicker) {
                    pendingPrivatePicker.onReceiveValue(null);
                    pendingPrivatePicker = null;
                    Toast.makeText(MainActivity.this,
                        "No Android document picker available", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        // Development APK offers both opt-in labs; production still launches untouched Ghost Signal.
        webView.loadUrl(BuildConfig.DEBUG ? "https://appassets.androidplatform.net/engine-lab.html" : APP_URL);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != IMPORT_PRIVATE_AEON) return;
        if (pendingPrivatePicker != null) {
            // The archive is installed by native code, never handed to JS.
            pendingPrivatePicker.onReceiveValue(null);
            pendingPrivatePicker = null;
        }
        if (resultCode != RESULT_OK || data == null || data.getData() == null ||
                privateImportBusy || !BuildConfig.DEBUG) return;
        final Uri selected = data.getData();
        privateImportBusy = true;
        Toast.makeText(this, "Checking owner campaign ZIP…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            int maps = 0;
            String error = null;
            try {
                maps = PrivateAeonAssets.install(MainActivity.this, selected);
            } catch (Exception failed) {
                // Never print private source paths, scene identifiers or ZIP
                // contents into logcat or public issue comments.
                error = "PRIVATE ZIP REJECTED — CHECK OWNER PACKAGE";
            }
            final int installedMaps = maps;
            final String failure = error;
            runOnUiThread(() -> {
                privateImportBusy = false;
                if (failure == null) {
                    Toast.makeText(MainActivity.this,
                        "Private campaign verified: " + installedMaps + " staged areas",
                        Toast.LENGTH_LONG).show();
                    if (webView != null) {
                        // Replace cached PNG/JSON bytes after activating a new
                        // approved owner package. This does not erase saves.
                        webView.clearCache(true);
                        webView.loadUrl(
                            "https://appassets.androidplatform.net/engine-lab.html");
                    }
                } else {
                    Toast.makeText(MainActivity.this, failure, Toast.LENGTH_LONG).show();
                }
            });
        }, "aeon-private-archive-import").start();
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
        if (pendingPrivatePicker != null) {
            pendingPrivatePicker.onReceiveValue(null);
            pendingPrivatePicker = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
