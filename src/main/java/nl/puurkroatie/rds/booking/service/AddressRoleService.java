package nl.puurkroatie.rds.booking.service;

import nl.puurkroatie.rds.booking.dto.AddressRoleDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AddressRoleService {

    List<AddressRoleDto> findAll();

    Optional<AddressRoleDto> findById(UUID id);
}
