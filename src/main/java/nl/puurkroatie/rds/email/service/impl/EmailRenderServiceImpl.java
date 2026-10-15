package nl.puurkroatie.rds.email.service.impl;

import freemarker.core.HTMLOutputFormat;
import freemarker.core.ParseException;
import freemarker.ext.beans.BeansWrapper;
import freemarker.template.Configuration;
import freemarker.template.DefaultObjectWrapperBuilder;
import freemarker.template.MalformedTemplateNameException;
import freemarker.template.Template;
import freemarker.template.TemplateNotFoundException;
import freemarker.template.TemplateException;
import freemarker.template.TemplateExceptionHandler;
import freemarker.core.TemplateClassResolver;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.docgen.service.BookingContextService;
import nl.puurkroatie.rds.docgen.service.RepeatTables;
import nl.puurkroatie.rds.docgen.service.TemplateModels;
import nl.puurkroatie.rds.email.dto.EmailRenderDto;
import nl.puurkroatie.rds.email.entity.EmailTemplate;
import nl.puurkroatie.rds.email.repository.EmailTemplateRepository;
import nl.puurkroatie.rds.email.service.EmailRenderService;
import nl.puurkroatie.rds.email.service.TemplateRenderException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EmailRenderServiceImpl implements EmailRenderService {

    private final EmailTemplateRepository emailTemplateRepository;
    private final BookingContextService bookingContextService;

    // Subject = platte tekst (geen escaping); body = HTML (auto-escaping van ${...}).
    private final Configuration subjectConfig;
    private final Configuration bodyConfig;

    public EmailRenderServiceImpl(EmailTemplateRepository emailTemplateRepository, BookingContextService bookingContextService) {
        this.emailTemplateRepository = emailTemplateRepository;
        this.bookingContextService = bookingContextService;
        this.subjectConfig = baseConfiguration();
        this.bodyConfig = baseConfiguration();
        this.bodyConfig.setOutputFormat(HTMLOutputFormat.INSTANCE);
    }

    /**
     * De template-tekst wordt door gebruikers geschreven (TEMPLATE_CREATE/UPDATE) en dus
     * als NIET-VERTROUWD behandeld. FreeMarker is standaard ruim bemeten: de ?new-built-in
     * mag elke TemplateModel-klasse aanmaken, waaronder freemarker.template.utility.Execute
     * (commando's uitvoeren). Daarom hier expliciet dichtgezet:
     *  - ?new niet toegestaan (ALLOWS_NOTHING_RESOLVER);
     *  - ?api uit;
     *  - van het model zijn alleen properties (getters) bereikbaar, geen methoden;
     *  - geen TemplateLoader, dus geen <#include>/<#import> van bestanden.
     */
    private Configuration baseConfiguration() {
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_32);
        cfg.setNewBuiltinClassResolver(TemplateClassResolver.ALLOWS_NOTHING_RESOLVER);
        cfg.setAPIBuiltinEnabled(false);
        DefaultObjectWrapperBuilder wrapper = new DefaultObjectWrapperBuilder(Configuration.VERSION_2_3_32);
        wrapper.setExposureLevel(BeansWrapper.EXPOSE_PROPERTIES_ONLY);
        cfg.setObjectWrapper(wrapper.build());
        cfg.setTemplateLoader(null);
        cfg.setDefaultEncoding("UTF-8");
        cfg.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        cfg.setLogTemplateExceptions(false);
        cfg.setNumberFormat("computer");
        return cfg;
    }

    /**
     * Voor een boeker of prospect: het model heeft {@code prospect}. De gegevens komen uit de gedeelde
     * BookingContextService (dezelfde als bij documenten), die ook de organisatie controleert.
     */
    @Override
    public EmailRenderDto render(UUID templateId, UUID bookerId) {
        EmailTemplate template = loadTemplate(templateId);
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("prospect", TemplateModels.toModel(bookingContextService.forBooker(bookerId)));
        return merge(template, model);
    }

    /**
     * Voor een boeking: het model heeft {@code booking} (met boeker, reizigers, accommodaties,
     * activiteiten) en, zodat een template voor beide doelen bruikbaar is, ook {@code prospect}: de
     * hoofdboeker van de boeking, dus de ontvanger.
     */
    @Override
    public EmailRenderDto renderForBooking(UUID templateId, UUID bookingId) {
        EmailTemplate template = loadTemplate(templateId);
        Map<String, Object> booking = TemplateModels.toModel(bookingContextService.forBooking(bookingId));
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("booking", booking);
        model.put("prospect", booking.get("booker")); // null als de boeking geen hoofdboeker heeft
        return merge(template, model);
    }

    private EmailTemplate loadTemplate(UUID templateId) {
        EmailTemplate template = emailTemplateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("EmailTemplate not found with id: " + templateId));
        verifyOrganization(template.getTenantOrganization());
        return template;
    }

    private EmailRenderDto merge(EmailTemplate template, Map<String, Object> model) {
        String subject = merge("subject", template.getSubject(), model, subjectConfig);
        String bodyHtml = template.getBodyHtml() != null ? template.getBodyHtml() : "";
        String body = merge("body", expandRepeatTables(bodyHtml), model, bodyConfig);
        return new EmailRenderDto(subject, body);
    }

    /** Herhaalde tabellen (data-repeat) -> FreeMarker-lussen; een ongeldige lijstnaam wordt netjes gemeld. */
    private String expandRepeatTables(String bodyHtml) {
        try {
            return RepeatTables.toFreemarker(bodyHtml);
        } catch (RepeatTables.InvalidRepeatException e) {
            throw new TemplateRenderException("Ongeldige herhaalde tabel in de HTML-body: " + e.getMessage());
        }
    }

    private String merge(String name, String templateText, Map<String, Object> model, Configuration cfg) {
        try (StringWriter writer = new StringWriter()) {
            Template tpl = new Template(name, new StringReader(templateText), cfg);
            tpl.process(model, writer);
            return writer.toString();
        } catch (TemplateException e) {
            // <#include>/<#import> faalt als TemplateException met de TemplateNotFoundException als oorzaak.
            if (e.getCause() instanceof TemplateNotFoundException || e.getCause() instanceof MalformedTemplateNameException) {
                throw new TemplateRenderException(includeNotAllowedMessage(name));
            }
            // Fout tijdens het verwerken, meestal een onbekende/verkeerd gespelde placeholder.
            throw new TemplateRenderException(placeholderMessage(name, e));
        } catch (ParseException e) {
            // Syntaxfout in de template (ParseException is een IOException, vang 'm eerst).
            throw new TemplateRenderException("Syntaxfout in " + partLabel(name) + ": " + e.getMessage());
        } catch (TemplateNotFoundException | MalformedTemplateNameException e) {
            // <#include>/<#import> kan niet: er is bewust geen template-loader (geen bestandstoegang).
            throw new TemplateRenderException(includeNotAllowedMessage(name));
        } catch (IOException e) {
            throw new RuntimeException("Kon template niet verwerken (" + name + "): " + e.getMessage(), e);
        }
    }

    private String includeNotAllowedMessage(String name) {
        return "In " + partLabel(name) + " zijn <#include> en <#import> niet toegestaan.";
    }

    /** Nederlandstalig label voor het template-onderdeel dat faalde. */
    private String partLabel(String name) {
        return "subject".equals(name) ? "het onderwerp" : "de HTML-body";
    }

    /** Begrijpelijke melding voor de template-auteur bij een placeholder-fout. */
    private String placeholderMessage(String name, TemplateException e) {
        String expression = e.getBlamedExpressionString();
        if (expression != null) {
            return "Onbekende of lege placeholder in " + partLabel(name) + ": ${" + expression + "}. "
                    + "Controleer de spelling (hoofdlettergevoelig, bv. ${prospect.fullName}).";
        }
        return "Kon " + partLabel(name) + " niet samenstellen: " + e.getMessage();
    }

    private void verifyOrganization(UUID organizationId) {
        if (!TenantContext.hasRole("ADMIN") && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
