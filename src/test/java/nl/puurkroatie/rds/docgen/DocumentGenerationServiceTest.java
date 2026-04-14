package nl.puurkroatie.rds.docgen;

import fr.opensagres.xdocreport.converter.ConverterTypeTo;
import fr.opensagres.xdocreport.converter.ConverterTypeVia;
import fr.opensagres.xdocreport.converter.Options;
import fr.opensagres.xdocreport.document.IXDocReport;
import fr.opensagres.xdocreport.document.registry.XDocReportRegistry;
import fr.opensagres.xdocreport.template.IContext;
import fr.opensagres.xdocreport.template.TemplateEngineKind;
import fr.opensagres.xdocreport.template.formatter.FieldsMetadata;
import nl.puurkroatie.rds.docgen.context.AccommodationContext;
import nl.puurkroatie.rds.docgen.context.AddressContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.context.BookingActivityContext;
import nl.puurkroatie.rds.docgen.context.BookingLineContext;
import nl.puurkroatie.rds.docgen.context.SupplierContext;
import nl.puurkroatie.rds.docgen.context.TravelerContext;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DocumentGenerationServiceTest {

    private static final String TEMPLATE_RESOURCE = "/nl/puurkroatie/rds/docgen/template-all.docx";

    private byte[] loadTemplate() throws Exception {
        try (InputStream is = getClass().getResourceAsStream(TEMPLATE_RESOURCE)) {
            assertNotNull(is, "Template not found on classpath: " + TEMPLATE_RESOURCE);
            return is.readAllBytes();
        }
    }

    @Test
    void generatePdfFromTemplateAll() throws Exception {
        byte[] templateBytes = loadTemplate();
        BookingContext bookingContext = buildTestBookingContext();
        byte[] pdfBytes = renderDocument(templateBytes, bookingContext, true);

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0, "Generated PDF should not be empty");
        assertTrue(pdfBytes[0] == '%' && pdfBytes[1] == 'P' && pdfBytes[2] == 'D' && pdfBytes[3] == 'F',
                "Output should be a valid PDF (starts with %PDF)");
    }

    @Test
    void generateDocxFromTemplateAll() throws Exception {
        byte[] templateBytes = loadTemplate();
        BookingContext bookingContext = buildTestBookingContext();
        byte[] docxBytes = renderDocument(templateBytes, bookingContext, false);

        assertNotNull(docxBytes);
        assertTrue(docxBytes.length > 0, "Generated DOCX should not be empty");
    }

    private byte[] renderDocument(byte[] templateData, BookingContext bookingContext, boolean toPdf) throws Exception {
        try (ByteArrayInputStream templateStream = new ByteArrayInputStream(templateData);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                    templateStream, TemplateEngineKind.Freemarker);

            FieldsMetadata metadata = report.createFieldsMetadata();
            metadata.load("booking", BookingContext.class);

            IContext context = report.createContext();
            context.put("booking", bookingContext);

            if (toPdf) {
                Options options = Options.getTo(ConverterTypeTo.PDF).via(ConverterTypeVia.XWPF);
                report.convert(context, options, outputStream);
            } else {
                report.process(context, outputStream);
            }

            return outputStream.toByteArray();
        }
    }

    private BookingContext buildTestBookingContext() {
        List<AddressContext> bookerAddresses = List.of(
                new AddressContext("Keizersgracht", 123, "A", "1015CJ", "Amsterdam", "Nederland", "HOME"),
                new AddressContext("Herengracht", 456, null, "1017BV", "Amsterdam", "Nederland", "WORK")
        );

        BookerContext booker = new BookerContext(
                "Jan", "van", "Bergen",
                "Jansen", "+31612345678", "jan@example.com",
                "MALE", LocalDate.of(1985, 3, 15), "J.",
                bookerAddresses
        );

        List<TravelerContext> travelers = List.of(
                new TravelerContext("Maria", "de", "Groot", "FEMALE", LocalDate.of(1990, 7, 22), "M."),
                new TravelerContext("Pieter", null, "Bakker", "MALE", LocalDate.of(1988, 11, 5), "P.")
        );

        List<AddressContext> accAddresses = List.of(
                new AddressContext("Obala Petra Kresimira", 10, null, "20000", "Dubrovnik", "Kroatie", "LOCATION")
        );
        List<AddressContext> supAddresses = List.of(
                new AddressContext("Vukovarska", 58, null, "21000", "Split", "Kroatie", "OFFICE")
        );

        List<BookingLineContext> bookingLines = List.of(
                new BookingLineContext(
                        LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8),
                        new BigDecimal("1250.00"),
                        new AccommodationContext("ACC-001", "Villa Dubrovnik", accAddresses),
                        new SupplierContext("SUP-001", "Croatia Villas d.o.o.", supAddresses)
                ),
                new BookingLineContext(
                        LocalDate.of(2026, 6, 8), LocalDate.of(2026, 6, 15),
                        new BigDecimal("980.00"),
                        new AccommodationContext("ACC-002", "Appartement Split", List.of(
                                new AddressContext("Marmontova", 5, null, "21000", "Split", "Kroatie", "LOCATION")
                        )),
                        new SupplierContext("SUP-002", "Dalmatia Rentals d.o.o.", List.of(
                                new AddressContext("Domovinskog Rata", 12, null, "21000", "Split", "Kroatie", "OFFICE")
                        ))
                )
        );

        List<BookingActivityContext> bookingActivities = List.of(
                new BookingActivityContext(
                        "Stadstour Dubrovnik", "tour",
                        LocalDateTime.of(2026, 6, 2, 9, 0), LocalDateTime.of(2026, 6, 2, 12, 0),
                        "Pile Gate", new BigDecimal("45.00")
                ),
                new BookingActivityContext(
                        "Blauwe Grot Excursie", "excursie",
                        LocalDateTime.of(2026, 6, 5, 8, 30), LocalDateTime.of(2026, 6, 5, 16, 0),
                        "Haven Dubrovnik", new BigDecimal("85.00")
                )
        );

        return new BookingContext(
                "BK-2026-0042", "CONFIRMED",
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 15),
                new BigDecimal("2360.00"),
                booker, travelers, bookingLines, bookingActivities
        );
    }
}
