package nl.puurkroatie.rds.email.service;

import nl.puurkroatie.rds.email.dto.EmailTemplateDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailTemplateService {

    EmailTemplateDto create(EmailTemplateDto dto);

    EmailTemplateDto update(UUID id, EmailTemplateDto dto);

    void delete(UUID id);

    List<EmailTemplateDto> findAll();

    Optional<EmailTemplateDto> findById(UUID id);
}
