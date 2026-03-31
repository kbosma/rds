package nl.puurkroatie.rds.auth.service.impl;

import nl.puurkroatie.rds.auth.dto.AuthorityDto;
import nl.puurkroatie.rds.auth.entity.Authority;
import nl.puurkroatie.rds.auth.mapper.AuthorityMapper;
import nl.puurkroatie.rds.auth.repository.AuthorityRepository;
import nl.puurkroatie.rds.auth.service.AuthorityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class AuthorityServiceImpl implements AuthorityService {

    private final AuthorityRepository authorityRepository;
    private final AuthorityMapper authorityMapper;

    public AuthorityServiceImpl(AuthorityRepository authorityRepository, AuthorityMapper authorityMapper) {
        this.authorityRepository = authorityRepository;
        this.authorityMapper = authorityMapper;
    }

    @Override
    public AuthorityDto create(AuthorityDto dto) {
        Authority entity = authorityMapper.toEntity(dto);
        Authority saved = authorityRepository.save(entity);
        return authorityMapper.toDto(saved);
    }

    @Override
    public AuthorityDto update(UUID id, AuthorityDto dto) {
        if (!authorityRepository.findById(id).isPresent()) {
            throw new RuntimeException("Authority not found with id: " + id);
        }
        Authority entity = authorityMapper.toEntity(id, dto);
        Authority saved = authorityRepository.save(entity);
        return authorityMapper.toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!authorityRepository.existsById(id)) {
            throw new RuntimeException("Authority not found with id: " + id);
        }
        authorityRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuthorityDto> findAll() {
        return authorityRepository.findAll().stream()
                .map(authorityMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuthorityDto> findById(UUID id) {
        return authorityRepository.findById(id)
                .map(authorityMapper::toDto);
    }
}
