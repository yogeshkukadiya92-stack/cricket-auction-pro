package in.yogeshaihub.auctionpro;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#04070D"));
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setBackgroundColor(Color.parseColor("#04070D"));
            }
        } catch (Exception ignored) {}
    }
}
