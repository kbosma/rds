package nl.puurkroatie.rds.docgen;

import fr.opensagres.xdocreport.document.IXDocReport;
import fr.opensagres.xdocreport.document.registry.XDocReportRegistry;
import fr.opensagres.xdocreport.template.IContext;
import fr.opensagres.xdocreport.template.TemplateEngineKind;
import nl.puurkroatie.rds.docgen.context.AddressContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.service.FreemarkerHardening;
import nl.puurkroatie.rds.docgen.service.TemplateModels;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * .docx-templates worden door gebruikers geüpload (TEMPLATE_CREATE) en zijn dus niet-
 * vertrouwd. Zonder afscherming volstaat één regel tekst in zo'n .docx om een commando op
 * de server uit te voeren (FreeMarker ?new -> freemarker.template.utility.Execute); dat is
 * hier met een onschuldig "echo" vastgesteld. FreemarkerHardening moet dat dichtzetten.
 *
 * Let op: de afscherming past de gedeelde FreeMarker-configuratie van xdocreport aan, dus
 * er is bewust geen "onbeveiligde" controle-test (die zou na de eerste test al afgeschermd zijn).
 */
class DocgenTemplateInjectionTest {

    private static byte[] docxWith(String text) throws Exception {
        try (XWPFDocument d = new XWPFDocument(); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            d.createParagraph().createRun().setText(text);
            d.write(o);
            return o.toByteArray();
        }
    }

    /** Rendert zoals DocumentGenerationServiceImpl: laden, afschermen, verwerken. */
    private static String render(String templateText) throws Exception {
        IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                new ByteArrayInputStream(docxWith(templateText)), TemplateEngineKind.Freemarker);
        FreemarkerHardening.harden(report);

        IContext context = report.createContext();
        BookerContext booker = new BookerContext("Jan", "van", "Bergen", "Jansen", "+31612345678",
                "jan@example.com", "MALE", LocalDate.of(1985, 3, 15), "J.",
                List.of(new AddressContext("Keizersgracht", 123, "A", "1015CJ", "Amsterdam", "Nederland", "HOME")));
        // Zoals de service: een platte map, geen bean.
        context.put("booking", TemplateModels.toModel(new BookingContext("B-1", "aanvraag",
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8), BigDecimal.TEN, booker,
                List.of(), List.of(), List.of())));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        report.process(context, out);
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(out.toByteArray()));
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText().trim();
        }
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @ValueSource(strings = {
            // commando's uitvoeren
            "${\"freemarker.template.utility.Execute\"?new()(\"echo pwned\")}",
            // willekeurige objecten aanmaken
            "${\"freemarker.template.utility.ObjectConstructor\"?new()(\"java.lang.StringBuilder\")}",
            // Java-API van objecten
            "${booking?api}",
    })
    void maliciousDocxTemplate_isRejected(String payload) {
        Exception ex = assertThrows(Exception.class, () -> render(payload));

        // Geweigerd om de bedoelde reden (resolver / ?api uit) en niet om een toevallige andere fout.
        assertTrue(rootMessage(ex).matches("(?s).*(not allowed in the template|api_builtin_enabled).*"), rootMessage(ex));
        assertFalse(rootMessage(ex).contains("pwned"));
    }

    /**
     * Met een bean-model kwam een template via {@code class} bij reflectie (klasse, protection
     * domain, classloader). Met de platte map bestaat die sleutel niet.
     */
    @ParameterizedTest(name = "[{index}] {0}")
    @ValueSource(strings = {
            "${booking.class}",
            "${booking.class.protectionDomain}",
            "${booking.booker.class}",
            "${booking.booker.class.classLoader}",
            "${booking.fromDate.class}",
            "${booking.totalSum.class}",
    })
    void reflectionViaTheModel_isNotPossible(String payload) {
        Exception ex = assertThrows(Exception.class, () -> render(payload));

        // Ofwel de sleutel bestaat niet (map), ofwel de waarde is tekst/getal en geen hash meer.
        assertTrue(rootMessage(ex).matches("(?s).*(null or missing|Expected a hash).*"), rootMessage(ex));
    }

    private static String rootMessage(Throwable t) {
        while (t.getCause() != null) t = t.getCause();
        return String.valueOf(t.getMessage()).split("\n")[0];
    }

    @Test
    void normalMergeFieldsStillWork() throws Exception {
        assertEquals("Boeking B-1 vanaf 2026-06-01", render("Boeking ${booking.bookingNumber} vanaf ${booking.fromDate}"));
    }
}
