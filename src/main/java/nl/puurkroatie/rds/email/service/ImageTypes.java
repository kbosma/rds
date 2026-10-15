package nl.puurkroatie.rds.email.service;

import java.util.Optional;

/**
 * Bepaalt het afbeeldingstype aan de hand van de eerste bytes ("magic bytes"), nooit
 * aan de door de client opgegeven Content-Type of bestandsnaam: die zijn vrij te
 * kiezen. De afbeelding wordt later publiek uitgeleverd met het hier vastgestelde
 * type, dus alleen echte rasterafbeeldingen komen erdoor.
 *
 * SVG staat er bewust niet tussen: dat is XML dat scripts kan bevatten.
 */
public final class ImageTypes {

    public static final String PNG = "image/png";
    public static final String JPEG = "image/jpeg";
    public static final String GIF = "image/gif";
    public static final String WEBP = "image/webp";

    /** Voor in foutmeldingen. */
    public static final String ALLOWED_DESCRIPTION = "PNG, JPEG, GIF, WebP";

    private ImageTypes() {
    }

    public static Optional<String> detect(byte[] data) {
        if (data == null) {
            return Optional.empty();
        }
        if (startsWith(data, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(PNG);
        }
        if (startsWith(data, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(JPEG);
        }
        if (startsWith(data, 'G', 'I', 'F', '8', '7', 'a') || startsWith(data, 'G', 'I', 'F', '8', '9', 'a')) {
            return Optional.of(GIF);
        }
        // WebP: "RIFF" + 4 bytes lengte + "WEBP"
        if (startsWith(data, 'R', 'I', 'F', 'F') && data.length >= 12
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] data, int... prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((data[i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
