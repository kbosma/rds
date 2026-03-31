package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.AccommodationSupplierDto;
import nl.puurkroatie.rds.booking.entity.AccommodationSupplier;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccommodationSupplierMapper {

    @Mapping(source = "accommodation.accommodationId", target = "accommodationId")
    @Mapping(source = "supplier.supplierId", target = "supplierId")
    AccommodationSupplierDto toDto(AccommodationSupplier entity);
}
