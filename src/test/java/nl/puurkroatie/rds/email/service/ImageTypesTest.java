package nl.puurkroatie.rds.email.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Het type volgt uit de bytes; de door de client opgegeven naam/type telt niet. */
class ImageTypesTest {

    private static byte[] bytes(int... values) {
        byte[] result = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            result[i] = (byte) values[i];
        }
        return result;
    }

    @Test
    void detectsPng() {
        assertEquals(Optional.of(ImageTypes.PNG),
                ImageTypes.detect(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0)));
    }

    @Test
    void detectsJpeg() {
        assertEquals(Optional.of(ImageTypes.JPEG), ImageTypes.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10)));
    }

    @Test
    void detectsGifBothVersions() {
        assertEquals(Optional.of(ImageTypes.GIF), ImageTypes.detect("GIF87a....".getBytes(StandardCharsets.US_ASCII)));
        assertEquals(Optional.of(ImageTypes.GIF), ImageTypes.detect("GIF89a....".getBytes(StandardCharsets.US_ASCII)));
    }

    @Test
    void detectsWebp() {
        assertEquals(Optional.of(ImageTypes.WEBP),
                ImageTypes.detect("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    void riffThatIsNotWebp_isRejected() {
        // bv. een WAV-bestand: ook "RIFF", maar geen "WEBP" op positie 8
        assertEquals(Optional.empty(),
                ImageTypes.detect("RIFF\u0000\u0000\u0000\u0000WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    void svgIsRejectedBecauseItCanContainScripts() {
        byte[] svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
                .getBytes(StandardCharsets.UTF_8);
        assertEquals(Optional.empty(), ImageTypes.detect(svg));
    }

    @Test
    void htmlDisguisedAsAnImage_isRejected() {
        assertEquals(Optional.empty(), ImageTypes.detect("<html><script>x</script></html>".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void tooShortOrNullOrEmpty_isRejected() {
        assertEquals(Optional.empty(), ImageTypes.detect(bytes(0x89, 'P')));
        assertEquals(Optional.empty(), ImageTypes.detect(new byte[0]));
        assertEquals(Optional.empty(), ImageTypes.detect(null));
    }
}
