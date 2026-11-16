package br.edu.aedb.individuaula;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int BRAND_NAVY = Color.rgb(7, 23, 54);
    private static final String APP_HOST = "app.individuaula.workers.dev";
    private static final String OFFLINE_URL = "file:///android_asset/public/offline.html";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // mantém o conteúdo abaixo das barras sem deixar a página web invadir as áreas do sistema.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        // prepara as áreas nativas para que o shell tenha a mesma identidade da aplicação.
        configureSystemBars();
        getWindow().getDecorView().post(this::configureSystemBars);
        // mantém o botão voltar útil para a navegação web antes de encerrar o aplicativo.
        configureBackNavigation();
        // envia links externos para o navegador adequado em vez de prendê-los no webview.
        configureExternalLinks();
    }

    private void configureSystemBars() {
        // usa o azul-marinho da marca e ícones claros em ambas as barras do Android.
        Window window = getWindow();
        window.setStatusBarColor(BRAND_NAVY);
        window.setNavigationBarColor(BRAND_NAVY);
        window.getDecorView().setBackgroundColor(BRAND_NAVY);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(BRAND_NAVY);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        } else {
            window.getDecorView().setSystemUiVisibility(0);
        }
    }

    private void configureBackNavigation() {
        // retorna pela pilha do webview e só fecha o app quando não há mais uma tela para voltar.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                finish();
            }
        });
    }

    private void configureExternalLinks() {
        // abre YouTube e outros domínios fora do webview, mantendo as rotas do IndividuAula internas.
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternalUrl(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternalUrl(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOfflinePage(view);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                showOfflinePage(view);
            }
        });
    }

    private boolean openExternalUrl(Uri uri) {
        // mantém URLs sem domínio no webview e trata apenas links HTTP externos.
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (host == null || APP_HOST.equalsIgnoreCase(host) || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
            return false;
        }
        startActivity(new Intent(Intent.ACTION_VIEW, uri));
        return true;
    }

    private void showOfflinePage(WebView webView) {
        // mostra uma orientação local quando a rede impede o carregamento da aplicação publicada.
        if (!OFFLINE_URL.equals(webView.getUrl())) webView.loadUrl(OFFLINE_URL);
    }
}
