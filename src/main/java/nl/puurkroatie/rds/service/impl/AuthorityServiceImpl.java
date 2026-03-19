package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.AuthorityDto;
import nl.puurkroatie.rds.entity.Authority;
import nl.puurkroatie.rds.repository.AuthorityRepository;
import nl.puurkroatie.rds.service.AuthorityService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthorityServiceImpl implements AuthorityService {

    private final AuthorityRepository authorityRepository;

    public AuthorityServiceImpl(AuthorityRepository authorityRepository) {
        this.authorityRepository = authorityRepository;
    }

    @Override
    public AuthorityDto create(AuthorityDto dto) {
        Authority entity = toEntity(dto);
        Authority saved = authorityRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public AuthorityDto update(UUID id, AuthorityDto dto) {
        if (!authorityRepository.findById(id).isPresent()) {
            throw new RuntimeException("Authority not found with id: " + id);
        }
        Authority entity = toEntity(id, dto);
        Authority saved = authorityRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!authorityRepository.existsById(id)) {
            throw new RuntimeException("Authority not found with id: " + id);
        }
        authorityRepository.deleteById(id);
    }

    @Override
    public List<AuthorityDto> findAll() {
        return authorityRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<AuthorityDto> findById(UUID id) {
        return authorityRepository.findById(id)
                .map(this::toDto);
    }

    private AuthorityDto toDto(Authority entity) {
        return new AuthorityDto(
                entity.getAuthorityId(),
                entity.getDescription()
        );
    }

    private Authority toEntity(AuthorityDto dto) {
        return new Authority(
                dto.getDescription()
        );
    }

    private Authority toEntity(UUID id, AuthorityDto dto) {
        return new Authority(
                id,
                dto.getDescription()
        );
    }
}
