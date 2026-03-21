package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.booking.dto.AddressRoleDto;
import nl.puurkroatie.rds.booking.entity.AddressRole;
import nl.puurkroatie.rds.booking.repository.AddressRoleRepository;
import nl.puurkroatie.rds.booking.service.AddressRoleService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AddressRoleServiceImpl implements AddressRoleService {

    private final AddressRoleRepository addressRoleRepository;

    public AddressRoleServiceImpl(AddressRoleRepository addressRoleRepository) {
        this.addressRoleRepository = addressRoleRepository;
    }

    @Override
    public List<AddressRoleDto> findAll() {
        return addressRoleRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AddressRoleDto> findById(UUID id) {
        return addressRoleRepository.findById(id)
                .map(this::toDto);
    }

    private AddressRoleDto toDto(AddressRole entity) {
        return new AddressRoleDto(
                entity.getAddressroleId(),
                entity.getDisplayname()
        );
    }
}
