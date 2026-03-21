package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.BookerAddressDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookerAddressService {

    List<BookerAddressDto> findAll();

    Optional<BookerAddressDto> findById(UUID bookerId, UUID addressId);

    BookerAddressDto create(BookerAddressDto dto);

    void delete(UUID bookerId, UUID addressId);
}
