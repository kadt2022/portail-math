package cd.portailmath.exetat.web.response;

public record ApiErrorResponse(
        String code,
        String message,
        String path
) {
}

