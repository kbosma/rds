package nl.puurkroatie.rds.email.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Maakt van de relatieve afbeelding-paden in template-HTML absolute URL's, op het
 * moment dat de mail wordt verstuurd.
 *
 * In de opgeslagen template staat bewust alleen het relatieve pad
 * ({@value #PUBLIC_PATH}{id}): dat laadt in de editor en preview via de eigen
 * origin (dev-proxy / NGINX) en is onafhankelijk van het publieke adres. Een
 * ontvanger heeft echter een absolute, publiek bereikbare URL nodig. Door die pas
 * bij het versturen in te vullen, blijven opgeslagen templates geldig als het
 * publieke adres later verandert (bv. van IP naar domeinnaam).
 */
@Component
public class EmailImageUrlResolver {

    /** Relatief publiek pad (vanaf de API-root, zonder context-path). */
    public static final String PUBLIC_PATH = "/api/public/email-images/";

    // Alleen een pad direct na een aanhalingsteken (src="..." / src='...'); een al
    // absolute URL (https://host/api/public/email-images/..) blijft zo onaangeroerd.
    private static final Pattern RELATIVE_SRC = Pattern.compile("([\"'])" + Pattern.quote(PUBLIC_PATH));

    // Elke verwijzing naar een afbeelding, ook een absolute URL of een in de tekst geplakt pad;
    // juist die moeten bij het opslaan gecontroleerd worden.
    private static final Pattern IMAGE_REFERENCE = Pattern.compile(
            Pattern.quote(PUBLIC_PATH) + "([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})");

    private final String absolutePrefix;

    /**
     * @param publicApiBaseUrl publiek bereikbare basis-URL van de API tot en met
     *                         '/api' (bv. http://178.104.163.88/api)
     */
    public EmailImageUrlResolver(@Value("${app.email.public-api-base-url}") String publicApiBaseUrl) {
        String base = publicApiBaseUrl.endsWith("/")
                ? publicApiBaseUrl.substring(0, publicApiBaseUrl.length() - 1)
                : publicApiBaseUrl;
        this.absolutePrefix = base + "/public/email-images/";
    }

    /** Het relatieve publieke pad van een afbeelding, zoals dat in template-HTML staat. */
    public static String publicPath(UUID imageId) {
        return PUBLIC_PATH + imageId;
    }

    /** De id's van alle afbeeldingen waarnaar de HTML verwijst (relatief of absoluut). */
    public static Set<UUID> imageIdsIn(String html) {
        Set<UUID> ids = new LinkedHashSet<>();
        if (html != null) {
            Matcher matcher = IMAGE_REFERENCE.matcher(html);
            while (matcher.find()) {
                ids.add(UUID.fromString(matcher.group(1)));
            }
        }
        return ids;
    }

    public String toAbsolute(String html) {
        if (html == null || html.isEmpty()) {
            return html;
        }
        Matcher matcher = RELATIVE_SRC.matcher(html);
        return matcher.replaceAll(m -> Matcher.quoteReplacement(m.group(1) + absolutePrefix));
    }
}
