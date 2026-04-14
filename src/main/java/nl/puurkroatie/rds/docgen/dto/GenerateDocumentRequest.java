package nl.puurkroatie.rds.docgen.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class GenerateDocumentRequest {

    @NotNull
    private UUID templateId;
    @NotNull
    private UUID bookingId;
    private String outputFormat;

    public GenerateDocumentRequest() {
    }

    public GenerateDocumentRequest(UUID templateId, UUID bookingId, String outputFormat) {
        this.templateId = templateId;
        this.bookingId = bookingId;
        this.outputFormat = outputFormat;
    }

    public UUID getTemplateId() {
        return templateId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public String getOutputFormat() {
        return outputFormat;
    }
}
