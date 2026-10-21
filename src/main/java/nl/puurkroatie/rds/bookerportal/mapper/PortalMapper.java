package nl.puurkroatie.rds.bookerportal.mapper;

import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.entity.OrganizationTheme;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.entity.Traveler;
import nl.puurkroatie.rds.email.entity.SentEmail;
import nl.puurkroatie.rds.email.repository.SentEmailSummary;
import nl.puurkroatie.rds.bookerportal.dto.PortalBookerDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalBookingDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalMessageContentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalMessageDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalOrganizationDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalPaymentDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalPaymentStatusDto;
import nl.puurkroatie.rds.bookerportal.dto.PortalTravelerDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentMethod;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatus;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Entities → minimale DTO's voor het boekerportaal. Enums gaan als lowercase tekst naar buiten, zoals in de rest
 * van de API.
 */
@Mapper(componentModel = "spring")
public interface PortalMapper {

    @Mapping(target = "status", source = "bookingStatus")
    PortalBookingDto toBookingDto(Booking booking);

    PortalBookerDto toBookerDto(Booker booker);

    PortalTravelerDto toTravelerDto(Traveler traveler);

    @Mapping(target = "name", source = "organization.name")
    @Mapping(target = "primaryColor", source = "theme.primaryColor")
    @Mapping(target = "accentColor", source = "theme.accentColor")
    @Mapping(target = "cardTitleColor", source = "theme.cardTitleColor")
    @Mapping(target = "logoUrl", source = "theme.logoUrl")
    PortalOrganizationDto toOrganizationDto(Organization organization, OrganizationTheme theme);

    @Mapping(target = "molliePaymentId", source = "payment.molliePaymentId")
    @Mapping(target = "description", source = "payment.description")
    @Mapping(target = "amount", source = "payment.amount")
    @Mapping(target = "currency", source = "payment.currency")
    @Mapping(target = "method", source = "payment.method")
    @Mapping(target = "currentStatus", source = "currentStatus")
    @Mapping(target = "createdAt", source = "payment.createdAt")
    PortalPaymentDto toPaymentDto(MolliePayment payment, MolliePaymentStatus currentStatus);

    @Mapping(target = "molliePaymentId", source = "entry.molliePayment.molliePaymentId")
    @Mapping(target = "status", source = "entry.status")
    @Mapping(target = "createdAt", source = "entry.createdAt")
    PortalPaymentStatusDto toPaymentStatusDto(MolliePaymentStatusEntry entry);

    @Mapping(target = "messageId", source = "sentEmailId")
    @Mapping(target = "resent", expression = "java(summary.getResentFromId() != null)")
    PortalMessageDto toMessageDto(SentEmailSummary summary);

    @Mapping(target = "messageId", source = "sentEmailId")
    @Mapping(target = "resent", expression = "java(email.getResentFromId() != null)")
    PortalMessageContentDto toMessageContentDto(SentEmail email);

    default String toValue(BookingStatus status) {
        return status == null ? null : status.toValue();
    }

    default String toValue(MolliePaymentMethod method) {
        return method == null ? null : method.toValue();
    }

    default String toValue(MolliePaymentStatus status) {
        return status == null ? null : status.toValue();
    }
}
