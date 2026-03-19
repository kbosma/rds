package nl.puurkroatie.rds.service.impl;

import nl.puurkroatie.rds.dto.PersonDto;
import nl.puurkroatie.rds.entity.Person;
import nl.puurkroatie.rds.repository.PersonRepository;
import nl.puurkroatie.rds.service.PersonService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PersonServiceImpl implements PersonService {

    private final PersonRepository personRepository;

    public PersonServiceImpl(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Override
    public PersonDto create(PersonDto dto) {
        Person entity = toEntity(dto);
        Person saved = personRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public PersonDto update(UUID id, PersonDto dto) {
        if (!personRepository.findById(id).isPresent()) {
            throw new RuntimeException("Person not found with id: " + id);
        }
        Person entity = toEntity(id, dto);
        Person saved = personRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(UUID id) {
        if (!personRepository.existsById(id)) {
            throw new RuntimeException("Person not found with id: " + id);
        }
        personRepository.deleteById(id);
    }

    @Override
    public List<PersonDto> findAll() {
        return personRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public Optional<PersonDto> findById(UUID id) {
        return personRepository.findById(id)
                .map(this::toDto);
    }

    private PersonDto toDto(Person entity) {
        return new PersonDto(
                entity.getPersoonId(),
                entity.getFirstname(),
                entity.getPrefix(),
                entity.getLastname(),
                entity.getCreatedAt(),
                entity.getCreatedBy(),
                entity.getModifiedAt(),
                entity.getModifiedBy()
        );
    }

    private Person toEntity(PersonDto dto) {
        return new Person(
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }

    private Person toEntity(UUID id, PersonDto dto) {
        return new Person(
                id,
                dto.getFirstname(),
                dto.getPrefix(),
                dto.getLastname(),
                dto.getCreatedAt(),
                dto.getCreatedBy(),
                dto.getModifiedAt(),
                dto.getModifiedBy()
        );
    }
}
