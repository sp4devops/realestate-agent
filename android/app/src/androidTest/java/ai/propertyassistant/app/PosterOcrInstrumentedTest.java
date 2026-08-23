package ai.propertyassistant.app;

import static org.junit.Assert.assertTrue;
import static org.junit.Assert.assertEquals;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public final class PosterOcrInstrumentedTest {
  @Test public void physicalInsetsAreConvertedToCssPixelsAtDeviceDensity() {
    assertEquals(28, MainActivity.toCssPixels(84, 3f));
    assertEquals(40, MainActivity.toCssPixels(120, 3f));
    assertEquals(0, MainActivity.toCssPixels(-4, 3f));
  }

  @Test public void bundledModelRecognizesPosterPhoneWithoutNetwork() throws Exception {
    Bitmap poster = Bitmap.createBitmap(1400, 420, Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(poster);
    canvas.drawColor(Color.WHITE);
    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    paint.setColor(Color.BLACK);
    paint.setTextSize(112f);
    paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    canvas.drawText("LAND ERODE", 45, 155, paint);
    canvas.drawText("CALL 9876543210", 45, 320, paint);

    TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    try {
      String text = Tasks.await(recognizer.process(InputImage.fromBitmap(poster, 0)), 30, TimeUnit.SECONDS)
          .getText().replaceAll("\\s+", "");
      assertTrue("Expected the bundled OCR model to recognize the phone number, got: " + text,
          text.contains("9876543210"));
    } finally {
      recognizer.close();
      poster.recycle();
    }
  }
}
