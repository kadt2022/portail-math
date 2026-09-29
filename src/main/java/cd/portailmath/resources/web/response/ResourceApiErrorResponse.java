package cd.portailmath.resources.web.response;

public record ResourceApiErrorResponse(
        String code,
        String message,
        String path
) {
}
