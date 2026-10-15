package nl.puurkroatie.rds.email.dto;

/**
 * De bytes van een afbeelding plus het (bij upload vastgestelde) Content-Type, voor
 * het publiek uitleveren. Bewust los van EmailImageDto: de bytes horen niet in de
 * upload-respons.
 */
public class EmailImageContentDto {

    private final String contentType;
    private final byte[] data;

    public EmailImageContentDto(String contentType, byte[] data) {
        this.contentType = contentType;
        this.data = data;
    }

    public String getContentType() {
        return contentType;
    }

    public byte[] getData() {
        return data;
    }
}
