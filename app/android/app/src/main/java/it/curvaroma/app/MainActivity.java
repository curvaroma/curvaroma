package it.curvaroma.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Da Android 15 (API 35+) l'app è sempre "edge-to-edge": senza questo
        // la pagina finirebbe sotto la barra di stato, i tasti e la tastiera.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return;

        // Dietro le barre: rosso in alto (come la testata), scuro in basso (come la barra dell'app).
        getWindow().setBackgroundDrawableResource(R.drawable.sfondo_barre);
        WindowInsetsControllerCompat barre = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        barre.setAppearanceLightStatusBars(false);
        barre.setAppearanceLightNavigationBars(false);

        View web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, finestra) -> {
            Insets b = finestra.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets tastiera = finestra.getInsets(WindowInsetsCompat.Type.ime());
            ViewGroup.MarginLayoutParams m = (ViewGroup.MarginLayoutParams) v.getLayoutParams();
            m.leftMargin = b.left;
            m.topMargin = b.top;
            m.rightMargin = b.right;
            m.bottomMargin = Math.max(b.bottom, tastiera.bottom);
            v.setLayoutParams(m);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(web);
    }
}
