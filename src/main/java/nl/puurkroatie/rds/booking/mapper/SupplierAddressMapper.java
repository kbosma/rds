package nl.puurkroatie.rds.booking.mapper;

import nl.puurkroatie.rds.booking.dto.SupplierAddressDto;
import nl.puurkroatie.rds.booking.entity.SupplierAddress;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SupplierAddressMapper {

    @Mapping(source = "supplier.supplierId", target = "supplierId")
    @Mapping(source = "address.addressId", target = "addressId")
    SupplierAddressDto toDto(SupplierAddress entity);
}
