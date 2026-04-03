package nl.puurkroatie.rds.mollie.mapper;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentStatusEntryDto;
import nl.puurkroatie.rds.mollie.entity.MolliePaymentStatusEntry;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MolliePaymentStatusEntryMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().toValue() : null)")
    @Mapping(target = "molliePaymentId", expression = "java(entity.getMolliePayment() != null ? entity.getMolliePayment().getMolliePaymentId() : null)")
    MolliePaymentStatusEntryDto toDto(MolliePaymentStatusEntry entity);
}
