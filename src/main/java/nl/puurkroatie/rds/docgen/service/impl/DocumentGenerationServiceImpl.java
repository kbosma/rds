package nl.puurkroatie.rds.docgen.service.impl;

import fr.opensagres.xdocreport.converter.ConverterTypeTo;
import fr.opensagres.xdocreport.converter.ConverterTypeVia;
import fr.opensagres.xdocreport.converter.Options;
import fr.opensagres.xdocreport.document.IXDocReport;
import fr.opensagres.xdocreport.document.registry.XDocReportRegistry;
import fr.opensagres.xdocreport.template.IContext;
import fr.opensagres.xdocreport.template.TemplateEngineKind;
import fr.opensagres.xdocreport.template.formatter.FieldsMetadata;
import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.Document;
import nl.puurkroatie.rds.booking.mapper.DocumentMapper;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.docgen.service.DocumentGenerationService;
import nl.puurkroatie.rds.docgen.service.BookingContextService;
import nl.puurkroatie.rds.docgen.service.FreemarkerHardening;
import nl.puurkroatie.rds.docgen.service.GeneratedDocumentName;
import nl.puurkroatie.rds.docgen.service.TemplateModels;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class DocumentGenerationServiceImpl implements DocumentGenerationService {

    private final DocumentTemplateRepository documentTemplateRepository;
    private final BookingRepository bookingRepository;
    private final BookingContextService bookingContextService;
    private final DocumentRepository documentRepository;
    private final DocumentMapper documentMapper;

    public DocumentGenerationServiceImpl(DocumentTemplateRepository documentTemplateRepository,
                                         BookingRepository bookingRepository,
                                         BookingContextService bookingContextService,
                                         DocumentRepository documentRepository,
                                         DocumentMapper documentMapper) {
        this.documentTemplateRepository = documentTemplateRepository;
        this.bookingRepository = bookingRepository;
        this.bookingContextService = bookingContextService;
        this.documentRepository = documentRepository;
        this.documentMapper = documentMapper;
    }

    @Override
    public DocumentDto generate(UUID templateId, UUID bookingId, String outputFormat, boolean visibleInPortal) {
        DocumentTemplate template = documentTemplateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("DocumentTemplate not found with id: " + templateId));
        verifyOrganization(template.getTenantOrganization());

        // Het Document hangt aan de boeking; de gegevens voor de template komen uit de gedeelde service
        // (die ook de organisatie van de boeking controleert).
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        verifyOrganization(booking.getTenantOrganization());
        BookingContext bookingContext = bookingContextService.forBooking(bookingId);

        boolean isPdf = "pdf".equalsIgnoreCase(outputFormat);
        String mimeType = isPdf
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        String extension = isPdf ? ".pdf" : ".docx";

        byte[] generatedDocument = renderDocument(template.getTemplateData(), bookingContext, isPdf);

        // Met datum en tijd: dezelfde template kan meermaals bij dezelfde boeking worden ingezet.
        String displayname = GeneratedDocumentName.of(
                template.getName(), booking.getBookingNumber(), LocalDateTime.now(), extension);
        Document document = new Document(booking, displayname, mimeType, generatedDocument, visibleInPortal);
        Document saved = documentRepository.save(document);
        return documentMapper.toDto(saved);
    }

    private byte[] renderDocument(byte[] templateData, BookingContext bookingContext, boolean toPdf) {
        try (ByteArrayInputStream templateStream = new ByteArrayInputStream(templateData);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                    templateStream, TemplateEngineKind.Freemarker);
            // De template is door een gebruiker geüpload (niet-vertrouwd): ?new/?api dichtzetten.
            FreemarkerHardening.harden(report);

            FieldsMetadata metadata = report.createFieldsMetadata();
            metadata.load("booking", BookingContext.class);

            IContext context = report.createContext();
            // Platte map i.p.v. bean: een (niet-vertrouwde) template kan zo niet via reflectie bij Java-klassen.
            context.put("booking", TemplateModels.toModel(bookingContext));

            if (toPdf) {
                Options options = Options.getTo(ConverterTypeTo.PDF).via(ConverterTypeVia.XWPF);
                report.convert(context, options, outputStream);
            } else {
                report.process(context, outputStream);
            }

            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate document: " + e.getMessage(), e);
        }
    }

    private void verifyOrganization(UUID organizationId) {
        if (!TenantContext.hasRole("ADMIN") && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
