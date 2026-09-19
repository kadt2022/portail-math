package cd.portailmath.content.web.response;

public record ContentApiErrorResponse(
        String code,
        String message,
        String path
) {
}
