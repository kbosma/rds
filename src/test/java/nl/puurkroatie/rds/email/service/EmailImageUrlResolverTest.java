package nl.puurkroatie.rds.email.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Het relatieve pad in de opgeslagen HTML wordt bij het versturen absoluut gemaakt.
 */
class EmailImageUrlResolverTest {

    private final EmailImageUrlResolver resolver = new EmailImageUrlResolver("http://178.104.163.88/api");

    @Test
    void relativeSrc_becomesAbsolute() {
        assertEquals("<img src=\"http://178.104.163.88/api/public/email-images/abc\">",
                resolver.toAbsolute("<img src=\"/api/public/email-images/abc\">"));
    }

    @Test
    void imageSizeFromTheEditor_survivesMakingTheSrcAbsolute() {
        assertEquals("<img src=\"http://178.104.163.88/api/public/email-images/abc\" alt=\"logo\" width=\"169\" height=\"85\""
                        + " style=\"max-width: 100%; height: auto;\">",
                resolver.toAbsolute("<img src=\"/api/public/email-images/abc\" alt=\"logo\" width=\"169\" height=\"85\""
                        + " style=\"max-width: 100%; height: auto;\">"));
    }

    @Test
    void singleQuotedSrc_becomesAbsolute() {
        assertEquals("<img src='http://178.104.163.88/api/public/email-images/abc'>",
                resolver.toAbsolute("<img src='/api/public/email-images/abc'>"));
    }

    @Test
    void everyImageInTheHtml_isConverted() {
        String result = resolver.toAbsolute(
                "<img src=\"/api/public/email-images/a\"><p>x</p><img src=\"/api/public/email-images/b\">");
        assertEquals("<img src=\"http://178.104.163.88/api/public/email-images/a\"><p>x</p>"
                + "<img src=\"http://178.104.163.88/api/public/email-images/b\">", result);
    }

    @Test
    void alreadyAbsoluteUrl_isLeftAlone() {
        String html = "<img src=\"https://cdn.example.com/api/public/email-images/abc\">";
        assertEquals(html, resolver.toAbsolute(html));
    }

    @Test
    void otherRelativePaths_areLeftAlone() {
        String html = "<a href=\"/api/other\">x</a><img src=\"/images/logo.png\">";
        assertEquals(html, resolver.toAbsolute(html));
    }

    @Test
    void pathMentionedInPlainText_isLeftAlone() {
        String html = "<p>zie /api/public/email-images/abc</p>";
        assertEquals(html, resolver.toAbsolute(html));
    }

    @Test
    void trailingSlashInTheBaseUrl_isNormalised() {
        EmailImageUrlResolver withSlash = new EmailImageUrlResolver("https://mail.example.nl/api/");
        assertEquals("<img src=\"https://mail.example.nl/api/public/email-images/abc\">",
                withSlash.toAbsolute("<img src=\"/api/public/email-images/abc\">"));
    }

    @Test
    void baseUrlWithRegexOrReplacementCharacters_isUsedLiterally() {
        EmailImageUrlResolver odd = new EmailImageUrlResolver("http://host/a$1b\\c/api");
        assertEquals("<img src=\"http://host/a$1b\\c/api/public/email-images/abc\">",
                odd.toAbsolute("<img src=\"/api/public/email-images/abc\">"));
    }

    @Test
    void nullAndEmpty_arePassedThrough() {
        assertNull(resolver.toAbsolute(null));
        assertEquals("", resolver.toAbsolute(""));
    }

    // ----- welke afbeeldingen noemt een stuk HTML? -----

    private static final UUID A = UUID.fromString("aaaaaaaa-1111-2222-3333-444444444444");
    private static final UUID B = UUID.fromString("bbbbbbbb-1111-2222-3333-444444444444");

    @Test
    void imageIdsIn_findsRelativeAndAbsoluteReferences() {
        String html = "<img src=\"/api/public/email-images/" + A + "\">"
                + "<img src='https://mail.example/api/public/email-images/" + B + "'>";

        assertEquals(Set.of(A, B), EmailImageUrlResolver.imageIdsIn(html));
    }

    @Test
    void imageIdsIn_countsADuplicateOnce_andKeepsTheOrder() {
        String html = "/api/public/email-images/" + B + " en " + "/api/public/email-images/" + A
                + " en weer /api/public/email-images/" + B;

        assertEquals(List.of(B, A), List.copyOf(EmailImageUrlResolver.imageIdsIn(html)));
    }

    @Test
    void imageIdsIn_isCaseInsensitiveOnTheUuid() {
        assertEquals(Set.of(A), EmailImageUrlResolver.imageIdsIn(
                "/api/public/email-images/" + A.toString().toUpperCase()));
    }

    @Test
    void imageIdsIn_ignoresWhatIsNotAnImageReference() {
        assertEquals(Set.of(), EmailImageUrlResolver.imageIdsIn("<p>geen plaatje</p>"));
        assertEquals(Set.of(), EmailImageUrlResolver.imageIdsIn("/api/public/email-images/not-a-uuid"));
        assertEquals(Set.of(), EmailImageUrlResolver.imageIdsIn("/api/other/" + A));
        assertEquals(Set.of(), EmailImageUrlResolver.imageIdsIn(""));
        assertEquals(Set.of(), EmailImageUrlResolver.imageIdsIn(null));
    }
}
