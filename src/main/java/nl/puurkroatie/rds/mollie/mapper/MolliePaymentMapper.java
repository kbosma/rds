package nl.puurkroatie.rds.mollie.mapper;

import nl.puurkroatie.rds.mollie.dto.MolliePaymentDto;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MolliePaymentMapper {

    @Mapping(target = "status", expression = "java(entity.getStatus() != null ? entity.getStatus().toValue() : null)")
    MolliePaymentDto toDto(MolliePayment entity);
}
