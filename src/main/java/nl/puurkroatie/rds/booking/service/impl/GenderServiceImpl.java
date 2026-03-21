package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.booking.dto.GenderDto;
import nl.puurkroatie.rds.booking.entity.Gender;
import nl.puurkroatie.rds.booking.repository.GenderRepository;
import nl.puurkroatie.rds.booking.service.GenderService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GenderServiceImpl implements GenderService {

    private final GenderRepository genderRepository;

    public GenderServiceImpl(GenderRepository genderRepository) {
        this.genderRepository = genderRepository;
    }

    @Override
    public List<GenderDto> findAll() {
        return genderRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<GenderDto> findById(UUID id) {
        return genderRepository.findById(id)
                .map(this::toDto);
    }

    private GenderDto toDto(Gender entity) {
        return new GenderDto(
                entity.getGenderId(),
                entity.getDisplayname()
        );
    }
}
