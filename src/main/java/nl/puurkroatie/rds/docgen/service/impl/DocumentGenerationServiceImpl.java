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
import nl.puurkroatie.rds.booking.entity.AccommodationAddress;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookerAddress;
import nl.puurkroatie.rds.booking.entity.BookingLine;
import nl.puurkroatie.rds.booking.entity.Document;
import nl.puurkroatie.rds.booking.entity.SupplierAddress;
import nl.puurkroatie.rds.booking.mapper.DocumentMapper;
import nl.puurkroatie.rds.booking.repository.AccommodationAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import nl.puurkroatie.rds.booking.repository.SupplierAddressRepository;
import nl.puurkroatie.rds.docgen.context.AccommodationContext;
import nl.puurkroatie.rds.docgen.context.AddressContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingActivityContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.context.BookingLineContext;
import nl.puurkroatie.rds.docgen.context.SupplierContext;
import nl.puurkroatie.rds.docgen.context.TravelerContext;
import nl.puurkroatie.rds.booking.entity.DocumentTemplate;
import nl.puurkroatie.rds.booking.repository.DocumentTemplateRepository;
import nl.puurkroatie.rds.docgen.service.DocumentGenerationService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentGenerationServiceImpl implements DocumentGenerationService {

    private final DocumentTemplateRepository documentTemplateRepository;
    private final BookingRepository bookingRepository;
    private final BookerAddressRepository bookerAddressRepository;
    private final AccommodationAddressRepository accommodationAddressRepository;
    private final SupplierAddressRepository supplierAddressRepository;
    private final DocumentRepository documentRepository;
    private final DocumentMapper documentMapper;

    public DocumentGenerationServiceImpl(DocumentTemplateRepository documentTemplateRepository,
                                         BookingRepository bookingRepository,
                                         BookerAddressRepository bookerAddressRepository,
                                         AccommodationAddressRepository accommodationAddressRepository,
                                         SupplierAddressRepository supplierAddressRepository,
                                         DocumentRepository documentRepository,
                                         DocumentMapper documentMapper) {
        this.documentTemplateRepository = documentTemplateRepository;
        this.bookingRepository = bookingRepository;
        this.bookerAddressRepository = bookerAddressRepository;
        this.accommodationAddressRepository = accommodationAddressRepository;
        this.supplierAddressRepository = supplierAddressRepository;
        this.documentRepository = documentRepository;
        this.documentMapper = documentMapper;
    }

    @Override
    public DocumentDto generate(UUID templateId, UUID bookingId, String outputFormat) {
        DocumentTemplate template = documentTemplateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("DocumentTemplate not found with id: " + templateId));
        verifyOrganization(template.getTenantOrganization());

        Booking bookingWithBookerAndTravelers = bookingRepository.findByIdWithBookerAndTravelers(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        verifyOrganization(bookingWithBookerAndTravelers.getTenantOrganization());

        Booking bookingWithLines = bookingRepository.findByIdWithBookingLines(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        Booking bookingWithActivities = bookingRepository.findByIdWithBookingActivities(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        BookingContext bookingContext = buildBookingContext(bookingWithBookerAndTravelers, bookingWithLines, bookingWithActivities);

        boolean isPdf = "pdf".equalsIgnoreCase(outputFormat);
        String mimeType = isPdf
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        String extension = isPdf ? ".pdf" : ".docx";

        byte[] generatedDocument = renderDocument(template.getTemplateData(), bookingContext, isPdf);

        String displayname = template.getName() + " - " + bookingWithBookerAndTravelers.getBookingNumber() + extension;
        Document document = new Document(bookingWithBookerAndTravelers, displayname, mimeType, generatedDocument);
        Document saved = documentRepository.save(document);
        return documentMapper.toDto(saved);
    }

    private BookingContext buildBookingContext(Booking bookingWithBookerAndTravelers, Booking bookingWithLines, Booking bookingWithActivities) {
        List<AddressContext> bookerAddresses = new ArrayList<>();
        if (bookingWithBookerAndTravelers.getBooker() != null) {
            bookerAddresses = bookerAddressRepository.findByBookerBookerId(
                    bookingWithBookerAndTravelers.getBooker().getBookerId()
            ).stream()
                    .map(ba -> toAddressContext(ba.getAddress()))
                    .toList();
        }

        BookerContext bookerContext = null;
        if (bookingWithBookerAndTravelers.getBooker() != null) {
            var booker = bookingWithBookerAndTravelers.getBooker();
            bookerContext = new BookerContext(
                    booker.getFirstname(),
                    booker.getPrefix(),
                    booker.getLastname(),
                    booker.getCallsign(),
                    booker.getTelephone(),
                    booker.getEmailaddress(),
                    booker.getGender() != null ? booker.getGender().name() : null,
                    booker.getBirthdate(),
                    booker.getInitials(),
                    bookerAddresses
            );
        }

        List<TravelerContext> travelerContexts = bookingWithBookerAndTravelers.getTravelers().stream()
                .map(t -> new TravelerContext(
                        t.getFirstname(),
                        t.getPrefix(),
                        t.getLastname(),
                        t.getGender() != null ? t.getGender().name() : null,
                        t.getBirthdate(),
                        t.getInitials()
                ))
                .toList();

        List<UUID> accommodationIds = bookingWithLines.getBookingLines().stream()
                .map(bl -> bl.getAccommodation().getAccommodationId())
                .distinct()
                .toList();
        List<UUID> supplierIds = bookingWithLines.getBookingLines().stream()
                .map(bl -> bl.getSupplier().getSupplierId())
                .distinct()
                .toList();

        Map<UUID, List<AddressContext>> accommodationAddressMap = new HashMap<>();
        if (!accommodationIds.isEmpty()) {
            accommodationAddressRepository.findByAccommodationAccommodationIdIn(accommodationIds)
                    .forEach(aa -> accommodationAddressMap
                            .computeIfAbsent(aa.getAccommodation().getAccommodationId(), k -> new ArrayList<>())
                            .add(toAddressContext(aa.getAddress())));
        }

        Map<UUID, List<AddressContext>> supplierAddressMap = new HashMap<>();
        if (!supplierIds.isEmpty()) {
            supplierAddressRepository.findBySupplierSupplierIdIn(supplierIds)
                    .forEach(sa -> supplierAddressMap
                            .computeIfAbsent(sa.getSupplier().getSupplierId(), k -> new ArrayList<>())
                            .add(toAddressContext(sa.getAddress())));
        }

        List<BookingLineContext> bookingLineContexts = bookingWithLines.getBookingLines().stream()
                .map(bl -> {
                    var acc = bl.getAccommodation();
                    var sup = bl.getSupplier();
                    return new BookingLineContext(
                            bl.getFromDate(),
                            bl.getUntilDate(),
                            bl.getPrice(),
                            new AccommodationContext(
                                    acc.getKey(),
                                    acc.getName(),
                                    accommodationAddressMap.getOrDefault(acc.getAccommodationId(), List.of())
                            ),
                            new SupplierContext(
                                    sup.getKey(),
                                    sup.getName(),
                                    supplierAddressMap.getOrDefault(sup.getSupplierId(), List.of())
                            )
                    );
                })
                .toList();

        List<BookingActivityContext> bookingActivityContexts = bookingWithActivities.getBookingActivities().stream()
                .map(ba -> new BookingActivityContext(
                        ba.getActivity().getName(),
                        ba.getActivity().getActivityType() != null ? ba.getActivity().getActivityType().toValue() : null,
                        ba.getFromDate(),
                        ba.getUntilDate(),
                        ba.getMeetingPoint(),
                        ba.getTotalPrice()
                ))
                .toList();

        return new BookingContext(
                bookingWithBookerAndTravelers.getBookingNumber(),
                bookingWithBookerAndTravelers.getBookingStatus() != null
                        ? bookingWithBookerAndTravelers.getBookingStatus().name() : null,
                bookingWithLines.getFromDate(),
                bookingWithLines.getUntilDate(),
                bookingWithLines.getTotalSum(),
                bookerContext,
                travelerContexts,
                bookingLineContexts,
                bookingActivityContexts
        );
    }

    private AddressContext toAddressContext(nl.puurkroatie.rds.booking.entity.Address address) {
        return new AddressContext(
                address.getStreet(),
                address.getHousenumber(),
                address.getHousenumberAddition(),
                address.getPostalcode(),
                address.getCity(),
                address.getCountry(),
                address.getAddressrole() != null ? address.getAddressrole().name() : null
        );
    }

    private byte[] renderDocument(byte[] templateData, BookingContext bookingContext, boolean toPdf) {
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
