package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.SupplierDto;
import nl.puurkroatie.rds.booking.entity.Supplier;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface SupplierMapper {

    SupplierDto toDto(Supplier entity);

    @Mapping(target = "supplierId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "modifiedAt", ignore = true)
    @Mapping(target = "modifiedBy", ignore = true)
    @Mapping(target = "tenantOrganization", ignore = true)
    Supplier toEntity(SupplierDto dto);

    default Supplier toEntity(UUID id, SupplierDto dto) {
        return new Supplier(id, dto.getKey(), dto.getName());
    }
}
