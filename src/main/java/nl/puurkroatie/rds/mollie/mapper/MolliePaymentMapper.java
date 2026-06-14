package nl.puurkroatie.rds.mollie.mapper;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MolliePaymentMapper {

    MolliePaymentDto toDto(MolliePayment entity);
}
