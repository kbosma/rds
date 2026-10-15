package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.context.TravelerContext;
import nl.puurkroatie.rds.docgen.service.BookingContextService;
import nl.puurkroatie.rds.email.dto.EmailRenderDto;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.email.service.TemplateRenderException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Validatie van de FreeMarker-merge: ${prospect.*} wordt ingevuld, en de body
 * (HTML) escapet waarden terwijl de subject (platte tekst) dat niet doet.
 */
@ExtendWith(MockitoExtension.class)
class EmailRenderServiceImplTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");

    @Mock
    private EmailTemplateRepository emailTemplateRepository;
    @Mock
    private BookingContextService bookingContextService;

    private EmailRenderServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EmailRenderServiceImpl(emailTemplateRepository, bookingContextService);
        TenantContext.setOrganizationId(ORG);
        TenantContext.setRoles(Set.of("EMPLOYEE"));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private UUID lastTemplateId;
    private UUID lastBookerId;

    private void stub(String subject, String body, String firstname, String lastname) {
        UUID templateId = UUID.randomUUID();
        UUID bookerId = UUID.randomUUID();
        // De test-template heeft geen tenant (niet gepersist); de tests draaien als ADMIN
        // zodat de tenant-check wordt overgeslagen. De booker krijgt wél tenant = ORG.
        EmailTemplate template = new EmailTemplate(templateId, "Welkom", null, subject, body);
        BookerContext booker = new BookerContext(firstname, null, lastname, "cs", "06", "x@y.nl",
                null, null, "i.", List.of());
        this.lastTemplateId = templateId;
        this.lastBookerId = bookerId;
        when(emailTemplateRepository.findById(templateId)).thenReturn(Optional.of(template));
        when(bookingContextService.forBooker(bookerId)).thenReturn(booker);
    }

    @Test
    void render_mergesProspectFieldsIntoSubjectAndBody() {
        // Als ADMIN draaien zodat de tenant-check van de (tenantloze) test-template slaagt.
        TenantContext.setRoles(Set.of("ADMIN"));
        stub("Welkom ${prospect.firstname}", "<p>Beste ${prospect.fullName}</p>", "Jan", "Vries");

        EmailRenderDto result = service.render(lastTemplateId, lastBookerId);

        assertEquals("Welkom Jan", result.getSubject());
        assertEquals("<p>Beste Jan Vries</p>", result.getBodyHtml());
    }

    @Test
    void render_escapesHtmlInBodyButNotInSubject() {
        TenantContext.setRoles(Set.of("ADMIN"));
        stub("Beste ${prospect.lastname}", "<p>${prospect.lastname}</p>", "Jan", "Vries & Co");

        EmailRenderDto result = service.render(lastTemplateId, lastBookerId);

        // subject = platte tekst → geen escaping
        assertEquals("Beste Vries & Co", result.getSubject());
        // body = HTML → '&' wordt geëscaped
        assertTrue(result.getBodyHtml().contains("Vries &amp; Co"),
                "HTML-body moet '&' escapen, was: " + result.getBodyHtml());
    }

    @Test
    void render_unknownPlaceholder_throwsFriendlyException() {
        TenantContext.setRoles(Set.of("ADMIN"));
        // 'fullname' (kleine n) bestaat niet; de getter is getFullName() -> ${prospect.fullName}
        stub("Welkom", "<p>${prospect.fullname}</p>", "Jan", "Vries");

        TemplateRenderException ex = assertThrows(TemplateRenderException.class,
                () -> service.render(lastTemplateId, lastBookerId));

        assertTrue(ex.getMessage().contains("Onbekende of lege placeholder"),
                "melding moet de auteur uitleggen wat er mis is, was: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("prospect.fullname"),
                "melding moet de foute placeholder noemen, was: " + ex.getMessage());
    }

    // ---------------------------------------------------------------------
    // Beveiliging: templates worden door gebruikers geschreven (TEMPLATE_CREATE/UPDATE)
    // en zijn dus niet-vertrouwd. FreeMarker staat standaard ?new toe op elke
    // TemplateModel-klasse, waaronder freemarker.template.utility.Execute (commando's
    // uitvoeren, RCE). Dat moet dicht zijn, in zowel subject als body.
    // ---------------------------------------------------------------------

    @ParameterizedTest(name = "[{index}] {0}")
    @ValueSource(strings = {
            // commando's uitvoeren
            "<#assign ex=\"freemarker.template.utility.Execute\"?new()>${ex(\"echo pwned\")}",
            // willekeurige objecten aanmaken
            "<#assign oc=\"freemarker.template.utility.ObjectConstructor\"?new()>${oc(\"java.lang.StringBuilder\")}",
            // ?api geeft toegang tot de Java-API van objecten
            "<#assign x=prospect?api>${x}",
            // de klasse / classloader van het model benaderen
            "${prospect.class}",
            "${prospect.class.protectionDomain}",
            // methoden aanroepen i.p.v. properties lezen
            "${prospect.getFirstname()}",
            // bestanden lezen via include/import
            "<#include \"/etc/passwd\">",
            "<#import \"/etc/passwd\" as p>"
    })
    void render_maliciousTemplate_isRejectedInBodyAndSubject(String payload) {
        TenantContext.setRoles(Set.of("ADMIN"));

        stub("Onderwerp", payload, "Jan", "Vries");
        TemplateRenderException inBody = assertThrows(TemplateRenderException.class,
                () -> service.render(lastTemplateId, lastBookerId));

        stub(payload, "<p>Body</p>", "Jan", "Vries");
        TemplateRenderException inSubject = assertThrows(TemplateRenderException.class,
                () -> service.render(lastTemplateId, lastBookerId));

        // En in geen geval is er commando-uitvoer in de melding terechtgekomen.
        assertFalse(inBody.getMessage().contains("pwned"), inBody.getMessage());
        assertFalse(inSubject.getMessage().contains("pwned"), inSubject.getMessage());
    }

    @Test
    void render_includeAndImport_giveAClearAuthorMessage() {
        TenantContext.setRoles(Set.of("ADMIN"));
        stub("Onderwerp", "<#include \"/etc/passwd\">", "Jan", "Vries");

        TemplateRenderException ex = assertThrows(TemplateRenderException.class,
                () -> service.render(lastTemplateId, lastBookerId));

        assertTrue(ex.getMessage().contains("<#include> en <#import> niet toegestaan"), ex.getMessage());
    }

    @Test
    void render_afterHardening_normalPropertiesStillWork() {
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = UUID.randomUUID();
        UUID bookerId = UUID.randomUUID();
        when(emailTemplateRepository.findById(templateId)).thenReturn(Optional.of(new EmailTemplate(
                templateId, "Welkom", null, "Hoi ${prospect.firstname}",
                "<p>${prospect.fullName} - ${prospect.initials} - ${prospect.birthdate}</p>")));
        when(bookingContextService.forBooker(bookerId)).thenReturn(new BookerContext(
                "Jan", "de", "Vries", "cs", "06", "x@y.nl",
                null, LocalDate.of(1990, 5, 17), "J.", List.of()));

        EmailRenderDto result = service.render(templateId, bookerId);

        assertEquals("Hoi Jan", result.getSubject());
        assertEquals("<p>Jan de Vries - J. - 1990-05-17</p>", result.getBodyHtml());
    }

    // ----- e-mail voor een BOEKING (zelfde model als bij documenten) -----

    private static final UUID BOOKING_ID = UUID.fromString("0b000000-0000-0000-0000-000000000001");

    private BookingContext booking(BookerContext booker, TravelerContext... travelers) {
        return new BookingContext("B-2026-0042", "BOEKING", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8),
                new BigDecimal("1250.00"), booker, List.of(travelers), List.of(), List.of());
    }

    private UUID stubBookingTemplate(String subject, String body, BookingContext context) {
        UUID templateId = UUID.randomUUID();
        when(emailTemplateRepository.findById(templateId))
                .thenReturn(Optional.of(new EmailTemplate(templateId, "Boeking", null, subject, body)));
        when(bookingContextService.forBooking(BOOKING_ID)).thenReturn(context);
        return templateId;
    }

    private static final BookerContext JAN =
            new BookerContext("Jan", "de", "Vries", "cs", "06", "jan@x.nl", "MAN", null, "J.", List.of());

    @Test
    void renderForBooking_hasTheBookingAndTheRecipientAsProspect() {
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = stubBookingTemplate("Boeking ${booking.bookingNumber}",
                "<p>Beste ${prospect.fullName}, uw boeking ${booking.bookingNumber} (${booking.booker.firstname}) is ${booking.bookingStatus}.</p>",
                booking(JAN));

        EmailRenderDto result = service.renderForBooking(templateId, BOOKING_ID);

        assertEquals("Boeking B-2026-0042", result.getSubject());
        assertEquals("<p>Beste Jan de Vries, uw boeking B-2026-0042 (Jan) is BOEKING.</p>", result.getBodyHtml());
    }

    @Test
    void renderForBooking_aTemplateForProspectsAlsoWorksForABooking() {
        // Eén template voor beide doelen: ${prospect.*} is de ontvanger.
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = stubBookingTemplate("Hallo ${prospect.firstname}", "<p>${prospect.fullName}</p>", booking(JAN));

        EmailRenderDto result = service.renderForBooking(templateId, BOOKING_ID);

        assertEquals("Hallo Jan", result.getSubject());
        assertEquals("<p>Jan de Vries</p>", result.getBodyHtml());
    }

    @Test
    void renderForBooking_repeatedTableBecomesOneRowPerTraveler() {
        TenantContext.setRoles(Set.of("ADMIN"));
        String html = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><th>Naam</th></tr>"
                + "<tr><td>${t.firstname} ${t.lastname}</td></tr></tbody></table>";
        UUID templateId = stubBookingTemplate("S", html, booking(JAN,
                new TravelerContext("Maria", "de", "Groot", "VROUW", null, "M."),
                new TravelerContext("Pieter", null, "Bakker", "MAN", null, "P.")));

        String body = service.renderForBooking(templateId, BOOKING_ID).getBodyHtml();

        // kopregel één keer, daarna een rij per reiziger; de editor-attributen zijn weg
        assertEquals("<table><tbody><tr><th>Naam</th></tr>"
                + "<tr><td>Maria Groot</td></tr><tr><td>Pieter Bakker</td></tr></tbody></table>", body);
    }

    @Test
    void renderForBooking_repeatedTableWithNoItemsKeepsOnlyTheHeader() {
        TenantContext.setRoles(Set.of("ADMIN"));
        String html = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><th>Naam</th></tr><tr><td>${t.firstname}</td></tr></tbody></table>";
        UUID templateId = stubBookingTemplate("S", html, booking(JAN));

        String body = service.renderForBooking(templateId, BOOKING_ID).getBodyHtml();

        assertEquals("<table><tbody><tr><th>Naam</th></tr></tbody></table>", body);
    }

    @Test
    void renderForBooking_aRepeatedTableCannotSmuggleADirective() {
        TenantContext.setRoles(Set.of("ADMIN"));
        String html = "<table data-repeat=\"booking.travelers as x><#assign y=1><#list booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><td>${t.firstname}</td></tr></tbody></table>";
        UUID templateId = stubBookingTemplate("S", html, booking(JAN));

        TemplateRenderException ex = assertThrows(TemplateRenderException.class,
                () -> service.renderForBooking(templateId, BOOKING_ID));

        assertTrue(ex.getMessage().contains("Ongeldige herhaalde tabel"), ex.getMessage());
    }

    @Test
    void renderForBooking_aBookingWithoutMainBookerGivesAClearMessageForProspectPlaceholders() {
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = stubBookingTemplate("S", "<p>${prospect.firstname}</p>", booking(null));

        TemplateRenderException ex = assertThrows(TemplateRenderException.class,
                () -> service.renderForBooking(templateId, BOOKING_ID));

        assertTrue(ex.getMessage().contains("Onbekende of lege placeholder"), ex.getMessage());
    }

    @Test
    void render_forAProspect_hasNoBookingPlaceholders() {
        TenantContext.setRoles(Set.of("ADMIN"));
        stub("S", "<p>${booking.bookingNumber}</p>", "Jan", "Vries");

        TemplateRenderException ex = assertThrows(TemplateRenderException.class,
                () -> service.render(lastTemplateId, lastBookerId));

        assertTrue(ex.getMessage().contains("${booking}"), ex.getMessage());
    }

    @Test
    void renderForBooking_theBookingModelIsAsHardenedAsTheProspectModel() {
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = stubBookingTemplate("S", "${booking.class}", booking(JAN));

        assertThrows(TemplateRenderException.class, () -> service.renderForBooking(templateId, BOOKING_ID));
    }

    @Test
    void renderForBooking_aMoneyAmountWithAFormat_alwaysHasTwoDecimals() {
        // Dit is wat de editor voor "Totaalbedrag" invoegt; zonder opmaak toont FreeMarker 1250.00 als "1.250".
        TenantContext.setRoles(Set.of("ADMIN"));
        UUID templateId = stubBookingTemplate("S", "<p>${booking.totalSum?string(\"#,##0.00\")}</p>", booking(JAN));

        String body = service.renderForBooking(templateId, BOOKING_ID).getBodyHtml();

        assertTrue(body.matches("<p>1[.,]250[.,]00</p>"), body);
    }
}
